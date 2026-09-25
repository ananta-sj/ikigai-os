import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { db } from '../db';
import { queueSyncChange } from '../lib/sync';
import { calculateXP } from '../lib/growth';
import { toDateKey } from '../lib/date';
import { TASK_CATEGORIES } from '../data/categories';
import type { ActivityCategory } from '../types';

const categories: ActivityCategory[] = TASK_CATEGORIES;

export function LogProgressModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState<ActivityCategory>('Projects');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState(45);

  async function save() {
    if (!title.trim()) return;
    const now = new Date();
    const id = crypto.randomUUID();
    await db.activities.add({
      id,
      date: toDateKey(now),
      category,
      title: title.trim(),
      note: note.trim() || undefined,
      durationMinutes: duration,
      xp: calculateXP(duration),
      createdAt: now.toISOString()
    });
    await queueSyncChange('activities', id);
    setTitle('');
    setNote('');
    setDuration(45);
    onSaved();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div className="modal glass-panel" initial={{ y: 28, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} onMouseDown={e => e.stopPropagation()}>
            <div className="eyebrow">DAILY EVIDENCE</div>
            <h2>What moved forward?</h2>
            <label>Category</label>
            <div className="category-grid">
              {categories.map(item => <button key={item} className={item === category ? 'chip selected' : 'chip'} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label>What did you do?</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Finished the first prototype" autoFocus />
            <label>Optional note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What did you learn or discover?" rows={3} />
            <label>Focused minutes: <strong>{duration}</strong></label>
            <input type="range" min="10" max="180" step="5" value={duration} onChange={e => setDuration(Number(e.target.value))} />
            <div className="modal-actions">
              <button className="button ghost" onClick={onClose}>Cancel</button>
              <button className="button primary" onClick={save}>Save progress</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
