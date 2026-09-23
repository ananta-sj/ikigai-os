import { useEffect, useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import { createTask } from '../lib/tasks';
import { toDateKey } from '../lib/date';
import { difficultyMeta } from '../lib/rewards';
import type { TaskCategory, TaskDifficulty } from '../types';

const categories: TaskCategory[] = ['ReFlow', 'Python', 'AI / ML', 'University', 'Career', 'Personal'];
const difficulties: TaskDifficulty[] = ['small', 'normal', 'hard', 'quest'];

interface Props {
  open: boolean;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddTaskModal({ open, defaultDate, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('ReFlow');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('normal');
  const [dueDate, setDueDate] = useState(defaultDate ?? toDateKey());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDueDate(defaultDate ?? toDateKey());
  }, [open, defaultDate]);

  if (!open) return null;

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        category,
        difficulty,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined
      });
      setTitle('');
      setNotes('');
      setDifficulty('normal');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}>
      <section className="modal task-modal glass-panel" role="dialog" aria-modal="true" aria-label="Add task">
        <div className="modal-kicker"><Sparkles size={15} /> NEW QUEST</div>
        <h2>What deserves a checkmark?</h2>
        <p className="modal-subcopy">Only the title is required. Ikigai should reduce admin work, not create more of it.</p>

        <label htmlFor="task-title">Task</label>
        <input
          id="task-title"
          autoFocus
          value={title}
          onChange={event => setTitle(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && save()}
          placeholder="e.g. Fix ReFlow agent handoff"
        />

        <label>Area</label>
        <div className="category-grid">
          {categories.map(item => (
            <button key={item} type="button" className={item === category ? 'chip selected' : 'chip'} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>

        <label>Difficulty</label>
        <div className="difficulty-grid">
          {difficulties.map(item => {
            const meta = difficultyMeta[item];
            return (
              <button key={item} type="button" className={item === difficulty ? 'difficulty-card selected' : 'difficulty-card'} onClick={() => setDifficulty(item)}>
                <strong>{meta.label}</strong>
                <small>+{meta.growth} growth</small>
              </button>
            );
          })}
        </div>

        <div className="task-form-row">
          <div>
            <label htmlFor="task-date"><CalendarDays size={13} /> Date</label>
            <input id="task-date" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
          </div>
          <div>
            <label htmlFor="task-notes">Optional note</label>
            <input id="task-notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Context, not a report" />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="button primary" disabled={!title.trim() || saving} onClick={save}>{saving ? 'Planting…' : 'Add task'}</button>
        </div>
      </section>
    </div>
  );
}
