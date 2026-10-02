import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  CalendarDays,
  Check,
  CircleDashed,
  Flag,
  Leaf,
  Milestone as MilestoneIcon,
  NotebookPen,
  Plus,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AddTaskModal } from '../components/AddTaskModal';
import { LoadingState } from '../components/ui/LoadingState';
import { getJourneyTheme, type JourneyThemeDefinition } from '../data/journeyThemes';
import { createMilestone } from '../lib/milestones';
import { loadDateContinuity, type DateContinuity } from '../lib/continuity';
import { isDateKey } from '../lib/integrityCore';
import { saveDayMemo } from '../lib/dayRecords';
import {
  addMonths,
  buildJourneyMonth,
  dateFromKey,
  type JourneyDaySnapshot,
  type JourneyMonthSnapshot
} from '../lib/journey';
import { canPlanJourneyDay, journeyDayStateLabel } from '../lib/journeyDeskCore';
import { ensureSettings } from '../lib/settings';
import { useReducedMotionPreference } from '../hooks/useReducedMotionPreference';
import { toDateKey } from '../lib/date';
import { createTask } from '../lib/tasks';
import { weekStartKey } from '../lib/weeklyReflection';
import type { MilestoneKind, UserSettings } from '../types';
import '../journey-v026.css';
import '../journey-calendar-v0285.css';

const milestoneKinds: MilestoneKind[] = ['exam', 'deadline', 'release', 'event', 'other'];

function journeyDateParam(value: string | null) {
  if (!isDateKey(value)) return null;
  const year = Number(value.slice(0, 4));
  return year >= 1970 && year <= 9999 ? value : null;
}

function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateFromKey(dateKey));
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

interface DaySheetProps {
  day: JourneyDaySnapshot;
  today: string;
  memoDraft: string;
  memoState: 'idle' | 'saving' | 'saved';
  taskTitle: string;
  taskSaving: boolean;
  markerTitle: string;
  markerKind: MilestoneKind;
  markerOpen: boolean;
  onMemoChange: (value: string) => void;
  onMemoSave: () => void;
  onTaskTitleChange: (value: string) => void;
  onTaskSubmit: (event: FormEvent) => void;
  onOpenTaskDetails: () => void;
  onMarkerTitleChange: (value: string) => void;
  onMarkerKindChange: (value: MilestoneKind) => void;
  onMarkerOpen: (open: boolean) => void;
  onMarkerSave: () => void;
  onClose: () => void;
  taskInputRef: RefObject<HTMLInputElement | null>;
  continuity: DateContinuity | null;
}

