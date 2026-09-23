import { db } from '../db';
import { difficultyMeta, initialGardenState } from './rewards';
import type { GardenState, Task } from '../types';

export async function createTask(input: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) {
  const task: Task = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  await db.tasks.add(task);
  return task;
}

export async function ensureGarden() {
  let garden = await db.garden.get('main');
  if (!garden) {
    garden = initialGardenState();
    await db.garden.put(garden);
  }
  return garden;
}

export async function completeTask(taskId: string) {
  return db.transaction('rw', db.tasks, db.garden, async () => {
    const task = await db.tasks.get(taskId);
    if (!task || task.completedAt) return task;

    const reward = difficultyMeta[task.difficulty];
    const completedAt = new Date().toISOString();
    await db.tasks.update(taskId, { completedAt });

    let garden = await db.garden.get('main');
    if (!garden) garden = initialGardenState();

    const nextGarden: GardenState = {
      ...garden,
      water: garden.water + reward.water,
      sunlight: garden.sunlight + reward.sunlight,
      fertilizer: garden.fertilizer + reward.fertilizer,
      growth: garden.growth + reward.growth,
      updatedAt: completedAt
    };

    await db.garden.put(nextGarden);
    return { ...task, completedAt };
  });
}

export async function reopenTask(taskId: string) {
  // Reopening intentionally does not subtract resources in v0.2. We will add
  // an auditable reward ledger before allowing reversible reward accounting.
  await db.tasks.update(taskId, { completedAt: undefined });
}
