import { db } from '../db';
import type {
  ApplicationStatus,
  CareerApplication,
  CareerProject,
  CareerProjectStatus,
  ProofItem,
  ProofKind,
  RoadmapItem,
  RoadmapItemStatus,
  RoadmapLane,
  RoadmapMode,
  RoadmapPhase
} from '../types';
import { queueSyncChange, queueSyncChanges } from './sync';

function nowIso() {
  return new Date().toISOString();
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeCareerUrl(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

// Kept for callers from older pages. v0.12.4 no longer seeds projects, phases,
// or checkpoints; an empty workspace stays genuinely empty until the user acts.
export async function ensureCareerWorkspace() {
  return undefined;
}

export async function listRoadmapPhases() {
  const phases = await db.roadmapPhases.toArray();
  return phases.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));
}

export function phaseForDate(phases: RoadmapPhase[], dateKey = localDateKey()): RoadmapPhase | undefined {
  return phases.find(phase => phase.startDate <= dateKey && phase.endDate >= dateKey);
}

export function phaseProgress(phase: RoadmapPhase, dateKey = localDateKey()) {
  const start = new Date(`${phase.startDate}T00:00:00`).getTime();
  const end = new Date(`${phase.endDate}T23:59:59`).getTime();
  const now = new Date(`${dateKey}T12:00:00`).getTime();
  if (now <= start) return 0;
  if (now >= end) return 1;
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}

