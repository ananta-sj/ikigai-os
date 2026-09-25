import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Flag,
  Leaf,
  Milestone as MilestoneIcon,
  NotebookPen,
  Plus,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AddTaskModal } from '../components/AddTaskModal';
import { PageHeader } from '../components/ui/PageHeader';
import { IkButton } from '../components/ui/IkButton';
import { getJourneyTheme, type JourneyThemeDefinition } from '../data/journeyThemes';
import { createMilestone } from '../lib/milestones';
import { saveDayMemo } from '../lib/dayRecords';
import {
  addMonths,
  buildJourneyMonth,
  buildYearActivity,
  dateFromKey,
  type JourneyDaySnapshot,
  type JourneyMonthSnapshot
} from '../lib/journey';
import { ensureSettings } from '../lib/settings';
import { toDateKey } from '../lib/date';
import type { MilestoneKind, Task, UserSettings } from '../types';
import '../journey-v071.css';

const weekdays = [
  { en: 'MON', jp: '月' },
  { en: 'TUE', jp: '火' },
  { en: 'WED', jp: '水' },
  { en: 'THU', jp: '木' },
  { en: 'FRI', jp: '金' },
  { en: 'SAT', jp: '土' },
  { en: 'SUN', jp: '日' }
];
const milestoneKinds: MilestoneKind[] = ['exam', 'deadline', 'release', 'event', 'other'];

function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateFromKey(dateKey));
}

function taskLabel(task: Task) {
  return task.completedAt ? 'done' : task.difficulty;
}

function calendarStyle(theme: JourneyThemeDefinition) {
  return {
    '--jc-paper': theme.paper,
    '--jc-paper-alt': theme.paperAlt,
    '--jc-ink': theme.ink,
    '--jc-muted': theme.mutedInk,
    '--jc-rule': theme.rule,
    '--jc-accent': theme.accent,
    '--jc-sunday': theme.sunday,
    '--jc-saturday': theme.saturday,
    '--jc-board': theme.board,
    '--jc-binding': theme.binding,
    '--jc-shadow': theme.shadow
  } as CSSProperties;
}

function CalendarArtwork({ theme, month, year }: { theme: JourneyThemeDefinition; month: number; year: number }) {
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(year, month, 1));

  if (theme.visual === 'landscape') {
    return (
      <div className="journey-artwork landscape" aria-hidden="true">
        <svg viewBox="0 0 900 220" role="presentation">
          <defs>
            <linearGradient id="journey-sky" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#7ebce1" />
              <stop offset="1" stopColor="#d7ecf2" />
            </linearGradient>
            <linearGradient id="journey-snow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fbfbf7" />
              <stop offset="1" stopColor="#c8d0cf" />
            </linearGradient>
          </defs>
          <rect width="900" height="220" fill="url(#journey-sky)" />
          <path d="M70 210 L390 55 L465 88 L520 68 L815 210 Z" fill="#8d7367" />
          <path d="M205 150 L390 55 L465 88 L520 68 L650 150 L520 112 L455 126 L390 96 Z" fill="url(#journey-snow)" />
          <path d="M0 190 C140 158 240 188 350 178 C500 166 640 148 900 190 L900 220 L0 220 Z" fill="#eef2ee" />
          <g fill="#27413a" opacity=".75">
            {Array.from({ length: 21 }, (_, i) => <path key={i} d={`M${20 + i * 44} 205 l12 -35 l12 35 z`} />)}
          </g>
        </svg>
        <span>{monthName} · {year} / seasonal plate</span>
      </div>
    );
  }

  if (theme.visual === 'study') {
    const cards = [['近', 'near'], ['遠', 'far'], ['世', 'world'], ['去', 'past'], ['別', 'separate'], ['勉', 'study']];
    return (
      <div className="journey-artwork study" aria-hidden="true">
        {cards.map(([kanji, label]) => <div key={kanji}><b>{kanji}</b><span>{label}</span></div>)}
        <small>small things learned become part of the month.</small>
      </div>
    );
  }

  if (theme.visual === 'nihon') {
    return (
      <div className="journey-artwork nihon" aria-hidden="true">
        <span className="sakura sakura-a">✿</span>
        <span className="sakura sakura-b">✿</span>
        <div><b>{month + 1}月</b><span>{monthName.toUpperCase()}</span></div>
        <p>月々の記録 · days kept in ink</p>
      </div>
    );
  }

  if (theme.visual === 'night') {
    return (
      <div className="journey-artwork night" aria-hidden="true">
        <svg viewBox="0 0 900 150" role="presentation">
          <circle cx="710" cy="54" r="32" fill="#e8efe7" opacity=".9" />
          <circle cx="724" cy="44" r="32" fill="#151a19" />
          {[[70,40],[126,75],[205,34],[300,62],[548,42],[815,86],[865,36]].map(([x,y], index) => <circle key={index} cx={x} cy={y} r="2.4" fill="#a9c4b4" />)}
          <path d="M0 126 C145 88 250 132 392 112 C510 95 674 90 900 125 L900 150 L0 150 Z" fill="#1d2823" />
        </svg>
        <span>{monthName} after dark</span>
      </div>
    );
  }

  return (
    <div className="journey-artwork washi" aria-hidden="true">
      <span>{String(month + 1).padStart(2, '0')}</span>
      <div><b>{monthName}</b><small>{year} · 月暦</small></div>
    </div>
  );
}

