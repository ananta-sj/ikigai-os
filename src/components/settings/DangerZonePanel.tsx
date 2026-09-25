import { AlertTriangle, CalendarX2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { clearCalendarData, resetIkigaiCompletely } from '../../lib/reset';

type ResetKind = 'calendar' | 'everything';

const resetCopy: Record<ResetKind, { phrase: string; title: string; detail: string }> = {
  calendar: {
    phrase: 'CLEAR CALENDAR',
    title: 'Clear calendar & task history',
    detail: 'Deletes quests, day notes, torn/open day records, milestones and weekly reflections. Garden, Memories, Career, Roadmap, themes and earned relics stay.'
  },
  everything: {
    phrase: 'RESET IKIGAI',
    title: 'Reset all Ikigai data',
    detail: 'Deletes everything stored by Ikigai in this browser: tasks, calendar, garden, memories and files, roadmap, career proof, achievements, AI conversations, settings and local sync metadata.'
  }
};

export function DangerZonePanel() {
  const [kind, setKind] = useState<ResetKind | null>(null);
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const active = kind ? resetCopy[kind] : null;
  const confirmed = Boolean(active && phrase.trim() === active.phrase);

  function open(next: ResetKind) {
    setKind(next);
    setPhrase('');
    setError('');
  }

  function close() {
    if (busy) return;
    setKind(null);
    setPhrase('');
    setError('');
  }

  async function execute() {
    if (!kind || !confirmed) return;
    setBusy(true);
    setError('');
    try {
      if (kind === 'calendar') {
        await clearCalendarData();
        window.location.assign('/');
        return;
      }

      await resetIkigaiCompletely();
      window.location.assign('/welcome');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Reset failed. No reload was performed.');
      setBusy(false);
    }
  }

  return (
    <section className="settings-card danger-zone" aria-labelledby="danger-zone-title">
      <div className="danger-zone-heading">
        <span><AlertTriangle size={17} /></span>
        <div>
          <div className="eyebrow">DANGER ZONE</div>
          <h3 id="danger-zone-title">Destructive resets</h3>
          <p>These actions cannot be undone from Ikigai. Create a backup above first if there is anything you may want later.</p>
        </div>
      </div>

      <div className="danger-zone-actions">
        <article>
          <div><CalendarX2 size={18} /><strong>Clear calendar</strong></div>
          <p>Start Today/Journey clean without deleting the rest of your world.</p>
          <button type="button" className="danger-button" onClick={() => open('calendar')}>Clear calendar data</button>
        </article>
        <article className="is-critical">
          <div><Trash2 size={18} /><strong>Reset everything</strong></div>
          <p>Return this browser installation to a completely fresh Ikigai.</p>
          <button type="button" className="danger-button danger-button-solid" onClick={() => open('everything')}>Reset all Ikigai</button>
        </article>
      </div>

      {active && (
        <div className="danger-confirm" role="dialog" aria-modal="true" aria-labelledby="danger-confirm-title">
          <div className="danger-confirm-card">
            <span className="danger-confirm-icon"><AlertTriangle size={20} /></span>
            <div>
              <div className="eyebrow">IRREVERSIBLE</div>
              <h3 id="danger-confirm-title">{active.title}</h3>
              <p>{active.detail}</p>
            </div>
            <label>
              <span>Type <b>{active.phrase}</b> to continue.</span>
              <input autoFocus value={phrase} onChange={event => setPhrase(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false} />
            </label>
            {error && <div className="danger-error" role="alert">{error}</div>}
            <div className="danger-confirm-actions">
              <button type="button" className="ik-button ik-button-quiet" disabled={busy} onClick={close}>Cancel</button>
              <button type="button" className="danger-button danger-button-solid" disabled={!confirmed || busy} onClick={() => void execute()}>{busy ? 'Deleting…' : active.title}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
