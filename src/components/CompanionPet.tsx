import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowUpRight,
  Hand,
  LoaderCircle,
  MessageCircle,
  Moon,
  RefreshCw,
  Send,
  Sparkles,
  WandSparkles,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  companionErrorPresentation,
  ensureCompanionState,
  hasCompanionApiKey,
  listCompanionMessages,
  sendCompanionMessage
} from '../lib/companion';
import { ensureSettings, updateSettings } from '../lib/settings';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import {
  clearCompanionFailure,
  COMPANION_UI_EVENT,
  getCompanionUiState,
  setCompanionDraft,
  setCompanionFailure,
  type CompanionUiRetry,
  type CompanionUiState
} from '../lib/companionUi';
import {
  FAMILIAR_OPEN_EVENT,
  FAMILIAR_REACTION_EVENT,
  familiarRouteContext,
  type FamiliarOpenDetail,
  type FamiliarPanelMode,
  type FamiliarReactionDetail
} from '../lib/familiar';
import { FamiliarAvatar, type FamiliarPose } from './familiar/FamiliarAvatar';
import type { CompanionErrorPresentation } from '../lib/companion';
import type { CompanionMessage, CompanionState, FamiliarPosition, UserSettings } from '../types';
import { getNowPlayingRuntime, subscribeNowPlaying } from '../lib/nowPlaying';
import { clearCompanionDocuments, companionDocumentsForRequest } from '../lib/companionDocuments';
import { loadFamiliarRoomSignal, type FamiliarRoomSignal } from '../lib/workspaceContinuity';
import { CompanionDocumentTray } from './companion/CompanionDocumentTray';
import { useDialogFocus } from './ui/dialogFocus';
import '../companion-pet.css';

function latestAssistant(messages: CompanionMessage[]) {
  return [...messages].reverse().find(message => message.role === 'assistant');
}

function playLocalTone(enabled: boolean, kind: 'soft' | 'bright') {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = kind === 'bright' ? 610 : 390;
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.055, context.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .24);
    oscillator.addEventListener('ended', () => { void context.close(); }, { once: true });
  } catch {
    // Sound is optional. A blocked Web Audio context must never affect the Familiar.
  }
}