function DayCell({ day, onSelect, selected, weekdayIndex }: { day: JourneyDaySnapshot; onSelect: () => void; selected: boolean; weekdayIndex: number }) {
  const primaryMilestone = day.milestones[0];
  const primaryTask = day.scheduledTasks[0];
  const stateLabel = day.state === 'open-past' ? 'UNTORN' : day.state === 'today' ? 'TODAY' : '';
  const weekendClass = weekdayIndex === 5 ? 'saturday' : weekdayIndex === 6 ? 'sunday' : '';

  return (
    <button
      type="button"
      className={`journey-day ${day.inMonth ? '' : 'outside'} ${day.state} ${selected ? 'selected' : ''} ${weekendClass}`}
      onClick={onSelect}
      aria-label={formatDayHeading(day.date)}
    >
      {day.state === 'closed' && <span className="journey-ink-cross" aria-hidden="true" />}
      <div className="journey-day-top">
        <span className="journey-day-number">{day.day}</span>
        {stateLabel && <small>{stateLabel}</small>}
      </div>

      <div className="journey-day-content">
        {primaryMilestone && <span className={`journey-marker ${primaryMilestone.kind}`}><Flag size={9} /> {primaryMilestone.title}</span>}
        {primaryTask && <span className={primaryTask.completedAt ? 'journey-task-preview done' : 'journey-task-preview'}>{primaryTask.completedAt ? <Check size={9} /> : <span className="journey-dot" />}{primaryTask.title}</span>}
      </div>

      <div className="journey-day-footer">
        <span>{day.completedCount ? `${day.completedCount}✓` : ''}</span>
        <span>{day.memo.trim() ? <NotebookPen size={10} /> : null}</span>
        <span>{day.milestones.length > 1 || day.scheduledTasks.length > 1 ? `+${Math.max(day.milestones.length - 1, 0) + Math.max(day.scheduledTasks.length - 1, 0)}` : ''}</span>
      </div>
    </button>
  );
}

