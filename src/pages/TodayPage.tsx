import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Check,
  Circle,
  Droplets,
  Leaf,
  LockKeyhole,
  Plus,
  Sparkles,
  Sun,
  TestTube2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AddTaskModal } from '../components/AddTaskModal';
import { InteractiveDailyPaper } from '../components/InteractiveDailyPaper';
import { db } from '../db';
import { prettyDate, toDateKey } from '../lib/date';
import { canTearDate, getDayRecord, repairPrematureClosures, resolveActivePaperDate, saveDayMemo } from '../lib/dayRecords';
import { difficultyMeta, plantStage } from '../lib/rewards';
import { ensureSettings } from '../lib/settings';
import { completeTask, ensureGarden } from '../lib/tasks';
import type { DayRecord, GardenState, Milestone, Task, UserSettings } from '../types';
import '../home-v040.css';

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function greetingFor(date: Date) {
  const hour = date.getHours();
  if (hour < 5) return 'Still awake?';
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  if (hour < 22) return 'Good evening.';
  return 'Wind down well.';
}

function monthCycle(date: Date) {
  return date.toLocaleDateString('en-IN', { month: 'long' }).toUpperCase();
}

export function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [garden, setGarden] = useState<GardenState | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [paperRecord, setPaperRecord] = useState<DayRecord | null>(null);
  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [paperDateKey, setPaperDateKey] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [memoDraft, setMemoDraft] = useState('');
  const [memoState, setMemoState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const today = toDateKey(clock);

  async function refresh() {
    const [allTasks, currentGarden, currentSettings, allMilestones] = await Promise.all([
      db.tasks.orderBy('createdAt').reverse().toArray(),
      ensureGarden(),
      ensureSettings(),
      db.milestones.orderBy('date').toArray()
    ]);

    await repairPrematureClosures(today);
    const currentTodayRecord = await getDayRecord(today);
    const activePaperDate = await resolveActivePaperDate(today, allTasks);
    const activeRecord = await getDayRecord(activePaperDate);

    setTasks(allTasks);
    setGarden(currentGarden);
    setMilestones(allMilestones);
    setSettings(currentSettings);
    setTodayRecord(currentTodayRecord);
    setMemoDraft(currentTodayRecord.memo ?? '');
    setPaperDateKey(activePaperDate);
    setPaperRecord(activeRecord);
  }

  useEffect(() => { void refresh(); }, [today]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  const todayTasks = useMemo(() => tasks.filter(task => task.dueDate === today), [tasks, today]);
  const openToday = todayTasks.filter(task => !task.completedAt);
  const completedToday = todayTasks.filter(task => task.completedAt);
  const completionRate = todayTasks.length ? Math.round((completedToday.length / todayTasks.length) * 100) : 0;
  const mainQuest = openToday[0];
  const secondaryTasks = openToday.slice(1, 5);
  const stage = plantStage(garden?.growth ?? 0);

  const upcomingTasks = tasks
    .filter(task => !task.completedAt && task.dueDate && task.dueDate > today)
    .map(task => ({ id: `task:${task.id}`, date: task.dueDate!, title: task.title, meta: `${task.category} · ${difficultyMeta[task.difficulty].label}` }));

  const upcomingMilestones = milestones
    .filter(item => item.date >= today)
    .map(item => ({ id: `milestone:${item.id}`, date: item.date, title: item.title, meta: `${item.kind}${item.category ? ` · ${item.category}` : ''}` }));

  const upcoming = [...upcomingTasks, ...upcomingMilestones]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const paperTasks = paperDateKey ? tasks.filter(task => task.dueDate === paperDateKey) : [];
  const paperDate = paperDateKey ? dateFromKey(paperDateKey) : clock;
  const paperTearable = Boolean(paperRecord && paperDateKey && canTearDate(paperDateKey, clock));
  const paperIsPast = Boolean(paperDateKey && paperDateKey < today);

  async function finish(task: Task) {
    if (task.completedAt || task.dueDate !== today) return;
    setCelebrating(task.id);
    await completeTask(task.id);
    await refresh();
    window.setTimeout(() => setCelebrating(null), 800);
  }

  async function persistMemo() {
    if (!todayRecord || memoDraft === todayRecord.memo) return;
    setMemoState('saving');
    const saved = await saveDayMemo(today, memoDraft);
    setTodayRecord(saved);
    setMemoState('saved');
    window.setTimeout(() => setMemoState('idle'), 1300);
    if (paperDateKey === today) setPaperRecord(saved);
  }

  return (
    <div className="page today-page ikigai-home-v040">
      <div className="home-grid-veil" aria-hidden="true" />

      <section className="home-studio">
        <header className="home-studio-header">
          <div className="home-heading-group">
            <div className="home-context-line">
              <span>{prettyDate(clock)}</span>
              <i />
              <span>{monthCycle(clock)} · LIVING DAY</span>
            </div>
            <h1>{greetingFor(clock)}</h1>
            <p>One meaningful thing is enough to make the day count.</p>
          </div>

          <div className="home-header-actions">
            <div className="home-state-chips" aria-label="Today at a glance">
              <span><b>{completedToday.length}</b> done</span>
              <span><b>{openToday.length}</b> open</span>
              <span><Leaf size={12} /> {stage.label}</span>
            </div>
            <button className="home-add-quest ik-button ik-button-primary" onClick={() => setModalOpen(true)}><Plus size={17} /> Add quest</button>
          </div>
        </header>

        <div className="home-studio-grid">
          <main className="home-primary-column">
            <section className="home-panel quest-board" aria-label="Today's quests">
              <div className="home-panel-header">
                <div>
                  <span className="panel-kicker">01 · TODAY'S QUESTS</span>
                  <h2>{mainQuest ? 'Main quest' : 'A quiet board is allowed.'}</h2>
                </div>
                <div className="quest-progress" aria-label={`${completionRate}% complete`}>
                  <i><b style={{ width: `${completionRate}%` }} /></i><span>{completionRate}%</span>
                </div>
              </div>

              {mainQuest ? (
                <div className="main-quest-card">
                  <button className="quest-check" onClick={() => void finish(mainQuest)} aria-label={`Complete ${mainQuest.title}`}><Circle size={24} /></button>
                  <div className="main-quest-copy">
                    <div className="quest-meta"><span>{mainQuest.category}</span><span>{difficultyMeta[mainQuest.difficulty].label}</span><span>+{difficultyMeta[mainQuest.difficulty].growth} growth</span></div>
                    <h3>{mainQuest.title}</h3>
                    {mainQuest.notes && <p>{mainQuest.notes}</p>}
                  </div>
                </div>
              ) : (
                <button className="quest-empty-state" onClick={() => setModalOpen(true)}>
                  <span className="quest-empty-plus"><Plus size={21} /></span>
                  <span><b>Choose one thing worth finishing today</b><small>No timer. No report. Just something real.</small></span>
                </button>
              )}

              <div className="quest-stream">
                {secondaryTasks.map((task, index) => (
                  <motion.div layout key={task.id} className={celebrating === task.id ? 'quest-stream-row celebrating' : 'quest-stream-row'}>
                    <span className="quest-index">{String(index + 2).padStart(2, '0')}</span>
                    <button onClick={() => void finish(task)} aria-label={`Complete ${task.title}`}><Circle size={17} /></button>
                    <span className="quest-stream-copy"><b>{task.title}</b><small>{task.category} · {difficultyMeta[task.difficulty].label}</small></span>
                  </motion.div>
                ))}
                {completedToday.slice(0, 2).map(task => (
                  <motion.div layout key={task.id} className="quest-stream-row completed">
                    <span className="quest-index"><Check size={13} /></span>
                    <span className="quest-complete-icon"><Sparkles size={14} /></span>
                    <span className="quest-stream-copy"><b>{task.title}</b><small>completed today</small></span>
                  </motion.div>
                ))}
              </div>

              <footer className="quest-board-footer">
                <span>{completedToday.length} completed</span>
                <span>{openToday.length} active</span>
                <span>{todayTasks.length} total</span>
                <span className="local-proof">local database · zero cloud</span>
              </footer>
            </section>

            <section className="home-panel day-note-panel">
              <div className="home-panel-header compact">
                <div><span className="panel-kicker">02 · DAY NOTE</span><h2>Leave one line for yourself.</h2></div>
                <span className={`memo-save-state ${memoState}`}>{memoState === 'saving' ? 'saving…' : memoState === 'saved' ? 'saved locally' : 'local note'}</span>
              </div>
              <textarea
                value={memoDraft}
                onChange={event => setMemoDraft(event.target.value)}
                onBlur={() => { void persistMemo(); }}
                placeholder="A thought, a reminder, a sentence worth keeping…"
                rows={3}
                maxLength={360}
              />
              <div className="day-note-rule"><span>{memoDraft.length}/360</span><span>Appears on today's paper.</span></div>
            </section>

            <section className="home-panel horizon-panel" aria-label="Upcoming tasks">
              <div className="home-panel-header compact">
                <div><span className="panel-kicker">03 · ON THE HORIZON</span><h2>What deserves remembering next.</h2></div>
                <Link to="/calendar">Open journey <ArrowUpRight size={13} /></Link>
              </div>
              <div className="horizon-grid">
                {upcoming.length ? upcoming.map(item => (
                  <div className="horizon-card" key={item.id}>
                    <time>{new Date(`${item.date}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</time>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </div>
                )) : (
                  <div className="horizon-empty">
                    <span>Tomorrow</span><i /><span>This week</span><i /><span>Later</span>
                    <p>Nothing is scheduled beyond today. Empty space here is intentional.</p>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="home-ritual-column">
            {settings?.showDailyPage && paperRecord && (
              <section className="home-panel ritual-calendar-panel" aria-label="Daily page ritual">
                <div className="ritual-object-heading">
                  <div><span className="panel-kicker">DAILY PAGE</span><small>{paperIsPast ? 'An older page is waiting to be released.' : 'Today stays with you until midnight.'}</small></div>
                  <i className={paperTearable ? 'ready' : ''} />
                </div>
                <InteractiveDailyPaper
                  date={paperDate}
                  tasks={paperTasks}
                  record={paperRecord}
                  tearable={paperTearable}
                  reducedMotion={settings.reducedMotion}
                  theme={settings.dailyPageTheme}
                  showMiniMonth={settings.showMiniMonth}
                  tearSound={settings.tearSound}
                  onDayClosed={() => { void refresh(); }}
                />
              </section>
            )}

            <section className="home-panel garden-pulse-panel">
              <div className="garden-pulse-top">
                <div><span className="panel-kicker">GARDEN PULSE</span><small>Stage {stage.label}</small></div>
                <Link to="/garden">Enter garden <ArrowUpRight size={13} /></Link>
              </div>
              <div className="garden-pulse-body">
                <div className="garden-visual" aria-hidden="true">
                  <div className="garden-halo" />
                  <motion.div key={stage.label} className="garden-seed" initial={{ scale: .82, y: 4 }} animate={{ scale: 1, y: 0 }}>{stage.emoji}</motion.div>
                  <div className="garden-soil" />
                </div>
                <div className="garden-copy">
                  <h3>{stage.label}</h3>
                  <p>{garden?.growth ?? 0} growth · {stage.progress}% toward the next stage</p>
                  <div className="garden-track"><i style={{ width: `${stage.progress}%` }} /></div>
                  <div className="garden-resources-mini">
                    <span><Droplets size={13} /> {garden?.water ?? 0}</span>
                    <span><Sun size={13} /> {garden?.sunlight ?? 0}</span>
                    <span><TestTube2 size={13} /> {garden?.fertilizer ?? 0}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="home-panel day-signal-panel">
              <div><span className="panel-kicker">DAY SIGNAL</span><strong>{completionRate}%</strong></div>
              <div className="signal-copy">
                <b>{paperTearable ? 'Page ready to release' : 'Day still in motion'}</b>
                <small>{paperTearable ? 'Carry forward unfinished quests when you tear.' : 'The paper remains locked until the date has fully ended.'}</small>
              </div>
              <span className="signal-lock"><LockKeyhole size={13} /> {paperTearable ? 'tear available' : 'midnight lock'}</span>
            </section>
          </aside>
        </div>
      </section>

      <AddTaskModal open={modalOpen} defaultDate={today} onClose={() => setModalOpen(false)} onSaved={() => void refresh()} />
    </div>
  );
}
