import { motion } from 'framer-motion';
import { CalendarClock, Check, Circle, Droplets, Plus, Sparkles, Sun, TestTube2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AddTaskModal } from '../components/AddTaskModal';
import { db } from '../db';
import { prettyDate, toDateKey } from '../lib/date';
import { difficultyMeta, plantStage } from '../lib/rewards';
import { completeTask, ensureGarden } from '../lib/tasks';
import type { GardenState, Task } from '../types';

export function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [garden, setGarden] = useState<GardenState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const today = toDateKey();

  async function refresh() {
    const [allTasks, currentGarden] = await Promise.all([
      db.tasks.orderBy('createdAt').reverse().toArray(),
      ensureGarden()
    ]);
    setTasks(allTasks);
    setGarden(currentGarden);
  }

  useEffect(() => { refresh(); }, []);

  const todayTasks = useMemo(() => tasks.filter(task => task.dueDate === today), [tasks, today]);
  const openToday = todayTasks.filter(task => !task.completedAt);
  const completedToday = todayTasks.filter(task => task.completedAt);
  const upcoming = tasks
    .filter(task => !task.completedAt && task.dueDate && task.dueDate > today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 3);

  const stage = plantStage(garden?.growth ?? 0);
  const completionRate = todayTasks.length ? Math.round((completedToday.length / todayTasks.length) * 100) : 0;

  async function finish(task: Task) {
    if (task.completedAt) return;
    setCelebrating(task.id);
    await completeTask(task.id);
    await refresh();
    window.setTimeout(() => setCelebrating(null), 850);
  }

  return (
    <div className="page today-page living-day">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      <header className="page-header today-header">
        <div>
          <div className="eyebrow">THE LIVING DAY</div>
          <h1>Good evening.</h1>
          <p>{prettyDate()} · Give today one honest checkmark.</p>
        </div>
        <button className="button primary large" onClick={() => setModalOpen(true)}><Plus size={18} /> Add task</button>
      </header>

      <section className="living-grid">
        <motion.article className="seed-card glass-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="seed-copy">
            <span className="pill">YOUR FIRST SEED</span>
            <h2>{stage.label}</h2>
            <p>Tasks nourish one living thing. No scattered forest, no fake progress.</p>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${stage.progress}%` }} /></div>
            <small>{garden?.growth ?? 0} growth · next stage is earned, never purchased.</small>
            <div className="resource-row">
              <span><Droplets size={15} /> {garden?.water ?? 0} water</span>
              <span><Sun size={15} /> {garden?.sunlight ?? 0} sun</span>
              <span><TestTube2 size={15} /> {garden?.fertilizer ?? 0} fertilizer</span>
            </div>
          </div>
          <div className="seed-scene" aria-label={stage.label}>
            <div className="garden-halo" />
            <motion.div key={stage.label} className="seed-emoji" initial={{ scale: .72, rotate: -5 }} animate={{ scale: 1, rotate: 0 }}>{stage.emoji}</motion.div>
            <div className="soil-patch" />
          </div>
        </motion.article>

        <article className="day-pulse glass-panel">
          <span className="eyebrow">TODAY</span>
          <strong className="day-score">{completedToday.length}<small>/{todayTasks.length || 0}</small></strong>
          <span>tasks complete</span>
          <div className="mini-ring" style={{ background: `conic-gradient(#9be8b4 ${completionRate * 3.6}deg, rgba(255,255,255,.06) 0deg)` }}><b>{completionRate}%</b></div>
          <small className="muted">No timer required.</small>
        </article>
      </section>

      <section className="quest-layout">
        <article className="glass-panel quest-card">
          <div className="section-heading">
            <div><span className="eyebrow">TODAY'S QUESTS</span><h3>{openToday.length ? 'What matters now' : 'The board is clear.'}</h3></div>
            <button className="text-action" onClick={() => setModalOpen(true)}><Plus size={15} /> New</button>
          </div>

          <div className="quest-list">
            {todayTasks.length === 0 && (
              <button className="empty-quest" onClick={() => setModalOpen(true)}>
                <Circle size={18} />
                <span><strong>Add your first task for today</strong><small>Only give it a title. Everything else is optional.</small></span>
              </button>
            )}

            {openToday.map(task => {
              const reward = difficultyMeta[task.difficulty];
              return (
                <motion.div layout className={celebrating === task.id ? 'quest-row celebrating' : 'quest-row'} key={task.id}>
                  <button className="quest-check" aria-label={`Complete ${task.title}`} onClick={() => finish(task)}><Circle size={22} /></button>
                  <div className="quest-copy">
                    <strong>{task.title}</strong>
                    <small>{task.category} · {reward.label} · +{reward.growth} growth</small>
                    {task.notes && <p>{task.notes}</p>}
                  </div>
                  <span className={`difficulty-badge ${task.difficulty}`}>{task.difficulty}</span>
                </motion.div>
              );
            })}

            {completedToday.map(task => (
              <motion.div layout className="quest-row completed" key={task.id}>
                <span className="quest-check done"><Check size={18} /></span>
                <div className="quest-copy"><strong>{task.title}</strong><small>{task.category} · completed</small></div>
                <Sparkles size={16} className="completed-spark" />
              </motion.div>
            ))}
          </div>
        </article>

        <aside className="glass-panel upcoming-card">
          <div className="section-heading"><div><span className="eyebrow">ON THE HORIZON</span><h3>Upcoming</h3></div><CalendarClock size={18} /></div>
          <div className="upcoming-list">
            {upcoming.length === 0 ? <p className="empty-state">Nothing scheduled after today yet.</p> : upcoming.map(task => (
              <div className="upcoming-row" key={task.id}>
                <time>{new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</time>
                <div><strong>{task.title}</strong><small>{task.category}</small></div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <AddTaskModal open={modalOpen} defaultDate={today} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  );
}
