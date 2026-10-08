import { useEffect, useState } from 'react';
import { cancelCompanionOperation, COMPANION_RUNTIME_EVENT, getCompanionRuntime } from '../../lib/companionRuntime';
import '../../companion-connection.css';

export function useCompanionRuntime() {
  const [runtime, setRuntime] = useState(getCompanionRuntime);
  useEffect(() => { const changed = () => setRuntime(getCompanionRuntime()); window.addEventListener(COMPANION_RUNTIME_EVENT, changed); return () => window.removeEventListener(COMPANION_RUNTIME_EVENT, changed); }, []);
  return runtime;
}
const labels = { 'not-configured': 'Not configured', configured: 'Saved · connection not tested', validating: 'Validating connection…', connected: 'Connected', connecting: 'Connecting…', sending: 'Sending…', receiving: 'Receiving reply…', retrying: 'Retrying…', 'rate-limited': 'Rate limited · check quota or wait', offline: 'Offline · check your connection', failed: 'Failed · review the error below', cancelled: 'Cancelled · draft preserved' };
export function CompanionConnectionStatus() {
  const runtime = useCompanionRuntime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!runtime.active) return; setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [runtime.active]);
  return <div className={`companion-live-status phase-${runtime.phase}`} role="status" aria-live="polite">
    <div><strong>{runtime.provider}{runtime.model ? ` · ${runtime.model}` : ''}</strong><span>{labels[runtime.phase]}{runtime.active && runtime.startedAt ? ` · ${Math.max(0, Math.floor((now - runtime.startedAt) / 1000))}s elapsed` : ''}{runtime.retryAt ? ` · retry in ${Math.max(0, Math.ceil((runtime.retryAt - now) / 1000))}s` : ''}{runtime.characters > 0 && runtime.active ? ` · ${runtime.characters} characters received` : ''}</span></div>
    {runtime.active ? <button type="button" onClick={cancelCompanionOperation}>Cancel request</button> : null}
  </div>;
}
