import type { GardenState, Task, TaskDifficulty } from '../types';

export const difficultyMeta: Record<TaskDifficulty, {
  label: string;
  description: string;
  growth: number;
  water: number;
  sunlight: number;
  fertilizer: number;
}> = {
  small: {
    label: 'Small',
    description: 'A quick win.',
    growth: 8,
    water: 1,
    sunlight: 0,
    fertilizer: 0
  },
  normal: {
    label: 'Normal',
    description: 'Meaningful everyday work.',
    growth: 18,
    water: 1,
    sunlight: 1,
    fertilizer: 0
  },
  hard: {
    label: 'Hard',
    description: 'Deep work or a difficult problem.',
    growth: 36,
    water: 2,
    sunlight: 1,
    fertilizer: 1
  },
  quest: {
    label: 'Quest',
    description: 'A milestone worth remembering.',
    growth: 70,
    water: 2,
    sunlight: 2,
    fertilizer: 2
  }
};


export interface GardenRewardTotals {
  growth: number;
  water: number;
  sunlight: number;
  fertilizer: number;
}

export function gardenRewardTotals(difficulties: readonly TaskDifficulty[]): GardenRewardTotals {
  return difficulties.reduce<GardenRewardTotals>((total, difficulty) => {
    const reward = difficultyMeta[difficulty];
    return {
      growth: total.growth + reward.growth,
      water: total.water + reward.water,
      sunlight: total.sunlight + reward.sunlight,
      fertilizer: total.fertilizer + reward.fertilizer
    };
  }, { growth: 0, water: 0, sunlight: 0, fertilizer: 0 });
}

const GARDEN_REWARD_FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000;

export function isPlausibleGardenRewardTimestamp(value: string | undefined, now = new Date()) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime() + GARDEN_REWARD_FUTURE_TOLERANCE_MS;
}

/**
 * Returns the difficulties that have evidence of already earning Garden credit.
 * A valid gardenRewardedAt survives task reopening, while completedAt lets legacy
 * pre-ledger completions be reconciled exactly once. Malformed/far-future dates do
 * not silently inflate the Sanctuary.
 */
export function gardenRewardHistoryDifficulties(
  tasks: readonly Pick<Task, 'difficulty' | 'completedAt' | 'gardenRewardedAt'>[],
  now = new Date()
): TaskDifficulty[] {
  return tasks.flatMap(task => (
    isPlausibleGardenRewardTimestamp(task.gardenRewardedAt, now)
    || isPlausibleGardenRewardTimestamp(task.completedAt, now)
  ) ? [task.difficulty] : []);
}

export function initialGardenState(): GardenState {
  const now = new Date().toISOString();
  return {
    id: 'main',
    seedType: 'first-seed',
    water: 0,
    sunlight: 0,
    fertilizer: 0,
    growth: 0,
    plantedAt: now,
    updatedAt: now
  };
}

export function plantStage(growth: number) {
  const safeGrowth = Number.isFinite(growth) && growth >= 0 ? growth : 0;
  const stages = [
    { min: 0, max: 20, label: 'Dormant Seed', emoji: '🫘' },
    { min: 20, max: 50, label: 'Awakening Seed', emoji: '🌰' },
    { min: 50, max: 105, label: 'Sprout', emoji: '🌱' },
    { min: 105, max: 180, label: 'Young Plant', emoji: '🌿' },
    { min: 180, max: 300, label: 'Sapling', emoji: '🪴' },
    { min: 300, max: 500, label: 'Young Tree', emoji: '🌳' },
    { min: 500, max: 800, label: 'Mature Tree', emoji: '🌲' },
    { min: 800, max: Infinity, label: 'Bloom', emoji: '🌸' }
  ];

  const stage = stages.find(item => safeGrowth >= item.min && safeGrowth < item.max) ?? stages[stages.length - 1];
  const progress = stage.max === Infinity
    ? 100
    : Math.max(0, Math.min(100, ((safeGrowth - stage.min) / (stage.max - stage.min)) * 100));

  return { ...stage, progress };
}
