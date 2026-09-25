import { achievementDefinitions } from '../data/achievements';
import { db } from '../db';
import type { AchievementDefinition, AchievementUnlock } from '../types';
import { queueSyncChange, queueSyncChanges } from './sync';

export interface AchievementState {
  unlocked: Array<{ definition: AchievementDefinition; unlock: AchievementUnlock }>;
  locked: AchievementDefinition[];
  newlyUnlocked: Array<{ definition: AchievementDefinition; unlock: AchievementUnlock }>;
}

function localDateFromIso(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function syncAchievements(): Promise<AchievementState> {
  const [tasks, proofItems, reflections, applications, existing] = await Promise.all([
    db.tasks.toArray(),
    db.proofItems.toArray(),
    db.weeklyReflections.toArray(),
    db.careerApplications.toArray(),
    db.achievementUnlocks.toArray()
  ]);

  const completed = tasks.filter(task => Boolean(task.completedAt));
  const completedDates = new Set(completed.map(task => localDateFromIso(task.completedAt)).filter(Boolean));
  const wroteReflection = reflections.some(item => Boolean(item.wins.trim() || item.friction.trim() || item.nextFocus.trim() || item.note.trim()));
  const applied = applications.some(item => ['applied', 'interview', 'offer'].includes(item.status));

  const conditions: Record<string, boolean> = {
    'first-footstep': completed.length >= 1,
    'deep-roots': completed.some(task => task.difficulty === 'hard' || task.difficulty === 'quest'),
    'seven-days-seen': completedDates.size >= 7,
    'proof-exists': proofItems.length >= 1,
    'week-kept': wroteReflection,
    'open-door': applied
  };

  const existingByAchievement = new Map(existing.map(item => [item.achievementId, item]));
  const newlyUnlocked: AchievementState['newlyUnlocked'] = [];

  for (const definition of achievementDefinitions) {
    if (!conditions[definition.id] || existingByAchievement.has(definition.id)) continue;
    const unlock: AchievementUnlock = {
      id: definition.id,
      achievementId: definition.id,
      unlockedAt: new Date().toISOString()
    };
    await db.achievementUnlocks.put(unlock);
    await queueSyncChange('achievementUnlocks', unlock.id);
    existingByAchievement.set(definition.id, unlock);
    newlyUnlocked.push({ definition, unlock });
  }

  const unlocked = achievementDefinitions.flatMap(definition => {
    const unlock = existingByAchievement.get(definition.id);
    return unlock ? [{ definition, unlock }] : [];
  });

  const locked = achievementDefinitions.filter(definition => !existingByAchievement.has(definition.id));
  return { unlocked, locked, newlyUnlocked };
}

export async function markAchievementsSeen(ids: string[]) {
  if (!ids.length) return;
  const seenAt = new Date().toISOString();
  await db.transaction('rw', db.achievementUnlocks, async () => {
    await Promise.all(ids.map(id => db.achievementUnlocks.update(id, { seenAt })));
  });
  await queueSyncChanges(ids.map(id => ({ table: 'achievementUnlocks' as const, recordId: id })));
}