export function CalendarPage() {
  const today = toDateKey();
  const [cursor, setCursor] = useState(() => new Date());
  const [direction, setDirection] = useState(0);
  const [snapshot, setSnapshot] = useState<JourneyMonthSnapshot | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [memoState, setMemoState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [markerOpen, setMarkerOpen] = useState(false);
  const [markerTitle, setMarkerTitle] = useState('');
  const [markerKind, setMarkerKind] = useState<MilestoneKind>('event');
  const [yearActivity, setYearActivity] = useState<Array<{ month: number; completed: number; closed: number; milestones: number; score: number }>>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => { void ensureSettings().then(setSettings); }, []);

  async function refresh(nextCursor = cursor) {
    const [month, year] = await Promise.all([
      buildJourneyMonth(nextCursor),
      buildYearActivity(nextCursor.getFullYear())
    ]);
    setSnapshot(month);
    setYearActivity(year);
  }

  useEffect(() => { void refresh(cursor); }, [cursor.getFullYear(), cursor.getMonth()]);

  const selected = useMemo(() => snapshot?.days.find(day => day.date === selectedDate) ?? null, [snapshot, selectedDate]);
  const activeTheme = getJourneyTheme(settings?.journeyCalendarTheme);

  useEffect(() => {
    setMemoDraft(selected?.memo ?? '');
    setMemoState('idle');
    setMarkerOpen(false);
    setMarkerTitle('');
  }, [selectedDate, selected?.memo]);

  function moveMonth(amount: number) {
    setDirection(amount);
    const next = addMonths(cursor, amount);
    setCursor(next);
    setSelectedDate(toDateKey(new Date(next.getFullYear(), next.getMonth(), 1, 12)));
  }

  function jumpToday() {
    const now = new Date();
    setDirection(now.getTime() > cursor.getTime() ? 1 : -1);
    setCursor(now);
    setSelectedDate(today);
  }

  function selectDay(day: JourneyDaySnapshot) {
    if (!day.inMonth) {
      const target = dateFromKey(day.date);
      setDirection(target < cursor ? -1 : 1);
      setCursor(new Date(target.getFullYear(), target.getMonth(), 1, 12));
    }
    setSelectedDate(day.date);
  }

  async function saveMemo() {
    if (!selected || selected.state === 'closed') return;
    setMemoState('saving');
    await saveDayMemo(selected.date, memoDraft);
    setMemoState('saved');
    await refresh();
    window.setTimeout(() => setMemoState('idle'), 1100);
  }

  async function addMarker() {
    if (!selected || !markerTitle.trim() || selected.date < today) return;
    await createMilestone({ title: markerTitle.trim(), date: selected.date, kind: markerKind });
    setMarkerTitle('');
    setMarkerOpen(false);
    await refresh();
  }

  if (!snapshot) {
    return <div className="page journey-page"><div className="journey-loading"><CalendarDays size={18} /> Hanging the calendar…</div></div>;
  }

  const monthTransition = settings?.reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, rotateX: direction >= 0 ? -9 : 7, y: direction >= 0 ? 18 : -12 },
        animate: { opacity: 1, rotateX: 0, y: 0 },
        exit: { opacity: 0, rotateX: direction >= 0 ? 7 : -9, y: direction >= 0 ? -12 : 18 }
      };
  const maxYearScore = Math.max(1, ...yearActivity.map(item => item.score));
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(snapshot.year, snapshot.month, 1));

  return (
    <div className={`page journey-page journey-theme-${activeTheme.id}`} style={calendarStyle(activeTheme)}>
      <section className="journey-shell">
        <PageHeader
          className="journey-header"
          eyebrow="JOURNEY CALENDAR · LOCAL"
          title="A real calendar for the days you actually lived."
          description="Turn the month like paper. Click a date to read or write on it. Torn Daily Pages remain crossed out here forever."
          actions={<IkButton size="sm" variant="quiet" className="journey-today-button" onClick={jumpToday}><RotateCcw size={14} /> Today</IkButton>}
        />

        <div className="journey-calendar-scene">
          <main className="journey-calendar-object" aria-label={`${monthName} ${snapshot.year} calendar`}>
            <div className="journey-calendar-backing" />
            <div className="journey-hanger" aria-hidden="true"><span /><i /></div>
            <div className="journey-binding" aria-hidden="true">
              {Array.from({ length: 11 }, (_, index) => <span key={index}><i /></span>)}
            </div>

            <section className="journey-calendar-paper">
              <CalendarArtwork theme={activeTheme} month={snapshot.month} year={snapshot.year} />

              <div className="journey-month-bar">
                <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ArrowLeft size={17} /></button>
                <div>
                  <span>{snapshot.year}</span>
                  <h2>{monthName}</h2>
                  <small>{String(snapshot.month + 1).padStart(2, '0')} / {String(snapshot.year).slice(-2)}</small>
                </div>
                <button type="button" onClick={() => moveMonth(1)} aria-label="Next month"><ArrowRight size={17} /></button>
              </div>

              <div className="journey-weekdays">
                {weekdays.map((day, index) => <span key={day.en} className={index === 5 ? 'saturday' : index === 6 ? 'sunday' : ''}><b>{day.jp}</b><small>{day.en}</small></span>)}
              </div>

              <div className="journey-calendar-stage">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={snapshot.monthKey}
                    className="journey-grid"
                    variants={monthTransition}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: settings?.reducedMotion ? .08 : .32, ease: [0.2, 0.75, 0.2, 1] }}
                    style={{ transformOrigin: 'top center' }}
                  >
                    {snapshot.days.map((day, index) => (
                      <DayCell key={day.date} day={day} weekdayIndex={index % 7} selected={selectedDate === day.date} onSelect={() => selectDay(day)} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              <footer className="journey-paper-footer">
                <span>{snapshot.completedTasks} completed</span>
                <span>{snapshot.closedDays} archived pages</span>
                <span>{snapshot.memoDays} written days</span>
                <span>{snapshot.milestoneCount} markers</span>
              </footer>
            </section>
          </main>

          <aside className="journey-inspector">
            <span className="journey-note-pin" aria-hidden="true" />
            {selected ? (
              <>
                <div className="journey-inspector-head">
                  <div className="journey-selected-number">{selected.day}</div>
                  <div>
                    <span>{selected.state === 'closed' ? 'ARCHIVED PAGE' : selected.state === 'open-past' ? 'UNTORN PAGE' : selected.state === 'today' ? 'TODAY' : 'PLANNED DAY'}</span>
                    <h2>{formatDayHeading(selected.date)}</h2>
                  </div>
                  <span className={`journey-state-seal ${selected.state}`}>{selected.state === 'closed' ? '×' : selected.state === 'today' ? '◎' : '○'}</span>
                </div>

                {selected.state === 'open-past' && (
                  <div className="journey-callout"><Clock3 size={15} /><div><strong>This page is still waiting.</strong><span>Tear it from Daily Page before it becomes part of the permanent archive.</span></div></div>
                )}

                <section className="journey-inspector-section">
                  <div className="journey-section-title"><Sparkles size={13} /> QUESTS</div>
                  <div className="journey-inspector-list">
                    {selected.state === 'closed' ? (
                      <>
                        {selected.recordCompletedTasks.map(task => <div className="journey-inspector-row done" key={`done-${task.id}`}><Check size={14} /><div><strong>{task.title}</strong><span>{task.category} · completed</span></div></div>)}
                        {selected.carriedTasks.map(task => <div className="journey-inspector-row carried" key={`carry-${task.id}`}><ChevronRight size={14} /><div><strong>{task.title}</strong><span>{task.category} · carried forward</span></div></div>)}
                        {selected.leftOpenTasks.map(task => <div className="journey-inspector-row open" key={`open-${task.id}`}><CircleDashed size={14} /><div><strong>{task.title}</strong><span>{task.category} · left unfinished</span></div></div>)}
                      </>
                    ) : (
                      selected.scheduledTasks.map(task => <div className={task.completedAt ? 'journey-inspector-row done' : 'journey-inspector-row'} key={task.id}>{task.completedAt ? <Check size={14} /> : <CircleDashed size={14} />}<div><strong>{task.title}</strong><span>{task.category} · {taskLabel(task)}</span></div></div>)
                    )}
                    {!selected.scheduledTasks.length && !selected.completedHere.length && !(selected.record?.completedTaskIds.length || selected.record?.carriedTaskIds.length || selected.record?.leftOpenTaskIds.length) && <div className="journey-empty-line">Nothing written into this square yet.</div>}
                  </div>
                  {selected.date >= today && selected.state !== 'closed' && <button type="button" className="journey-inline-action" onClick={() => setTaskModalOpen(true)}><Plus size={14} /> Add quest</button>}
                </section>

                <section className="journey-inspector-section">
                  <div className="journey-section-title"><NotebookPen size={13} /> NOTE <span className={`journey-memo-state ${memoState}`}>{memoState === 'saving' ? 'saving…' : memoState === 'saved' ? 'saved' : ''}</span></div>
                  {selected.state === 'closed' ? (
                    <div className={selected.memo.trim() ? 'journey-archive-note' : 'journey-archive-note empty'}>{selected.memo.trim() || 'No note was left on this date.'}</div>
                  ) : (
                    <textarea value={memoDraft} onChange={event => setMemoDraft(event.target.value)} onBlur={() => void saveMemo()} placeholder="Write directly on this date…" maxLength={280} />
                  )}
                </section>

                <section className="journey-inspector-section">
                  <div className="journey-section-title"><MilestoneIcon size={13} /> MARKERS</div>
                  <div className="journey-marker-list">
                    {selected.milestones.map(item => <div key={item.id} className={`journey-marker-card ${item.kind}`}><Flag size={13} /><div><strong>{item.title}</strong><span>{item.kind}</span></div></div>)}
                    {!selected.milestones.length && <div className="journey-empty-line">No exam, deadline or event marked here.</div>}
                  </div>
                  {selected.date >= today && !markerOpen && <button type="button" className="journey-inline-action" onClick={() => setMarkerOpen(true)}><Plus size={14} /> Add marker</button>}
                  {markerOpen && (
                    <div className="journey-marker-form">
                      <input autoFocus value={markerTitle} onChange={event => setMarkerTitle(event.target.value)} placeholder="e.g. Important event" />
                      <select value={markerKind} onChange={event => setMarkerKind(event.target.value as MilestoneKind)}>{milestoneKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select>
                      <div><button type="button" onClick={() => setMarkerOpen(false)}>Cancel</button><button type="button" disabled={!markerTitle.trim()} onClick={() => void addMarker()}>Save</button></div>
                    </div>
                  )}
                </section>

                {selected.state === 'closed' && <div className="journey-history-rule"><Leaf size={14} /> Torn Daily Pages stay read-only here. The mark remains; the day does not reopen.</div>}
              </>
            ) : null}
          </aside>
        </div>

        <section className="journey-year-rail">
          <div className="journey-year-rail-heading"><span>{snapshot.year} · YEAR INDEX</span><small>Jump between the calendar's pages.</small></div>
          <div className="journey-year-months">
            {yearActivity.map(item => {
              const active = item.month === snapshot.month;
              const strength = item.score / maxYearScore;
              return (
                <button
                  type="button"
                  key={item.month}
                  className={active ? 'active' : ''}
                  onClick={() => {
                    const amount = item.month - cursor.getMonth();
                    setDirection(amount >= 0 ? 1 : -1);
                    const next = new Date(snapshot.year, item.month, 1, 12);
                    setCursor(next);
                    setSelectedDate(toDateKey(next));
                  }}
                >
                  <span>{new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(snapshot.year, item.month, 1)).toUpperCase()}</span>
                  <i style={{ '--activity': Math.max(.08, strength) } as CSSProperties} />
                </button>
              );
            })}
          </div>
        </section>
      </section>

      <AddTaskModal open={taskModalOpen} defaultDate={selectedDate} onClose={() => setTaskModalOpen(false)} onSaved={() => void refresh()} />
    </div>
  );
}
