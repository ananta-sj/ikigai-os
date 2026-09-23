import Dexie, { type Table } from 'dexie';
import type { Activity, DailyEntry, GardenState, Task } from './types';

export class IkigaiDB extends Dexie {
  activities!: Table<Activity, string>;
  dailyEntries!: Table<DailyEntry, string>;
  tasks!: Table<Task, string>;
  garden!: Table<GardenState, string>;

  constructor() {
    super('ikigai-os');

    this.version(1).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt'
    });

    // v0.2: tasks become the source of truth for daily progress.
    // v0.1 tables stay intact so prototype data is not deleted.
    this.version(2).stores({
      activities: 'id, date, category, createdAt',
      dailyEntries: 'date, status, updatedAt',
      tasks: 'id, dueDate, completedAt, category, difficulty, createdAt',
      garden: 'id, updatedAt'
    });
  }
}

export const db = new IkigaiDB();
