import { db } from '../db';
import { difficultyMeta, gardenRewardTotals, initialGardenState, isPlausibleGardenRewardTimestamp } from './rewards';
import type { GardenState, Task } from '../types';
import { queueSyncChange, queueSyncChanges } from './sync';
import { reactFamiliar } from './familiar';

export async function createTask(input: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'gardenRewardedAt'>) {
  const task: Task = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };

  await db.tasks.add(task);
  await queueSyncChange('tasks', task.id);
  return task;
}

function reconciledGarden(existing: GardenState | undefined, rewardHistory: Task[], updatedAt: string): GardenState {
  const minimum = gardenRewardTotals(rewardHistory.map(task => task.difficulty));
  const base = existing ?? initialGardenState();
  return {
    ...base,
    water: Math.max(base.water, minimum.water),
    sunlight: Math.max(base.sunlight, minimum.sunlight),
    fertilizer: Math.max(base.fertilizer, minimum.fertilizer),
    growth: Math.max(base.growth, minimum.growth),
    updatedAt
  };
}

/**
 * Keeps the legacy Garden resource pool compatible with the task history.
 * Reconciliation is monotonic: it can restore missing earned resources but never
 * removes older Garden progress. Existing completed tasks are stamped as already
 * rewarded so reopen -> complete cannot repeatedly mint resources afterwards.
 */
export async function ensureGarden() {
  const now = new Date().toISOString();
  const result = await db.transaction('rw', db.tasks, db.garden, async () => {
    const [existing, tasks] = await Promise.all([db.garden.get('main'), db.tasks.toArray()]);
    const nowDate = new Date(now);
    const rewardHistory = tasks.filter(task => isPlausibleGardenRewardTimestamp(task.gardenRewardedAt, nowDate) || isPlausibleGardenRewardTimestamp(task.completedAt, nowDate));
    const unclaimed = tasks.filter(task => isPlausibleGardenRewardTimestamp(task.completedAt, nowDate) && !task.gardenRewardedAt);
    const nextGarden = reconciledGarden(existing, rewardHistory, existing?.updatedAt ?? now);
    const gardenChanged = !existing
      || nextGarden.water !== existing.water
      || nextGarden.sunlight !== existing.sunlight
      || nextGarden.fertilizer !== existing.fertilizer
      || nextGarden.growth !== existing.growth;

    if (gardenChanged) {
      nextGarden.updatedAt = now;
      await db.garden.put(nextGarden);
    }

    if (unclaimed.length) {
      await Promise.all(unclaimed.map(task => db.tasks.update(task.id, { gardenRewardedAt: task.completedAt ?? now })));
    }

    return { garden: nextGarden, claimedTaskIds: unclaimed.map(task => task.id), gardenChanged };
  });

  const changes = [
    ...(result.gardenChanged ? [{ table: 'garden' as const, recordId: 'main' }] : []),
    ...result.claimedTaskIds.map(recordId => ({ table: 'tasks' as const, recordId }))
  ];
  if (changes.length) await queueSyncChanges(changes);
  return result.garden;
}

export async function completeTask(taskId: string) {
  let didComplete = false;
  let gardenChanged = false;
  let migrationClaimIds: string[] = [];

  const result = await db.transaction('rw', db.tasks, db.garden, async () => {
    const task = await db.tasks.get(taskId);
    if (!task || task.completedAt) return task;

    const completedAt = new Date().toISOString();
    const shouldReward = !task.gardenRewardedAt;
    didComplete = true;
    await db.tasks.update(taskId, {
      completedAt,
      ...(shouldReward ? { gardenRewardedAt: completedAt } : {})
    });

    const [garden, tasks] = await Promise.all([db.garden.get('main'), db.tasks.toArray()]);
    const completedDate = new Date(completedAt);
    const rewardHistory = tasks.filter(candidate => isPlausibleGardenRewardTimestamp(candidate.gardenRewardedAt, completedDate) || isPlausibleGardenRewardTimestamp(candidate.completedAt, completedDate));
    const unclaimed = tasks.filter(candidate => candidate.id !== taskId && isPlausibleGardenRewardTimestamp(candidate.completedAt, completedDate) && !candidate.gardenRewardedAt);
    migrationClaimIds = unclaimed.map(candidate => candidate.id);
    if (unclaimed.length) {
      await Promise.all(unclaimed.map(candidate => db.tasks.update(candidate.id, { gardenRewardedAt: candidate.completedAt ?? completedAt })));
    }

    let nextGarden = reconciledGarden(garden, rewardHistory, garden?.updatedAt ?? completedAt);
    if (garden && shouldReward) {
      const reward = difficultyMeta[task.difficulty];
      nextGarden = {
        ...nextGarden,
        water: Math.max(nextGarden.water, garden.water + reward.water),
        sunlight: Math.max(nextGarden.sunlight, garden.sunlight + reward.sunlight),
        fertilizer: Math.max(nextGarden.fertilizer, garden.fertilizer + reward.fertilizer),
        growth: Math.max(nextGarden.growth, garden.growth + reward.growth),
        updatedAt: completedAt
      };
    }

    gardenChanged = !garden
      || nextGarden.water !== garden.water
      || nextGarden.sunlight !== garden.sunlight
      || nextGarden.fertilizer !== garden.fertilizer
      || nextGarden.growth !== garden.growth;
    if (gardenChanged) await db.garden.put(nextGarden);

    return { ...task, completedAt, gardenRewardedAt: task.gardenRewardedAt ?? completedAt };
  });

  if (result) {
    const changes = [
      { table: 'tasks' as const, recordId: taskId },
      ...(gardenChanged ? [{ table: 'garden' as const, recordId: 'main' }] : []),
      ...migrationClaimIds.map(recordId => ({ table: 'tasks' as const, recordId }))
    ];
    await queueSyncChanges(changes);
    if (didComplete) reactFamiliar('task-completed');
  }
  return result;
}

export async function reopenTask(taskId: string) {
  // Earned Garden resources remain earned. gardenRewardedAt deliberately survives
  // reopening so completing the same task again cannot mint the reward twice.
  await db.tasks.update(taskId, { completedAt: undefined });
  await queueSyncChange('tasks', taskId);
}
