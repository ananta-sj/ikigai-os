import { db } from '../db';
import type { RoadmapPhase, RoadmapItem, SyncTableName } from '../types';
import { clearSyncQueue, ensureSyncState, markBackupCreated, markRestoreCompleted, rebuildSyncManifest, syncableTables } from './sync';
import { describeBackupIssue, inspectBackupResourceLimits, inspectBackupTables, isIsoTimestamp, isPlainRecord } from './integrityCore';
import { normalizeExternalHttpUrl, safeFilename } from './security';

const BACKUP_FORMAT = 'ikigai-os-backup';
const BACKUP_FORMAT_VERSION = 1;
export const CURRENT_SCHEMA_VERSION = 13;
export const APP_DATA_VERSION = '0.29.0';
export const MAX_BACKUP_FILE_BYTES = 256 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 250_000;
const MAX_SERIALIZED_BLOB_CHARS = 48 * 1024 * 1024;
const BACKUP_RESOURCE_LIMITS = { maxRecords: MAX_BACKUP_RECORDS, maxSerializedBlobChars: MAX_SERIALIZED_BLOB_CHARS } as const;

function assertBackupResourceLimits(tables: unknown) {
  const issues = inspectBackupResourceLimits(tables, syncableTables, BACKUP_RESOURCE_LIMITS);
  if (issues.length) throw new Error(`Backup resource check failed — ${describeBackupIssue(issues[0])}`);
}

export type RestoreMode = 'merge' | 'replace';

interface SerializedBlob {
  __ikigaiBlob: true;
  type: string;
  data: string;
}

export interface IkigaiBackupBundle {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  schemaVersion: number;
  appDataVersion: string;
  exportedAt: string;
  sourceDevice: {
    deviceId: string;
    deviceName: string;
  };
  tables: Partial<Record<SyncTableName, unknown[]>>;
  checksum: string;
}

export interface BackupPreview {
  bundle: IkigaiBackupBundle;
  counts: Partial<Record<SyncTableName, number>>;
  totalRecords: number;
  exportedAt: string;
  sourceDeviceName: string;
  fileBytes: number;
}

export interface RestoreResult {
  restoredRecords: number;
  recoveredRoadmapPhases: number;
  maintenanceWarning?: string;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new Error('The backup contains an attachment that could not be decoded. Nothing was restored.');
  }
}

async function serializeValue(value: unknown): Promise<unknown> {
  if (value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer());
    return {
      __ikigaiBlob: true,
      type: value.type,
      data: bytesToBase64(bytes)
    } satisfies SerializedBlob;
  }
  if (Array.isArray(value)) return Promise.all(value.map(item => serializeValue(item)));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value as Record<string, unknown>).map(async ([key, item]) => [key, await serializeValue(item)] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

function deserializeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deserializeValue);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.__ikigaiBlob === true && typeof record.data === 'string') {
      const bytes = base64ToBytes(record.data);
      return new Blob([bytes], { type: typeof record.type === 'string' ? record.type : '' });
    }
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, deserializeValue(item)]));
  }
  return value;
}

const legacyCategoryMap: Record<string, string> = {
  ReFlow: 'Projects',
  Python: 'Learning',
  'AI / ML': 'Learning',
  University: 'Study'
};

