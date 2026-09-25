import { db } from '../db';
import type { GardenState } from '../types';
import { initialGardenState } from './rewards';
import { queueSyncChange } from './sync';

export type GardenCareKind = 'water' | 'sunlight' | 'fertilizer';

export const gardenCareMeta: Record<GardenCareKind, {
  label: string;
  growth: number;
  description: string;
}> = {
  water: {
    label: 'Water',
    growth: 4,
    description: 'Use one drop to strengthen roots.'
  },
  sunlight: {
    label: 'Sunlight',
    growth: 5,
    description: 'Use one sun token to feed the canopy.'
  },
  fertilizer: {
    label: 'Fertilizer',
    growth: 10,
    description: 'Use one fertilizer token for a stronger growth pulse.'
  }
};

export async function applyGardenCare(kind: GardenCareKind): Promise<GardenState | null> {
  const next = await db.transaction('rw', db.garden, async () => {
    let garden = await db.garden.get('main');
    if (!garden) garden = initialGardenState();

    if (garden[kind] <= 0) return null;

    const updated: GardenState = {
      ...garden,
      [kind]: garden[kind] - 1,
      growth: garden.growth + gardenCareMeta[kind].growth,
      updatedAt: new Date().toISOString()
    };

    await db.garden.put(updated);
    return updated;
  });
  if (next) await queueSyncChange('garden', 'main');
  return next;
}
