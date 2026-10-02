import { db } from '../db';
import type { FocusTimerState } from '../types';
import {
  FOCUS_TIMER_CHANNEL,
  FOCUS_TIMER_EVENT,
  applyFocusTimerPresetState,
  completeFocusTimerState,
  createDefaultFocusTimerState,
  pauseFocusTimerState,
  resetFocusTimerState,
  startFocusTimerState,
  type FocusTimerPreset
} from './focusTimerCore';

let broadcastChannel: BroadcastChannel | null | undefined;

function getBroadcastChannel() {
  if (broadcastChannel !== undefined) return broadcastChannel;
  if (typeof BroadcastChannel === 'undefined') {
    broadcastChannel = null;
    return broadcastChannel;
  }
  try {
    broadcastChannel = new BroadcastChannel(FOCUS_TIMER_CHANNEL);
  } catch {
    broadcastChannel = null;
  }
  return broadcastChannel;
}

function announceFocusTimer(state: FocusTimerState) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<FocusTimerState>(FOCUS_TIMER_EVENT, { detail: state }));
  }
  try {
    getBroadcastChannel()?.postMessage(state);
  } catch {
    // Persistence already succeeded; cross-tab mirroring is best-effort only.
  }
}

export function subscribeFocusTimer(listener: (state: FocusTimerState) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onLocal = (event: Event) => {
    const state = (event as CustomEvent<FocusTimerState>).detail;
    if (state?.id === 'main') listener(state);
  };
  const channel = getBroadcastChannel();
  const onBroadcast = (event: MessageEvent<FocusTimerState>) => {
    if (event.data?.id === 'main') listener(event.data);
  };
  window.addEventListener(FOCUS_TIMER_EVENT, onLocal);
  channel?.addEventListener('message', onBroadcast);
  return () => {
    window.removeEventListener(FOCUS_TIMER_EVENT, onLocal);
    channel?.removeEventListener('message', onBroadcast);
  };
}

export async function ensureFocusTimerState() {
  const existing = await db.focusTimer.get('main');
  if (existing) return existing;
  const initial = createDefaultFocusTimerState();
  await db.focusTimer.put(initial);
  announceFocusTimer(initial);
  return initial;
}

async function mutateFocusTimer(mutator: (current: FocusTimerState) => FocusTimerState) {
  const next = await db.transaction('rw', db.focusTimer, async () => {
    const current = await db.focusTimer.get('main') ?? createDefaultFocusTimerState();
    const updated = mutator(current);
    if (updated !== current) await db.focusTimer.put(updated);
    return updated;
  });
  announceFocusTimer(next);
  return next;
}

export function startFocusTimer(nowMs = Date.now()) {
  return mutateFocusTimer(current => startFocusTimerState(current, nowMs));
}

export function pauseFocusTimer(nowMs = Date.now()) {
  return mutateFocusTimer(current => pauseFocusTimerState(current, nowMs));
}

export function resetFocusTimer(nowMs = Date.now()) {
  return mutateFocusTimer(current => resetFocusTimerState(current, nowMs));
}

export function applyFocusTimerPreset(preset: Pick<FocusTimerPreset, 'mode' | 'minutes'>, nowMs = Date.now()) {
  return mutateFocusTimer(current => applyFocusTimerPresetState(current, preset, nowMs));
}

export function updateFocusTimerIntention(intention: string) {
  return mutateFocusTimer(current => ({
    ...current,
    intention: intention.slice(0, 160),
    updatedAt: new Date().toISOString()
  }));
}

export function updateFocusTimerNotifications(notifyOnComplete: boolean) {
  return mutateFocusTimer(current => ({
    ...current,
    notifyOnComplete,
    updatedAt: new Date().toISOString()
  }));
}

export async function settleFocusTimer(nowMs = Date.now()) {
  let completed = false;
  const state = await mutateFocusTimer(current => {
    const next = completeFocusTimerState(current, nowMs);
    completed = next !== current && next.status === 'complete';
    return next;
  });
  return { state, completed };
}

export async function claimFocusCompletionNotice(completedAt: string) {
  let claimed = false;
  const state = await mutateFocusTimer(current => {
    if (current.status !== 'complete' || current.completedAt !== completedAt || current.completionNoticeHandledAt) return current;
    claimed = true;
    const handledAt = new Date().toISOString();
    return {
      ...current,
      completionNoticeHandledAt: handledAt,
      updatedAt: handledAt
    };
  });
  return { state, claimed };
}

export type FocusNotificationPermission = NotificationPermission | 'unsupported';

export function focusNotificationPermission(): FocusNotificationPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function enableFocusNotifications() {
  if (typeof Notification === 'undefined') return 'unsupported' as const;
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;
  await updateFocusTimerNotifications(permission === 'granted');
  return permission;
}

export async function showFocusCompletionNotification(state: FocusTimerState) {
  if (!state.notifyOnComplete || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const title = state.mode === 'focus' ? 'Focus session complete' : 'Rest timer complete';
  const options: NotificationOptions = {
    body: state.mode === 'focus' ? 'Your focus block has ended.' : 'Your rest block has ended.',
    tag: 'ikigai-focus-complete'
  };

  try {
    new Notification(title, options);
    return true;
  } catch {
    // Some mobile browsers only allow notifications through a service worker.
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    } catch {
      // The timer remains complete even if the browser cannot surface a notice.
    }
  }
  return false;
}
