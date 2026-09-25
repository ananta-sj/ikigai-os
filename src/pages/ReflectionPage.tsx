import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ChevronRight,
  Droplets,
  Leaf,
  NotebookPen,
  Sparkles,
  Sun,
  TestTube2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { TASK_CATEGORIES } from '../data/categories';
import type { TaskCategory, WeeklyReflection } from '../types';
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

const categoryOrder: TaskCategory[] = TASK_CATEGORIES;

function dayLabel(dateKey: string) {
  const date = dateFromKey(dateKey);
  return {
    weekday: date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase(),
    day: date.getDate()
  };
}

export function ReflectionPage() {
  const currentWeek = weekStartKey();
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  const [reflection, setReflection] = useState<WeeklyReflection | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  async function refresh(start = weekStart) {
    const [nextSnapshot, nextReflection] = await Promise.all([
      buildWeeklySnapshot(start),
      getWeeklyReflection(start)
    ]);
    setSnapshot(nextSnapshot);
    setReflection(nextReflection);
  }

  useEffect(() => { void refresh(weekStart); }, [weekStart]);

  const canGoNext = weekStart < currentWeek;
  const summary = useMemo(() => snapshot ? localWeeklySummary(snapshot) : '', [snapshot]);
  const totalCategory = snapshot ? Object.values(snapshot.categoryCounts).reduce((sum, value) => sum + (value ?? 0), 0) : 0;

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
    return <div className="page reflection-page"><div className="reflection-loading"><Sparkles size={20} /> Gathering the week from local history…</div></div>;
  }

  return (
    <div className="page reflection-page">
      <section className="reflection-shell">
        <PageHeader
          className="reflection-header"
          eyebrow={<><NotebookPen size={14} /> WEEKLY CHAPTER · LOCAL ONLY</>}
          title="What did this week become?"
          description="Facts come from your tasks and day records. The meaning is yours to write."
          actions={
            <div className="week-switcher" aria-label="Week navigation">
              <button onClick={() => setWeekStart(addDaysKey(weekStart, -7))} aria-label="Previous week"><ArrowLeft size={16} /></button>
              <button className="week-range-button" onClick={() => setWeekStart(currentWeek)} title="Jump to current week">
                <CalendarRange size={15} /> {formatWeekRange(weekStart)}
              </button>
              <button disabled={!canGoNext} onClick={() => canGoNext && setWeekStart(addDaysKey(weekStart, 7))} aria-label="Next week"><ArrowRight size={16} /></button>
            </div>
          }
        />

        <div className="reflection-grid">
          <main className="reflection-main">
            <section className="reflection-panel ik-surface chapter-overview">
              <div className="reflection-panel-heading">
                <div><span>01 · THE WEEK IN EVIDENCE</span><h2>{reflection.title || 'An unnamed chapter'}</h2></div>
                <span className={`reflection-save ${saveState}`} role="status" aria-live="polite">{saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved locally' : 'editable'}</span>
              </div>

              <input
                className="chapter-title-input"
                value={reflection.title}
                onChange={event => setReflection({ ...reflection, title: event.target.value })}
                onBlur={event => void persist({ title: event.target.value })}
                placeholder="Give this week a name, if it deserves one…"
                maxLength={80}
              />

              <div className="week-metrics">
                <article><strong>{snapshot.completedTasks.length}</strong><span>completed quests</span></article>
                <article><strong>{snapshot.activeDays}</strong><span>active days</span></article>
                <article><strong>{snapshot.carriedCount}</strong><span>carried forward</span></article>
                <article><strong>{snapshot.growthEarned}</strong><span>garden growth</span></article>
              </div>

              <div className="local-summary">
                <Sparkles size={16} />
                <p>{summary}</p>
              </div>
            </section>

            <section className="reflection-panel ik-surface week-strip-panel">
              <div className="reflection-panel-heading compact"><div><span>02 · SEVEN DAYS</span><h2>A week without fake streaks.</h2></div></div>
              <div className="week-strip">
                {snapshot.days.map(day => {
                  const label = dayLabel(day.date);
                  const hasSignal = day.completed > 0 || day.memo.trim().length > 0;
                  return (
                    <article key={day.date} className={`week-day ${hasSignal ? 'has-signal' : ''} ${day.status === 'closed' ? 'closed' : ''}`}>
                      <div className="week-day-head"><span>{label.weekday}</span><strong>{label.day}</strong></div>
                      <div className="week-day-mark" aria-hidden="true"><i /></div>
                      <div className="week-day-counts">
                        <b>{day.completed}</b><small>done</small>
                        {day.carried > 0 && <em>↗ {day.carried}</em>}
                      </div>
                      <p>{day.memo || (day.open ? `${day.open} still open` : '—')}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="reflection-panel ik-surface reflection-writing-panel">
              <div className="reflection-panel-heading compact"><div><span>03 · MAKE SENSE OF IT</span><h2>Reflection, not reporting.</h2></div></div>
              <div className="reflection-prompts">
                <label>
                  <span>What moved forward?</span>
                  <small>Wins, understanding, courage, something finally unstuck.</small>
                  <textarea value={reflection.wins} onChange={event => setReflection({ ...reflection, wins: event.target.value })} onBlur={event => void persist({ wins: event.target.value })} placeholder="What are you glad happened?" rows={4} />
                </label>
                <label>
                  <span>What felt heavy?</span>
                  <small>Friction is information, not a score against you.</small>
                  <textarea value={reflection.friction} onChange={event => setReflection({ ...reflection, friction: event.target.value })} onBlur={event => void persist({ friction: event.target.value })} placeholder="What kept resisting?" rows={4} />
                </label>
                <label className="wide">
                  <span>What deserves protection next week?</span>
                  <small>One direction is enough. This can later seed your weekly plan.</small>
                  <textarea value={reflection.nextFocus} onChange={event => setReflection({ ...reflection, nextFocus: event.target.value })} onBlur={event => void persist({ nextFocus: event.target.value })} placeholder="Next week, protect…" rows={3} />
                </label>
                <label className="wide freeform">
                  <span>Anything else worth keeping?</span>
                  <textarea value={reflection.note} onChange={event => setReflection({ ...reflection, note: event.target.value })} onBlur={event => void persist({ note: event.target.value })} placeholder="A sentence, realization, memory, or nothing at all." rows={5} />
                </label>
              </div>
            </section>
          </main>

          <aside className="reflection-side">
            <section className="reflection-panel ik-surface rhythm-panel">
              <div className="reflection-panel-heading compact"><div><span>ATTENTION RHYTHM</span><h2>Where completed work landed.</h2></div></div>
              <div className="rhythm-list">
                {categoryOrder.map(category => {
                  const count = snapshot.categoryCounts[category] ?? 0;
                  const percent = totalCategory ? Math.round((count / totalCategory) * 100) : 0;
                  return (
                    <div className="rhythm-row" key={category}>
                      <div><span>{category}</span><b>{count}</b></div>
                      <i><em style={{ width: `${percent}%` }} /></i>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="reflection-panel ik-surface garden-receipt">
              <div className="reflection-panel-heading compact"><div><span>GARDEN RECEIPT</span><h2>What the week fed.</h2></div></div>
              <div className="garden-receipt-growth"><Leaf size={21} /><strong>+{snapshot.growthEarned}</strong><span>growth earned from completed work</span></div>
              <div className="garden-receipt-resources">
                <span><Droplets size={14} /><b>{snapshot.waterEarned}</b> water</span>
                <span><Sun size={14} /><b>{snapshot.sunlightEarned}</b> sun</span>
                <span><TestTube2 size={14} /><b>{snapshot.fertilizerEarned}</b> fertilizer</span>
              </div>
            </section>

            <section className="reflection-panel ik-surface week-milestones">
              <div className="reflection-panel-heading compact"><div><span>MILESTONES</span><h2>Dates that shared the week.</h2></div></div>
              {snapshot.milestones.length ? (
                <div className="week-milestone-list">
                  {snapshot.milestones.map(item => (
                    <div key={item.id}><time>{dateFromKey(item.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</time><span><b>{item.title}</b><small>{item.kind}</small></span><ChevronRight size={14} /></div>
                  ))}
                </div>
              ) : <p className="reflection-empty-copy">No milestones were scheduled inside this week.</p>}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
