import { Archive, ArrowRight, CalendarDays, Check, Circle, LampDesk, MoreHorizontal, PenLine, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AddTaskModal } from '../components/AddTaskModal';
import { InteractiveDailyPaper } from '../components/InteractiveDailyPaper';
import { useDialogFocus } from '../components/ui/dialogFocus';
import { db } from '../db';
import { prettyDate, toDateKey } from '../lib/date';
import { listRoadmapPhases, phaseForDate } from '../lib/career';
import { closeDay, getDayRecord, repairPrematureClosures, resolveActivePaperDate, saveDayMemo } from '../lib/dayRecords';
import { difficultyMeta, plantStage } from '../lib/rewards';
import { ensureSettings } from '../lib/settings';
import { completeTask, createTask, ensureGarden } from '../lib/tasks';
import { readLocalUiMarker, writeLocalUiMarker } from '../lib/security';
import { defaultCarryIds, handoffSummary, shouldAutoOpenMorningHandoff } from '../lib/dailyHandoffCore';
import { weekStartKey } from '../lib/weeklyReflection';
import { reflectionHasWriting } from '../lib/continuityCore';
import type { DayRecord, GardenState, Milestone, RoadmapPhase, Task, UserSettings, WeeklyReflection } from '../types';
import '../daily-desk-v026.css';

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function greetingFor(date: Date, profileName = '') {
  const name = profileName.trim();
  const hour = date.getHours();
  if (hour < 5) return name ? `Still awake, ${name}?` : 'Still awake?';
  if (hour < 12) return name ? `Good morning, ${name}.` : 'Good morning.';
  if (hour < 17) return name ? `Good afternoon, ${name}.` : 'Good afternoon.';
  if (hour < 22) return name ? `Good evening, ${name}.` : 'Good evening.';
  return name ? `Wind down well, ${name}.` : 'Wind down well.';
}

