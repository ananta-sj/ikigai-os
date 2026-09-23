import type { GardenState, TaskDifficulty } from '../types';

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

  const stage = stages.find(item => growth >= item.min && growth < item.max) ?? stages[stages.length - 1];
  const progress = stage.max === Infinity
    ? 100
    : Math.max(0, Math.min(100, ((growth - stage.min) / (stage.max - stage.min)) * 100));

  return { ...stage, progress };
}
