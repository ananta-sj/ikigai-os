import { db } from '../db';
import { clearSyncQueue, rebuildSyncManifest } from './sync';

export async function clearCalendarData() {
  await db.transaction(
    'rw',
    db.activities,
    db.dailyEntries,
    db.tasks,
    db.dayRecords,
    db.milestones,
    db.weeklyReflections,
    async () => {
      await Promise.all([
        db.activities.clear(),
        db.dailyEntries.clear(),
        db.tasks.clear(),
        db.dayRecords.clear(),
        db.milestones.clear(),
        db.weeklyReflections.clear()
      ]);
    }
  );

  // Sync transport is still off, but stale queued task/day mutations would make
  // diagnostics misleading. Re-baseline the remaining local dataset instead.
  await clearSyncQueue();
  await rebuildSyncManifest();
}

export async function resetIkigaiCompletely() {
  // Deleting the Dexie database removes every Ikigai table, including Vault
  // attachment blobs, settings, garden state, companion history and sync meta.
  await db.delete();
}