const legacyPhaseMap: Record<string, string> = {
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

const legacyProjectIds = new Set(['project-reflow', 'project-ikigai']);
const legacyPlanIds = new Set([
  'plan-python-rebuild', 'plan-ai-literacy', 'plan-reflow-alpha', 'plan-oct-exams',
  'plan-reflow-v1', 'plan-applied-ai-proof', 'plan-small-ml-project', 'plan-endsem',
  'plan-reflow-deep-dive', 'plan-portfolio-pass', 'plan-feb-ta', 'plan-internship-push',
  'plan-career-proof', 'plan-midsem',
  'starter-foundation-skill', 'starter-foundation-project', 'starter-protect-first',
  'starter-build-output', 'starter-build-proof', 'starter-quiet', 'starter-deepen',
  'starter-proof-pass', 'starter-opportunity', 'starter-review'
]);

function sanitizeRestoredRecords(tableName: SyncTableName, records: unknown[]) {
  const objects = records.filter((record): record is Record<string, unknown> => Boolean(record && typeof record === 'object' && !Array.isArray(record)));

  if (tableName === 'careerProjects') {
    return objects
      .filter(record => !legacyProjectIds.has(String(record.id ?? '')))
      .map(record => ({
        ...record,
        category: typeof record.category === 'string' ? (legacyCategoryMap[record.category] ?? record.category) : record.category,
        repoUrl: normalizeExternalHttpUrl(typeof record.repoUrl === 'string' ? record.repoUrl : undefined),
        demoUrl: normalizeExternalHttpUrl(typeof record.demoUrl === 'string' ? record.demoUrl : undefined)
      }));
  }

  if (tableName === 'roadmapItems') {
    return objects
      .filter(record => !legacyPlanIds.has(String(record.id ?? '')))
      .map(record => {
        const next = { ...record };
        if (typeof next.phaseId === 'string' && legacyPhaseMap[next.phaseId]) next.phaseId = legacyPhaseMap[next.phaseId];
        if (legacyProjectIds.has(String(next.projectId ?? ''))) delete next.projectId;
        return next;
      });
  }

  if (tableName === 'proofItems') {
    return objects.map(record => {
      const next: Record<string, unknown> = {
        ...record,
        url: normalizeExternalHttpUrl(typeof record.url === 'string' ? record.url : undefined)
      };
      if (legacyProjectIds.has(String(next.projectId ?? ''))) delete next.projectId;
      return next;
    });
  }

  if (tableName === 'careerApplications') {
    return objects.map(record => ({
      ...record,
      sourceUrl: normalizeExternalHttpUrl(typeof record.sourceUrl === 'string' ? record.sourceUrl : undefined)
    }));
  }

  if (tableName === 'memories') {
    return objects.map(record => ({
      ...record,
      linkUrl: normalizeExternalHttpUrl(typeof record.linkUrl === 'string' ? record.linkUrl : undefined)
    }));
  }

  if (tableName === 'memoryAttachments') {
    return objects.map(record => ({
      ...record,
      name: safeFilename(typeof record.name === 'string' ? record.name : undefined, 'Recovered file'),
      mimeType: typeof record.mimeType === 'string' ? record.mimeType.slice(0, 120) : 'application/octet-stream'
    }));
  }

  if (tableName === 'settings') {
    return objects.map(record => ({
      ...record,
      focusAreas: Array.isArray(record.focusAreas)
        ? Array.from(new Set(record.focusAreas.map(value => typeof value === 'string' ? (legacyCategoryMap[value] ?? value) : value)))
        : record.focusAreas
    }));
  }

  if (tableName === 'tasks' || tableName === 'activities' || tableName === 'milestones') {
    return objects.map(record => ({
      ...record,
      category: typeof record.category === 'string' ? (legacyCategoryMap[record.category] ?? record.category) : record.category
    }));
  }

  return objects;
}

function importedPhaseForItems(phaseId: string, items: Array<Partial<RoadmapItem>>, index: number): RoadmapPhase {
  const now = new Date().toISOString();
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
  const targets = items.map(item => item.targetDate).filter((value): value is string => Boolean(value)).sort();
  const known = oldDates[phaseId];
  const startDate = known?.[0] ?? targets[0] ?? now.slice(0, 10);
  const endDate = known?.[1] ?? targets.at(-1) ?? startDate;
  return {
    id: phaseId,
    title: `Imported phase ${index}`,
    startDate,
    endDate,
    mode: 'green',
    intent: 'Preserved from an older backup. Edit this phase to make it yours.',
    note: '',
    source: 'imported',
    createdAt: now,
    updatedAt: now
  };
}

async function sha256(text: string) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function bundlePayload() {
  const state = await ensureSyncState();
  const tables: Partial<Record<SyncTableName, unknown[]>> = {};
  for (const tableName of syncableTables) {
    const records = await db.table(tableName).toArray();
    tables[tableName] = await serializeValue(records) as unknown[];
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appDataVersion: APP_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    sourceDevice: {
      deviceId: state.deviceId,
      deviceName: state.deviceName
    },
    tables
  } as const;
}

export async function createBackupBundle(): Promise<IkigaiBackupBundle> {
  const payload = await bundlePayload();
  const checksum = await sha256(JSON.stringify(payload));
  return { ...payload, checksum };
}

export async function downloadBackup() {
  const bundle = await createBackupBundle();
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date(bundle.exportedAt);
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ikigai-os-backup_${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  await markBackupCreated(bundle.exportedAt);
  return { bundle, bytes: blob.size };
}

function assertBundleShape(value: unknown): asserts value is IkigaiBackupBundle {
  if (!isPlainRecord(value)) throw new Error('This file is not a valid Ikigai backup.');
  const bundle = value as Partial<IkigaiBackupBundle>;
  if (bundle.format !== BACKUP_FORMAT) throw new Error('This file is not an Ikigai backup.');
  if (bundle.formatVersion !== BACKUP_FORMAT_VERSION) throw new Error('This backup format is not supported by this version of Ikigai.');
  if (typeof bundle.schemaVersion !== 'number' || !Number.isInteger(bundle.schemaVersion) || bundle.schemaVersion < 1) throw new Error('The backup is missing valid schema information.');
  if (bundle.schemaVersion > CURRENT_SCHEMA_VERSION) throw new Error('This backup was created by a newer Ikigai data schema. Update the app before restoring it.');
  if (!isIsoTimestamp(bundle.exportedAt)) throw new Error('The backup is missing a valid export timestamp.');
  if (!isPlainRecord(bundle.sourceDevice)) throw new Error('The backup is missing source-device metadata.');
  if (typeof bundle.sourceDevice.deviceId !== 'string' || typeof bundle.sourceDevice.deviceName !== 'string') throw new Error('The backup has invalid source-device metadata.');
  if (!isPlainRecord(bundle.tables)) throw new Error('The backup does not contain valid table data.');
  if (typeof bundle.checksum !== 'string' || !bundle.checksum.trim()) throw new Error('The backup is missing its integrity checksum.');
}

export async function readBackupFile(file: File): Promise<BackupPreview> {
  if (file.size > MAX_BACKUP_FILE_BYTES) throw new Error(`That backup is larger than ${Math.round(MAX_BACKUP_FILE_BYTES / (1024 * 1024))} MB. Ikigai refuses to parse it in one browser process to avoid exhausting device memory.`);
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  assertBundleShape(parsed);
  assertBackupResourceLimits(parsed.tables);

  const { checksum, ...payload } = parsed;
  const actual = await sha256(JSON.stringify(payload));
  if (actual !== checksum) throw new Error('Backup integrity check failed. The file may be incomplete or modified.');

  const inspection = inspectBackupTables(parsed.tables, syncableTables);
  if (inspection.issues.length) {
    const first = describeBackupIssue(inspection.issues[0]);
    const more = inspection.issues.length > 1 ? ` ${inspection.issues.length - 1} more issue${inspection.issues.length === 2 ? '' : 's'} found.` : '';
    throw new Error(`Backup structure check failed — ${first}${more}`);
  }

  return {
    bundle: parsed,
    counts: inspection.counts as Partial<Record<SyncTableName, number>>,
    totalRecords: inspection.totalRecords,
    exportedAt: parsed.exportedAt,
    sourceDeviceName: parsed.sourceDevice.deviceName || 'Unknown device',
    fileBytes: file.size
  };
}

async function prepareRestore(bundle: IkigaiBackupBundle, mode: RestoreMode) {
  const prepared: Partial<Record<SyncTableName, Record<string, unknown>[]>> = {};
  let restoredRecords = 0;

  // Decode and sanitize every table before opening a write transaction. A bad
  // attachment therefore fails before replace mode has a chance to clear data.
  for (const tableName of syncableTables) {
    const serialized = bundle.tables[tableName];
    if (!Array.isArray(serialized) || !serialized.length) {
      prepared[tableName] = [];
      continue;
    }
    const decoded = deserializeValue(serialized) as unknown[];
    const records = sanitizeRestoredRecords(tableName, decoded);
    prepared[tableName] = records;
    restoredRecords += records.length;
  }

  const phaseRecords = (prepared.roadmapPhases ?? []) as unknown as RoadmapPhase[];
  const itemRecords = (prepared.roadmapItems ?? []) as unknown as RoadmapItem[];
  const knownPhaseIds = new Set(phaseRecords.map(phase => phase.id));
  if (mode === 'merge') {
    for (const id of await db.roadmapPhases.toCollection().primaryKeys()) knownPhaseIds.add(String(id));
  }

  const missing = new Map<string, RoadmapItem[]>();
  for (const item of itemRecords) {
    if (!item.phaseId || knownPhaseIds.has(item.phaseId)) continue;
    const group = missing.get(item.phaseId) ?? [];
    group.push(item);
    missing.set(item.phaseId, group);
  }

  let index = phaseRecords.length + 1;
  for (const [phaseId, items] of missing) {
    phaseRecords.push(importedPhaseForItems(phaseId, items, index++));
    knownPhaseIds.add(phaseId);
    restoredRecords += 1;
  }
  prepared.roadmapPhases = phaseRecords as unknown as Record<string, unknown>[];

  return { prepared, restoredRecords, recoveredRoadmapPhases: missing.size };
}

export async function restoreBackup(bundle: IkigaiBackupBundle, mode: RestoreMode): Promise<RestoreResult> {
  assertBundleShape(bundle);
  assertBackupResourceLimits(bundle.tables);
  const { checksum, ...payload } = bundle;
  const actual = await sha256(JSON.stringify(payload));
  if (actual !== checksum) throw new Error('Backup integrity check failed. The file may have changed since it was selected. Nothing was restored.');
  const inspection = inspectBackupTables(bundle.tables, syncableTables);
  if (inspection.issues.length) throw new Error(`Backup structure check failed — ${describeBackupIssue(inspection.issues[0])}`);

  const { prepared, restoredRecords, recoveredRoadmapPhases } = await prepareRestore(bundle, mode);
  const tables = syncableTables.map(tableName => db.table(tableName));

  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      for (const table of tables) await table.clear();
    }

    for (const tableName of syncableTables) {
      const records = prepared[tableName];
      if (!records?.length) continue;
      await db.table(tableName).bulkPut(records);
    }
  });

  // Device identity and transport state are intentionally not restored. These
  // diagnostics are secondary to the user dataset: if rebuilding them fails,
  // the successful atomic restore is still reported as successful.
  let maintenanceWarning: string | undefined;
  try {
    await clearSyncQueue();
    await rebuildSyncManifest();
    await markRestoreCompleted();
  } catch {
    maintenanceWarning = 'Your data was restored, but local sync diagnostics could not be rebuilt. Run “Rebuild diagnostics” from Settings later.';
  }

  return { restoredRecords, recoveredRoadmapPhases, maintenanceWarning };
}
