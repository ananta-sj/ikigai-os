import type { Activity } from '../types';

export function calculateXP(durationMinutes: number) {
  const focusedBlocks = Math.max(1, Math.round(durationMinutes / 25));
  return Math.min(120, 12 + focusedBlocks * 8);
}

export function totalXP(activities: Activity[]) {
  return activities.reduce((sum, activity) => sum + activity.xp, 0);
}

export function treeStage(xp: number) {
  if (xp >= 1600) return { label: 'Ancient Tree', emoji: '✨🌳', progress: 100 };
  if (xp >= 900) return { label: 'Bloom', emoji: '🌸', progress: ((xp - 900) / 700) * 100 };
  if (xp >= 400) return { label: 'Tree', emoji: '🌳', progress: ((xp - 400) / 500) * 100 };
  if (xp >= 140) return { label: 'Sapling', emoji: '🌿', progress: ((xp - 140) / 260) * 100 };
  return { label: 'Seed', emoji: '🌱', progress: (xp / 140) * 100 };
}