export function CompanionPet() {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<UserSettings | null>(null);
  const interactionTimer = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean; latest: FamiliarPosition | null } | null>(null);
  const suppressClickRef = useRef(false);
  const previousPending = useRef(0);
  const roomSignalRequest = useRef(0);
  const [state, setState] = useState<CompanionState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [pending, setPending] = useState(0);
  const initialUi = useMemo(() => getCompanionUiState(), []);
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<FamiliarPanelMode>('together');
  const [prompt, setPromptState] = useState(initialUi.draft);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<CompanionErrorPresentation | null>(initialUi.failure?.presentation ?? null);
  const [failedPrompt, setFailedPrompt] = useState(initialUi.failure?.prompt ?? '');
  const [retry, setRetry] = useState<CompanionUiRetry | null>(initialUi.retry);
  const [interactionPose, setInteractionPose] = useState<FamiliarPose | null>(null);
  const [ambientPose, setAmbientPose] = useState<FamiliarPose>('awake');
  const [musicActive, setMusicActive] = useState(() => Boolean(getNowPlayingRuntime().item?.isPlaying));
  const [dragPosition, setDragPosition] = useState<FamiliarPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [roomSignal, setRoomSignal] = useState<FamiliarRoomSignal | null>(null);
  const [, setRetryTick] = useState(0);
  const drawerRef = useDialogFocus<HTMLElement>(open, () => setOpen(false), { lockScroll: false });

  function updatePrompt(next: string) {
    setPromptState(next);
    setCompanionDraft(next);
    if (failedPrompt && next.trim() !== failedPrompt.trim()) clearCompanionFailure();
  }

  async function refresh() {
    const [nextState, nextMessages, nextSettings] = await Promise.all([
      ensureCompanionState(),
      listCompanionMessages(12),
      ensureSettings()
    ]);
    setState(nextState);
    setMessages(nextMessages);
    setSettings(nextSettings);
    settingsRef.current = nextSettings;
    setPending(nextMessages.flatMap(message => message.proposals ?? []).filter(proposal => proposal.status === 'pending').length);
  }

  function temporaryPose(pose: FamiliarPose, duration = 1800) {
    if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    setInteractionPose(pose);
    interactionTimer.current = window.setTimeout(() => {
      setInteractionPose(null);
      interactionTimer.current = null;
    }, duration);
  }

  useEffect(() => {
    void refresh();
    const companionListener = () => { void refresh(); };
    const settingsListener = (event: Event) => {
      const next = (event as CustomEvent<UserSettings>).detail;
      if (next) { setSettings(next); settingsRef.current = next; }
    };
    const uiListener = (event: Event) => {
      const next = (event as CustomEvent<CompanionUiState>).detail ?? getCompanionUiState();
      setPromptState(next.draft);
      setError(next.failure?.presentation ?? null);
      setFailedPrompt(next.failure?.prompt ?? '');
      setRetry(next.retry);
    };
    const openListener = (event: Event) => {
      const detail = (event as CustomEvent<FamiliarOpenDetail>).detail;
      setQuickOpen(false);
      setPanelMode(detail?.mode ?? 'together');
      setOpen(true);
    };
    const reactionListener = (event: Event) => {
      const detail = (event as CustomEvent<FamiliarReactionDetail>).detail;
      if (settingsRef.current?.familiarReactions === false) return;
      if (detail?.kind === 'task-completed') temporaryPose('celebrate', 2600);
      if (detail?.kind === 'proposal-ready') temporaryPose('curious', 2200);
      if (detail?.kind === 'play') temporaryPose('play', 1900);
    };

    const unsubscribeNowPlaying = subscribeNowPlaying(next => setMusicActive(Boolean(next.item?.isPlaying)));
    window.addEventListener('ikigai-companion-changed', companionListener);
    window.addEventListener('ikigai-settings-changed', settingsListener);
    window.addEventListener(COMPANION_UI_EVENT, uiListener);
    window.addEventListener(FAMILIAR_OPEN_EVENT, openListener);
    window.addEventListener(FAMILIAR_REACTION_EVENT, reactionListener);
    return () => {
      unsubscribeNowPlaying();
      window.removeEventListener('ikigai-companion-changed', companionListener);
      window.removeEventListener('ikigai-settings-changed', settingsListener);
      window.removeEventListener(COMPANION_UI_EVENT, uiListener);
      window.removeEventListener(FAMILIAR_OPEN_EVENT, openListener);
      window.removeEventListener(FAMILIAR_REACTION_EVENT, reactionListener);
      if (interactionTimer.current) window.clearTimeout(interactionTimer.current);
    };
    // The reaction listener reads the latest settings through subsequent settings events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reduced = useReducedMotionPreference(Boolean(settings?.reducedMotion));
  const activity = settings?.familiarActivity ?? 'calm';

  useEffect(() => { setDragPosition(null); }, [settings?.familiarPosition?.x, settings?.familiarPosition?.y]);

  useEffect(() => {
    if (reduced || activity === 'still') {
      setAmbientPose('rest');
      return;
    }
    if (activity === 'hidden') return;

    const hour = new Date().getHours();
    const night = hour >= 22 || hour < 6;
    const reflectiveRoom = ['/reflection', '/memories'].includes(location.pathname);
    const planningRoom = ['/calendar', '/roadmap', '/career'].includes(location.pathname);

    type AmbientChoice = { pose: FamiliarPose; weight: number; hold: number };
    const pool: AmbientChoice[] = night
      ? (activity === 'lively'
          ? [
              { pose: 'awake', weight: 4, hold: 7200 },
              { pose: 'peek', weight: 2, hold: 4200 },
              { pose: 'stretch', weight: 2, hold: 4600 },
              { pose: 'curious', weight: 2, hold: 5000 },
              { pose: 'sleepy', weight: 5, hold: 9600 },
              { pose: 'rest', weight: 6, hold: 11000 }
            ]
          : [
              { pose: 'rest', weight: 8, hold: 14000 },
              { pose: 'sleepy', weight: 6, hold: 12000 },
              { pose: 'awake', weight: 2, hold: 9000 },
              { pose: 'stretch', weight: 1, hold: 5200 }
            ])
      : reflectiveRoom
        ? (activity === 'lively'
            ? [
                { pose: 'awake', weight: 5, hold: 7200 },
                { pose: 'curious', weight: 4, hold: 5600 },
                { pose: 'stretch', weight: 2, hold: 4800 },
                { pose: 'peek', weight: 2, hold: 4200 },
                { pose: 'rest', weight: 3, hold: 8200 },
                { pose: 'greet', weight: 1, hold: 2600 }
              ]
            : [
                { pose: 'rest', weight: 6, hold: 11000 },
                { pose: 'awake', weight: 5, hold: 9200 },
                { pose: 'stretch', weight: 2, hold: 5200 },
                { pose: 'sleepy', weight: 2, hold: 9000 },
                { pose: 'curious', weight: 1, hold: 6200 }
              ])
        : planningRoom
          ? (activity === 'lively'
              ? [
                  { pose: 'curious', weight: 5, hold: 5200 },
                  { pose: 'awake', weight: 5, hold: 6800 },
                  { pose: 'peek', weight: 3, hold: 4100 },
                  { pose: 'stretch', weight: 2, hold: 4600 },
                  { pose: 'greet', weight: 1, hold: 2600 },
                  { pose: 'hop', weight: 1, hold: 1800 }
                ]
              : [
                  { pose: 'awake', weight: 6, hold: 9000 },
                  { pose: 'curious', weight: 4, hold: 6500 },
                  { pose: 'peek', weight: 2, hold: 4600 },
                  { pose: 'stretch', weight: 2, hold: 5200 },
                  { pose: 'rest', weight: 2, hold: 8800 }
                ])
          : (activity === 'lively'
              ? [
                  { pose: 'awake', weight: 6, hold: 6600 },
                  { pose: 'curious', weight: 4, hold: 5200 },
                  { pose: 'stretch', weight: 3, hold: 4400 },
                  { pose: 'peek', weight: 3, hold: 4000 },
                  { pose: 'rest', weight: 2, hold: 7600 },
                  { pose: 'greet', weight: 1, hold: 2600 },
                  { pose: 'hop', weight: 1, hold: 1700 },
                  { pose: 'play', weight: 1, hold: 2600 }
                ]
              : [
                  { pose: 'awake', weight: 7, hold: 9600 },
                  { pose: 'rest', weight: 5, hold: 10800 },
                  { pose: 'curious', weight: 3, hold: 6200 },
                  { pose: 'stretch', weight: 2, hold: 5200 },
                  { pose: 'peek', weight: 1, hold: 4600 }
                ]);

    let lastPose: FamiliarPose = ambientPose;
    let timer = 0;

    const chooseNext = () => {
      const candidates = pool.filter(choice => choice.pose !== lastPose);
      const choices = candidates.length ? candidates : pool;
      const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
      let cursor = Math.random() * total;
      for (const choice of choices) {
        cursor -= choice.weight;
        if (cursor <= 0) return choice;
      }
      return choices[choices.length - 1];
    };

    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          schedule(12000);
          return;
        }
        if (open || interactionPose) {
          schedule(2400);
          return;
        }
        const next = chooseNext();
        lastPose = next.pose;
        setAmbientPose(next.pose);
        const jitter = .84 + Math.random() * .34;
        schedule(Math.round(next.hold * jitter));
      }, delay);
    };

    const first = chooseNext();
    lastPose = first.pose;
    setAmbientPose(first.pose);
    schedule(Math.round(first.hold * (.9 + Math.random() * .2)));
    return () => window.clearTimeout(timer);
  }, [activity, reduced, open, interactionPose, location.pathname]);

  useEffect(() => {
    if (!retry) return;
    const timer = window.setInterval(() => setRetryTick(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [retry]);

  useEffect(() => {
    if (pending > previousPending.current && previousPending.current >= 0 && settings?.familiarReactions !== false) {
      temporaryPose('curious', 2100);
    }
    previousPending.current = pending;
  }, [pending, settings?.familiarReactions]);

  useEffect(() => {
    setOpen(false);
    setQuickOpen(false);
    setPanelMode('together');
  }, [location.pathname]);

  useEffect(() => {
    const requestId = ++roomSignalRequest.current;
    setRoomSignal(null);
    if (!open || panelMode !== 'together' || settings?.familiarContextHints === false) return;
    void loadFamiliarRoomSignal(location.pathname, location.search)
      .then(signal => { if (requestId === roomSignalRequest.current) setRoomSignal(signal); })
      .catch(() => { if (requestId === roomSignalRequest.current) setRoomSignal(null); });
  }, [open, panelMode, location.pathname, location.search, settings?.familiarContextHints]);

  useEffect(() => {
    if (!open && !quickOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); setQuickOpen(false); }
    };
    const closeOutside = (event: PointerEvent) => {
      const node = rootRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) { setOpen(false); setQuickOpen(false); }
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOutside, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOutside, true);
    };
  }, [open, quickOpen]);

  function positionFromPixels(x: number, y: number): FamiliarPosition {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const marginX = Math.min(54, width * .16);
    const marginY = Math.min(54, height * .16);
    const clampedX = Math.min(width - marginX, Math.max(marginX, x));
    const clampedY = Math.min(height - marginY, Math.max(marginY, y));
    return { x: clampedX / width, y: clampedY / height };
  }

  function handleDragStart(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || open || quickOpen) return;
    temporaryPose('peek', 1200);
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      moved: false,
      latest: settings?.familiarPosition ?? null
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    suppressClickRef.current = true;
    setDragging(true);
    temporaryPose('curious', 1800);
    const next = positionFromPixels(drag.originX + dx, drag.originY + dy);
    drag.latest = next;
    setDragPosition(next);
    event.preventDefault();
  }

  async function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved || !drag.latest) return;
    const next = await updateSettings({ familiarPosition: drag.latest, familiarSide: drag.latest.x < .5 ? 'left' : 'right' });
    setSettings(next);
    settingsRef.current = next;
    temporaryPose('hop', 900);
  }

  function cancelDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setDragPosition(null);
  }

  const configured = Boolean(state?.model) && (state?.provider === 'ollama' || hasCompanionApiKey());
  const latest = latestAssistant(messages);
  const context = familiarRouteContext(location.pathname);
  const familiarName = settings?.familiarName?.trim() || 'Familiar';
  const side = settings?.familiarSide ?? 'right';
  const inSanctuary = location.pathname === '/garden';
  const hiddenOutsideHome = activity === 'hidden' && location.pathname !== '/companion' && !inSanctuary;
  const familiarPosition = dragPosition ?? settings?.familiarPosition ?? null;
  const familiarPositionStyle: CSSProperties | undefined = familiarPosition ? {
    // Keep persisted normalized placement useful across rotation, browser
    // chrome changes and notched displays. `dvh` follows the visible mobile
    // viewport while the clamp keeps the resident inside both safe-area edges.
    left: `clamp(max(6px, env(safe-area-inset-left)), calc(${familiarPosition.x * 100}vw - var(--familiar-shell-half)), calc(100vw - max(6px, env(safe-area-inset-right)) - var(--familiar-shell-size)))`,
    top: `clamp(max(6px, env(safe-area-inset-top)), calc(${familiarPosition.y * 100}dvh - var(--familiar-shell-half)), calc(100dvh - var(--familiar-bottom-guard, max(6px, env(safe-area-inset-bottom))) - var(--familiar-shell-size)))`,
    right: 'auto',
    bottom: 'auto'
  } : undefined;

  if (settings?.familiarEnabled === false || hiddenOutsideHome) return null;

  const pose: FamiliarPose = sending
    ? 'thinking'
    : interactionPose ?? (pending > 0
        ? 'waiting'
        : open
          ? (panelMode === 'talk' ? 'curious' : 'awake')
          : (musicActive && settings?.familiarMusicPresence !== false ? 'music' : ambientPose));

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || retry || !configured) return;
    setSending(true);
    clearCompanionFailure();
    try {
      await sendCompanionMessage(trimmed, companionDocumentsForRequest());
      clearCompanionDocuments();
      updatePrompt('');
      clearCompanionFailure();
      await refresh();
    } catch (cause) {
      const presentation = companionErrorPresentation(cause);
      updatePrompt(trimmed);
      setCompanionFailure(trimmed, presentation);
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendText(prompt);
  }

  function play(kind: 'pet' | 'mote' | 'rest') {
    if (settings?.familiarPlay === false) return;
    if (kind === 'rest') temporaryPose('sleepy', 5200);
    else if (kind === 'mote') temporaryPose('play', 2400);
    else temporaryPose('greet', 1700);
    playLocalTone(Boolean(settings?.familiarSounds), kind === 'mote' ? 'bright' : 'soft');
  }

  function openTogether() {
    setQuickOpen(false);
    setPanelMode('together');
    setOpen(true);
    temporaryPose('greet', 1200);
  }

  function handleNookClick() {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    const touchLike = typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (touchLike && !open && settings?.familiarPlay !== false) {
      setQuickOpen(value => !value);
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    openTogether();
  }

  const retrySeconds = retry
    ? Math.max(1, Math.ceil((Date.parse(retry.retryAt) - Date.now()) / 1000))
    : 0;

  return (
    <div
      ref={rootRef}
      className={`ik-familiar-shell side-${side} ${familiarPosition ? 'is-free-position' : ''} ${dragging ? 'is-dragging' : ''} ${open ? 'is-open' : ''} ${quickOpen ? 'quick-open' : ''} ${inSanctuary ? 'world-resident-mode' : ''} activity-${activity}`}
      data-route={location.pathname}
      style={familiarPositionStyle}
    >
      {!inSanctuary ? (
        <>
          {settings?.familiarPlay !== false ? (
            <div className="familiar-quick-actions" aria-label={`${familiarName} quick interactions`}>
              <button type="button" className="quick-pet" data-label="Pet" aria-label={`Pet ${familiarName}`} onClick={() => { play('pet'); setQuickOpen(false); }}><Hand size={15} /></button>
              <button type="button" className="quick-mote" data-label="Mote" aria-label="Toss a mote" onClick={() => { play('mote'); setQuickOpen(false); }}><WandSparkles size={15} /></button>
              <button type="button" className="quick-rest" data-label="Settle" aria-label={`Let ${familiarName} settle`} onClick={() => { play('rest'); setQuickOpen(false); }}><Moon size={15} /></button>
              <button type="button" className="quick-open-panel" data-label="Together" aria-label={`Open ${familiarName}`} onClick={openTogether}><Sparkles size={15} /></button>
            </div>
          ) : null}
          <button
            type="button"
            className="familiar-nook"
            aria-label={open ? `Close ${familiarName}` : pending ? `Open ${familiarName}, ${pending} proposals waiting` : `Open ${familiarName}`}
            aria-expanded={open || quickOpen}
            aria-haspopup="dialog"
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={event => { void finishDrag(event); }}
            onPointerCancel={cancelDrag}
            onClick={handleNookClick}
          >
            <span className="familiar-nook-shelf" aria-hidden="true" />
            <FamiliarAvatar
              design={settings?.familiarDesign}
              color={settings?.familiarColor}
              theme={settings?.familiarTheme}
              pose={pose}
              size="md"
            />
            {pending > 0 ? <span className="familiar-nook-badge" aria-label={`${pending} proposals waiting`}>{pending > 9 ? '9+' : pending}</span> : null}
            <span className="familiar-nook-label">{familiarName}</span>
          </button>
        </>
      ) : null}

      {open ? (
        <section ref={drawerRef} tabIndex={-1} className="familiar-drawer" role="dialog" aria-modal="true" aria-labelledby="familiar-drawer-title">
          <header className="familiar-drawer-head">
            <div className="familiar-drawer-identity">
              <FamiliarAvatar
                design={settings?.familiarDesign}
                color={settings?.familiarColor}
                theme={settings?.familiarTheme}
                pose={pose}
                size="sm"
              />
              <div><strong id="familiar-drawer-title">{familiarName}</strong><small>{configured ? 'local presence · conversation ready' : 'local presence · conversation offline'}</small></div>
            </div>
            <button type="button" className="familiar-drawer-close" onClick={() => setOpen(false)} aria-label={`Close ${familiarName}`}><X size={16} /></button>
          </header>

          <nav className="familiar-drawer-tabs" aria-label="Familiar modes">
            <button type="button" className={panelMode === 'together' ? 'active' : ''} onClick={() => setPanelMode('together')}><Sparkles size={14} /> Together</button>
            <button type="button" className={panelMode === 'talk' ? 'active' : ''} onClick={() => setPanelMode('talk')}><MessageCircle size={14} /> Talk {pending ? <b>{pending}</b> : null}</button>
          </nav>

          {panelMode === 'together' ? (
            <div className="familiar-together">
              {settings?.familiarContextHints !== false ? (
                <section className="familiar-context-card">
                  <span>{context.label}</span>
                  <strong>{context.title}</strong>
                  <p>{context.detail}</p>
                  {roomSignal ? <div className="familiar032-room-signal" role="status"><span>{roomSignal.label}</span><b>{roomSignal.title}</b><small>{roomSignal.detail}</small></div> : null}
                  <div className="familiar-context-actions">
                    {context.actions.map(action => <Link key={action.to} to={action.to} onClick={() => setOpen(false)}>{action.label}<ArrowUpRight size={12} /></Link>)}
                  </div>
                </section>
              ) : (
                <section className="familiar-context-card quiet"><span>QUIET MODE</span><strong>No room hints.</strong><p>The Familiar stays present without suggesting where to go next.</p></section>
              )}

              <Link className="familiar-manage-link" to="/companion" onClick={() => setOpen(false)}>
                Edit Familiar identity &amp; presence <ArrowUpRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="familiar-talk">
              {configured ? (
                <>
                  {latest ? <article className="familiar-talk-latest"><span>LATEST REPLY</span><p>{latest.content}</p></article> : <article className="familiar-talk-latest empty"><span>CONVERSATION</span><p>Ask for help thinking, planning or shaping a proposal. The Familiar never applies a change by itself.</p></article>}

                  {pending > 0 ? (
                    <Link className="familiar-pending-link" to="/companion?view=chat" onClick={() => setOpen(false)}>
                      Review &amp; apply {pending} proposal{pending === 1 ? '' : 's'} <ArrowUpRight size={13} />
                    </Link>
                  ) : null}

                  {retry ? (
                    <div className="familiar-auto-retry" role="status" aria-live="polite">
                      <RefreshCw size={13} className="spin" />
                      <span>Auto retry {retry.nextAttempt}/{retry.maxAttempts} in about {retrySeconds}s…</span>
                    </div>
                  ) : null}

                  {error ? (
                    <div className="familiar-error" role="alert">
                      <div><strong>{error.title}</strong><span>{error.detail}</span></div>
                      {error.retryable && failedPrompt ? <button type="button" onClick={() => void sendText(failedPrompt)} disabled={sending || Boolean(retry)}><RefreshCw size={13} className={sending ? 'spin' : ''} /> Retry</button> : null}
                    </div>
                  ) : null}

                  <form className="familiar-compose" onSubmit={submit}>
                    <CompanionDocumentTray compact disabled={sending || Boolean(retry)} />
                    <label className="sr-only" htmlFor="familiar-prompt">Message {familiarName}</label>
                    <textarea
                      id="familiar-prompt"
                      rows={3}
                      value={prompt}
                      onChange={event => updatePrompt(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Ask, plan, or attach a document…"
                      title="Enter for a new line · Shift+Enter to send"
                      maxLength={5000}
                      disabled={sending || Boolean(retry)}
                    />
                    <button type="submit" disabled={sending || Boolean(retry) || !prompt.trim()} aria-label="Send message">{sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}</button>
                  </form>
                  <Link className="familiar-open-chat" to="/companion?view=chat" onClick={() => setOpen(false)}>Open full conversation <ArrowUpRight size={13} /></Link>
                </>
              ) : (
                <section className="familiar-conversation-offline">
                  <MessageCircle size={18} />
                  <div><strong>Conversation is optional.</strong><p>{familiarName} still exists as a local presence without a model. Connect one only when you want planning or proposal help.</p></div>
                  <Link to="/companion?view=connection" onClick={() => setOpen(false)}>AI settings <ArrowUpRight size={13} /></Link>
                </section>
              )}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
