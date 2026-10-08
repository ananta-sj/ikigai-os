import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ChevronDown,
  NotebookPen,
  Sparkles
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { loadRoadmapThreadForWeek } from '../lib/continuity';
import type { RoadmapRangeThread } from '../lib/continuityCore';
import { isDateKey } from '../lib/integrityCore';
import { LoadingState } from '../components/ui/LoadingState';
import type { WeeklyReflection } from '../types';
import {
  addDaysKey,
  buildWeeklySnapshot,
  dateFromKey,
  formatWeekRange,
  getWeeklyReflection,
  localWeeklySummary,
  saveWeeklyReflection,
  weekStartKey,
  type WeeklySnapshot
} from '../lib/weeklyReflection';
import '../reflection-v060.css';
import '../reflection-career-v028.css';


const WEEK_PICKER_MIN_YEAR = 1970;
const WEEK_PICKER_MAX_YEAR = 9999;
const WEEK_PICKER_MIN_WEEK = weekStartKey(new Date(WEEK_PICKER_MIN_YEAR, 0, 1, 12, 0, 0));
const WEEK_PICKER_MAX_WEEK = weekStartKey(new Date(WEEK_PICKER_MAX_YEAR, 11, 31, 12, 0, 0));
const MONTH_NAMES = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(2024, month, 1)));
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function reflectionWeekParam(value: string | null) {
  if (!isDateKey(value)) return null;
  const normalized = weekStartKey(dateFromKey(value));
  return normalized >= WEEK_PICKER_MIN_WEEK && normalized <= WEEK_PICKER_MAX_WEEK ? normalized : null;
}

function roadmapThreadCopy(thread: RoadmapRangeThread | null) {
  if (!thread || thread.kind === 'none' || !thread.primary) {
    return { title: 'No Roadmap chapter crosses this week.', detail: 'The week can stay unassigned.' };
  }
  if (thread.kind === 'single') {
    return { title: thread.primary.title, detail: 'This week sits inside one Roadmap chapter.' };
  }
  if (thread.kind === 'transition') {
    return { title: `${thread.phases[0].title} → ${thread.phases[thread.phases.length - 1].title}`, detail: 'The week crosses a chapter boundary.' };
  }
  return {
    title: thread.primary.title,
    detail: `${thread.phases.length} Roadmap chapters overlap part of this week.`
  };
}

function monthCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1, 12, 0, 0);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset, 12, 0, 0);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function shiftMonth(date: Date, amount: number) {
  const year = date.getFullYear();
  const month = date.getMonth() + amount;
  const next = new Date(year, month, 1, 12, 0, 0);
  const nextYear = Math.min(WEEK_PICKER_MAX_YEAR, Math.max(WEEK_PICKER_MIN_YEAR, next.getFullYear()));
  return new Date(nextYear, nextYear === WEEK_PICKER_MIN_YEAR && next.getFullYear() < WEEK_PICKER_MIN_YEAR ? 0 : next.getMonth(), 1, 12, 0, 0);
}

function dayLabel(dateKey: string) {
  const date = dateFromKey(dateKey);
  return `${date.toLocaleDateString('en-IN', { weekday: 'short' })} ${date.getDate()}`;
}