export async function createRoadmapPhase(input: {
  title: string;
  startDate: string;
  endDate: string;
  mode?: RoadmapMode;
  intent?: string;
  note?: string;
  source?: RoadmapPhase['source'];
  id?: string;
}) {
  if (!input.startDate || !input.endDate) throw new Error('Choose a start and end date.');
  if (input.endDate < input.startDate) throw new Error('The end date must be on or after the start date.');
  const timestamp = nowIso();
  const phase: RoadmapPhase = {
    id: input.id || crypto.randomUUID(),
    title: input.title.trim().slice(0, 140) || 'Untitled phase',
    startDate: input.startDate,
    endDate: input.endDate,
    mode: input.mode ?? 'green',
    intent: input.intent?.trim().slice(0, 700) ?? '',
    note: input.note?.trim().slice(0, 900) ?? '',
    source: input.source ?? 'user',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.roadmapPhases.put(phase);
  await queueSyncChange('roadmapPhases', phase.id);
  return phase;
}

export async function updateRoadmapPhase(id: string, patch: Partial<Pick<RoadmapPhase, 'title' | 'startDate' | 'endDate' | 'mode' | 'intent' | 'note'>>) {
  const current = await db.roadmapPhases.get(id);
  if (!current) throw new Error('That roadmap phase no longer exists.');
  const nextStart = patch.startDate ?? current.startDate;
  const nextEnd = patch.endDate ?? current.endDate;
  if (nextEnd < nextStart) throw new Error('The end date must be on or after the start date.');
  const next: Partial<RoadmapPhase> = {
    ...patch,
    title: patch.title !== undefined ? patch.title.trim().slice(0, 140) || current.title : undefined,
    intent: patch.intent !== undefined ? patch.intent.trim().slice(0, 700) : undefined,
    note: patch.note !== undefined ? patch.note.trim().slice(0, 900) : undefined,
    updatedAt: nowIso()
  };
  Object.keys(next).forEach(key => (next as Record<string, unknown>)[key] === undefined && delete (next as Record<string, unknown>)[key]);
  await db.roadmapPhases.update(id, next);
  await queueSyncChange('roadmapPhases', id);
}

export async function deleteRoadmapPhase(id: string) {
  const itemIds = (await db.roadmapItems.where('phaseId').equals(id).primaryKeys()).map(String);
  await db.transaction('rw', db.roadmapPhases, db.roadmapItems, async () => {
    await db.roadmapItems.where('phaseId').equals(id).delete();
    await db.roadmapPhases.delete(id);
  });
  await queueSyncChange('roadmapPhases', id, 'delete');
  await queueSyncChanges(itemIds.map(recordId => ({ table: 'roadmapItems' as const, recordId, operation: 'delete' as const })));
}

export async function listRoadmapItems() {
  return db.roadmapItems.toArray();
}

export async function setRoadmapStatus(id: string, status: RoadmapItemStatus) {
  await db.roadmapItems.update(id, { status, updatedAt: nowIso() });
  await queueSyncChange('roadmapItems', id);
}

export async function saveRoadmapNotes(id: string, notes: string) {
  await db.roadmapItems.update(id, { notes: notes.trim().slice(0, 1200), updatedAt: nowIso() });
  await queueSyncChange('roadmapItems', id);
}

export async function createRoadmapItem(input: {
  phaseId: string;
  title: string;
  detail?: string;
  lane: RoadmapLane;
  targetDate?: string;
  projectId?: string;
}) {
  const phase = await db.roadmapPhases.get(input.phaseId);
  if (!phase) throw new Error('Choose a roadmap phase first.');
  const timestamp = nowIso();
  const targetDate = input.targetDate && input.targetDate >= phase.startDate && input.targetDate <= phase.endDate ? input.targetDate : undefined;
  const item: RoadmapItem = {
    id: crypto.randomUUID(),
    phaseId: input.phaseId,
    title: input.title.trim().slice(0, 160) || 'Untitled checkpoint',
    detail: input.detail?.trim().slice(0, 700) ?? '',
    lane: input.lane,
    targetDate,
    status: 'planned',
    projectId: input.projectId || undefined,
    notes: '',
    source: 'custom',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.roadmapItems.add(item);
  await queueSyncChange('roadmapItems', item.id);
  return item;
}

export async function deleteRoadmapItem(id: string) {
  const item = await db.roadmapItems.get(id);
  if (!item) return false;
  await db.roadmapItems.delete(id);
  await queueSyncChange('roadmapItems', id, 'delete');
  return true;
}

export async function listCareerProjects() {
  return db.careerProjects.orderBy('updatedAt').reverse().toArray();
}

export async function updateCareerProject(id: string, patch: Partial<Pick<CareerProject, 'summary' | 'status' | 'targetDate' | 'repoUrl' | 'demoUrl'>>) {
  const next: Partial<CareerProject> = { ...patch, updatedAt: nowIso() };
  if ('repoUrl' in patch) next.repoUrl = normalizeCareerUrl(patch.repoUrl);
  if ('demoUrl' in patch) next.demoUrl = normalizeCareerUrl(patch.demoUrl);
  await db.careerProjects.update(id, next);
  await queueSyncChange('careerProjects', id);
}

export async function createCareerProject(input: { title: string; summary?: string; status?: CareerProjectStatus; targetDate?: string; repoUrl?: string; demoUrl?: string }) {
  const timestamp = nowIso();
  const project: CareerProject = {
    id: crypto.randomUUID(),
    title: input.title.trim().slice(0, 140) || 'Untitled project',
    summary: input.summary?.trim().slice(0, 900) ?? '',
    status: input.status ?? 'building',
    targetDate: input.targetDate || undefined,
    repoUrl: normalizeCareerUrl(input.repoUrl),
    demoUrl: normalizeCareerUrl(input.demoUrl),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.careerProjects.add(project);
  await queueSyncChange('careerProjects', project.id);
  return project;
}

export async function listProofItems() {
  return db.proofItems.orderBy('date').reverse().toArray();
}

export async function createProofItem(input: {
  title: string;
  kind: ProofKind;
  date?: string;
  url?: string;
  note?: string;
  projectId?: string;
  roadmapItemId?: string;
}) {
  const timestamp = nowIso();
  const item: ProofItem = {
    id: crypto.randomUUID(),
    title: input.title.trim().slice(0, 180) || 'Untitled proof',
    kind: input.kind,
    date: input.date || localDateKey(),
    url: normalizeCareerUrl(input.url),
    note: input.note?.trim().slice(0, 1200) || undefined,
    projectId: input.projectId || undefined,
    roadmapItemId: input.roadmapItemId || undefined,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.proofItems.add(item);
  await queueSyncChange('proofItems', item.id);
  return item;
}

export async function deleteProofItem(id: string) {
  await db.proofItems.delete(id);
  await queueSyncChange('proofItems', id, 'delete');
}

export async function listApplications() {
  const all = await db.careerApplications.toArray();
  return all.sort((a, b) => (b.updatedAt).localeCompare(a.updatedAt));
}

export async function createApplication(input: {
  company: string;
  role: string;
  status?: ApplicationStatus;
  sourceUrl?: string;
  deadline?: string;
  appliedAt?: string;
  note?: string;
}) {
  const timestamp = nowIso();
  const application: CareerApplication = {
    id: crypto.randomUUID(),
    company: input.company.trim().slice(0, 120) || 'Unknown organization',
    role: input.role.trim().slice(0, 160) || 'Opportunity',
    status: input.status ?? 'watching',
    sourceUrl: normalizeCareerUrl(input.sourceUrl),
    deadline: input.deadline || undefined,
    appliedAt: input.appliedAt || undefined,
    note: input.note?.trim().slice(0, 1200) || undefined,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await db.careerApplications.add(application);
  await queueSyncChange('careerApplications', application.id);
  return application;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  const patch: Partial<CareerApplication> = { status, updatedAt: nowIso() };
  if (status === 'applied') {
    const current = await db.careerApplications.get(id);
    if (!current?.appliedAt) patch.appliedAt = localDateKey();
  }
  await db.careerApplications.update(id, patch);
  await queueSyncChange('careerApplications', id);
}

export async function deleteApplication(id: string) {
  await db.careerApplications.delete(id);
  await queueSyncChange('careerApplications', id, 'delete');
}