function DaySheet(props: DaySheetProps) {
  const { day, today } = props;
  const fallbackWeekStart = weekStartKey(dateFromKey(day.date));
  const canPlan = canPlanJourneyDay(day.date, today, day.state);
  const recordedTasks = day.state === 'closed'
    ? [...day.recordCompletedTasks, ...day.carriedTasks, ...day.leftOpenTasks]
    : day.scheduledTasks;

  return (
    <motion.aside
      className={`journey026-day-sheet journey0262-day-sheet ${day.state}`}
      initial={{ opacity: 0, y: 26, rotate: 1.6, scale: .96 }}
      animate={{ opacity: 1, y: 0, rotate: -.5, scale: 1 }}
      exit={{ opacity: 0, y: 18, rotate: 1.2, scale: .97 }}
      transition={{ type: 'spring', stiffness: 290, damping: 27 }}
      aria-label={`Notes for ${formatDayHeading(day.date)}`}
    >
      <span className="journey026-sheet-tape" aria-hidden="true" />
      <button type="button" className="journey026-sheet-close" onClick={props.onClose} aria-label="Close date sheet"><X size={15} /></button>
      <header>
        <div className="journey026-sheet-number">{day.day}</div>
        <div><span>{journeyDayStateLabel(day.state).toUpperCase()}</span><h2>{formatDayHeading(day.date)}</h2></div>
      </header>

      {day.state === 'open-past' && <p className="journey026-sheet-callout">This older day is still open. Use Today’s morning handoff to archive it or carry unfinished tasks forward.</p>}

      <section className="journey026-sheet-section">
        <div className="journey026-sheet-label"><Sparkles size={12} /> Tasks</div>
        <div className="journey026-sheet-tasks">
          {recordedTasks.map(task => {
            const completed = Boolean(task.completedAt) || day.recordCompletedTasks.some(item => item.id === task.id);
            const carried = day.carriedTasks.some(item => item.id === task.id);
            const leftOpen = day.leftOpenTasks.some(item => item.id === task.id);
            return (
              <div className={`journey026-sheet-task ${completed ? 'done' : ''}`} key={`${task.id}-${carried ? 'carry' : leftOpen ? 'left' : 'task'}`}>
                {completed ? <Check size={13} /> : carried ? <ArrowRight size={13} /> : <CircleDashed size={13} />}
                <span>{task.title}</span>
                {carried && <small>carried</small>}{leftOpen && <small>left here</small>}
              </div>
            );
          })}
          {!recordedTasks.length && <p className="journey026-empty-ink">Nothing is written here yet.</p>}
        </div>

        {canPlan && (
          <form className="journey026-write-task" onSubmit={props.onTaskSubmit}>
            <Plus size={14} />
            <input
              ref={props.taskInputRef}
              value={props.taskTitle}
              onChange={event => props.onTaskTitleChange(event.target.value)}
              placeholder="Write a task on this day…"
              aria-label="New task title"
            />
            <button type="submit" disabled={!props.taskTitle.trim() || props.taskSaving}>{props.taskSaving ? '…' : 'Add'}</button>
          </form>
        )}
        {canPlan && <button type="button" className="journey026-details-link" onClick={props.onOpenTaskDetails}>Add task with details</button>}
      </section>

      <section className="journey026-sheet-section note">
        <div className="journey026-sheet-label"><NotebookPen size={12} /> Note <span>{props.memoState === 'saving' ? 'saving…' : props.memoState === 'saved' ? 'saved' : ''}</span></div>
        {day.state === 'closed' ? (
          <p className={day.memo.trim() ? 'journey026-archive-note' : 'journey026-empty-ink'}>{day.memo.trim() || 'No note was left on this date.'}</p>
        ) : (
          <textarea value={props.memoDraft} onChange={event => props.onMemoChange(event.target.value)} onBlur={props.onMemoSave} placeholder="A line for future you…" maxLength={420} />
        )}
      </section>

      <section className="journey026-sheet-section journey032-thread" aria-label="Threads from this date">
        <div className="journey026-sheet-label"><Sparkles size={12} /> Threads</div>
        <div className="journey032-thread-lines">
          <Link to="/roadmap">
            <span>ROADMAP</span>
            <strong>{props.continuity ? (props.continuity.dayPhase?.title ?? (props.continuity.roadmap.primary ? `This week touches ${props.continuity.roadmap.primary.title}.` : 'No chapter covers this date.')) : 'Open this date in the wider route.'}</strong>
            <small>open <ArrowRight size={10} /></small>
          </Link>
          <Link to={`/reflection?week=${props.continuity?.weekStart ?? fallbackWeekStart}`}>
            <span>REFLECTION</span>
            <strong>{props.continuity ? (props.continuity.reflectionStarted ? 'This week already has a thread.' : 'One sentence is enough.') : 'Open this week as one reflection.'}</strong>
            <small>{props.continuity?.reflectionStarted ? 'continue' : 'reflect'} <ArrowRight size={10} /></small>
          </Link>
          <Link to={`/memories?date=${day.date}`}>
            <span>MEMORIES</span>
            <strong>{props.continuity ? (props.continuity.memoryCount ? `${props.continuity.memoryCount} ${props.continuity.memoryCount === 1 ? 'memory' : 'memories'} kept on this day.` : 'Nothing has been kept from this day yet.') : 'Open the vault at this date.'}</strong>
            <small>{props.continuity?.memoryCount ? 'open' : 'vault'} <Archive size={10} /></small>
          </Link>
        </div>
      </section>

      <section className="journey026-sheet-section markers">
        <div className="journey026-sheet-label"><MilestoneIcon size={12} /> Markers</div>
        <div className="journey026-marker-row">
          {day.milestones.map(item => <span key={item.id} className={`journey026-marker ${item.kind}`}><Flag size={10} /> {item.title}</span>)}
          {!day.milestones.length && <span className="journey026-empty-marker">No marker</span>}
        </div>
        {canPlan && !props.markerOpen && <button type="button" className="journey026-details-link" onClick={() => props.onMarkerOpen(true)}>+ mark this date</button>}
        {canPlan && props.markerOpen && (
          <div className="journey026-marker-form">
            <input value={props.markerTitle} onChange={event => props.onMarkerTitleChange(event.target.value)} placeholder="Exam, deadline, event…" />
            <select value={props.markerKind} onChange={event => props.onMarkerKindChange(event.target.value as MilestoneKind)}>{milestoneKinds.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select>
            <button type="button" onClick={props.onMarkerSave} disabled={!props.markerTitle.trim()}>Save</button>
            <button type="button" onClick={() => props.onMarkerOpen(false)}>Cancel</button>
          </div>
        )}
      </section>

      {day.state === 'closed' && <footer><Leaf size={12} /> Archived days stay read-only here.</footer>}
    </motion.aside>
  );
}

export function CalendarPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const reducedMotion = useReducedMotionPreference(Boolean(settings?.reducedMotion));
  const today = toDateKey();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const requestedDate = journeyDateParam(dateParam);
  const initialDate = requestedDate ?? today;
  const [cursor, setCursor] = useState(() => dateFromKey(initialDate));
  const [direction, setDirection] = useState(0);
  const [snapshot, setSnapshot] = useState<JourneyMonthSnapshot | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [sheetOpen, setSheetOpen] = useState(Boolean(requestedDate));
  const [continuity, setContinuity] = useState<DateContinuity | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSaving, setTaskSaving] = useState(false);
  const [memoDraft, setMemoDraft] = useState('');
  const [memoState, setMemoState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [markerOpen, setMarkerOpen] = useState(false);
  const [markerTitle, setMarkerTitle] = useState('');
  const [markerKind, setMarkerKind] = useState<MilestoneKind>('event');
  const taskInputRef = useRef<HTMLInputElement>(null);
  const monthRequestRef = useRef(0);
  const continuityRequestRef = useRef(0);

  useEffect(() => { void ensureSettings().then(setSettings); }, []);

  async function refresh(nextCursor = cursor) {
    const requestId = ++monthRequestRef.current;
    const month = await buildJourneyMonth(nextCursor);
    if (requestId !== monthRequestRef.current) return;
    setSnapshot(month);
  }

  useEffect(() => { void refresh(cursor); }, [cursor.getFullYear(), cursor.getMonth()]);
  const selected = useMemo(() => snapshot?.days.find(day => day.date === selectedDate) ?? null, [snapshot, selectedDate]);
  const activeTheme = getJourneyTheme(settings?.journeyCalendarTheme);

  useEffect(() => {
    const nextDate = journeyDateParam(dateParam);
    if (!nextDate || (nextDate === selectedDate && sheetOpen)) return;
    const target = dateFromKey(nextDate);
    setDirection(0);
    setCursor(new Date(target.getFullYear(), target.getMonth(), 1, 12, 0, 0));
    setSelectedDate(nextDate);
    setSheetOpen(true);
  }, [dateParam]);

  useEffect(() => {
    const requestId = ++continuityRequestRef.current;
    setContinuity(null);
    void loadDateContinuity(selectedDate).then(next => {
      if (requestId === continuityRequestRef.current) setContinuity(next);
    }).catch(() => {
      if (requestId === continuityRequestRef.current) setContinuity(null);
    });
  }, [selectedDate]);

  useEffect(() => {
    setMemoDraft(selected?.memo ?? '');
    setMemoState('idle');
    setTaskTitle('');
    setMarkerOpen(false);
    setMarkerTitle('');
  }, [selectedDate, selected?.memo]);

  function closeSheet() {
    setSheetOpen(false);
    setSearchParams({}, { replace: true });
  }

  function moveMonth(amount: number) {
    setDirection(amount);
    const next = addMonths(cursor, amount);
    const nextDate = toDateKey(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setCursor(next);
    setSelectedDate(nextDate);
    setSheetOpen(false);
    setSearchParams({}, { replace: true });
  }

  function jumpToday(openSheet = false) {
    const now = new Date();
    setDirection(now.getTime() > cursor.getTime() ? 1 : -1);
    setCursor(now);
    setSelectedDate(today);
    setSheetOpen(openSheet);
    setSearchParams(openSheet ? { date: today } : {}, { replace: true });
  }

  function selectDay(day: JourneyDaySnapshot) {
    if (!day.inMonth) {
      const target = dateFromKey(day.date);
      setDirection(target < cursor ? -1 : 1);
      setCursor(new Date(target.getFullYear(), target.getMonth(), 1, 12));
    }
    setSelectedDate(day.date);
    setSheetOpen(true);
    setSearchParams({ date: day.date }, { replace: true });
  }

  async function saveMemo() {
    if (!selected || selected.state === 'closed' || memoDraft === selected.memo) return;
    setMemoState('saving');
    await saveDayMemo(selected.date, memoDraft);
    setMemoState('saved');
    await refresh();
    window.setTimeout(() => setMemoState('idle'), 1000);
  }

  async function quickAddTask(event: FormEvent) {
    event.preventDefault();
    if (!selected || !taskTitle.trim() || !canPlanJourneyDay(selected.date, today, selected.state)) return;
    setTaskSaving(true);
    try {
      await createTask({ title: taskTitle.trim(), category: 'Projects', difficulty: 'normal', dueDate: selected.date });
      setTaskTitle('');
      await refresh();
      window.setTimeout(() => taskInputRef.current?.focus(), 0);
    } finally {
      setTaskSaving(false);
    }
  }

  async function addMarker() {
    if (!selected || !markerTitle.trim() || !canPlanJourneyDay(selected.date, today, selected.state)) return;
    await createMilestone({ title: markerTitle.trim(), date: selected.date, kind: markerKind });
    setMarkerTitle('');
    setMarkerOpen(false);
    await refresh();
  }

  if (!snapshot) {
    return <div className="page journey-page"><LoadingState className="journey-loading" icon={<CalendarDays size={18} />} title="Opening the room…" detail="Rebuilding this month from local history." /></div>;
  }

  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(snapshot.year, snapshot.month, 1));
  const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className={`page journey-page journey0285-page journey-theme-${activeTheme.id}`} style={calendarStyle(activeTheme)}>
      <section className="journey0285-shell">
        <header className="journey0285-header">
          <div>
            <span>JOURNEY · CALENDAR</span>
            <h1>Move through time on the page.</h1>
            <p>Choose a date to reveal its paper sheet. Nothing stays open beside the calendar unless you ask for it.</p>
          </div>
          <button type="button" className="journey0285-today" onClick={() => jumpToday(false)}><RotateCcw size={14} /> Today</button>
        </header>

        <div
          className={`journey0285-stage ${sheetOpen ? 'sheet-open' : ''}`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
            if (event.key === 'ArrowLeft' && event.altKey) { event.preventDefault(); moveMonth(-1); }
            if (event.key === 'ArrowRight' && event.altKey) { event.preventDefault(); moveMonth(1); }
            if (event.key === 'Escape') closeSheet();
          }}
        >
          <div className="journey0285-calendar-wrap" aria-label={`${monthName} ${snapshot.year} Journey calendar`}>
            <div className="journey0285-calendar-shadow" aria-hidden="true" />
            <div className="journey0285-board">
              <div className="journey0285-rings" aria-hidden="true">{Array.from({ length: 9 }).map((_, index) => <i key={index} />)}</div>
              <div className="journey0285-stack" aria-hidden="true"><i /><i /></div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={snapshot.monthKey}
                  className="journey0285-paper"
                  initial={reducedMotion ? { opacity: 0 } : { x: direction >= 0 ? 22 : -22, y: 5, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { x: direction >= 0 ? -18 : 18, y: 3, opacity: 0 }}
                  transition={reducedMotion ? { duration: .06 } : { duration: .22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <header className="journey0285-calendar-header">
                    <div>
                      <small>{snapshot.year}</small>
                      <h2>{monthName}</h2>
                      <span className="journey0285-theme-signature" aria-hidden="true"><b>{activeTheme.mark}</b><em>{activeTheme.name}</em></span>
                    </div>
                    <button type="button" onClick={() => jumpToday(false)}>today</button>
                  </header>

                  <div className="journey0285-weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
                  <div className="journey0285-grid">
                    {snapshot.days.map((day, index) => {
                      const marks = day.scheduledTasks.length + day.milestones.length + (day.memo.trim() ? 1 : 0);
                      return (
                        <button
                          type="button"
                          key={day.date}
                          className={`${day.inMonth ? '' : 'outside'} ${day.date === selectedDate ? 'selected' : ''} ${day.state}`}
                          onClick={() => selectDay(day)}
                          aria-label={`${day.date}${marks ? `, ${marks} saved items` : ''}`}
                        >
                          <span>{day.day}</span>
                          <em aria-hidden="true">
                            {day.completedCount > 0 && <i className="complete" />}
                            {day.milestones.length > 0 && <i className="marker" />}
                            {day.memo.trim() && <i className="note" />}
                          </em>
                          {index % 7 === 6 && <b aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <footer>
                    <span>{snapshot.completedTasks} completed</span>
                    <span>{snapshot.milestoneCount} markers</span>
                    <span>{snapshot.memoDays} notes</span>
                  </footer>
                </motion.div>
              </AnimatePresence>

              <button type="button" className="journey0285-page-turn prev" onClick={() => moveMonth(-1)} aria-label="Previous month"><ArrowLeft size={18} /></button>
              <button type="button" className="journey0285-page-turn next" onClick={() => moveMonth(1)} aria-label="Next month"><ArrowRight size={18} /></button>
            </div>
          </div>

          <AnimatePresence>{sheetOpen && selected && (
            <DaySheet
              day={selected}
              today={today}
              memoDraft={memoDraft}
              memoState={memoState}
              taskTitle={taskTitle}
              taskSaving={taskSaving}
              markerTitle={markerTitle}
              markerKind={markerKind}
              markerOpen={markerOpen}
              onMemoChange={setMemoDraft}
              onMemoSave={() => void saveMemo()}
              onTaskTitleChange={setTaskTitle}
              onTaskSubmit={quickAddTask}
              onOpenTaskDetails={() => setTaskModalOpen(true)}
              onMarkerTitleChange={setMarkerTitle}
              onMarkerKindChange={setMarkerKind}
              onMarkerOpen={setMarkerOpen}
              onMarkerSave={() => void addMarker()}
              onClose={closeSheet}
              taskInputRef={taskInputRef}
              continuity={continuity}
            />
          )}</AnimatePresence>
        </div>

        <footer className="journey0285-help">
          <span>Click any date to open its temporary paper sheet.</span>
          <span><kbd>Alt</kbd> + <kbd>←</kbd>/<kbd>→</kbd> turns months · <kbd>Esc</kbd> closes the sheet.</span>
        </footer>
      </section>

      <AddTaskModal open={taskModalOpen} defaultDate={selectedDate} onClose={() => setTaskModalOpen(false)} onSaved={() => void refresh()} />
    </div>
  );
}
