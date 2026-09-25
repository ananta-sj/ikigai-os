import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent
} from 'react';
import { ArrowUpRight, LoaderCircle, Maximize2, MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  companionErrorPresentation,
  ensureCompanionState,
  hasCompanionApiKey,
  listCompanionMessages,
  sendCompanionMessage
} from '../lib/companion';
import { ensureSettings } from '../lib/settings';
import type { CompanionErrorPresentation } from '../lib/companion';
import type { CompanionMessage, CompanionState, FamiliarActivity, UserSettings } from '../types';
import '../companion-pet.css';

type FamiliarMood = 'sleeping' | 'idle' | 'thinking' | 'waiting';
type Point = { x: number; y: number };
type Rect = { x: number; y: number; width: number; height: number };
type BubblePlacement = 'left' | 'right' | 'above' | 'below' | 'mobile';
type BubbleLayout = { anchor: Point; rect: Rect; placement: BubblePlacement };

const PET_SIZE = 72;
const BUBBLE_GAP = 9;
const DESKTOP_BUBBLE_WIDTH = 322;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function activityDelay(activity: FamiliarActivity) {
  if (activity === 'lively') return 9000;
  if (activity === 'calm') return 22000;
  return 0;
}

function safePerches(width: number, height: number, pathname: string): Point[] {
  const mobile = width < 760;
  const right = Math.max(16, width - PET_SIZE - (mobile ? 14 : 22));
  const low = Math.max(84, height - PET_SIZE - (mobile ? 92 : 22));
  const mid = clamp(Math.round(height * 0.58), 120, Math.max(120, height - 190));
  const high = clamp(Math.round(height * 0.28), 100, Math.max(100, height - 260));
  const nearRight = Math.max(16, right - Math.min(120, Math.round(width * 0.07)));

  const routeBias = pathname === '/calendar' || pathname === '/roadmap' ? high : pathname === '/career' ? mid : low;
  return [
    { x: right, y: routeBias },
    { x: right, y: mid },
    { x: nearRight, y: low },
    { x: right, y: low },
    { x: nearRight, y: high }
  ];
}

function latestAssistant(messages: CompanionMessage[]) {
  return [...messages].reverse().find(message => message.role === 'assistant');
}

