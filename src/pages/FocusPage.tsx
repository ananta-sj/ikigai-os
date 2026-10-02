import { ArrowLeftRight, Bell, BellOff, Maximize2, Minimize2, Pause, Play, Plus, RotateCcw, Sparkles, TimerReset, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useFocusTimer } from '../hooks/useFocusTimer';
import {
  applyFocusTimerPreset,
  enableFocusNotifications,
  focusNotificationPermission,
  pauseFocusTimer,
  resetFocusTimer,
  startFocusTimer,
  updateFocusTimerIntention,
  updateFocusTimerNotifications
} from '../lib/focusTimer';
import {
  FOCUS_TIMER_MAX_MINUTES,
  FOCUS_TIMER_PRESETS,
  formatFocusTimer,
  focusTimerStatusLabel
} from '../lib/focusTimerCore';
import type { FocusCustomQuote, FocusQuoteMode, FocusQuoteSide, FocusTimerMode } from '../types';
import { focusBuiltInQuotes, shuffleFocusQuotes } from '../data/focusQuotes';
import { ensureSettings, updateSettings } from '../lib/settings';
import '../focus-v029.css';


export function FocusPage() {
  const { state, remainingMs, progress } = useFocusTimer();
  const roomRef = useRef<HTMLElement | null>(null);
  const [intentionDraft, setIntentionDraft] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(() => focusNotificationPermission());
  const [noticeMessage, setNoticeMessage] = useState('');
  const [customMode, setCustomMode] = useState<FocusTimerMode>('focus');
  const [customMinutes, setCustomMinutes] = useState('30');
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [fallbackImmersive, setFallbackImmersive] = useState(false);
  const [quoteMode, setQuoteMode] = useState<FocusQuoteMode>('off');
  const [quoteSide, setQuoteSide] = useState<FocusQuoteSide>('right');
  const [singleQuoteId, setSingleQuoteId] = useState(focusBuiltInQuotes[0]?.id ?? '');
  const [customQuotes, setCustomQuotes] = useState<FocusCustomQuote[]>([]);
  const [quoteOrder, setQuoteOrder] = useState<string[]>([]);
  const [quoteCursor, setQuoteCursor] = useState(0);
  const [customQuoteText, setCustomQuoteText] = useState('');
  const [customQuoteAuthor, setCustomQuoteAuthor] = useState('');

  useEffect(() => {
    if (state) setIntentionDraft(state.intention);
  }, [state?.intention]);

  useEffect(() => {
    void ensureSettings().then(settings => {
      setQuoteMode(settings.focusQuoteMode);
      setQuoteSide(settings.focusQuoteSide);
      setSingleQuoteId(settings.focusQuoteSingleId);
      setCustomQuotes(settings.focusCustomQuotes);
    });
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setBrowserFullscreen(document.fullscreenElement === roomRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!fallbackImmersive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setFallbackImmersive(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fallbackImmersive]);

  const allQuotes = useMemo(() => [...focusBuiltInQuotes, ...customQuotes], [customQuotes]);

  useEffect(() => {
    setQuoteOrder(shuffleFocusQuotes(allQuotes.map(quote => quote.id)));
    setQuoteCursor(0);
  }, [allQuotes]);

  useEffect(() => {
    if (!(browserFullscreen || fallbackImmersive) || quoteMode !== 'shuffle' || quoteOrder.length < 2) return;
    setQuoteCursor(cursor => (cursor + 1) % quoteOrder.length);
    const timer = window.setInterval(() => setQuoteCursor(cursor => (cursor + 1) % quoteOrder.length), 60_000);
    return () => window.clearInterval(timer);
  }, [browserFullscreen, fallbackImmersive, quoteMode, quoteOrder]);

  const activePresetId = useMemo(() => {
    if (!state) return '';
    return FOCUS_TIMER_PRESETS.find(preset => preset.mode === state.mode && preset.minutes === state.durationMinutes)?.id ?? '';
  }, [state?.mode, state?.durationMinutes]);
  const focusPresets = useMemo(() => FOCUS_TIMER_PRESETS.filter(preset => preset.mode === 'focus'), []);
  const restPresets = useMemo(() => FOCUS_TIMER_PRESETS.filter(preset => preset.mode === 'rest'), []);

  const activeQuote = useMemo(() => {
    if (quoteMode === 'off' || !allQuotes.length) return null;
    const id = quoteMode === 'single' ? singleQuoteId : quoteOrder[quoteCursor % Math.max(1, quoteOrder.length)];
    return allQuotes.find(quote => quote.id === id) ?? allQuotes[0] ?? null;
  }, [allQuotes, quoteCursor, quoteMode, quoteOrder, singleQuoteId]);

  if (!state) {
    return (
      <div className="page focus029-page">
        <section className="focus029-loading" role="status">Opening the Focus Room…</section>
      </div>
    );
  }

  const running = state.status === 'running';
  const canChangePreset = state.status !== 'running' && state.status !== 'paused';
  const dialStyle = { '--focus-angle': `${Math.round(progress * 360)}deg` } as CSSProperties;
  const statusLabel = focusTimerStatusLabel(state);
  const distractionFree = browserFullscreen || fallbackImmersive;

  async function persistIntention() {
    if (!state || intentionDraft === state.intention) return;
    await updateFocusTimerIntention(intentionDraft.trim());
  }

  async function setFocusQuoteMode(next: FocusQuoteMode) {
    setQuoteMode(next);
    await updateSettings({ focusQuoteMode: next, focusQuotes: next !== 'off' });
  }

  async function swapFocusSides() {
    const next: FocusQuoteSide = quoteSide === 'right' ? 'left' : 'right';
    setQuoteSide(next);
    await updateSettings({ focusQuoteSide: next });
  }

  async function selectSingleQuote(id: string) {
    setSingleQuoteId(id);
    await updateSettings({ focusQuoteSingleId: id });
  }

  async function addCustomQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = customQuoteText.trim().replace(/\s+/g, ' ').slice(0, 240);
    const author = customQuoteAuthor.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!text || !author || customQuotes.length >= 40) return;
    const quote: FocusCustomQuote = { id: `custom-${crypto.randomUUID()}`, text, author, createdAt: new Date().toISOString() };
    const next = [...customQuotes, quote];
    setCustomQuotes(next);
    setCustomQuoteText('');
    setCustomQuoteAuthor('');
    if (quoteMode === 'single') setSingleQuoteId(quote.id);
    await updateSettings({ focusCustomQuotes: next, ...(quoteMode === 'single' ? { focusQuoteSingleId: quote.id } : {}) });
  }

  async function removeCustomQuote(id: string) {
    const next = customQuotes.filter(quote => quote.id !== id);
    const fallback = focusBuiltInQuotes[0]?.id ?? '';
    const nextSingleId = singleQuoteId === id ? fallback : singleQuoteId;
    setCustomQuotes(next);
    setSingleQuoteId(nextSingleId);
    await updateSettings({ focusCustomQuotes: next, focusQuoteSingleId: nextSingleId });
  }

  async function toggleNotifications() {
    if (!state) return;
    setNoticeMessage('');
    if (state.notifyOnComplete) {
      await updateFocusTimerNotifications(false);
      setNoticeMessage('Completion notifications are off.');
      return;
    }
    const permission = await enableFocusNotifications();
    setNotificationPermission(permission);
    if (permission === 'granted') setNoticeMessage('A quiet system notification will appear when the timer ends.');
    else if (permission === 'denied') setNoticeMessage('Notifications are blocked by this browser. The timer still works normally.');
    else if (permission === 'unsupported') setNoticeMessage('This browser does not expose system notifications here.');
  }

  async function toggleDistractionFree() {
    const room = roomRef.current;
    if (!room) return;

    if (document.fullscreenElement === room) {
      await document.exitFullscreen();
      return;
    }
    if (fallbackImmersive) {
      setFallbackImmersive(false);
      return;
    }

    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* Continue with the local fallback. */ }
    }

    if (typeof room.requestFullscreen === 'function') {
      try {
        await room.requestFullscreen();
        return;
      } catch {
        // Browser/embedding policy may deny fullscreen; the CSS fallback still offers a clean focus view.
      }
    }
    setFallbackImmersive(true);
  }

  function applyCustomDuration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canChangePreset) return;
    const parsed = Number(customMinutes);
    if (!Number.isFinite(parsed)) return;
    const minutes = Math.min(FOCUS_TIMER_MAX_MINUTES, Math.max(1, Math.round(parsed)));
    setCustomMinutes(String(minutes));
    void applyFocusTimerPreset({ mode: customMode, minutes });
  }

  return (
    <div className={`page focus029-page mode-${state.mode} status-${state.status}`}>
      <section
        ref={roomRef}
        className={`focus029-room${distractionFree ? ' is-distraction-free' : ''} quote-${quoteSide}${activeQuote ? ' has-quote' : ' no-quote'}`}
        aria-labelledby="focus029-title"
      >
        <div className="focus029-atmosphere" aria-hidden="true">
          <span className="focus029-window"><i /><i /><i /></span>
          <span className="focus029-lightpool" />
          <span className="focus029-plant"><i /><i /><i /></span>
          <span className="focus029-mug" />
        </div>

        <header className="focus029-header">
          <div>
            <span className="focus029-eyebrow"><TimerReset size={14} aria-hidden="true" /> FOCUS ROOM</span>
            <h1 id="focus029-title">One block. One intention.</h1>
            <p>The timer follows the clock, not the tab. Leave this room whenever you need to; your session keeps its real end time.</p>
          </div>
          <div className="focus029-header-actions">
            <button type="button" className="focus029-fullscreen" onClick={() => void toggleDistractionFree()} aria-pressed={distractionFree} aria-label="Enter distraction-free fullscreen">
              <Maximize2 size={15} aria-hidden="true" /> Full screen
            </button>
            <Link to="/" className="focus029-exit">Back to Today</Link>
          </div>
        </header>

        <div className="focus029-workspace">
          <section className="focus029-timer-card" aria-label="Focus timer">
            <button type="button" className="focus029-immersive-exit" onClick={() => void toggleDistractionFree()}>
              <Minimize2 size={15} aria-hidden="true" /> Exit focus view
            </button>
            <div className="focus029-immersive-layout">
              <div className="focus029-clock-pane">
                <div
                  className="focus029-dial"
                  style={dialStyle}
                  role="progressbar"
                  aria-label={statusLabel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <div className="focus029-dial-inner">
                    <span>{state.mode === 'focus' ? 'FOCUS' : 'REST'}</span>
                    <strong aria-live="off">{formatFocusTimer(remainingMs)}</strong>
                    <small>{statusLabel}</small>
                  </div>
                </div>

                {distractionFree && state.intention ? <p className="focus029-immersive-intention">{state.intention}</p> : null}

                {state.status === 'complete' ? (
                  <div className="focus029-complete" role="status">
                    <Sparkles size={16} aria-hidden="true" />
                    <span>{state.mode === 'focus' ? 'That block is complete. Stop here or choose a rest when it helps.' : 'Rest is complete. Return when you are ready.'}</span>
                  </div>
                ) : null}

                <div className="focus029-controls">
                  <button
                    type="button"
                    className="focus029-primary"
                    onClick={() => void (running ? pauseFocusTimer() : startFocusTimer())}
                  >
                    {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                    {running ? 'Pause' : state.status === 'paused' ? 'Resume' : 'Start'}
                  </button>
                  <button type="button" className="focus029-secondary" onClick={() => void resetFocusTimer()}>
                    <RotateCcw size={16} aria-hidden="true" /> Reset
                  </button>
                </div>
              </div>

              {activeQuote ? (
                <figure className="focus029-quote">
                  <span>{quoteMode === 'shuffle' ? 'SHUFFLED FOCUS NOTE' : 'FOCUS NOTE'}</span>
                  <blockquote>“{activeQuote.text}”</blockquote>
                  <figcaption>— {activeQuote.author}</figcaption>
                </figure>
              ) : null}
            </div>
          </section>

          <aside className="focus029-note" aria-label="Focus setup">
            <label className="focus029-intention">
              <span>INTENTION</span>
              <input
                value={intentionDraft}
                onChange={event => setIntentionDraft(event.target.value)}
                onBlur={() => void persistIntention()}
                maxLength={160}
                placeholder="What deserves this block?"
              />
              <small>Optional. This stays on this device with the timer state.</small>
            </label>

            <div className="focus029-presets" aria-label="Timer presets and custom duration">
              <span>PACE</span>
              <div className="focus029-preset-groups">
                <div className="focus029-preset-group">
                  <small>FOCUS</small>
                  <div>
                    {focusPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className={activePresetId === preset.id ? 'is-active' : ''}
                        disabled={!canChangePreset}
                        onClick={() => void applyFocusTimerPreset(preset)}
                        aria-pressed={activePresetId === preset.id}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="focus029-preset-group">
                  <small>REST</small>
                  <div>
                    {restPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className={activePresetId === preset.id ? 'is-active' : ''}
                        disabled={!canChangePreset}
                        onClick={() => void applyFocusTimerPreset(preset)}
                        aria-pressed={activePresetId === preset.id}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <form className="focus029-custom" onSubmit={applyCustomDuration}>
                <span className="focus029-custom-label">CUSTOM</span>
                <div className="focus029-custom-modes" aria-label="Custom timer type">
                  <button type="button" className={customMode === 'focus' ? 'is-active' : ''} aria-pressed={customMode === 'focus'} disabled={!canChangePreset} onClick={() => setCustomMode('focus')}>Focus</button>
                  <button type="button" className={customMode === 'rest' ? 'is-active' : ''} aria-pressed={customMode === 'rest'} disabled={!canChangePreset} onClick={() => setCustomMode('rest')}>Rest</button>
                </div>
                <label>
                  <span className="sr-only">Custom duration in minutes</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={FOCUS_TIMER_MAX_MINUTES}
                    step={1}
                    value={customMinutes}
                    disabled={!canChangePreset}
                    onChange={event => setCustomMinutes(event.target.value)}
                    aria-label={`Custom duration in minutes, 1 to ${FOCUS_TIMER_MAX_MINUTES}`}
                  />
                  <em>min</em>
                </label>
                <button type="submit" disabled={!canChangePreset}>Set</button>
              </form>
              {!canChangePreset ? <small>Pause and reset before changing the pace.</small> : <small>Choose a preset or any custom block from 1–{FOCUS_TIMER_MAX_MINUTES} minutes. Focus and rest never auto-chain.</small>}
            </div>

            <div className="focus029-quote-option">
              <div className="focus029-quote-option-head">
                <div>
                  <span>FOCUS SCREEN</span>
                  <p>In focus view, pair the clock with a large quote, keep one fixed quote, or remove quotes entirely.</p>
                </div>
                <button type="button" className="focus029-swap" onClick={() => void swapFocusSides()} disabled={quoteMode === 'off'}>
                  <ArrowLeftRight size={14} aria-hidden="true" /> {quoteSide === 'right' ? 'Clock left' : 'Clock right'}
                </button>
              </div>
              <div className="focus029-quote-modes" role="group" aria-label="Focus quotation mode">
                {(['shuffle', 'single', 'off'] as FocusQuoteMode[]).map(mode => (
                  <button key={mode} type="button" className={quoteMode === mode ? 'is-active' : ''} aria-pressed={quoteMode === mode} onClick={() => void setFocusQuoteMode(mode)}>
                    {mode === 'shuffle' ? 'Shuffle' : mode === 'single' ? 'One quote' : 'None'}
                  </button>
                ))}
              </div>
              {quoteMode === 'single' ? (
                <label className="focus029-single-quote">
                  <span>DISPLAY THIS QUOTE</span>
                  <select value={activeQuote?.id ?? singleQuoteId} onChange={event => void selectSingleQuote(event.target.value)}>
                    {focusBuiltInQuotes.map(quote => <option key={quote.id} value={quote.id}>{quote.author} — {quote.text}</option>)}
                    {customQuotes.map(quote => <option key={quote.id} value={quote.id}>Custom · {quote.author} — {quote.text}</option>)}
                  </select>
                </label>
              ) : null}
              <details className="focus029-quote-library">
                <summary>Custom quotes <small>{customQuotes.length}/40</small></summary>
                <form onSubmit={addCustomQuote}>
                  <label>
                    <span>QUOTE</span>
                    <textarea value={customQuoteText} onChange={event => setCustomQuoteText(event.target.value)} maxLength={240} rows={2} placeholder="Write a line you want to see while focusing…" />
                  </label>
                  <label>
                    <span>QUOTER</span>
                    <input value={customQuoteAuthor} onChange={event => setCustomQuoteAuthor(event.target.value)} maxLength={80} placeholder="Name" />
                  </label>
                  <button type="submit" disabled={!customQuoteText.trim() || !customQuoteAuthor.trim() || customQuotes.length >= 40}><Plus size={14} aria-hidden="true" /> Add quote</button>
                </form>
                {customQuotes.length ? (
                  <div className="focus029-custom-quote-list">
                    {customQuotes.map(quote => (
                      <article key={quote.id}>
                        <div><strong>“{quote.text}”</strong><small>— {quote.author}</small></div>
                        <button type="button" onClick={() => void removeCustomQuote(quote.id)} aria-label={`Remove quote by ${quote.author}`}><Trash2 size={13} aria-hidden="true" /></button>
                      </article>
                    ))}
                  </div>
                ) : <p className="focus029-empty-quotes">Your own quotes stay local with the rest of your settings.</p>}
              </details>
            </div>

            <div className="focus029-notifications">
              <div>
                <span>END NOTICE</span>
                <p>Optional system notification when this block finishes. No streaks, alarms, or nagging.</p>
              </div>
              <button
                type="button"
                onClick={() => void toggleNotifications()}
                aria-pressed={state.notifyOnComplete}
                disabled={notificationPermission === 'unsupported'}
              >
                {state.notifyOnComplete ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
                {state.notifyOnComplete ? 'On' : notificationPermission === 'unsupported' ? 'Unavailable' : 'Off'}
              </button>
            </div>
            {noticeMessage ? <p className="focus029-notice" role="status">{noticeMessage}</p> : null}
          </aside>
        </div>

        <footer className="focus029-footer">
          <span>Persistent locally · timestamp-based timing</span>
          <span>No score · no streak · no automatic next round</span>
        </footer>
      </section>
    </div>
  );
}
