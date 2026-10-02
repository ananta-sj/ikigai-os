import type { Milestone, MilestoneKind, TaskCategory } from '../types';
function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export interface OnboardingDateDraft {
  title: string;
  date: string;
  kind: MilestoneKind;
  category: TaskCategory;
}

export function prepareOnboardingMilestones(
  drafts: readonly OnboardingDateDraft[],
  createdAt: string,
  makeId: () => string
): Milestone[] {
  return drafts.flatMap(draft => {
    const title = draft.title.trim();
    if (!title || !isValidDateKey(draft.date)) return [];
    return [{
      id: makeId(),
      title,
      date: draft.date,
      kind: draft.kind,
      category: draft.category,
      createdAt
    }];
  });
}
