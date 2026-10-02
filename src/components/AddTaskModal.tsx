import { useEffect, useState, type FormEvent } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { createTask } from '../lib/tasks';
import { toDateKey } from '../lib/date';
import { difficultyMeta } from '../lib/rewards';
import { TASK_CATEGORIES } from '../data/categories';
import type { TaskCategory, TaskDifficulty } from '../types';
import { useDialogFocus } from './ui/dialogFocus';
import '../workspace-dialog-v032.css';

const categories = TASK_CATEGORIES;
const difficulties: TaskDifficulty[] = ['small', 'normal', 'hard', 'quest'];

interface Props {
  open: boolean;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function AddTaskModal({ open, defaultDate, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Projects');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('normal');
  const [dueDate, setDueDate] = useState(defaultDate ?? toDateKey());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useDialogFocus<HTMLFormElement>(open, onClose);

  useEffect(() => {
    if (open) setDueDate(defaultDate ?? toDateKey());
  }, [open, defaultDate]);

  if (!open || typeof document === 'undefined') return null;

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save();
  }

  const dialog = (
    <div className="ik-workspace-dialog-backdrop" role="presentation" onMouseDown={event => event.currentTarget === event.target && onClose()}>
      <form
        ref={dialogRef}
        tabIndex={-1}
        className="ik-surface ik-workspace-dialog ik-workspace-dialog--task"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-title"
        onSubmit={submit}
      >
        <header className="ik-workspace-dialog__head">
          <div className="ik-workspace-dialog__intro">
            <span className="ik-section-kicker">NEW TASK</span>
            <h2 id="add-task-title">What needs doing?</h2>
            <p>A title is enough. Ikigai fills in sensible defaults so adding a task stays fast.</p>
          </div>
          <button type="button" className="ik-workspace-dialog__close" onClick={onClose} aria-label="Close task editor" disabled={saving}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="ik-workspace-dialog__body">
          <label className="ik-workspace-dialog__field" htmlFor="task-title">
            Task
            <input id="task-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Draft the project outline" />
          </label>

          <label className="ik-workspace-dialog__field" htmlFor="task-date">
            <span><CalendarDays size={12} aria-hidden="true" /> When</span>
            <input id="task-date" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
          </label>

          <details className="ik-workspace-dialog__details">
            <summary><span>Optional details</span><small>optional</small></summary>
            <div className="ik-workspace-dialog__details-body">
              <div className="ik-workspace-dialog__option-section">
                <span>Area</span>
                <div className="category-grid">
                  {categories.map(item => (
                    <button key={item} type="button" className={item === category ? 'chip selected' : 'chip'} onClick={() => setCategory(item)}>{item}</button>
                  ))}
                </div>
              </div>

              <div className="ik-workspace-dialog__option-section">
                <span>Effort</span>
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
              </div>

              <label className="ik-workspace-dialog__field" htmlFor="task-notes">
                Note
                <input id="task-notes" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Context, not a report" />
              </label>
            </div>
          </details>

          <div className="ik-workspace-dialog__actions">
            <button type="button" className="ik-button ik-button-quiet" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="ik-button ik-button-primary" disabled={!title.trim() || saving}>{saving ? 'Adding…' : 'Add task'}</button>
          </div>
        </div>
      </form>
    </div>
  );

  return createPortal(dialog, document.body);
}