function shortDate(value: string) {
  return dateFromKey(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [garden, setGarden] = useState<GardenState | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentPhase, setCurrentPhase] = useState<RoadmapPhase | null>(null);
  const [currentReflection, setCurrentReflection] = useState<WeeklyReflection | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [paperRecord, setPaperRecord] = useState<DayRecord | null>(null);
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [paperDateKey, setPaperDateKey] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [carryIds, setCarryIds] = useState<string[]>([]);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffError, setHandoffError] = useState('');
  const [clock, setClock] = useState(() => new Date());
  const [memoDraft, setMemoDraft] = useState('');
  const [memoState, setMemoState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [quickTask, setQuickTask] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [mobileLeaf, setMobileLeaf] = useState<'tasks' | 'notes'>('tasks');
  const handoffDialogRef = useDialogFocus<HTMLElement>(handoffOpen, () => { if (!handoffBusy) setHandoffOpen(false); });

  const today = toDateKey(clock);
  const paperTasks = paperDateKey ? tasks.filter(task => task.dueDate === paperDateKey) : [];
  const handoffStats = handoffSummary(paperTasks);

  async function refresh() {
    const [allTasks, currentGarden, currentSettings, allMilestones, roadmapPhases, weeklyReflection] = await Promise.all([
      db.tasks.orderBy('createdAt').reverse().toArray(),
      ensureGarden(),
      ensureSettings(),
      db.milestones.orderBy('date').toArray(),
      listRoadmapPhases(),
      db.weeklyReflections.get(weekStartKey(dateFromKey(today)))
    ]);

    await repairPrematureClosures(today);
    const currentTodayRecord = await getDayRecord(today);
    const activePaperDate = await resolveActivePaperDate(today, allTasks);
    const activeRecord = await getDayRecord(activePaperDate);

    setTasks(allTasks);
    setGarden(currentGarden);
    setMilestones(allMilestones);
    setCurrentPhase(phaseForDate(roadmapPhases, today) ?? null);
    setCurrentReflection(weeklyReflection ?? null);
    setSettings(currentSettings);
    setTodayRecord(currentTodayRecord);
    setMemoDraft(currentTodayRecord.memo ?? '');
    setPaperDateKey(activePaperDate);
    setPaperRecord(activeRecord);
  }

  useEffect(() => { void refresh(); }, [today]);
  useEffect(() => {
    const syncClock = () => setClock(new Date());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncClock();
    };
    const id = window.setInterval(syncClock, 15000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', syncClock);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', syncClock);
    };
  }, []);

  useEffect(() => {
    if (!paperRecord || !paperDateKey || !settings) return;
    const storageKey = 'ikigai.morning-handoff.seen';
    const lastSeenDay = readLocalUiMarker(storageKey);
    if (!shouldAutoOpenMorningHandoff({
      activeDate: paperDateKey,
      today,
      status: paperRecord.status,
      enabled: settings.showDailyPage && !settings.todayPaperPhysics,
      lastSeenDay
    })) return;
    setCarryIds(defaultCarryIds(paperTasks));
    setHandoffError('');
    setHandoffOpen(true);
    writeLocalUiMarker(storageKey, today);
  }, [paperDateKey, paperRecord?.status, settings?.showDailyPage, settings?.todayPaperPhysics, today, paperTasks.length]);

  const todayTasks = useMemo(() => tasks.filter(task => task.dueDate === today), [tasks, today]);
  const openToday = todayTasks.filter(task => !task.completedAt);
  const completedToday = todayTasks.filter(task => task.completedAt);
  const completionRate = todayTasks.length ? Math.round((completedToday.length / todayTasks.length) * 100) : 0;
  const mainTask = openToday[0];
  const stage = plantStage(garden?.growth ?? 0);
  const reflectionStarted = reflectionHasWriting(currentReflection);
  const currentWeekStart = weekStartKey(dateFromKey(today));

  const upcoming = useMemo(() => {
    const futureTasks = tasks
      .filter(task => !task.completedAt && task.dueDate && task.dueDate > today)
      .map(task => ({ id: `task:${task.id}`, date: task.dueDate!, title: task.title, meta: task.category }));
    const futureMilestones = milestones
      .filter(item => item.date >= today)
      .map(item => ({ id: `milestone:${item.id}`, date: item.date, title: item.title, meta: item.kind }));
    return [...futureTasks, ...futureMilestones].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  }, [tasks, milestones, today]);

  async function finish(task: Task) {
    if (task.completedAt || task.dueDate !== today) return;
    await completeTask(task.id);
    await refresh();
  }

  async function addQuickTask(event: FormEvent) {
    event.preventDefault();
    if (!quickTask.trim() || quickSaving) return;
    setQuickSaving(true);
    try {
      await createTask({ title: quickTask.trim(), category: 'Projects', difficulty: 'normal', dueDate: today });
      setQuickTask('');
      await refresh();
    } finally {
      setQuickSaving(false);
    }
  }

  async function persistMemo() {
    if (!todayRecord || memoDraft === todayRecord.memo) return;
    setMemoState('saving');
    const saved = await saveDayMemo(today, memoDraft);
    setTodayRecord(saved);
    setMemoState('saved');
    window.setTimeout(() => setMemoState('idle'), 1200);
    if (paperDateKey === today) setPaperRecord(saved);
  }

  function openHandoff() {
    setCarryIds(defaultCarryIds(paperTasks));
    setHandoffError('');
    setHandoffOpen(true);
  }

  function toggleCarry(id: string) {
    setCarryIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  async function archivePreviousDay() {
    if (!paperRecord || !paperDateKey || paperDateKey >= today || handoffBusy) return;
    setHandoffBusy(true);
    setHandoffError('');
    try {
      await closeDay(paperDateKey, paperTasks, carryIds);
      setHandoffOpen(false);
      await refresh();
    } catch (reason) {
      console.error(reason);
      setHandoffError('That day could not be archived. Nothing was moved.');
    } finally {
      setHandoffBusy(false);
    }
  }

  return (
    <div className="page today-page daily026-page">
      <section className={`daily026-room ${lampOn ? 'lamp-on' : 'lamp-off'}`}>
        <header className="daily026-header">
          <div>
            <time>{prettyDate(clock)}</time>
            <h1>{greetingFor(clock, settings?.profileName)}</h1>
            <p>Open the page. Write what matters. Leave the rest of the interface out of the way.</p>
          </div>
          <div className="daily026-header-actions">
            <Link to="/calendar"><CalendarDays size={14} /> Journey</Link>
            <button type="button" onClick={() => setModalOpen(true)}><MoreHorizontal size={15} /> Task details</button>
          </div>
        </header>

        <div className={`daily026-desk ${settings?.todayPaperPhysics ? `has-physical-paper paper-size-${settings.dailyCalendarSize}` : ''}`}>
          <button type="button" className={`daily026-lamp ${lampOn ? 'is-on' : ''}`} onClick={() => setLampOn(value => !value)} aria-pressed={lampOn} aria-label="Toggle desk lamp"><LampDesk size={23} /><span>lamp</span></button>
          <div className="daily026-cup" aria-hidden="true"><i /></div>
          <div className="daily026-eraser" aria-hidden="true" />
          <div className="daily026-desk-grain" aria-hidden="true" />

          <nav className="daily026-mobile-leaf-tabs" aria-label="Today's notebook pages">
            <button type="button" className={mobileLeaf === 'tasks' ? 'is-active' : ''} aria-pressed={mobileLeaf === 'tasks'} onClick={() => setMobileLeaf('tasks')}>
              <Circle size={14} /><span>Tasks</span><small>{openToday.length}</small>
            </button>
            <button type="button" className={mobileLeaf === 'notes' ? 'is-active' : ''} aria-pressed={mobileLeaf === 'notes'} onClick={() => setMobileLeaf('notes')}>
              <PenLine size={14} /><span>Day note</span><small>{memoDraft.trim() ? '•' : ''}</small>
            </button>
          </nav>

          <section className={`daily026-notebook mobile-leaf-${mobileLeaf}`} aria-label="Today's desk page">
            <div className="daily026-spine" aria-hidden="true" />
            <section className="daily026-page-sheet tasks">
              <div className="daily026-page-date">
                <span>{clock.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase()}</span>
                <strong>{clock.getDate()}</strong>
                <div><b>{clock.toLocaleDateString('en-IN', { month: 'long' })}</b><small>{clock.getFullYear()}</small></div>
              </div>

              <div className="daily026-progress-line">
                <span>{completedToday.length} done · {openToday.length} open</span>
                <i><b style={{ width: `${completionRate}%` }} /></i>
              </div>

              {mainTask ? (
                <div className="daily026-main-task">
                  <button type="button" onClick={() => void finish(mainTask)} aria-label={`Complete ${mainTask.title}`}><Circle size={21} /></button>
                  <div><span>FIRST</span><h2>{mainTask.title}</h2>{mainTask.notes && <p>{mainTask.notes}</p>}</div>
                </div>
              ) : (
                <div className="daily026-empty-task"><Sparkles size={17} /><span>The page has room.</span></div>
              )}

              <div className="daily026-task-lines">
                {openToday.slice(1).map(task => (
                  <div className="daily026-task-line" key={task.id}>
                    <button type="button" onClick={() => void finish(task)} aria-label={`Complete ${task.title}`}><Circle size={15} /></button>
                    <span>{task.title}</span>
                    <small>{difficultyMeta[task.difficulty].label}</small>
                  </div>
                ))}
                {completedToday.slice(0, 4).map(task => (
                  <div className="daily026-task-line done" key={task.id}><Check size={14} /><span>{task.title}</span><small>done</small></div>
                ))}
              </div>

              <form className="daily026-write-line" onSubmit={addQuickTask}>
                <Plus size={15} />
                <input value={quickTask} onChange={event => setQuickTask(event.target.value)} placeholder="Write a task…" aria-label="Quick task" />
                <button type="submit" disabled={!quickTask.trim() || quickSaving}>{quickSaving ? '…' : 'add'}</button>
              </form>
              <button type="button" className="daily026-task-details" onClick={() => setModalOpen(true)}>area, effort or note…</button>
            </section>

            <section className="daily026-page-sheet notes">
              <div className="daily026-note-heading"><PenLine size={15} /><div><span>DAY NOTE</span><strong>One thought is enough.</strong></div><small>{memoState === 'saving' ? 'saving…' : memoState === 'saved' ? 'saved' : ''}</small></div>
              <textarea value={memoDraft} onChange={event => setMemoDraft(event.target.value)} onBlur={() => void persistMemo()} placeholder="What mattered, changed, or deserves remembering?" maxLength={1200} />

              <nav className="daily032-thread" aria-label="Threads into the rest of Ikigai Space">
                <span>THREADS FROM TODAY</span>
                <Link to="/roadmap">
                  <b>ROADMAP CHAPTER</b>
                  <strong>{currentPhase?.title ?? 'No chapter covers today.'}</strong>
                  <small>{currentPhase ? 'open' : 'shape one'} <ArrowRight size={10} /></small>
                </Link>
                <Link to={`/reflection?week=${currentWeekStart}`}>
                  <b>WEEKLY REFLECTION</b>
                  <strong>{reflectionStarted ? 'This week already has a thread.' : 'One sentence is enough.'}</strong>
                  <small>{reflectionStarted ? 'continue' : 'reflect'} <ArrowRight size={10} /></small>
                </Link>
              </nav>

              <div className="daily026-horizon">
                <div className="daily026-subhead"><span>NEAR HORIZON</span><Link to="/calendar">open calendar</Link></div>
                {upcoming.length ? upcoming.map(item => (
                  <div className="daily026-horizon-row" key={item.id}><time>{shortDate(item.date)}</time><span>{item.title}</span><small>{item.meta}</small></div>
                )) : <p>Nothing scheduled ahead.</p>}
              </div>
            </section>
          </section>

          {settings?.todayPaperPhysics && paperRecord && paperDateKey && (
            <aside className="daily026-paper-object" data-paper-size={settings.dailyCalendarSize} aria-label={`Physical daily page for ${shortDate(paperDateKey)}`}>
              <InteractiveDailyPaper
                date={dateFromKey(paperDateKey)}
                tasks={paperTasks}
                record={paperRecord}
                tearable={paperDateKey < today}
                manipulable={!settings.reducedMotion}
                presentation="desk"
                deskSize={settings.dailyCalendarSize}
                reducedMotion={settings.reducedMotion}
                theme={settings.dailyPageTheme}
                showMiniMonth={settings.showMiniMonth}
                tearSound={settings.tearSound}
                onDayClosed={() => { void refresh(); }}
              />
            </aside>
          )}

          <Link className="daily026-sanctuary-postcard" to="/garden">
            <span className="daily026-postcard-pin" aria-hidden="true" />
            <div aria-hidden="true">{stage.emoji}</div>
            <span>SANCTUARY</span>
            <strong>{stage.label}</strong>
            <small>{garden?.growth ?? 0} growth · visit world</small>
          </Link>

          {settings?.showDailyPage && paperRecord && paperDateKey < today && (
            <button type="button" className="daily026-handoff-tab" onClick={openHandoff}>
              <Archive size={14} /><span>{shortDate(paperDateKey)} is still on the desk</span>
            </button>
          )}
        </div>

        {settings?.showDailyPage && paperRecord && paperDateKey < today && handoffOpen && (
          <div className="daily026-handoff-backdrop" onMouseDown={event => event.currentTarget === event.target && setHandoffOpen(false)}>
            <section ref={handoffDialogRef} tabIndex={-1} className="daily026-handoff-card" role="dialog" aria-modal="true" aria-labelledby="daily026-handoff-title">
              <span className="daily026-handoff-tape" aria-hidden="true" />
              <button type="button" className="daily026-handoff-close" onClick={() => setHandoffOpen(false)} aria-label="Close morning handoff"><X size={16} /></button>
              <header>
                <span>MORNING HANDOFF</span>
                <h2 id="daily026-handoff-title">Yesterday is still on the desk.</h2>
                <p>Archive {shortDate(paperDateKey)} and decide which unfinished tasks should travel forward. No page gets torn up.</p>
              </header>
              <div className="daily026-handoff-summary">
                <span><strong>{handoffStats.completed}</strong> completed</span>
                <span><strong>{handoffStats.unfinished}</strong> unfinished</span>
              </div>
              {handoffStats.unfinished > 0 && (
                <div className="daily026-handoff-list">
                  <span className="daily026-handoff-label">Carry into the next day</span>
                  {paperTasks.filter(task => !task.completedAt).map(task => {
                    const selected = carryIds.includes(task.id);
                    return (
                      <button key={task.id} type="button" className={selected ? 'selected' : ''} onClick={() => toggleCarry(task.id)}>
                        <i>{selected && <Check size={12} />}</i><span>{task.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {handoffError && <p className="daily026-handoff-error" role="alert">{handoffError}</p>}
              <footer>
                <button type="button" className="daily026-handoff-later" onClick={() => setHandoffOpen(false)}>Later</button>
                <button type="button" className="daily026-handoff-archive" onClick={() => void archivePreviousDay()} disabled={handoffBusy}>
                  <span>{handoffBusy ? 'Archiving…' : 'Archive day'}</span><ArrowRight size={15} />
                </button>
              </footer>
            </section>
          </div>
        )}
      </section>

      <AddTaskModal open={modalOpen} defaultDate={today} onClose={() => setModalOpen(false)} onSaved={() => void refresh()} />
    </div>
  );
}
