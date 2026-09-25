import { db } from '../db';
import type { Milestone } from '../types';
import { queueSyncChange } from './sync';

export async function createMilestone(input: Omit<Milestone, 'id' | 'createdAt'>) {
  const milestone: Milestone = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  await db.milestones.add(milestone);
  await queueSyncChange('milestones', milestone.id);
  return milestone;
}
