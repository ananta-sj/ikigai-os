import { db } from '../db';
import type { SyncOperation, SyncQueueItem, SyncState, SyncTableName } from '../types';

export const syncableTables: SyncTableName[] = [
  'activities',
  'dailyEntries',
  'tasks',
  'garden',
  'settings',
  'dayRecords',
  'milestones',
  'weeklyReflections',
  'memories',
  'memoryAttachments',
  'roadmapPhases',
  'roadmapItems',
  'careerProjects',
  'proofItems',
  'careerApplications',
  'achievementUnlocks',
  'companionMessages'
];

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultDeviceName() {
  if (typeof navigator === 'undefined') return 'Ikigai device';
  const platform = navigator.platform?.trim();
  return platform ? `${platform} browser` : 'This browser';
}

export async function ensureSyncState(): Promise<SyncState> {
  const existing = await db.syncState.get('main');
  if (existing) return existing;

  const state: SyncState = {
    id: 'main',
    deviceId: randomId(),
    deviceName: defaultDeviceName(),
    provider: 'none',
    transportEnabled: false,
    updatedAt: new Date().toISOString()
  };
  await db.syncState.put(state);
  return state;
}

export async function updateSyncState(patch: Partial<Omit<SyncState, 'id' | 'deviceId' | 'provider' | 'transportEnabled'>>): Promise<SyncState> {
  const current = await ensureSyncState();
  const next: SyncState = {
    ...current,
    ...patch,
    id: 'main',
    provider: 'none',
    transportEnabled: false,
    updatedAt: new Date().toISOString()
  };
  await db.syncState.put(next);
  return next;
}

export async function queueSyncChange(table: SyncTableName, recordId: string, operation: SyncOperation = 'upsert') {
  const changedAt = new Date().toISOString();
  const item: SyncQueueItem = {
    id: `${table}:${recordId}`,
    table,
    recordId,
    operation,
    changedAt
  };
  await db.syncQueue.put(item);
}

export async function queueSyncChanges(changes: Array<{ table: SyncTableName; recordId: string; operation?: SyncOperation }>) {
  if (!changes.length) return;
  const changedAt = new Date().toISOString();
  await db.syncQueue.bulkPut(changes.map(change => ({
    id: `${change.table}:${change.recordId}`,
    table: change.table,
    recordId: change.recordId,
    operation: change.operation ?? 'upsert',
    changedAt
  })));
}

async function sha256(text: string) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Small non-cryptographic fallback for older engines. It is only used as a
  // change fingerprint, never as a security primitive.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function rebuildSyncManifest() {
  const lines: string[] = [];
  const changes: Array<{ table: SyncTableName; recordId: string }> = [];

  for (const tableName of syncableTables) {
    const table = db.table(tableName);
    const keys = await table.toCollection().primaryKeys();
    const ids = keys.map(key => String(key)).sort();
    ids.forEach(recordId => {
      lines.push(`${tableName}:${recordId}`);
      changes.push({ table: tableName, recordId });
    });
  }

  // Keep delete tombstones already in the queue. Upserts are put on top of
  // stale upserts but never erase a delete for a record that no longer exists.
  await queueSyncChanges(changes);

  const hash = await sha256(lines.join('\n'));
  const now = new Date().toISOString();
  await updateSyncState({ lastManifestAt: now, lastManifestHash: hash });
  return { hash, records: changes.length, createdAt: now };
}

export async function clearSyncQueue() {
  await db.syncQueue.clear();
}

export async function getSyncOverview() {
  const [state, queued] = await Promise.all([
    ensureSyncState(),
    db.syncQueue.toArray()
  ]);
  return {
    state,
    pending: queued.length,
    upserts: queued.filter(item => item.operation === 'upsert').length,
    deletes: queued.filter(item => item.operation === 'delete').length,
    oldestChangeAt: queued.slice().sort((a, b) => a.changedAt.localeCompare(b.changedAt))[0]?.changedAt
  };
}

export async function markBackupCreated(at = new Date().toISOString()) {
  return updateSyncState({ lastBackupAt: at });
}

export async function markRestoreCompleted(at = new Date().toISOString()) {
  return updateSyncState({ lastRestoreAt: at });
}
