export type TaskCategory =
  | 'ReFlow'
  | 'Python'
  | 'AI / ML'
  | 'University'
  | 'Career'
  | 'Personal';

export type TaskDifficulty = 'small' | 'normal' | 'hard' | 'quest';

// Legacy alias retained so the v0.1 prototype component still type-checks.
export type ActivityCategory = TaskCategory;

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  projectId?: string;
  createdAt: string;
  completedAt?: string;
}

// Kept for compatibility with the v0.1 prototype. We are no longer using
// activities as the primary progress model; tasks now drive progress.
export interface Activity {
  id: string;
  date: string;
  category: TaskCategory;
  title: string;
  note?: string;
  durationMinutes: number;
  xp: number;
  createdAt: string;
}

export interface DailyEntry {
  date: string;
  energy?: number;
  mood?: string;
  tomorrowPriority?: string;
  status?: 'meaningful' | 'partial' | 'missed' | 'exceptional' | 'recovery';
  updatedAt: string;
}

export interface GardenState {
  id: 'main';
  seedType: string;
  water: number;
  sunlight: number;
  fertilizer: number;
  growth: number;
  plantedAt: string;
  updatedAt: string;
}
