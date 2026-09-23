import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AddTaskModal } from '../components/AddTaskModal';
import { db } from '../db';
import type { Task } from '../types';

export function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function refresh() { setTasks(await db.tasks.toArray()); }
  useEffect(() => { refresh(); }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - startOffset + 1;
    return day >= 1 && day <= days ? day : null;
  });

  const byDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const d = new Date(`${task.dueDate}T12:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map.set(d.getDate(), [...(map.get(d.getDate()) ?? []), task]);
      }
    });
    return map;
  }, [tasks, year, month]);

  function dateKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function openDay(day: number) {
    setSelectedDate(dateKey(day));
    setModalOpen(true);
  }

  return (
    <div className="page">
      <header className="page-header compact">
        <div><div className="eyebrow">JOURNEY CALENDAR · PROTOTYPE</div><h1>{cursor.toLocaleString('en-IN', { month: 'long' })} {year}</h1><p>Tasks now live on dates. The physical tear-off calendar comes next.</p></div>
        <div className="calendar-controls"><button onClick={() => setCursor(new Date(year, month - 1, 1))}>←</button><button onClick={() => setCursor(new Date())}>Today</button><button onClick={() => setCursor(new Date(year, month + 1, 1))}>→</button></div>
      </header>
      <section className="calendar-card glass-panel">
        <div className="weekday-row">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {cells.map((day, index) => {
            const list = day ? (byDay.get(day) ?? []) : [];
            const done = list.filter(task => task.completedAt).length;
            return (
              <button className={day ? 'day-cell interactive' : 'day-cell empty'} key={index} disabled={!day} onClick={() => day && openDay(day)}>
                {day && <>
                  <div className="day-top"><span>{day}</span>{list.length > 0 && <strong>{done === list.length ? '✓' : `${done}/${list.length}`}</strong>}</div>
                  <div className="day-body">{list.slice(0, 3).map(task => <span className={task.completedAt ? 'task-chip done' : 'task-chip'} key={task.id}>{task.title}</span>)}</div>
                  <small>{list.length ? `${list.length} task${list.length === 1 ? '' : 's'}` : <><Plus size={11} /> add</>}</small>
                </>}
              </button>
            );
          })}
        </div>
      </section>
      <AddTaskModal open={modalOpen} defaultDate={selectedDate ?? undefined} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  );
}
