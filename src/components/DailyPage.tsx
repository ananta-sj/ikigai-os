import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { ArrowUpRight, CalendarDays, PenLine, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { closeDay, reopenDay, saveDayMemo, type CloseDayMode } from '../lib/dayRecords';
import type { DailyPageTheme, DayRecord, Task } from '../types';

interface DailyPageProps {
  date: Date;
  tasks: Task[];
  record: DayRecord;
  theme: DailyPageTheme;
  showMiniMonth: boolean;
  reducedMotion: boolean;
  tearSound: boolean;
  onMemoSaved?: (record: DayRecord) => void;
  onDayClosed?: (record: DayRecord) => void;
  onDayReopened?: (record: DayRecord) => void;
}

const jpWeekdays = ['日', '月', '火', '水', '木', '金', '土'];
const jpWeekdayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const LIFT_THRESHOLD = 58;
const SWIPE_THRESHOLD = 92;
const MAX_LIFT = 112;
const MAX_SWIPE = 188;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
}

function miniMonthCells(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const sundayOffset = first.getDay();
  const cells: Array<number | null> = [];

  for (let i = 0; i < sundayOffset; i += 1) cells.push(null);
  for (let day = 1; day <= last.getDate(); day += 1) cells.push(day);
  while (cells.length < 42) cells.push(null);
  return cells;
}

function MiniMonth({ date, label }: { date: Date; label: string }) {
  const cells = useMemo(() => miniMonthCells(date), [date]);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase();

  return (
    <div className="himekuri-mini" aria-label={`${label} ${month} ${date.getFullYear()}`}>
      <div className="himekuri-mini-title"><span>{label}</span><b>{month}</b></div>
      <div className="himekuri-mini-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
      <div className="himekuri-mini-grid">
        {cells.map((day, index) => <span key={`${label}-${index}`}>{day ?? ''}</span>)}
      </div>
    </div>
  );
}

function NextSheetPreview({ date, theme, revealed = false }: { date: Date; theme: DailyPageTheme; revealed?: boolean }) {
  const monthEn = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase();
  const weekdayEn = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).toUpperCase();

  return (
    <div className={`himekuri-next-sheet theme-${theme}${revealed ? ' revealed' : ''}`} aria-hidden={!revealed}>
      <div className="himekuri-next-top"><span>TOMORROW</span><b>{date.getFullYear()}</b></div>
      <div className="himekuri-next-body">
        <aside><strong>{jpWeekdays[date.getDay()]}</strong><span>{weekdayEn}</span></aside>
        <main><small>{monthEn}</small><strong>{date.getDate()}</strong></main>
        <aside className="right"><strong>{date.getMonth() + 1}</strong><span>月</span></aside>
      </div>
      <div className="himekuri-next-footer">A fresh page is waiting.</div>
    </div>
  );
}

function playSyntheticTear() {
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const duration = 0.42;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      const t = i / data.length;
      const envelope = Math.pow(1 - t, 1.8);
      const flutter = 0.55 + 0.45 * Math.sin(i * 0.13) * Math.sin(i * 0.021);
      data[i] = (Math.random() * 2 - 1) * envelope * flutter;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = 1450;
    filter.Q.value = 0.62;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
    window.setTimeout(() => void context.close(), 700);
  } catch {
    // Audio is delight, not a dependency. Ignore browsers that block it.
  }
}

