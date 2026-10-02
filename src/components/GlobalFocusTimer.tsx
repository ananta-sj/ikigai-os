import { Pause, Play, TimerReset } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFocusTimer } from '../hooks/useFocusTimer';
import {
  claimFocusCompletionNotice,
  pauseFocusTimer,
  settleFocusTimer,
  showFocusCompletionNotification,
  startFocusTimer
} from '../lib/focusTimer';
import { formatFocusTimer, focusTimerStatusLabel } from '../lib/focusTimerCore';
import '../focus-v029.css';

export function GlobalFocusTimer() {
  const location = useLocation();
  const { state, remainingMs } = useFocusTimer();
  const settlingRef = useRef(false);
  const noticeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state || state.status !== 'running' || remainingMs > 0 || settlingRef.current) return;
    settlingRef.current = true;
    void settleFocusTimer().finally(() => {
      settlingRef.current = false;
    });
  }, [state, remainingMs]);

  useEffect(() => {
    if (!state?.completedAt || state.completionNoticeHandledAt || state.status !== 'complete') return;
    if (noticeRef.current === state.completedAt) return;
    noticeRef.current = state.completedAt;
    void claimFocusCompletionNotice(state.completedAt).then(result => {
      if (result.claimed) void showFocusCompletionNotification(result.state);
    });
  }, [state]);

  if (!state || location.pathname === '/focus' || (state.status !== 'running' && state.status !== 'paused')) return null;

  const running = state.status === 'running';
  return (
    <aside className="focus029-global" aria-label={`${focusTimerStatusLabel(state)} · ${formatFocusTimer(remainingMs)}`}>
      <Link to="/focus" className="focus029-global-main">
        <TimerReset size={15} aria-hidden="true" />
        <span>
          <small>{state.mode === 'focus' ? 'FOCUS' : 'REST'}{state.status === 'paused' ? ' · PAUSED' : ''}</small>
          <strong>{formatFocusTimer(remainingMs)}</strong>
        </span>
        {state.intention ? <em>{state.intention}</em> : null}
      </Link>
      <button
        type="button"
        className="focus029-global-toggle"
        onClick={() => void (running ? pauseFocusTimer() : startFocusTimer())}
        aria-label={running ? 'Pause focus timer' : 'Resume focus timer'}
      >
        {running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
      </button>
    </aside>
  );
}
