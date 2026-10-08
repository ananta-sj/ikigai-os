import { db } from '../db';
import type { MemoryAttachment, MemoryAttachmentKind, RoadmapItem, RoadmapPhase, SyncTableName, VaultMemory, VaultMemoryKind } from '../types';
import { isDateKey, isIsoTimestamp } from './integrityCore';
import { ensureSettings } from './settings';
import { ensureGarden } from './tasks';
import { queueSyncChange, queueSyncChanges } from './sync';
import { normalizeExternalHttpUrl } from './security';

export type IntegritySeverity = 'warning' | 'error';

export interface IntegrityIssue {
  code: string;
  severity: IntegritySeverity;
  title: string;
  detail: string;
  count: number;
  repairable: boolean;
}

export interface IntegrityReport {
  checkedAt: string;
  healthy: boolean;
  totalRecords: number;
  issues: IntegrityIssue[];
  repairableCount: number;
}

export interface IntegrityRepairResult {
  repaired: number;
  report: IntegrityReport;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function issue(
  issues: IntegrityIssue[],
  code: string,
  severity: IntegritySeverity,
  title: string,
  detail: string,
  count: number,
  repairable: boolean
) {
  if (count <= 0) return;
  issues.push({ code, severity, title, detail, count, repairable });
}

function expectedAttachmentKind(attachment: MemoryAttachment): MemoryAttachmentKind {
  const type = attachment.blob?.type?.toLowerCase() || attachment.mimeType?.toLowerCase() || '';
  if (type.startsWith('image/') && type !== 'image/svg+xml') return 'image';
  if (type === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'file';
}

function recoveredMemoryKind(attachments: MemoryAttachment[]): VaultMemoryKind {
  const hasImage = attachments.some(item => expectedAttachmentKind(item) === 'image');
  const hasOther = attachments.some(item => expectedAttachmentKind(item) !== 'image');
  if (hasImage && hasOther) return 'mixed';
  if (hasImage) return 'photo';
  return 'file';
}

function phaseFromOrphanItems(phaseId: string, items: RoadmapItem[]): RoadmapPhase {
  const now = new Date().toISOString();
  const dates = items.map(item => item.targetDate).filter((value): value is string => Boolean(value && isDateKey(value))).sort();
  const startDate = dates[0] ?? todayKey();
  const endDate = dates.at(-1) ?? startDate;
  return {
    id: phaseId,
    title: 'Recovered roadmap phase',
    startDate,
    endDate,
    mode: 'green',
    intent: 'Recovered by Ikigai Space because checkpoints referenced a phase that was missing.',
    note: 'Review the dates and title when convenient.',
    source: 'imported',
    createdAt: now,
    updatedAt: now
  };
}

export async function auditDataIntegrity(): Promise<IntegrityReport> {
  const [
    totalCounts,
    settings,
    gardens,
    tasks,
    memories,
    attachments,
    phases,
    roadmapItems,
    projects,
    proofItems,
    applications,
    dayRecords
  ] = await Promise.all([
    Promise.all(db.tables.map(table => table.count())),
    db.settings.toArray(),
    db.garden.toArray(),
    db.tasks.toArray(),
    db.memories.toArray(),
    db.memoryAttachments.toArray(),
    db.roadmapPhases.toArray(),
    db.roadmapItems.toArray(),
    db.careerProjects.toArray(),
    db.proofItems.toArray(),
    db.careerApplications.toArray(),
    db.dayRecords.toArray()
  ]);

  const issues: IntegrityIssue[] = [];
  const taskIds = new Set(tasks.map(item => item.id));
  const memoryIds = new Set(memories.map(item => item.id));
  const phaseIds = new Set(phases.map(item => item.id));
  const roadmapItemIds = new Set(roadmapItems.map(item => item.id));
  const projectIds = new Set(projects.map(item => item.id));

  issue(issues, 'settings-main-missing', 'warning', 'Settings record is missing', 'Ikigai Space can recreate the local settings record without touching life data.', settings.some(item => item.id === 'main') ? 0 : 1, true);
  issue(issues, 'settings-extra-records', 'warning', 'Unexpected settings records', 'Only the “main” settings record is used. Extra records are left untouched for manual inspection.', settings.filter(item => item.id !== 'main').length, false);
  issue(issues, 'garden-main-missing', 'warning', 'Garden state is missing', 'Ikigai Space can recreate an empty Garden state. Existing tasks and history are not changed.', gardens.some(item => item.id === 'main') ? 0 : 1, true);
  issue(issues, 'garden-extra-records', 'warning', 'Unexpected Garden records', 'Only the “main” Garden state is active. Extra records are preserved rather than deleted automatically.', gardens.filter(item => item.id !== 'main').length, false);

  const invalidGardenNumbers = gardens.filter(garden => [garden.water, garden.sunlight, garden.fertilizer, garden.growth].some(value => !Number.isFinite(value) || value < 0));
  issue(issues, 'garden-invalid-numbers', 'error', 'Garden resources contain invalid values', 'Negative or non-numeric Garden resources need manual inspection; Ikigai Space will not guess replacement values.', invalidGardenNumbers.length, false);

  const taskProjectRefs = tasks.filter(item => item.projectId && !projectIds.has(item.projectId));
  issue(issues, 'task-project-orphans', 'warning', 'Tasks reference missing projects', 'The missing project link can be cleared while keeping each task intact.', taskProjectRefs.length, true);

  const memoryTaskRefs = memories.filter(item => item.taskId && !taskIds.has(item.taskId));
  issue(issues, 'memory-task-orphans', 'warning', 'Memories reference missing tasks', 'The stale task link can be cleared without changing the memory itself.', memoryTaskRefs.length, true);

  const orphanAttachments = attachments.filter(item => !memoryIds.has(item.memoryId));
  issue(issues, 'attachment-memory-orphans', 'error', 'Vault attachments lost their memory record', 'Ikigai Space can recover them into placeholder memories instead of deleting the files.', orphanAttachments.length, true);

  const invalidAttachmentMetadata = attachments.filter(item => {
    if (!(item.blob instanceof Blob)) return false;
    return item.size !== item.blob.size || item.mimeType !== item.blob.type || item.kind !== expectedAttachmentKind(item);
  });
  issue(issues, 'attachment-metadata-mismatch', 'warning', 'Vault attachment metadata is out of sync', 'File size, MIME type and attachment kind can be rebuilt from the stored Blob.', invalidAttachmentMetadata.length, true);

  const unreadableAttachments = attachments.filter(item => !(item.blob instanceof Blob));
  issue(issues, 'attachment-blob-missing', 'error', 'Vault attachment data is unreadable', 'The attachment record exists but its stored Blob is missing or invalid. Ikigai Space will not delete it automatically.', unreadableAttachments.length, false);

  const itemPhaseRefs = roadmapItems.filter(item => !item.phaseId || !phaseIds.has(item.phaseId));
  issue(issues, 'roadmap-phase-orphans', 'error', 'Roadmap checkpoints reference missing phases', 'Ikigai Space can recreate neutral imported phases around those checkpoints.', itemPhaseRefs.length, true);

  const itemProjectRefs = roadmapItems.filter(item => item.projectId && !projectIds.has(item.projectId));
  issue(issues, 'roadmap-project-orphans', 'warning', 'Roadmap checkpoints reference missing projects', 'The stale project link can be cleared while preserving the checkpoint.', itemProjectRefs.length, true);

  const proofProjectRefs = proofItems.filter(item => item.projectId && !projectIds.has(item.projectId));
  issue(issues, 'proof-project-orphans', 'warning', 'Proof items reference missing projects', 'The stale project link can be cleared while preserving the proof item.', proofProjectRefs.length, true);

  const proofRoadmapRefs = proofItems.filter(item => item.roadmapItemId && !roadmapItemIds.has(item.roadmapItemId));
  issue(issues, 'proof-roadmap-orphans', 'warning', 'Proof items reference missing checkpoints', 'The stale checkpoint link can be cleared while preserving the proof item.', proofRoadmapRefs.length, true);

  const invalidMemoryLinks = memories.filter(item => item.linkUrl && !normalizeExternalHttpUrl(item.linkUrl));
  issue(issues, 'memory-unsafe-links', 'error', 'Memories contain unsafe or malformed links', 'Ikigai Space can clear these links while preserving the memory text and attachments.', invalidMemoryLinks.length, true);

  const invalidProjectLinks = projects.filter(item => (item.repoUrl && !normalizeExternalHttpUrl(item.repoUrl)) || (item.demoUrl && !normalizeExternalHttpUrl(item.demoUrl)));
  issue(issues, 'career-project-unsafe-links', 'error', 'Career projects contain unsafe or malformed links', 'Ikigai Space can clear only the invalid link fields while preserving the project.', invalidProjectLinks.length, true);

  const invalidProofLinks = proofItems.filter(item => item.url && !normalizeExternalHttpUrl(item.url));
  issue(issues, 'proof-unsafe-links', 'error', 'Proof items contain unsafe or malformed links', 'Ikigai Space can clear the unsafe link while preserving the proof record.', invalidProofLinks.length, true);

  const invalidApplicationLinks = applications.filter(item => item.sourceUrl && !normalizeExternalHttpUrl(item.sourceUrl));
  issue(issues, 'application-unsafe-links', 'error', 'Opportunities contain unsafe or malformed source links', 'Ikigai Space can clear the unsafe link while preserving the opportunity.', invalidApplicationLinks.length, true);

  const invalidPhaseRanges = phases.filter(phase => !isDateKey(phase.startDate) || !isDateKey(phase.endDate) || phase.endDate < phase.startDate);
  issue(issues, 'roadmap-invalid-ranges', 'error', 'Roadmap phases contain invalid date ranges', 'These dates may carry user intent, so Ikigai Space reports them instead of changing them automatically.', invalidPhaseRanges.length, false);

  const invalidTaskDates = tasks.filter(task => (task.dueDate && !isDateKey(task.dueDate)) || !isIsoTimestamp(task.createdAt) || (task.completedAt && !isIsoTimestamp(task.completedAt)) || (task.gardenRewardedAt && !isIsoTimestamp(task.gardenRewardedAt)));
  issue(issues, 'task-invalid-dates', 'error', 'Tasks contain invalid dates', 'The affected task dates need manual inspection; automatic repair could move or rewrite planned work.', invalidTaskDates.length, false);

  const invalidDayRecords = dayRecords.filter(record => !isDateKey(record.date) || !isIsoTimestamp(record.updatedAt) || (record.closedAt && !isIsoTimestamp(record.closedAt)));
  issue(issues, 'day-record-invalid-dates', 'error', 'Daily history contains invalid dates', 'Ikigai Space leaves historical dates untouched and reports them for manual recovery.', invalidDayRecords.length, false);

  const totalRecords = totalCounts.reduce((sum, count) => sum + count, 0);
  return {
    checkedAt: new Date().toISOString(),
    healthy: issues.length === 0,
    totalRecords,
    issues,
    repairableCount: issues.filter(item => item.repairable).reduce((sum, item) => sum + item.count, 0)
  };
}

export async function repairSafeIntegrityIssues(): Promise<IntegrityRepairResult> {
  let repaired = 0;
  const changes: Array<{ table: SyncTableName; recordId: string; operation?: 'upsert' | 'delete' }> = [];

  if (!(await db.settings.get('main'))) {
    await ensureSettings();
    await queueSyncChange('settings', 'main');
    repaired += 1;
  }

  if (!(await db.garden.get('main'))) {
    await ensureGarden();
    repaired += 1;
  }

  await db.transaction(
    'rw',
    [
      db.tasks,
      db.memories,
      db.memoryAttachments,
      db.roadmapPhases,
      db.roadmapItems,
      db.careerProjects,
      db.proofItems,
      db.careerApplications
    ],
    async () => {
      const [tasks, memories, attachments, phases, roadmapItems, projects, proofItems, applications] = await Promise.all([
        db.tasks.toArray(),
        db.memories.toArray(),
        db.memoryAttachments.toArray(),
        db.roadmapPhases.toArray(),
        db.roadmapItems.toArray(),
        db.careerProjects.toArray(),
        db.proofItems.toArray(),
        db.careerApplications.toArray()
      ]);

      const taskIds = new Set(tasks.map(item => item.id));
      const memoryIds = new Set(memories.map(item => item.id));
      const phaseIds = new Set(phases.map(item => item.id));
      const roadmapItemIds = new Set(roadmapItems.map(item => item.id));
      const projectIds = new Set(projects.map(item => item.id));

      for (const task of tasks) {
        if (!task.projectId || projectIds.has(task.projectId)) continue;
        await db.tasks.update(task.id, { projectId: undefined });
        changes.push({ table: 'tasks', recordId: task.id });
        repaired += 1;
      }

      for (const memory of memories) {
        if (!memory.taskId || taskIds.has(memory.taskId)) continue;
        await db.memories.update(memory.id, { taskId: undefined, updatedAt: new Date().toISOString() });
        changes.push({ table: 'memories', recordId: memory.id });
        repaired += 1;
      }

      for (const memory of memories) {
        if (!memory.linkUrl || normalizeExternalHttpUrl(memory.linkUrl)) continue;
        await db.memories.update(memory.id, { linkUrl: undefined, updatedAt: new Date().toISOString() });
        changes.push({ table: 'memories', recordId: memory.id });
        repaired += 1;
      }

      const orphanGroups = new Map<string, MemoryAttachment[]>();
      for (const attachment of attachments) {
        if (memoryIds.has(attachment.memoryId)) continue;
        const key = attachment.memoryId?.trim() || `recovered-${attachment.id}`;
        const group = orphanGroups.get(key) ?? [];
        group.push(attachment);
        orphanGroups.set(key, group);
      }

      for (const [missingMemoryId, group] of orphanGroups) {
        const id = missingMemoryId.startsWith('recovered-') ? crypto.randomUUID() : missingMemoryId;
        const createdAt = group.map(item => item.createdAt).filter(isIsoTimestamp).sort()[0] ?? new Date().toISOString();
        const memory: VaultMemory = {
          id,
          title: 'Recovered memory',
          body: 'Recovered by Ikigai Space because the original Memory Vault record was missing. Review or rename this memory when convenient.',
          date: isDateKey(createdAt.slice(0, 10)) ? createdAt.slice(0, 10) : todayKey(),
          tags: ['recovered'],
          kind: recoveredMemoryKind(group),
          createdAt,
          updatedAt: new Date().toISOString()
        };
        await db.memories.put(memory);
        changes.push({ table: 'memories', recordId: id });
        memoryIds.add(id);
        repaired += 1;

        for (const attachment of group) {
          if (attachment.memoryId === id) continue;
          await db.memoryAttachments.update(attachment.id, { memoryId: id });
          changes.push({ table: 'memoryAttachments', recordId: attachment.id });
          repaired += 1;
        }
      }

      for (const attachment of attachments) {
        if (!(attachment.blob instanceof Blob)) continue;
        const kind = expectedAttachmentKind(attachment);
        if (attachment.size === attachment.blob.size && attachment.mimeType === attachment.blob.type && attachment.kind === kind) continue;
        await db.memoryAttachments.update(attachment.id, {
          size: attachment.blob.size,
          mimeType: attachment.blob.type,
          kind
        });
        changes.push({ table: 'memoryAttachments', recordId: attachment.id });
        repaired += 1;
      }

      const orphanPhaseGroups = new Map<string, RoadmapItem[]>();
      for (const item of roadmapItems) {
        if (item.phaseId && phaseIds.has(item.phaseId)) continue;
        const id = item.phaseId?.trim() || `recovered-phase-${item.id}`;
        const group = orphanPhaseGroups.get(id) ?? [];
        group.push(item);
        orphanPhaseGroups.set(id, group);
      }

      for (const [phaseId, items] of orphanPhaseGroups) {
        const phase = phaseFromOrphanItems(phaseId, items);
        await db.roadmapPhases.put(phase);
        changes.push({ table: 'roadmapPhases', recordId: phase.id });
        phaseIds.add(phase.id);
        repaired += 1;
        for (const item of items) {
          if (item.phaseId === phase.id) continue;
          await db.roadmapItems.update(item.id, { phaseId: phase.id, updatedAt: new Date().toISOString() });
          changes.push({ table: 'roadmapItems', recordId: item.id });
          repaired += 1;
        }
      }

      for (const item of roadmapItems) {
        if (!item.projectId || projectIds.has(item.projectId)) continue;
        await db.roadmapItems.update(item.id, { projectId: undefined, updatedAt: new Date().toISOString() });
        changes.push({ table: 'roadmapItems', recordId: item.id });
        repaired += 1;
      }

      for (const project of projects) {
        const patch: { repoUrl?: undefined; demoUrl?: undefined; updatedAt?: string } = {};
        if (project.repoUrl && !normalizeExternalHttpUrl(project.repoUrl)) patch.repoUrl = undefined;
        if (project.demoUrl && !normalizeExternalHttpUrl(project.demoUrl)) patch.demoUrl = undefined;
        if (!('repoUrl' in patch) && !('demoUrl' in patch)) continue;
        patch.updatedAt = new Date().toISOString();
        await db.careerProjects.update(project.id, patch);
        changes.push({ table: 'careerProjects', recordId: project.id });
        repaired += 1;
      }

      for (const proof of proofItems) {
        if (!proof.url || normalizeExternalHttpUrl(proof.url)) continue;
        await db.proofItems.update(proof.id, { url: undefined, updatedAt: new Date().toISOString() });
        changes.push({ table: 'proofItems', recordId: proof.id });
        repaired += 1;
      }

      for (const application of applications) {
        if (!application.sourceUrl || normalizeExternalHttpUrl(application.sourceUrl)) continue;
        await db.careerApplications.update(application.id, { sourceUrl: undefined, updatedAt: new Date().toISOString() });
        changes.push({ table: 'careerApplications', recordId: application.id });
        repaired += 1;
      }

      for (const proof of proofItems) {
        const patch: { projectId?: undefined; roadmapItemId?: undefined; updatedAt?: string } = {};
        if (proof.projectId && !projectIds.has(proof.projectId)) patch.projectId = undefined;
        if (proof.roadmapItemId && !roadmapItemIds.has(proof.roadmapItemId)) patch.roadmapItemId = undefined;
        if (!('projectId' in patch) && !('roadmapItemId' in patch)) continue;
        patch.updatedAt = new Date().toISOString();
        await db.proofItems.update(proof.id, patch);
        changes.push({ table: 'proofItems', recordId: proof.id });
        repaired += 1;
      }
    }
  );

  if (changes.length) {
    const unique = Array.from(new Map(changes.map(change => [`${change.table}:${change.recordId}`, change] as const)).values());
    try {
      await queueSyncChanges(unique);
    } catch {
      // Sync transport is disabled in this release. A diagnostics-queue failure
      // must not turn an already-committed data repair into a reported failure.
    }
  }
  return { repaired, report: await auditDataIntegrity() };
}
