import Dexie, { type Table } from 'dexie';
import type { Activity, AchievementUnlock, CareerApplication, CareerProject, CompanionMessage, CompanionState, DailyEntry, DayRecord, GardenState, MemoryAttachment, Milestone, ProofItem, RoadmapItem, RoadmapPhase, SyncQueueItem, SyncState, Task, UserSettings, VaultMemory, WeeklyReflection } from './types';

export class IkigaiDB extends Dexie {
  activities!: Table<Activity, string>;
  dailyEntries!: Table<DailyEntry, string>;
  tasks!: Table<Task, string>;
  garden!: Table<GardenState, string>;
  settings!: Table<UserSettings, string>;
  dayRecords!: Table<DayRecord, string>;
  milestones!: Table<Milestone, string>;
  weeklyReflections!: Table<WeeklyReflection, string>;
  memories!: Table<VaultMemory, string>;
  memoryAttachments!: Table<MemoryAttachment, string>;
  roadmapPhases!: Table<RoadmapPhase, string>;
  roadmapItems!: Table<RoadmapItem, string>;
  careerProjects!: Table<CareerProject, string>;
  proofItems!: Table<ProofItem, string>;
  careerApplications!: Table<CareerApplication, string>;
  achievementUnlocks!: Table<AchievementUnlock, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  syncState!: Table<SyncState, string>;
  companionMessages!: Table<CompanionMessage, string>;
  companionState!: Table<CompanionState, string>;

