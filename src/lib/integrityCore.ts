export interface BackupTableIssue {
  table?: string;
  recordIndex?: number;
  message: string;
}

export interface BackupTableInspection {
  issues: BackupTableIssue[];
  counts: Record<string, number>;
  totalRecords: number;
}

export const BACKUP_PRIMARY_KEYS: Record<string, string> = {
  activities: 'id',
  dailyEntries: 'date',
  tasks: 'id',
  garden: 'id',
  settings: 'id',
  dayRecords: 'date',
  milestones: 'id',
  weeklyReflections: 'weekStart',
  memories: 'id',
  memoryAttachments: 'id',
  roadmapPhases: 'id',
  roadmapItems: 'id',
  careerProjects: 'id',
  proofItems: 'id',
  careerApplications: 'id',
  achievementUnlocks: 'id',
  companionMessages: 'id'
};

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function inspectSerializedValue(value: unknown, table: string, recordIndex: number, issues: BackupTableIssue[], depth = 0): void {
  if (depth > 64) {
    issues.push({ table, recordIndex, message: 'Contains data nested too deeply to restore safely.' });
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) inspectSerializedValue(item, table, recordIndex, issues, depth + 1);
    return;
  }

  if (!isPlainRecord(value)) return;

  if (value.__ikigaiBlob === true) {
    if (typeof value.data !== 'string' || value.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)) {
      issues.push({ table, recordIndex, message: 'Contains an invalid serialized attachment.' });
      return;
    }
    if (typeof value.type !== 'string') {
      issues.push({ table, recordIndex, message: 'Contains attachment metadata with an invalid MIME type.' });
    }
    return;
  }

  for (const item of Object.values(value)) inspectSerializedValue(item, table, recordIndex, issues, depth + 1);
}

export function inspectBackupTables(
  tables: unknown,
  allowedTables: readonly string[],
  primaryKeys: Record<string, string> = BACKUP_PRIMARY_KEYS
): BackupTableInspection {
  const issues: BackupTableIssue[] = [];
  const counts: Record<string, number> = {};
  let totalRecords = 0;

  if (!isPlainRecord(tables)) {
    return {
      issues: [{ message: 'Backup table data is missing or malformed.' }],
      counts,
      totalRecords
    };
  }

  for (const table of allowedTables) {
    const value = tables[table];
    if (value === undefined) {
      counts[table] = 0;
      continue;
    }

    if (!Array.isArray(value)) {
      issues.push({ table, message: 'Expected an array of records.' });
      counts[table] = 0;
      continue;
    }

    counts[table] = value.length;
    totalRecords += value.length;
    const keyField = primaryKeys[table];
    const seen = new Set<string>();

    value.forEach((record, index) => {
      if (!isPlainRecord(record)) {
        issues.push({ table, recordIndex: index, message: 'Record is not an object.' });
        return;
      }

      if (keyField) {
        const rawKey = record[keyField];
        if (typeof rawKey !== 'string' || !rawKey.trim()) {
          issues.push({ table, recordIndex: index, message: `Record is missing its ${keyField} primary key.` });
        } else if (seen.has(rawKey)) {
          issues.push({ table, recordIndex: index, message: `Duplicate primary key “${rawKey}”.` });
        } else {
          seen.add(rawKey);
        }
      }

      inspectSerializedValue(record, table, index, issues);
    });
  }

  return { issues, counts, totalRecords };
}

export interface BackupResourceLimits {
  maxRecords: number;
  maxSerializedBlobChars: number;
}

export function inspectBackupResourceLimits(
  tables: unknown,
  allowedTables: readonly string[],
  limits: BackupResourceLimits
): BackupTableIssue[] {
  const issues: BackupTableIssue[] = [];
  if (!isPlainRecord(tables)) return issues;
  let totalRecords = 0;

  const inspect = (value: unknown, table: string, recordIndex: number, depth = 0): void => {
    if (issues.length) return;
    if (depth > 64) {
      issues.push({ table, recordIndex, message: 'Contains data nested too deeply to restore safely.' });
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) inspect(item, table, recordIndex, depth + 1);
      return;
    }
    if (!isPlainRecord(value)) return;
    if (value.__ikigaiBlob === true && typeof value.data === 'string') {
      if (value.data.length > limits.maxSerializedBlobChars) issues.push({ table, recordIndex, message: 'Contains an attachment that is too large to restore safely in one browser process.' });
      return;
    }
    for (const item of Object.values(value)) inspect(item, table, recordIndex, depth + 1);
  };

  for (const table of allowedTables) {
    const records = tables[table];
    if (!Array.isArray(records)) continue;
    totalRecords += records.length;
    if (totalRecords > limits.maxRecords) {
      issues.push({ table, message: `Backup contains more than ${limits.maxRecords.toLocaleString()} records.` });
      break;
    }
    records.forEach((record, index) => inspect(record, table, index));
    if (issues.length) break;
  }

  return issues;
}

export function describeBackupIssue(issue: BackupTableIssue): string {
  const location = issue.table
    ? `${issue.table}${typeof issue.recordIndex === 'number' ? ` record ${issue.recordIndex + 1}` : ''}`
    : 'backup';
  return `${location}: ${issue.message}`;
}
