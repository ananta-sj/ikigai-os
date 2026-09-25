import type { TaskCategory } from '../types';

export const TASK_CATEGORIES: TaskCategory[] = ['Projects', 'Learning', 'Study', 'Career', 'Health', 'Personal'];

const LEGACY_CATEGORY_MAP: Record<string, TaskCategory> = {
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

export function normalizeTaskCategory(value: unknown): TaskCategory {
  return typeof value === 'string' && LEGACY_CATEGORY_MAP[value]
    ? LEGACY_CATEGORY_MAP[value]
    : 'Personal';
}

export function normalizeTaskCategories(values: unknown): TaskCategory[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(normalizeTaskCategory)));
}
