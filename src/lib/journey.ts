import { db } from '../db';
import { toDateKey } from './date';
import type { DayRecord, Milestone, Task } from '../types';

export type JourneyDayState = 'closed' | 'open-past' | 'today' | 'future' | 'quiet';

export interface JourneyDaySnapshot {
  date: string;
  day: number;
  inMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  state: JourneyDayState;
  record?: DayRecord;
  scheduledTasks: Task[];
  completedHere: Task[];
  recordCompletedTasks: Task[];
  carriedTasks: Task[];
  leftOpenTasks: Task[];
  milestones: Milestone[];
  memo: string;
  completedCount: number;
  openCount: number;
  carriedCount: number;
  leftOpenCount: number;
  hasEvidence: boolean;
}

export interface JourneyMonthSnapshot {
  year: number;
  month: number;
  monthKey: string;
  label: string;
  days: JourneyDaySnapshot[];
  closedDays: number;
  waitingDays: number;
  completedTasks: number;
  carriedTasks: number;
  leftOpenTasks: number;
  memoDays: number;
  milestoneCount: number;
  activeDays: number;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1, 12));
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0);
}

export function weekStartFromKey(key: string) {
  const date = dateFromKey(key);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toDateKey(date);
}

function completedDate(task: Task) {
  return task.completedAt ? toDateKey(new Date(task.completedAt)) : '';
}

function uniqueTasks(tasks: Task[]) {
  const seen = new Set<string>();
  return tasks.filter(task => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}


export async function buildJourneyMonth(cursor: Date): Promise<JourneyMonthSnapshot> {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = toDateKey();

  // Monday-first six-week calendar, including adjacent-month days.
  const first = new Date(year, month, 1, 12, 0, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset, 12, 0, 0);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  const startKey = toDateKey(gridStart);
  const endKey = toDateKey(gridEnd);

  const [tasks, records, milestones] = await Promise.all([
    db.tasks.toArray(),
    db.dayRecords.where('date').between(startKey, endKey, true, true).toArray(),
    db.milestones.where('date').between(startKey, endKey, true, true).toArray()
  ]);

  const taskMap = new Map(tasks.map(task => [task.id, task]));
  const recordMap = new Map(records.map(record => [record.date, record]));
  const scheduledMap = new Map<string, Task[]>();
  const completionMap = new Map<string, Task[]>();
  const milestoneMap = new Map<string, Milestone[]>();

  tasks.forEach(task => {
    if (task.dueDate && task.dueDate >= startKey && task.dueDate <= endKey) {
      scheduledMap.set(task.dueDate, [...(scheduledMap.get(task.dueDate) ?? []), task]);
    }
    const done = completedDate(task);
    if (done && done >= startKey && done <= endKey) {
      completionMap.set(done, [...(completionMap.get(done) ?? []), task]);
    }
  });
  milestones.forEach(item => milestoneMap.set(item.date, [...(milestoneMap.get(item.date) ?? []), item]));

  const days: JourneyDaySnapshot[] = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateKey(date);
    const record = recordMap.get(key);
    const scheduled = scheduledMap.get(key) ?? [];
    const completedByTimestamp = completionMap.get(key) ?? [];
    const completedFromRecord = (record?.completedTaskIds ?? []).map(id => taskMap.get(id)).filter((task): task is Task => Boolean(task));
    const recordCompletedTasks = uniqueTasks(completedFromRecord);
    const carriedTasks = uniqueTasks((record?.carriedTaskIds ?? []).map(id => taskMap.get(id)).filter((task): task is Task => Boolean(task)));
    const leftOpenTasks = uniqueTasks((record?.leftOpenTaskIds ?? []).map(id => taskMap.get(id)).filter((task): task is Task => Boolean(task)));
    const completedHere = uniqueTasks([...completedFromRecord, ...completedByTimestamp]);
    const closed = record?.status === 'closed';
    const completedCount = closed ? record.completedTaskIds.length : completedHere.length;
    const openCount = closed
      ? record.leftOpenTaskIds.length
      : scheduled.filter(task => !task.completedAt).length;
    const memo = record?.memo ?? '';
    const milestoneList = milestoneMap.get(key) ?? [];
    const hasEvidence = Boolean(scheduled.length || completedHere.length || milestoneList.length || memo.trim() || record);
    const state: JourneyDayState = closed
      ? 'closed'
      : key === today
        ? 'today'
        : key > today
          ? 'future'
          : hasEvidence
            ? 'open-past'
            : 'quiet';

    return {
      date: key,
      day: date.getDate(),
      inMonth: date.getFullYear() === year && date.getMonth() === month,
      isPast: key < today,
      isToday: key === today,
      isFuture: key > today,
      state,
      record,
      scheduledTasks: scheduled,
      completedHere,
      recordCompletedTasks,
      carriedTasks,
      leftOpenTasks,
      milestones: milestoneList,
      memo,
      completedCount,
      openCount,
      carriedCount: record?.carriedTaskIds.length ?? 0,
      leftOpenCount: record?.leftOpenTaskIds.length ?? 0,
      hasEvidence
    };
  });

  const monthDays = days.filter(day => day.inMonth);
  const monthCompleted = tasks.filter(task => {
    const done = completedDate(task);
    return done.startsWith(`${monthKey(year, month)}-`);
  }).length;
  const monthRecords = records.filter(record => record.date.startsWith(`${monthKey(year, month)}-`));
  const activeDateSet = new Set<string>();
  monthDays.forEach(day => { if (day.hasEvidence) activeDateSet.add(day.date); });

  return {
    year,
    month,
    monthKey: monthKey(year, month),
    label: monthLabel(year, month),
    days,
    closedDays: monthRecords.filter(record => record.status === 'closed').length,
    waitingDays: monthDays.filter(day => day.state === 'open-past').length,
    completedTasks: monthCompleted,
    carriedTasks: monthRecords.reduce((sum, record) => sum + record.carriedTaskIds.length, 0),
    leftOpenTasks: monthRecords.reduce((sum, record) => sum + record.leftOpenTaskIds.length, 0),
    memoDays: monthRecords.filter(record => record.memo.trim()).length,
    milestoneCount: milestones.filter(item => item.date.startsWith(`${monthKey(year, month)}-`)).length,
    activeDays: activeDateSet.size
  };
}

export async function buildYearActivity(year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const [tasks, records, milestones] = await Promise.all([
    db.tasks.toArray(),
    db.dayRecords.where('date').between(start, end, true, true).toArray(),
    db.milestones.where('date').between(start, end, true, true).toArray()
  ]);

  return Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const completed = tasks.filter(task => completedDate(task).startsWith(prefix)).length;
    const monthRecords = records.filter(record => record.date.startsWith(prefix));
    const monthMilestones = milestones.filter(item => item.date.startsWith(prefix)).length;
    const score = completed
      + monthRecords.filter(record => record.memo.trim()).length
      + monthRecords.filter(record => record.status === 'closed').length
      + monthMilestones;
    return { month, completed, closed: monthRecords.filter(record => record.status === 'closed').length, milestones: monthMilestones, score };
  });
}