function overlapArea(a: Rect, b: Rect) {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

function rectFromElement(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function protectedRects() {
  const selectors = [
    '[aria-label="Daily page ritual"]',
    '.journey-calendar-object',
    '.roadmap-sheet',
    '.career-project',
    '.ik-modal-backdrop'
  ];
  return selectors
    .flatMap(selector => Array.from(document.querySelectorAll(selector)))
    .filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map(rectFromElement);
}

function bubbleRect(anchor: Point, placement: Exclude<BubblePlacement, 'mobile'>, width: number, height: number): Rect {
  if (placement === 'left') {
    return {
      x: anchor.x - width - BUBBLE_GAP,
      y: anchor.y + PET_SIZE - height - 12,
      width,
      height
    };
  }
  if (placement === 'right') {
    return {
      x: anchor.x + PET_SIZE + BUBBLE_GAP,
      y: anchor.y + PET_SIZE - height - 12,
      width,
      height
    };
  }
  if (placement === 'below') {
    return {
      x: anchor.x + PET_SIZE / 2 - width / 2,
      y: anchor.y + PET_SIZE + BUBBLE_GAP,
      width,
      height
    };
  }
  return {
    x: anchor.x + PET_SIZE / 2 - width / 2,
    y: anchor.y - height - BUBBLE_GAP,
    width,
    height
  };
}

function chooseBubbleLayout(
  base: Point,
  perches: Point[],
  viewport: { width: number; height: number },
  connected: boolean,
  hasReply: boolean
): BubbleLayout {
  if (viewport.width < 760) {
    return {
      anchor: base,
      placement: 'mobile',
      rect: {
        x: 12,
        y: Math.max(82, viewport.height - (connected ? 280 : 176) - 92),
        width: Math.max(280, viewport.width - 24),
        height: connected ? 280 : 176
      }
    };
  }

  const width = Math.min(DESKTOP_BUBBLE_WIDTH, viewport.width - 28);
  const height = connected ? (hasReply ? 286 : 232) : 164;
  const protectedAreas = protectedRects();
  const anchors = [base, ...perches].filter((point, index, all) =>
    all.findIndex(other => Math.abs(other.x - point.x) < 2 && Math.abs(other.y - point.y) < 2) === index
  );
  const placements: Array<Exclude<BubblePlacement, 'mobile'>> = ['left', 'right', 'above', 'below'];

  let best: { score: number; layout: BubbleLayout } | null = null;

  for (const anchor of anchors) {
    for (const placement of placements) {
      const rect = bubbleRect(anchor, placement, width, height);
      const margin = 12;
      const outLeft = Math.max(0, margin - rect.x);
      const outTop = Math.max(0, 72 - rect.y);
      const outRight = Math.max(0, rect.x + rect.width + margin - viewport.width);
      const outBottom = Math.max(0, rect.y + rect.height + margin - viewport.height);
      const offscreenPenalty = (outLeft + outTop + outRight + outBottom) * 120;
      const overlapPenalty = protectedAreas.reduce((sum, area) => sum + overlapArea(rect, area), 0) * 0.14;
      const distancePenalty = Math.hypot(anchor.x - base.x, anchor.y - base.y) * 0.42;
      const placementPenalty = placement === 'below' ? 22 : placement === 'above' ? 8 : 0;
      const score = offscreenPenalty + overlapPenalty + distancePenalty + placementPenalty;
      if (!best || score < best.score) {
        best = { score, layout: { anchor, rect, placement } };
      }
    }
  }

  if (best) return best.layout;

  const anchor = base;
  const rect = bubbleRect(anchor, 'left', width, height);
  return { anchor, rect, placement: 'left' };
}

export function CompanionPet() {
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<CompanionState | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [pending, setPending] = useState(0);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<CompanionErrorPresentation | null>(null);
  const [failedPrompt, setFailedPrompt] = useState('');
  const [perchIndex, setPerchIndex] = useState(0);
  const [manualPosition, setManualPosition] = useState<Point | null>(null);
  const [chatLayout, setChatLayout] = useState<BubbleLayout | null>(null);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const drag = useRef<{ pointerId: number; startX: number; startY: number; origin: Point; moved: boolean } | null>(null);

  async function refresh() {
    const [nextState, nextMessages, nextSettings] = await Promise.all([
      ensureCompanionState(),
      listCompanionMessages(12),
      ensureSettings()
    ]);
    setState(nextState);
    setMessages(nextMessages);
    setSettings(nextSettings);
    setPending(nextMessages.flatMap(message => message.proposals ?? []).filter(proposal => proposal.status === 'pending').length);
  }

  useEffect(() => {
    void refresh();
    const companionListener = () => { void refresh(); };
    const settingsListener = (event: Event) => {
      const next = (event as CustomEvent<UserSettings>).detail;
      if (next) setSettings(next);
    };
    const resizeListener = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('ikigai-companion-changed', companionListener);
    window.addEventListener('ikigai-settings-changed', settingsListener);
    window.addEventListener('resize', resizeListener);
    return () => {
      window.removeEventListener('ikigai-companion-changed', companionListener);
      window.removeEventListener('ikigai-settings-changed', settingsListener);
      window.removeEventListener('resize', resizeListener);
    };
  }, []);

  const perches = useMemo(() => safePerches(viewport.width, viewport.height, location.pathname), [viewport, location.pathname]);
  const activity = settings?.familiarActivity ?? 'calm';
  const reduced = Boolean(settings?.reducedMotion);
  const configured = Boolean(state?.model) && (state?.provider === 'ollama' || hasCompanionApiKey());
  const mood: FamiliarMood = sending ? 'thinking' : pending > 0 ? 'waiting' : configured ? 'idle' : 'sleeping';
  const restingPerch = activity === 'still' || reduced ? perches[3] : perches[perchIndex % perches.length];
  const basePosition = manualPosition ?? restingPerch ?? { x: viewport.width - 100, y: viewport.height - 120 };
  const latest = latestAssistant(messages);
  const renderedPosition = open && chatLayout ? chatLayout.anchor : basePosition;

  useEffect(() => {
    setPerchIndex(0);
    setManualPosition(null);
    setOpen(false);
    setChatLayout(null);
  }, [location.pathname]);

  useEffect(() => {
    const delay = activityDelay(activity);
    if (!delay || reduced || open || manualPosition || location.pathname === '/companion') return;
    const timer = window.setInterval(() => setPerchIndex(index => (index + 1) % perches.length), delay);
    return () => window.clearInterval(timer);
  }, [activity, reduced, open, manualPosition, perches.length, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      const node = rootRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOutside, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOutside, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setChatLayout(null);
      return;
    }
    const next = chooseBubbleLayout(basePosition, perches, viewport, configured, Boolean(latest));
    setChatLayout(next);
  }, [open, basePosition.x, basePosition.y, perches, viewport, configured, latest?.id]);

  if (location.pathname === '/companion' || activity === 'hidden') return null;

  function toggleChat() {
    if (open) {
      setOpen(false);
      return;
    }
    setError(null);
    setFailedPrompt('');
    setChatLayout(chooseBubbleLayout(basePosition, perches, viewport, configured, Boolean(latest)));
    setOpen(true);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: renderedPosition,
      moved: false
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (Math.hypot(dx, dy) > 5) active.moved = true;
    if (!active.moved) return;
    if (open) setOpen(false);
    const next = {
      x: clamp(active.origin.x + dx, 10, Math.max(10, viewport.width - PET_SIZE - 10)),
      y: clamp(active.origin.y + dy, 72, Math.max(72, viewport.height - PET_SIZE - 12))
    };
    setManualPosition(next);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    drag.current = null;
    if (!active.moved) toggleChat();
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !configured) return;
    setSending(true);
    setError(null);
    setFailedPrompt('');
    try {
      await sendCompanionMessage(trimmed);
      setPrompt('');
      await refresh();
    } catch (cause) {
      setPrompt(trimmed);
      setFailedPrompt(trimmed);
      setError(companionErrorPresentation(cause));
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendText(prompt);
  }

  const bubblePlacement = chatLayout?.placement ?? 'left';
  const bubbleStyle = chatLayout && bubblePlacement !== 'mobile'
    ? {
        left: chatLayout.rect.x - renderedPosition.x,
        top: chatLayout.rect.y - renderedPosition.y,
        width: chatLayout.rect.width
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={`ik-familiar mood-${mood} activity-${activity} ${manualPosition ? 'is-parked' : 'is-roaming'} ${open ? 'chat-open' : ''} bubble-${bubblePlacement}`}
      style={{ left: renderedPosition.x, top: renderedPosition.y }}
      data-route={location.pathname}
    >
      <button
        type="button"
        className="ik-familiar-creature"
        aria-label={open ? 'Close familiar chat' : pending ? `Open familiar chat, ${pending} proposals waiting` : 'Open familiar chat'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; }}
      >
        <span className="familiar-shadow" aria-hidden="true" />
        <span className="familiar-wisp wisp-a" aria-hidden="true" />
        <span className="familiar-wisp wisp-b" aria-hidden="true" />
        <span className="familiar-tail" aria-hidden="true" />
        <span className="familiar-body" aria-hidden="true">
          <i className="familiar-leaf leaf-left" />
          <i className="familiar-leaf leaf-right" />
          <i className="familiar-brow brow-left" />
          <i className="familiar-brow brow-right" />
          <i className="familiar-eye eye-left" />
          <i className="familiar-eye eye-right" />
          <i className="familiar-mouth" />
          <i className="familiar-core" />
          {mood === 'thinking' ? <i className="familiar-scroll" /> : null}
        </span>
        {pending > 0 ? <span className="familiar-badge">{pending > 9 ? '9+' : pending}</span> : null}
        <span className="familiar-speech-hint" aria-hidden="true">{sending ? 'thinking…' : pending ? `${pending} waiting` : configured ? 'say something' : 'sleeping'}</span>
      </button>

      {open && chatLayout ? (
        <section
          className={`familiar-popover placement-${bubblePlacement}`}
          style={bubbleStyle}
          aria-label="Ikigai familiar chat"
        >
          <span className="familiar-popover-tail" aria-hidden="true" />
          <header className="familiar-popover-head">
            <strong>
              {sending
                ? 'Thinking…'
                : pending > 0
                  ? `${pending} change${pending === 1 ? '' : 's'} waiting for you.`
                  : configured
                    ? 'What should we shape?'
                    : 'I’m asleep until a model is connected.'}
            </strong>
            <div className="familiar-popover-actions">
              <Link to="/companion" aria-label="Open full Companion" title="Open full Companion"><Maximize2 size={14} /></Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close familiar chat"><X size={14} /></button>
            </div>
          </header>

          {configured ? (
            <div className="familiar-chat-body">
              {latest ? (
                <article className="familiar-last-reply">
                  <p>{latest.content}</p>
                </article>
              ) : (
                <article className="familiar-last-reply empty">
                  <MessageCircle size={16} />
                  <p>Ask for a plan, a lighter week, or help shaping what comes next.</p>
                </article>
              )}

              {pending > 0 ? (
                <Link className="familiar-pending-link" to="/companion">
                  Review {pending} proposal{pending === 1 ? '' : 's'} <ArrowUpRight size={13} />
                </Link>
              ) : null}

              {error ? (
                <div className="familiar-error" role="alert">
                  <div><strong>{error.title}</strong><span>{error.detail}</span></div>
                  {error.retryable && failedPrompt ? (
                    <button type="button" onClick={() => void sendText(failedPrompt)} disabled={sending} aria-label="Retry last request">
                      <RefreshCw size={13} className={sending ? 'spin' : ''} /> Retry
                    </button>
                  ) : null}
                </div>
              ) : null}

              <form className="familiar-compose" onSubmit={submit}>
                <label className="sr-only" htmlFor="familiar-prompt">Message the familiar</label>
                <textarea
                  id="familiar-prompt"
                  rows={2}
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  placeholder="Plan next week…"
                  maxLength={5000}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !prompt.trim()} aria-label="Send message">
                  {sending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          ) : (
            <div className="familiar-offline-body">
              <p>Connect a local Ollama model or a compatible API when you want the familiar to wake up.</p>
              <Link className="familiar-connect" to="/companion">Connect a model <ArrowUpRight size={14} /></Link>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