export function ReflectionPage() {
  const currentWeek = weekStartKey();
  const [searchParams, setSearchParams] = useSearchParams();
  const weekParam = searchParams.get('week');
  const requestedWeek = reflectionWeekParam(weekParam);
  const [weekStart, setWeekStart] = useState(requestedWeek ?? currentWeek);
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  const [reflection, setReflection] = useState<WeeklyReflection | null>(null);
  const [roadmapThread, setRoadmapThread] = useState<RoadmapRangeThread | null>(null);
  const [roadmapThreadLoaded, setRoadmapThreadLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => dateFromKey(currentWeek));
  const weekPickerRef = useRef<HTMLDivElement | null>(null);
  const weekRequestRef = useRef(0);

  async function refresh(start = weekStart) {
    const requestId = ++weekRequestRef.current;
    setRoadmapThreadLoaded(false);
    setRoadmapThread(null);

    const roadmapRequest = loadRoadmapThreadForWeek(start)
      .then(nextRoadmapThread => ({ ok: true as const, nextRoadmapThread }))
      .catch(() => ({ ok: false as const, nextRoadmapThread: null }));

    const [nextSnapshot, nextReflection] = await Promise.all([
      buildWeeklySnapshot(start),
      getWeeklyReflection(start)
    ]);
    if (requestId !== weekRequestRef.current) return;
    setSnapshot(nextSnapshot);
    setReflection(nextReflection);

    const roadmapResult = await roadmapRequest;
    if (requestId !== weekRequestRef.current) return;
    if (roadmapResult.ok) {
      setRoadmapThread(roadmapResult.nextRoadmapThread);
      setRoadmapThreadLoaded(true);
    }
  }

  useEffect(() => { void refresh(weekStart); }, [weekStart]);

  useEffect(() => {
    const nextWeek = reflectionWeekParam(weekParam);
    if (nextWeek && nextWeek !== weekStart) {
      setSnapshot(null);
      setReflection(null);
      setRoadmapThread(null);
      setRoadmapThreadLoaded(false);
      setWeekStart(nextWeek);
    }
  }, [weekParam]);

  function chooseWeek(nextWeek: string) {
    const normalized = reflectionWeekParam(nextWeek) ?? currentWeek;
    if (normalized !== weekStart) {
      setSnapshot(null);
      setReflection(null);
      setRoadmapThread(null);
      setRoadmapThreadLoaded(false);
      setWeekStart(normalized);
    }
    setSearchParams({ week: normalized }, { replace: true });
  }

  useEffect(() => {
    if (!weekPickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target as Node)) setWeekPickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setWeekPickerOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [weekPickerOpen]);

  const pickerDays = useMemo(() => monthCalendarDays(pickerMonth.getFullYear(), pickerMonth.getMonth()), [pickerMonth]);
  const summary = useMemo(() => snapshot ? localWeeklySummary(snapshot) : '', [snapshot]);
  const roadmapCopy = useMemo(() => roadmapThreadCopy(roadmapThread), [roadmapThread]);

  async function persist(patch: Partial<Omit<WeeklyReflection, 'weekStart' | 'updatedAt'>>) {
    if (!reflection) return;
    const nextLocal = { ...reflection, ...patch };
    setReflection(nextLocal);
    setSaveState('saving');
    const saved = await saveWeeklyReflection(weekStart, patch);
    setReflection(saved);
    setSaveState('saved');
    window.setTimeout(() => setSaveState('idle'), 1200);
  }

  if (!snapshot || !reflection) {
    return <div className="page reflection-page"><LoadingState className="reflection-loading" icon={<Sparkles size={20} />} title="Gathering the week from local history…" detail="Tasks, day records and milestones stay local." /></div>;
  }

  return (
    <div className="page reflection-page reflection-v028">
      <section className="reflection-v028-shell">
        <PageHeader
          className="reflection-header"
          eyebrow={<><NotebookPen size={14} /> REFLECTION · OPTIONAL</>}
          title="Keep one thing from the week."
          description="A sentence is enough. Everything else can stay folded away until you want it."
          actions={
            <div className="week-switcher-wrap" ref={weekPickerRef}>
              <div className="week-switcher" aria-label="Week navigation">
                <button type="button" onClick={() => chooseWeek(weekStart > WEEK_PICKER_MIN_WEEK ? addDaysKey(weekStart, -7) : weekStart)} disabled={weekStart <= WEEK_PICKER_MIN_WEEK} aria-label="Previous week"><ArrowLeft size={16} /></button>
                <button
                  type="button"
                  className="week-range-button"
                  onClick={() => { setPickerMonth(dateFromKey(weekStart)); setWeekPickerOpen(open => !open); }}
                  aria-expanded={weekPickerOpen}
                  aria-haspopup="dialog"
                  aria-controls="reflection-week-picker"
                  title="Choose a week"
                >
                  <CalendarRange size={15} /> {formatWeekRange(weekStart)}
                </button>
                <button type="button" onClick={() => chooseWeek(weekStart < WEEK_PICKER_MAX_WEEK ? addDaysKey(weekStart, 7) : weekStart)} disabled={weekStart >= WEEK_PICKER_MAX_WEEK} aria-label="Next week"><ArrowRight size={16} /></button>
              </div>
              {weekPickerOpen ? (
                <div id="reflection-week-picker" className="week-picker" role="dialog" aria-label="Choose week">
                  <div className="week-picker-head">
                    <button type="button" onClick={() => setPickerMonth(month => shiftMonth(month, -1))} disabled={pickerMonth.getFullYear() === WEEK_PICKER_MIN_YEAR && pickerMonth.getMonth() === 0} aria-label="Previous month"><ArrowLeft size={15} /></button>
                    <div className="week-picker-period">
                      <select aria-label="Month" value={pickerMonth.getMonth()} onChange={event => setPickerMonth(new Date(pickerMonth.getFullYear(), Number(event.target.value), 1, 12, 0, 0))}>
                        {MONTH_NAMES.map((name, month) => <option key={name} value={month}>{name}</option>)}
                      </select>
                      <input
                        type="number"
                        aria-label="Year"
                        min={WEEK_PICKER_MIN_YEAR}
                        max={WEEK_PICKER_MAX_YEAR}
                        value={pickerMonth.getFullYear()}
                        onChange={event => {
                          const year = Number(event.target.value);
                          if (Number.isInteger(year) && year >= WEEK_PICKER_MIN_YEAR && year <= WEEK_PICKER_MAX_YEAR) setPickerMonth(new Date(year, pickerMonth.getMonth(), 1, 12, 0, 0));
                        }}
                      />
                    </div>
                    <button type="button" onClick={() => setPickerMonth(month => shiftMonth(month, 1))} disabled={pickerMonth.getFullYear() === WEEK_PICKER_MAX_YEAR && pickerMonth.getMonth() === 11} aria-label="Next month"><ArrowRight size={15} /></button>
                  </div>
                  <div className="week-picker-weekdays" aria-hidden="true">{WEEKDAY_LABELS.map(day => <span key={day}>{day}</span>)}</div>
                  <div className="week-picker-grid">
                    {pickerDays.map(day => {
                      const dayWeek = weekStartKey(day);
                      const inMonth = day.getMonth() === pickerMonth.getMonth();
                      const selected = dayWeek === weekStart;
                      const isToday = day.toDateString() === new Date().toDateString();
                      const selectable = day.getFullYear() >= WEEK_PICKER_MIN_YEAR && day.getFullYear() <= WEEK_PICKER_MAX_YEAR;
                      return (
                        <button
                          key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                          type="button"
                          className={`${inMonth ? '' : 'is-outside'}${selected ? ' is-selected-week' : ''}${isToday ? ' is-today' : ''}${selectable ? '' : ' is-unavailable'}`}
                          disabled={!selectable}
                          onClick={() => { chooseWeek(dayWeek); setWeekPickerOpen(false); }}
                          aria-label={`Choose week containing ${day.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="week-picker-footer">
                    <span>Date picker · 1970–9999 · Monday–Sunday weeks</span>
                    <button type="button" onClick={() => { chooseWeek(currentWeek); setPickerMonth(dateFromKey(currentWeek)); setWeekPickerOpen(false); }}>This week</button>
                  </div>
                </div>
              ) : null}
            </div>
          }
        />

        <section className="reflection-v028-card ik-surface">
          <header className="reflection-v028-prompt-head">
            <div><span>THIS WEEK</span><h2>What stayed with you?</h2></div>
            <span className={`reflection-save ${saveState}`} role="status" aria-live="polite">{saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved locally' : 'local'}</span>
          </header>
          <textarea
            className="reflection-v028-main-note"
            value={reflection.note}
            onChange={event => setReflection({ ...reflection, note: event.target.value })}
            onBlur={event => void persist({ note: event.target.value })}
            placeholder="A sentence, a feeling, a realization, or nothing at all…"
            rows={7}
          />
          <div className="reflection-v028-facts" aria-label="Week summary">
            <span><b>{snapshot.completedTasks.length}</b> completed</span>
            <span><b>{snapshot.activeDays}</b> active days</span>
            <span><b>{snapshot.carriedCount}</b> carried</span>
            <span>{summary}</span>
          </div>
        </section>

        {roadmapThreadLoaded ? (
          <section className="reflection032-continuity" aria-label="Where this week sits in Ikigai Space">
            <span>WHERE THIS WEEK SITS</span>
            <div>
              <strong>{roadmapCopy.title}</strong>
              <small>{roadmapCopy.detail}</small>
            </div>
            <nav aria-label="Week continuity links">
              <Link to={`/calendar?date=${weekStart}`}>Journey <ArrowRight size={11} /></Link>
              <Link to="/roadmap">Roadmap <ArrowRight size={11} /></Link>
            </nav>
          </section>
        ) : null}

        <details className="reflection-v028-deeper ik-surface">
          <summary><span><ChevronDown size={16} /> Reflect a little deeper</span><small>answer only what feels useful</small></summary>
          <div className="reflection-v028-deeper-body">
            <p className="reflection-v028-deeper-note">These prompts are optional. Use the ones that help you understand the week; leave the rest blank.</p>
            <label className="reflection-v028-deeper-primary">
              <span>What moved forward?</span>
              <textarea value={reflection.wins} onChange={event => setReflection({ ...reflection, wins: event.target.value })} onBlur={event => void persist({ wins: event.target.value })} placeholder="Something that became clearer, easier, braver…" rows={3} />
            </label>
            <label className="reflection-v028-deeper-primary">
              <span>What felt heavy?</span>
              <textarea value={reflection.friction} onChange={event => setReflection({ ...reflection, friction: event.target.value })} onBlur={event => void persist({ friction: event.target.value })} placeholder="Friction is information, not a score." rows={3} />
            </label>
            <label className="reflection-v028-deeper-wide">
              <span>What deserves protection next week?</span>
              <textarea value={reflection.nextFocus} onChange={event => setReflection({ ...reflection, nextFocus: event.target.value })} onBlur={event => void persist({ nextFocus: event.target.value })} placeholder="One direction is enough…" rows={3} />
            </label>
            <label className="reflection-v028-deeper-title">
              <span>Name this week</span>
              <small>Optional chapter title</small>
              <input value={reflection.title} onChange={event => setReflection({ ...reflection, title: event.target.value })} onBlur={event => void persist({ title: event.target.value })} placeholder="An unnamed chapter" maxLength={80} />
            </label>
          </div>
        </details>

        <details className="reflection-v028-evidence ik-surface">
          <summary><span><ChevronDown size={16} /> See the week in evidence</span><small>generated locally</small></summary>
          <div className="reflection-v028-evidence-body">
            <div className="reflection-v028-week-strip">
              {snapshot.days.map(day => (
                <article key={day.date} className={(day.completed || day.memo.trim()) ? 'has-signal' : ''}>
                  <span>{dayLabel(day.date)}</span>
                  <b>{day.completed}</b>
                  <small>done</small>
                  {day.memo ? <p>{day.memo}</p> : null}
                </article>
              ))}
            </div>
            {snapshot.milestones.length ? <div className="reflection-v028-milestones"><strong>Dates that mattered</strong>{snapshot.milestones.map(item => <span key={item.id}>{dateFromKey(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })} · {item.title}</span>)}</div> : null}
          </div>
        </details>
      </section>
    </div>
  );
}
