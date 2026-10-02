import { useEffect, useMemo, useState } from 'react';
import { ensureFocusTimerState, subscribeFocusTimer } from '../lib/focusTimer';
import { focusTimerProgress, focusTimerRemainingMs } from '../lib/focusTimerCore';
import type { FocusTimerState } from '../types';

export function useFocusTimer() {
  const [state, setState] = useState<FocusTimerState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    void ensureFocusTimerState().then(value => { if (alive) setState(value); });
    const unsubscribe = subscribeFocusTimer(value => { if (alive) setState(value); });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state?.status !== 'running') return;
    const update = () => setNowMs(Date.now());
    update();
    const timer = window.setInterval(update, 500);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, [state?.status, state?.endsAt]);

  const remainingMs = useMemo(() => state ? focusTimerRemainingMs(state, nowMs) : 0, [state, nowMs]);
  const progress = useMemo(() => state ? focusTimerProgress(state, nowMs) : 0, [state, nowMs]);
  return { state, remainingMs, progress, nowMs };
}
