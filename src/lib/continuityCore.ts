import type { RoadmapPhase, WeeklyReflection } from '../types';

export interface RoadmapRangeThread {
  kind: 'none' | 'single' | 'transition' | 'overlap';
  phases: RoadmapPhase[];
  primary: RoadmapPhase | null;
}

export function reflectionHasWriting(reflection: WeeklyReflection | null | undefined) {
  if (!reflection) return false;
  return [reflection.title, reflection.wins, reflection.friction, reflection.nextFocus, reflection.note]
    .some(value => value.trim().length > 0);
}

export function roadmapThreadForRange(
  phases: RoadmapPhase[],
  startDate: string,
  endDate: string,
  focusDate = startDate
): RoadmapRangeThread {
  const overlapping = phases
    .filter(phase => phase.startDate <= endDate && phase.endDate >= startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate) || a.title.localeCompare(b.title));

  if (!overlapping.length) return { kind: 'none', phases: [], primary: null };

  const primary = overlapping.find(phase => phase.startDate <= focusDate && phase.endDate >= focusDate) ?? overlapping[0];
  if (overlapping.length === 1) return { kind: 'single', phases: overlapping, primary };

  const sequential = overlapping.every((phase, index) => index === 0 || overlapping[index - 1].endDate < phase.startDate);
  return { kind: sequential ? 'transition' : 'overlap', phases: overlapping, primary };
}
