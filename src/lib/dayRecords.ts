import { db } from '../db';
import { toDateKey } from './date';
import type { DayRecord, Task } from '../types';
import { queueSyncChange, queueSyncChanges } from './sync';

function addDaysToKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day + days, 12, 0, 0);
  return toDateKey(date);
}

export function canTearDate(dateKey: string, now = new Date()) {
  // A page only becomes tearable once its calendar day has completely ended.
  // Comparing YYYY-MM-DD keys gives the exact local-midnight boundary we need.
  return dateKey < toDateKey(now);
}

export async function getDayRecord(date: string): Promise<DayRecord> {
  const existing = await db.dayRecords.get(date);
  if (existing) {
    return {
      completedTaskIds: [],
      carriedTaskIds: [],
      leftOpenTaskIds: [],
      ...existing
    };
  }

  return {
    date,
    memo: '',
    status: 'open',
    completedTaskIds: [],
    carriedTaskIds: [],
    leftOpenTaskIds: [],
    updatedAt: new Date().toISOString()
  };
}

export async function saveDayMemo(date: string, memo: string): Promise<DayRecord> {
  const current = await getDayRecord(date);
  if (current.status === 'closed') return current;

  const next: DayRecord = {
    ...current,
    memo,
    updatedAt: new Date().toISOString()
  };
  await db.dayRecords.put(next);
  await queueSyncChange('dayRecords', date);
  return next;
}

/**
 * Permanently seal one calendar page.
 *
 * The operation is intentionally one-way. Once torn, a day is historical.
 * Selected unfinished tasks can be carried to the next calendar day before
 * the DayRecord is committed.
 */
export async function closeDay(
  date: string,
  tasks: Task[],
  carryTaskIds: string[]
): Promise<DayRecord> {
  if (!canTearDate(date)) {
    throw new Error('This page cannot be torn until the day has ended.');
  }

  const now = new Date().toISOString();
  const tomorrow = addDaysToKey(date, 1);
  const completedTaskIds = tasks.filter(task => Boolean(task.completedAt)).map(task => task.id);
  const unfinished = tasks.filter(task => !task.completedAt);
  const unfinishedIds = new Set(unfinished.map(task => task.id));
  const carriedTaskIds = carryTaskIds.filter(id => unfinishedIds.has(id));
  const carried = new Set(carriedTaskIds);
  const leftOpenTaskIds = unfinished.filter(task => !carried.has(task.id)).map(task => task.id);

  const result = await db.transaction('rw', db.dayRecords, db.tasks, async () => {
    const existing = await db.dayRecords.get(date);
    if (existing?.status === 'closed') return existing as DayRecord;

    await Promise.all(
      carriedTaskIds.map(taskId => db.tasks.update(taskId, { dueDate: tomorrow }))
    );

    const current = existing ?? await getDayRecord(date);
    const next: DayRecord = {
      ...current,
      status: 'closed',
      closedAt: now,
      completedTaskIds,
      carriedTaskIds,
      leftOpenTaskIds,
      updatedAt: now
    };

    await db.dayRecords.put(next);
    return next;
  });
  await queueSyncChanges([
    { table: 'dayRecords', recordId: date },
    ...carriedTaskIds.map(recordId => ({ table: 'tasks' as const, recordId }))
  ]);
  return result;
}

/**
 * Resolve the page that should physically be sitting on top of the calendar.
 * An older open page always wins over today's page. This creates a natural
 * catch-up ritual after a day (or several days) away from the app.
 */

/**
 * Development migration: older prototypes allowed today's sheet to be closed
 * before midnight. v0.3.3 removes that behavior permanently. If such a legacy
 * record exists, restore it once so the new midnight rule can take over.
 */
export async function repairPrematureClosures(today: string) {
  const records = await db.dayRecords.toArray();
  const premature = records.filter(record => record.status === 'closed' && record.date >= today);
  if (!premature.length) return;

  await db.transaction('rw', db.dayRecords, db.tasks, async () => {
    for (const record of premature) {
      await Promise.all((record.carriedTaskIds ?? []).map(taskId => db.tasks.update(taskId, { dueDate: record.date })));
      await db.dayRecords.put({
        ...record,
        status: 'open',
        closedAt: undefined,
        completedTaskIds: [],
        carriedTaskIds: [],
        leftOpenTaskIds: [],
        updatedAt: new Date().toISOString()
      });
    }
  });
  await queueSyncChanges([
    ...premature.map(record => ({ table: 'dayRecords' as const, recordId: record.date })),
    ...premature.flatMap(record => (record.carriedTaskIds ?? []).map(recordId => ({ table: 'tasks' as const, recordId })))
  ]);
}

export async function resolveActivePaperDate(today: string, tasks: Task[]) {
  const records = await db.dayRecords.orderBy('date').toArray();
  const oldestOpenPast = records
    .filter(record => record.status === 'open' && record.date < today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (oldestOpenPast) return oldestOpenPast.date;

  // If an old task exists but that day's page was never instantiated, surface
  // that date so it can still be acknowledged and carried forward properly.
  const historicalTaskDates = Array.from(new Set(
    tasks
      .map(task => task.dueDate)
      .filter((date): date is string => Boolean(date && date < today))
  )).sort();

  for (const date of historicalTaskDates) {
    const record = await db.dayRecords.get(date);
    if (!record || record.status !== 'closed') return date;
  }

  return today;
}
