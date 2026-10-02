import type { DayRecord, Task } from '../types';

export function shouldAutoOpenMorningHandoff({
  activeDate,
  today,
  status,
  enabled,
  lastSeenDay
}: {
  activeDate: string;
  today: string;
  status: DayRecord['status'];
  enabled: boolean;
  lastSeenDay: string | null;
}) {
  return Boolean(enabled && status === 'open' && activeDate < today && lastSeenDay !== today);
}

export function defaultCarryIds(tasks: Task[]) {
  return tasks.filter(task => !task.completedAt).map(task => task.id);
}

export function handoffSummary(tasks: Task[]) {
  const completed = tasks.filter(task => Boolean(task.completedAt)).length;
  const unfinished = tasks.length - completed;
  return { completed, unfinished, total: tasks.length };
}
