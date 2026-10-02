import type { FocusTimerMode, FocusTimerState } from '../types';

export const FOCUS_TIMER_MINUTE_MS = 60_000;
export const FOCUS_TIMER_MAX_MINUTES = 240;
export const FOCUS_TIMER_EVENT = 'ikigai-focus-timer-changed';
export const FOCUS_TIMER_CHANNEL = 'ikigai-focus-timer';

export interface FocusTimerPreset {
  id: string;
  label: string;
  mode: FocusTimerMode;
  minutes: number;
}

export const FOCUS_TIMER_PRESETS: readonly FocusTimerPreset[] = Object.freeze([
  { id: 'focus-15', label: '15', mode: 'focus', minutes: 15 },
  { id: 'focus-25', label: '25', mode: 'focus', minutes: 25 },
  { id: 'focus-45', label: '45', mode: 'focus', minutes: 45 },
  { id: 'focus-50', label: '50', mode: 'focus', minutes: 50 },
  { id: 'focus-90', label: '90', mode: 'focus', minutes: 90 },
  { id: 'rest-5', label: '5', mode: 'rest', minutes: 5 },
  { id: 'rest-10', label: '10', mode: 'rest', minutes: 10 },
  { id: 'rest-15', label: '15', mode: 'rest', minutes: 15 },
  { id: 'rest-20', label: '20', mode: 'rest', minutes: 20 }
]);

const clampDurationMinutes = (minutes: number) => Math.min(FOCUS_TIMER_MAX_MINUTES, Math.max(1, Math.round(minutes)));
const iso = (nowMs: number) => new Date(nowMs).toISOString();

export function createDefaultFocusTimerState(nowMs = Date.now()): FocusTimerState {
  return {
    id: 'main',
    mode: 'focus',
    status: 'idle',
    durationMinutes: 25,
    remainingMs: 25 * FOCUS_TIMER_MINUTE_MS,
    intention: '',
    notifyOnComplete: false,
    updatedAt: iso(nowMs)
  };
}

export function focusTimerRemainingMs(state: FocusTimerState, nowMs = Date.now()) {
  if (state.status !== 'running' || !state.endsAt) return Math.max(0, state.remainingMs);
  const endMs = Date.parse(state.endsAt);
  if (!Number.isFinite(endMs)) return Math.max(0, state.remainingMs);
  return Math.max(0, endMs - nowMs);
}

export function focusTimerProgress(state: FocusTimerState, nowMs = Date.now()) {
  const durationMs = Math.max(1, state.durationMinutes * FOCUS_TIMER_MINUTE_MS);
  const remainingMs = Math.min(durationMs, focusTimerRemainingMs(state, nowMs));
  return Math.min(1, Math.max(0, 1 - remainingMs / durationMs));
}

export function formatFocusTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function startFocusTimerState(state: FocusTimerState, nowMs = Date.now()): FocusTimerState {
  if (state.status === 'running') return state;
  const fullDurationMs = clampDurationMinutes(state.durationMinutes) * FOCUS_TIMER_MINUTE_MS;
  const remainingMs = state.status === 'complete' || state.remainingMs <= 0
    ? fullDurationMs
    : Math.min(fullDurationMs, Math.max(1_000, state.remainingMs));
  const freshSession = state.status === 'idle' || state.status === 'complete';
  return {
    ...state,
    status: 'running',
    durationMinutes: clampDurationMinutes(state.durationMinutes),
    remainingMs,
    endsAt: iso(nowMs + remainingMs),
    startedAt: freshSession ? iso(nowMs) : state.startedAt,
    completedAt: undefined,
    completionNoticeHandledAt: undefined,
    updatedAt: iso(nowMs)
  };
}

export function pauseFocusTimerState(state: FocusTimerState, nowMs = Date.now()): FocusTimerState {
  if (state.status !== 'running') return state;
  const remainingMs = focusTimerRemainingMs(state, nowMs);
  if (remainingMs <= 0) return completeFocusTimerState(state, nowMs);
  return {
    ...state,
    status: 'paused',
    remainingMs,
    endsAt: undefined,
    updatedAt: iso(nowMs)
  };
}

export function resetFocusTimerState(state: FocusTimerState, nowMs = Date.now()): FocusTimerState {
  const durationMinutes = clampDurationMinutes(state.durationMinutes);
  return {
    ...state,
    status: 'idle',
    durationMinutes,
    remainingMs: durationMinutes * FOCUS_TIMER_MINUTE_MS,
    endsAt: undefined,
    startedAt: undefined,
    completedAt: undefined,
    completionNoticeHandledAt: undefined,
    updatedAt: iso(nowMs)
  };
}

export function applyFocusTimerPresetState(
  state: FocusTimerState,
  preset: Pick<FocusTimerPreset, 'mode' | 'minutes'>,
  nowMs = Date.now()
): FocusTimerState {
  const durationMinutes = clampDurationMinutes(preset.minutes);
  return {
    ...state,
    mode: preset.mode,
    status: 'idle',
    durationMinutes,
    remainingMs: durationMinutes * FOCUS_TIMER_MINUTE_MS,
    endsAt: undefined,
    startedAt: undefined,
    completedAt: undefined,
    completionNoticeHandledAt: undefined,
    updatedAt: iso(nowMs)
  };
}

export function completeFocusTimerState(state: FocusTimerState, nowMs = Date.now()): FocusTimerState {
  if (state.status !== 'running' || focusTimerRemainingMs(state, nowMs) > 0) return state;
  const completedAt = state.endsAt && Number.isFinite(Date.parse(state.endsAt)) ? state.endsAt : iso(nowMs);
  return {
    ...state,
    status: 'complete',
    remainingMs: 0,
    endsAt: undefined,
    completedAt,
    completionNoticeHandledAt: undefined,
    updatedAt: iso(nowMs)
  };
}

export function focusTimerStatusLabel(state: FocusTimerState) {
  if (state.status === 'complete') return state.mode === 'focus' ? 'Focus complete' : 'Rest complete';
  if (state.status === 'paused') return state.mode === 'focus' ? 'Focus paused' : 'Rest paused';
  if (state.status === 'running') return state.mode === 'focus' ? 'Focusing' : 'Resting';
  return state.mode === 'focus' ? 'Ready to focus' : 'Ready to rest';
}