export function DailyPage({
  date,
  tasks,
  record,
  theme,
  showMiniMonth,
  reducedMotion,
  tearSound,
  onMemoSaved,
  onDayClosed,
  onDayReopened
}: DailyPageProps) {
  const [memo, setMemo] = useState(record.memo);
  const [saved, setSaved] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [tearing, setTearing] = useState(false);
  const [detached, setDetached] = useState(record.status === 'closed');
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lift = useMotionValue(0);
  const swipe = useMotionValue(0);

  // Gesture language: lift the loose bottom edge first, then sweep it right.
  // That keeps the page feeling attached to the top binding until the tear.
  const pageY = useTransform(lift, [0, MAX_LIFT], [0, -52]);
  const pageX = useTransform(swipe, [0, MAX_SWIPE], [0, 68]);
  const pageRotateX = useTransform(lift, [0, MAX_LIFT], [0, 13]);
  const pageRotateZ = useTransform(swipe, [0, MAX_SWIPE], [0, 6]);
  const pageScaleY = useTransform(lift, [0, MAX_LIFT], [1, 0.985]);
  const pageScaleX = useTransform(swipe, [0, MAX_SWIPE], [1, 0.992]);
  const peelOpacity = useTransform(lift, [0, MAX_LIFT], [0, 0.96]);
  const nextLift = useTransform(lift, [0, MAX_LIFT], [10, 0]);
  const nextOpacity = useTransform(lift, [0, 26, MAX_LIFT], [0.28, 0.64, 1]);

  const completed = tasks.filter(task => task.completedAt).length;
  const unfinished = tasks.filter(task => !task.completedAt);
  const weekdayEn = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).toUpperCase();
  const monthEn = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const tomorrow = addDays(date, 1);

  useEffect(() => {
    setMemo(record.memo);
    setSaved(true);
    setDetached(record.status === 'closed');
    lift.set(0);
    swipe.set(0);
  }, [record.date, record.memo, record.status, lift, swipe]);

  async function persistMemo() {
    if (memo === record.memo) {
      setSaved(true);
      return;
    }
    const next = await saveDayMemo(record.date, memo.trimEnd());
    setSaved(true);
    onMemoSaved?.(next);
  }

  function resetGesture() {
    setDragging(false);
    pointerStart.current = null;
    animate(lift, 0, { type: 'spring', stiffness: 360, damping: 29 });
    animate(swipe, 0, { type: 'spring', stiffness: 360, damping: 29 });
  }

  function askToClose() {
    if (record.status === 'closed' || tearing) return;
    if (unfinished.length) {
      setDecisionOpen(true);
      // Hold the paper in a slightly lifted, right-tensioned pose while the
      // user decides what to do with unfinished quests.
      animate(lift, 72, { type: 'spring', stiffness: 300, damping: 28 });
      animate(swipe, 66, { type: 'spring', stiffness: 300, damping: 28 });
      return;
    }
    void commitTear('leave');
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (record.status === 'closed' || tearing || decisionOpen) return;
    event.preventDefault();
    pointerStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || pointerStart.current === null || tearing) return;

    const rawLift = clamp(pointerStart.current.y - event.clientY, 0, MAX_LIFT);
    const rawSwipe = clamp(event.clientX - pointerStart.current.x, 0, MAX_SWIPE);

    // Horizontal peel is intentionally locked until the page has been lifted
    // a little. This creates an up -> right -> rip ritual rather than a generic
    // diagonal drag.
    const unlock = clamp((rawLift - 16) / 38, 0, 1);
    lift.set(rawLift);
    swipe.set(rawSwipe * unlock);
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }

    const liftedEnough = lift.get() >= LIFT_THRESHOLD;
    const sweptEnough = swipe.get() >= SWIPE_THRESHOLD;

    setDragging(false);
    pointerStart.current = null;

    if (liftedEnough && sweptEnough) askToClose();
    else resetGesture();
  }

  async function commitTear(mode: CloseDayMode) {
    if (tearing || record.status === 'closed') return;
    setDecisionOpen(false);

    // Seal any in-progress memo edit before changing the day's status. This
    // avoids an onBlur save racing the close transaction and reopening a page.
    if (!saved || memo !== record.memo) {
      await saveDayMemo(record.date, memo.trimEnd());
      setSaved(true);
    }

    const nextRecord = await closeDay(record.date, tasks, mode);

    if (reducedMotion) {
      setDetached(true);
      setTearing(false);
      lift.set(0);
      swipe.set(0);
      onDayClosed?.(nextRecord);
      return;
    }

    // Tension phase: settle into the same poised position every time so the
    // rip animation starts cleanly whether the user tore directly or passed
    // through the unfinished-task dialog.
    await Promise.all([
      animate(lift, 78, { duration: 0.13, ease: [0.22, 0.72, 0.2, 1] }),
      animate(swipe, 72, { duration: 0.13, ease: [0.22, 0.72, 0.2, 1] })
    ]);

    setTearing(true);

    window.setTimeout(() => {
      if (tearSound) playSyntheticTear();
      if ('vibrate' in navigator) navigator.vibrate?.([10, 18, 7]);
    }, 135);

    // Keep the stage occupied until the flying page has almost cleared it.
    // This prevents the home layout from collapsing underneath the calendar.
    window.setTimeout(() => setDetached(true), 690);
    window.setTimeout(() => {
      setTearing(false);
      lift.set(0);
      swipe.set(0);
      onDayClosed?.(nextRecord);
    }, 820);
  }

  function cancelDecision() {
    setDecisionOpen(false);
    resetGesture();
  }

  async function restorePage() {
    const nextRecord = await reopenDay(record.date);
    setDetached(false);
    lift.set(0);
    swipe.set(0);
    onDayReopened?.(nextRecord);
  }

  return (
    <div className={`himekuri-stage${dragging ? ' is-pulling' : ''}${tearing ? ' is-tearing' : ''}${detached ? ' is-closed' : ''}`}>
      <div className="himekuri-cord" aria-hidden="true"><span /><i /><span /></div>
      <div className="himekuri-hardware" aria-hidden="true">
        <i className="himekuri-screw left" />
        <strong>IKIGAI DAILY</strong>
        <i className="himekuri-screw right" />
      </div>

      <div className="himekuri-stack" aria-hidden="true"><i /><i /><i /></div>

      <motion.div
        className="himekuri-next-motion"
        style={detached ? { y: 0, opacity: 1 } : { y: nextLift, opacity: nextOpacity }}
      >
        <NextSheetPreview date={tomorrow} theme={theme} revealed={detached} />
      </motion.div>

      <AnimatePresence>
        {!detached && (
          <motion.section
            className={`daily-page-object himekuri theme-${theme}${dragging ? ' pulling' : ''}${tearing ? ' tearing' : ''}`}
            initial={reducedMotion ? false : { opacity: 0, y: 12, rotateZ: -0.5 }}
            animate={tearing && !reducedMotion
              ? {
                  // up -> sweep right -> rip -> fly away. Opacity stays solid
                  // until the sheet has physically cleared the pad.
                  opacity: [1, 1, 1, 1, 0],
                  x: [26, 42, 138, 350, 510],
                  y: [-36, -52, -58, 24, 300],
                  rotateZ: [2.2, 1.4, 8, 15, 19],
                  rotateX: [10, 14, 19, 24, 28],
                  scaleX: [0.997, 0.994, 0.985, 0.978, 0.97],
                  scaleY: [0.99, 0.985, 0.98, 0.97, 0.96]
                }
              : { opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 540, y: 330, rotateZ: 20 }}
            transition={tearing
              ? { duration: 0.78, times: [0, 0.18, 0.43, 0.84, 1], ease: [0.18, 0.72, 0.2, 1] }
              : { type: 'spring', stiffness: 150, damping: 20 }}
            style={tearing ? undefined : {
              x: pageX,
              y: pageY,
              rotateX: pageRotateX,
              rotateZ: pageRotateZ,
              scaleX: pageScaleX,
              scaleY: pageScaleY
            }}
          >
            <div className="himekuri-paper-grain" aria-hidden="true" />
            <div className="himekuri-perforation" aria-hidden="true" />
            <div className="himekuri-rip-progress" aria-hidden="true" />
            <motion.div className="himekuri-peel-shadow" style={{ opacity: peelOpacity }} aria-hidden="true" />

            <div className="himekuri-topline">
              <div><b>{date.getFullYear()}年</b><span>{monthEn}</span></div>
              <div className="himekuri-brand-mark">日めくり</div>
            </div>

            <div className="himekuri-date-layout">
              <aside className="himekuri-rail left-rail">
                <strong>{jpWeekdays[date.getDay()]}</strong>
                <span>{jpWeekdayNames[date.getDay()]}</span>
                <em>{weekdayEn}</em>
                {showMiniMonth && <MiniMonth date={previousMonth} label="PREV" />}
              </aside>

              <main className="himekuri-center">
                <span className="himekuri-month-number">{date.getMonth() + 1}月</span>
                <strong className="himekuri-day-number">{date.getDate()}</strong>
                <div className="himekuri-status-line">
                  <span>{completed}/{tasks.length || 0} QUESTS</span>
                  <i />
                  <span>{record.status.toUpperCase()}</span>
                </div>
              </main>

              <aside className="himekuri-rail right-rail">
                <strong>{date.getMonth() + 1}</strong>
                <span>月</span>
                <em>{date.getDate()}日</em>
                {showMiniMonth && <MiniMonth date={nextMonth} label="NEXT" />}
              </aside>
            </div>

            <div className="himekuri-lower-rule" />

            <div className="himekuri-memo">
              <label htmlFor="daily-page-memo"><PenLine size={12} /> MEMO</label>
              <textarea
                id="daily-page-memo"
                value={memo}
                onChange={event => { setMemo(event.target.value); setSaved(false); }}
                onBlur={persistMemo}
                maxLength={180}
                placeholder="Write one thing for today…"
              />
              <small>{saved ? 'saved locally' : 'click away to save'}</small>
            </div>

            <div className="himekuri-bottom-meta">
              <span>IKIGAI OS · {record.date}</span>
              <span>{dragging ? 'lift, then sweep right…' : 'lift edge ↑ then sweep → to close day'}</span>
            </div>

            <div
              className="himekuri-grab-edge"
              role="button"
              tabIndex={0}
              aria-label="Lift the lower edge up, then sweep right to tear off and close this day"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  askToClose();
                }
              }}
            >
              <ArrowUpRight size={12} />
              <span>lift + sweep</span>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {detached && (
        <div className="himekuri-closed-caption">
          <CalendarDays size={14} />
          <span>{formatShortDate(date)} closed · tomorrow is underneath</span>
          <button type="button" onClick={() => void restorePage()}><RotateCcw size={11} /> restore</button>
        </div>
      )}

      <AnimatePresence>
        {decisionOpen && (
          <motion.div
            className="tear-decision-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={event => { if (event.target === event.currentTarget) cancelDecision(); }}
          >
            <motion.div
              className="tear-decision-card"
              initial={reducedMotion ? false : { opacity: 0, y: 12, scale: .98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: .985 }}
            >
              <span className="tear-decision-kicker">CLOSE {record.date}</span>
              <h4>{unfinished.length} {unfinished.length === 1 ? 'quest is' : 'quests are'} still open.</h4>
              <p>What should happen before this sheet leaves the pad?</p>

              <button className="tear-choice primary" onClick={() => void commitTear('carry')}>
                <strong>Carry to tomorrow</strong>
                <span>Move {unfinished.length === 1 ? 'it' : 'them'} to {formatShortDate(tomorrow)}.</span>
              </button>
              <button className="tear-choice" onClick={() => void commitTear('leave')}>
                <strong>Leave on today</strong>
                <span>Close the page without changing the original due date.</span>
              </button>
              <button className="tear-cancel" onClick={cancelDecision}><RotateCcw size={13} /> Keep this page</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