  constructor() {
    super('ikigai-os');

    this.version(1).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt'
    });

    this.version(2).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt'
    });

    this.version(3).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt'
    });

    // v0.5.0: important dates selected during onboarding become first-class milestones.
    this.version(4).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt'
    });

    // v0.6.0: editable weekly chapters live locally and remain independent
    // from raw task/day history, so summaries can evolve without mutating facts.
    this.version(5).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt'
    });

    // v0.8.0: local Memory Vault. Metadata and attachment blobs are kept in
    // separate tables so memories remain searchable without loading files.
    this.version(6).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt'
    });

    // v0.9.0: roadmap + career/proof workspace. The roadmap remains exam-aware
    // while projects, evidence and applications become first-class local data.
    this.version(7).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt',
      roadmapItems: 'id, phaseId, lane, targetDate, status, projectId, updatedAt',
      careerProjects: 'id, status, category, targetDate, updatedAt',
      proofItems: 'id, date, kind, projectId, roadmapItemId, updatedAt',
      careerApplications: 'id, status, deadline, appliedAt, updatedAt'
    });

    // v0.10.0: achievements are reconciled from existing life data and persisted
    // once unlocked so the living world can keep permanent artifacts.
    this.version(8).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt',
      roadmapItems: 'id, phaseId, lane, targetDate, status, projectId, updatedAt',
      careerProjects: 'id, status, category, targetDate, updatedAt',
      proofItems: 'id, date, kind, projectId, roadmapItemId, updatedAt',
      careerApplications: 'id, status, deadline, appliedAt, updatedAt',
      achievementUnlocks: 'id, achievementId, unlockedAt, seenAt'
    });


    // v0.11.0: local backup metadata + provider-neutral sync queue foundation.
    // No network transport is enabled yet; the queue only records local changes
    // so a future sync provider can consume them with explicit user consent.
    this.version(9).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt',
      roadmapItems: 'id, phaseId, lane, targetDate, status, projectId, updatedAt',
      careerProjects: 'id, status, category, targetDate, updatedAt',
      proofItems: 'id, date, kind, projectId, roadmapItemId, updatedAt',
      careerApplications: 'id, status, deadline, appliedAt, updatedAt',
      achievementUnlocks: 'id, achievementId, unlockedAt, seenAt',
      syncQueue: 'id, table, recordId, operation, changedAt',
      syncState: 'id, updatedAt'
    });

    // v0.12.0: local-first AI companion. Conversation history is portable and
    // syncable; endpoint/model preferences stay device-local.
    this.version(10).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt',
      roadmapItems: 'id, phaseId, lane, targetDate, status, projectId, updatedAt',
      careerProjects: 'id, status, category, targetDate, updatedAt',
      proofItems: 'id, date, kind, projectId, roadmapItemId, updatedAt',
      careerApplications: 'id, status, deadline, appliedAt, updatedAt',
      achievementUnlocks: 'id, achievementId, unlockedAt, seenAt',
      syncQueue: 'id, table, recordId, operation, changedAt',
      syncState: 'id, updatedAt',
      companionMessages: 'id, role, createdAt',
      companionState: 'id, updatedAt'
    });

    // v0.12.2: remove prototype personalization from the product defaults.
    // Legacy task categories are folded into neutral categories; hard-coded
    // starter projects / tailored roadmap checkpoints are removed.
    this.version(11).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt',
      roadmapItems: 'id, phaseId, lane, targetDate, status, projectId, updatedAt',
      careerProjects: 'id, status, category, targetDate, updatedAt',
      proofItems: 'id, date, kind, projectId, roadmapItemId, updatedAt',
      careerApplications: 'id, status, deadline, appliedAt, updatedAt',
      achievementUnlocks: 'id, achievementId, unlockedAt, seenAt',
      syncQueue: 'id, table, recordId, operation, changedAt',
      syncState: 'id, updatedAt',
      companionMessages: 'id, role, createdAt',
      companionState: 'id, updatedAt'
    }).upgrade(async tx => {
      const categoryMap: Record<string, string> = {
        ReFlow: 'Projects',
        Python: 'Learning',
        'AI / ML': 'Learning',
        University: 'Study',
        Projects: 'Projects',
        Learning: 'Learning',
        Study: 'Study',
        Career: 'Career',
        Health: 'Health',
        Personal: 'Personal'
      };
      const normalizeCategory = (value: unknown) => typeof value === 'string' && categoryMap[value] ? categoryMap[value] : 'Personal';

      for (const tableName of ['tasks', 'activities', 'milestones', 'careerProjects']) {
        await tx.table(tableName).toCollection().modify(record => {
          if ('category' in record && record.category) record.category = normalizeCategory(record.category);
        });
      }

      await tx.table('settings').toCollection().modify(record => {
        if (Array.isArray(record.focusAreas)) record.focusAreas = Array.from(new Set(record.focusAreas.map(normalizeCategory)));
      });

      const oldPhaseMap: Record<string, string> = {
        'foundation-sep-oct': 'phase-1-foundation',
        'ta-oct': 'phase-2-protect',
        'ship-nov-dec': 'phase-3-build',
        'endsem-dec-jan': 'phase-4-quiet',
        'recovery-jan': 'phase-5-reset',
        'deep-dive-jan-feb': 'phase-6-deepen',
        'ta-feb': 'phase-7-protect',
        'career-feb-mar': 'phase-8-proof',
        'midsem-mar': 'phase-9-review'
      };
      const legacyProjectIds = ['project-reflow', 'project-ikigai'];
      const legacyPlanIds = [
        'plan-python-rebuild',
        'plan-ai-literacy',
        'plan-reflow-alpha',
        'plan-oct-exams',
        'plan-reflow-v1',
        'plan-applied-ai-proof',
        'plan-small-ml-project',
        'plan-endsem',
        'plan-reflow-deep-dive',
        'plan-portfolio-pass',
        'plan-feb-ta',
        'plan-internship-push',
        'plan-career-proof',
        'plan-midsem'
      ];

      await tx.table('roadmapItems').bulkDelete(legacyPlanIds);
      await tx.table('roadmapItems').toCollection().modify(record => {
        if (typeof record.phaseId === 'string' && oldPhaseMap[record.phaseId]) record.phaseId = oldPhaseMap[record.phaseId];
        if (legacyProjectIds.includes(record.projectId)) delete record.projectId;
      });
      await tx.table('proofItems').toCollection().modify(record => {
        if (legacyProjectIds.includes(record.projectId)) delete record.projectId;
      });
      await tx.table('careerProjects').bulkDelete(legacyProjectIds);
    });


    // v0.12.4: roadmap phases become user-owned records instead of hard-coded
    // product defaults. Existing custom checkpoints are preserved by creating
    // neutral imported phases only when they need somewhere to live.
    this.version(12).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt',
      settings: 'id, updatedAt',
      dayRecords: 'date, status, updatedAt',
      milestones: 'id, date, kind, category, createdAt',
      weeklyReflections: 'weekStart, updatedAt',
      memories: 'id, date, kind, createdAt, updatedAt, *tags, taskId',
      memoryAttachments: 'id, memoryId, kind, createdAt',
      roadmapPhases: 'id, startDate, endDate, mode, source, updatedAt',
      roadmapItems: 'id, phaseId, lane, targetDate, status, projectId, updatedAt',
      careerProjects: 'id, status, category, targetDate, updatedAt',
      proofItems: 'id, date, kind, projectId, roadmapItemId, updatedAt',
      careerApplications: 'id, status, deadline, appliedAt, updatedAt',
      achievementUnlocks: 'id, achievementId, unlockedAt, seenAt',
      syncQueue: 'id, table, recordId, operation, changedAt',
      syncState: 'id, updatedAt',
      companionMessages: 'id, role, createdAt',
      companionState: 'id, updatedAt'
    }).upgrade(async tx => {
      const starterIds = [
        'starter-foundation-skill', 'starter-foundation-project', 'starter-protect-first',
        'starter-build-output', 'starter-build-proof', 'starter-quiet', 'starter-deepen',
        'starter-proof-pass', 'starter-opportunity', 'starter-review'
      ];
      await tx.table('roadmapItems').bulkDelete(starterIds);

      const oldDates: Record<string, [string, string]> = {
        'phase-1-foundation': ['2026-09-24', '2026-10-19'],
        'phase-2-protect': ['2026-10-20', '2026-10-30'],
        'phase-3-build': ['2026-10-31', '2026-12-12'],
        'phase-4-quiet': ['2026-12-13', '2027-01-07'],
        'phase-5-reset': ['2027-01-08', '2027-01-17'],
        'phase-6-deepen': ['2027-01-18', '2027-02-09'],
        'phase-7-protect': ['2027-02-10', '2027-02-20'],
        'phase-8-proof': ['2027-02-21', '2027-03-10'],
        'phase-9-review': ['2027-03-11', '2027-03-25']
      };
      const remaining = await tx.table('roadmapItems').toArray();
      const grouped = new Map<string, any[]>();
      for (const item of remaining) {
        if (!item?.phaseId) continue;
        const group = grouped.get(String(item.phaseId)) ?? [];
        group.push(item);
        grouped.set(String(item.phaseId), group);
      }
      const now = new Date().toISOString();
      const imported = [];
      let index = 1;
      for (const [phaseId, items] of grouped.entries()) {
        const known = oldDates[phaseId];
        const dates = items.map(item => item.targetDate).filter(Boolean).sort();
        const startDate = known?.[0] ?? dates[0] ?? now.slice(0, 10);
        const endDate = known?.[1] ?? dates[dates.length - 1] ?? startDate;
        imported.push({
          id: phaseId,
          title: `Imported phase ${index++}`,
          startDate,
          endDate,
          mode: 'green',
          intent: 'Preserved from an earlier Ikigai roadmap. Edit this phase to make it yours.',
          note: '',
          source: 'imported',
          createdAt: now,
          updatedAt: now
        });
      }
      if (imported.length) await tx.table('roadmapPhases').bulkPut(imported);

      await tx.table('companionState').toCollection().modify(record => {
        if (!record.provider) record.provider = 'ollama';
      });
    });

  }
}

export const db = new IkigaiDB();
