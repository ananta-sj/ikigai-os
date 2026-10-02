import { db } from '../db';
import type { RoadmapPhase } from '../types';
import { listRoadmapPhases, phaseForDate } from './career';
import { toDateKey } from './date';
import { reflectionHasWriting, roadmapThreadForRange, type RoadmapRangeThread } from './continuityCore';
import { dateFromKey, weekEndKey, weekStartKey } from './weeklyReflection';

export interface DateContinuity {
  dateKey: string;
  weekStart: string;
  weekEnd: string;
  dayPhase: RoadmapPhase | null;
  roadmap: RoadmapRangeThread;
  reflectionStarted: boolean;
  memoryCount: number;
}

export async function loadDateContinuity(dateKey: string): Promise<DateContinuity> {
  const weekStart = weekStartKey(dateFromKey(dateKey));
  const weekEnd = weekEndKey(weekStart);
  const [phases, reflection, memoryCount] = await Promise.all([
    listRoadmapPhases(),
    db.weeklyReflections.get(weekStart),
    db.memories.where('date').equals(dateKey).count()
  ]);

  return {
    dateKey,
    weekStart,
    weekEnd,
    dayPhase: phaseForDate(phases, dateKey) ?? null,
    roadmap: roadmapThreadForRange(phases, weekStart, weekEnd, dateKey),
    reflectionStarted: reflectionHasWriting(reflection),
    memoryCount
  };
}

export async function loadRoadmapThreadForWeek(weekStart: string): Promise<RoadmapRangeThread> {
  const phases = await listRoadmapPhases();
  const weekEnd = weekEndKey(weekStart);
  const middleOfWeek = dateFromKey(weekStart);
  middleOfWeek.setDate(middleOfWeek.getDate() + 3);
  const focusDate = toDateKey(middleOfWeek);
  return roadmapThreadForRange(phases, weekStart, weekEnd, focusDate);
}
