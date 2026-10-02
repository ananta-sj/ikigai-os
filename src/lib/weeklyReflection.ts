import { db } from '../db';
import { difficultyMeta } from './rewards';
import { toDateKey } from './date';
import type { DayRecord, Milestone, Task, TaskCategory, WeeklyReflection } from '../types';
import { queueSyncChange } from './sync';

export interface WeeklyDaySnapshot {
  date: string;
  completed: number;
  open: number;
  carried: number;
  memo: string;
  status: DayRecord['status'] | 'unrecorded';
}

export interface WeeklySnapshot {
  weekStart: string;
  weekEnd: string;
  completedTasks: Task[];
  scheduledTasks: Task[];
  dayRecords: DayRecord[];
  milestones: Milestone[];
  days: WeeklyDaySnapshot[];
  carriedCount: number;
  leftOpenCount: number;
  growthEarned: number;
  waterEarned: number;
  sunlightEarned: number;
  fertilizerEarned: number;
  memoDays: number;
  activeDays: number;
  categoryCounts: Partial<Record<TaskCategory, number>>;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function addDaysKey(key: string, days: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function weekStartKey(date = new Date()) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const mondayOffset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - mondayOffset);
  return toDateKey(copy);
}

export function weekEndKey(start: string) {
  return addDaysKey(start, 6);
}

export function formatWeekRange(start: string) {
  const a = dateFromKey(start);
  const b = dateFromKey(weekEndKey(start));
  const sameMonth = a.getMonth() === b.getMonth();
  const startText = a.toLocaleDateString('en-IN', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endText = b.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startText} — ${endText}`;
}

function completedDateKey(task: Task) {
  if (!task.completedAt) return '';
  return toDateKey(new Date(task.completedAt));
}

export async function buildWeeklySnapshot(start: string): Promise<WeeklySnapshot> {
  const end = weekEndKey(start);
  const [tasks, dayRecords, milestones] = await Promise.all([
    db.tasks.toArray(),
    db.dayRecords.where('date').between(start, end, true, true).toArray(),
    db.milestones.where('date').between(start, end, true, true).toArray()
  ]);

  const completedTasks = tasks.filter(task => {
    const completed = completedDateKey(task);
    return completed >= start && completed <= end;
  });
  const scheduledTasks = tasks.filter(task => Boolean(task.dueDate && task.dueDate >= start && task.dueDate <= end));
  const recordMap = new Map(dayRecords.map(record => [record.date, record]));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDaysKey(start, index);
    const record = recordMap.get(date);
    const due = scheduledTasks.filter(task => task.dueDate === date);
    const completions = completedTasks.filter(task => completedDateKey(task) === date);

    return {
      date,
      completed: record?.status === 'closed' ? record.completedTaskIds.length : completions.length,
      open: record?.status === 'closed'
        ? record.leftOpenTaskIds.length
        : due.filter(task => !task.completedAt).length,
      carried: record?.carriedTaskIds.length ?? 0,
      memo: record?.memo ?? '',
      status: record?.status ?? 'unrecorded'
    } satisfies WeeklyDaySnapshot;
  });

  const categoryCounts: Partial<Record<TaskCategory, number>> = {};
  let growthEarned = 0;
  let waterEarned = 0;
  let sunlightEarned = 0;
  let fertilizerEarned = 0;
  completedTasks.forEach(task => {
    categoryCounts[task.category] = (categoryCounts[task.category] ?? 0) + 1;
    const reward = difficultyMeta[task.difficulty];
    growthEarned += reward.growth;
    waterEarned += reward.water;
    sunlightEarned += reward.sunlight;
    fertilizerEarned += reward.fertilizer;
  });

  const carriedCount = dayRecords.reduce((sum, record) => sum + record.carriedTaskIds.length, 0);
  const leftOpenCount = dayRecords.reduce((sum, record) => sum + record.leftOpenTaskIds.length, 0);
  const memoDays = dayRecords.filter(record => record.memo.trim()).length;
  const activeDates = new Set<string>();
  completedTasks.forEach(task => activeDates.add(completedDateKey(task)));
  dayRecords.filter(record => record.memo.trim()).forEach(record => activeDates.add(record.date));

  return {
    weekStart: start,
    weekEnd: end,
    completedTasks,
    scheduledTasks,
    dayRecords,
    milestones,
    days,
    carriedCount,
    leftOpenCount,
    growthEarned,
    waterEarned,
    sunlightEarned,
    fertilizerEarned,
    memoDays,
    activeDays: activeDates.size,
    categoryCounts
  };
}

export async function getWeeklyReflection(weekStart: string): Promise<WeeklyReflection> {
  const existing = await db.weeklyReflections.get(weekStart);
  if (existing) return existing;
  return {
    weekStart,
    title: '',
    wins: '',
    friction: '',
    nextFocus: '',
    note: '',
    updatedAt: new Date().toISOString()
  };
}

export async function saveWeeklyReflection(
  weekStart: string,
  patch: Partial<Omit<WeeklyReflection, 'weekStart' | 'updatedAt'>>
): Promise<WeeklyReflection> {
  const current = await getWeeklyReflection(weekStart);
  const next: WeeklyReflection = {
    ...current,
    ...patch,
    weekStart,
    updatedAt: new Date().toISOString()
  };
  await db.weeklyReflections.put(next);
  await queueSyncChange('weeklyReflections', weekStart);
  return next;
}

export function localWeeklySummary(snapshot: WeeklySnapshot) {
  if (snapshot.completedTasks.length === 0 && snapshot.memoDays === 0) {
    return 'This week is still quiet. Empty weeks are data too — nothing here needs to be invented.';
  }

  const topCategory = Object.entries(snapshot.categoryCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const pieces = [
    `You completed ${snapshot.completedTasks.length} ${snapshot.completedTasks.length === 1 ? 'quest' : 'quests'} across ${snapshot.activeDays || 1} active ${snapshot.activeDays === 1 ? 'day' : 'days'}.`,
    snapshot.growthEarned ? `That work earned ${snapshot.growthEarned} garden growth.` : '',
    topCategory ? `${topCategory} received the most completed attention.` : '',
    snapshot.carriedCount ? `${snapshot.carriedCount} unfinished ${snapshot.carriedCount === 1 ? 'task moved' : 'tasks moved'} forward rather than disappearing.` : '',
    snapshot.leftOpenCount ? `${snapshot.leftOpenCount} ${snapshot.leftOpenCount === 1 ? 'task was' : 'tasks were'} left unfinished on their original day.` : '',
    snapshot.memoDays ? `You left notes on ${snapshot.memoDays} ${snapshot.memoDays === 1 ? 'day' : 'days'}.` : ''
  ].filter(Boolean);
  return pieces.join(' ');
}
