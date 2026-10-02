import type { JourneyDayState } from './journey';

export type MonthFlipIntent = -1 | 0 | 1;

/**
 * Translate a deliberate horizontal paper pull into month navigation.
 * Positive x reveals the previous sheet; negative x reveals the next sheet.
 */
export function monthFlipIntent(offsetX: number, velocityX = 0): MonthFlipIntent {
  const distanceThreshold = 74;
  const velocityThreshold = 520;
  if (offsetX >= distanceThreshold || velocityX >= velocityThreshold) return -1;
  if (offsetX <= -distanceThreshold || velocityX <= -velocityThreshold) return 1;
  return 0;
}

export function canPlanJourneyDay(dateKey: string, todayKey: string, state: JourneyDayState) {
  return state !== 'closed' && dateKey >= todayKey;
}

export function journeyDayStateLabel(state: JourneyDayState) {
  switch (state) {
    case 'closed': return 'Archived day';
    case 'open-past': return 'Needs handoff';
    case 'today': return 'Today';
    case 'future': return 'Planned day';
    default: return 'Quiet day';
  }
}
