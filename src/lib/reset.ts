import { db } from '../db';
import { clearSyncQueue, rebuildSyncManifest } from './sync';
import { setCompanionApiKey } from './companion';
import { clearCompanionUi } from './companionUi';
import { clearCompanionDocuments } from './companionDocuments';
import { clearCompanionEndpointTrusts } from './security';
import { clearNowPlayingCredentials } from './nowPlaying';
import { cancelCompanionOperation } from './companionRuntime';

export async function clearCalendarData() {
  await db.transaction(
    'rw',
    [
      db.activities,
      db.dailyEntries,
      db.tasks,
      db.dayRecords,
      db.milestones,
      db.weeklyReflections,
      db.memories
    ],
    async () => {
      await db.memories.toCollection().modify(memory => {
        if (memory.taskId) {
          delete memory.taskId;
          memory.updatedAt = new Date().toISOString();
        }
      });
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
  cancelCompanionOperation();
  // Deleting the Dexie database removes every Ikigai Space table, including Vault
  // attachment blobs, settings, garden state, companion history and sync meta.
  await db.delete();
  // Mounted observers must not query a Dexie instance that reset just deleted.
  setCompanionApiKey('', false, false);
  clearCompanionEndpointTrusts();
  clearCompanionUi();
  clearCompanionDocuments();
  clearNowPlayingCredentials();
}
