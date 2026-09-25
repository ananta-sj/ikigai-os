import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Clock3, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { closeDay } from '../lib/dayRecords';
import { paperAudio } from '../lib/paperAudio';
import type { DailyPageTheme, DayRecord, Task } from '../types';
import { PaperRig, type PaperDiagnostics } from './paper/PaperRig';
import '../paper-home.css';

const silentDiagnostics: PaperDiagnostics = {
  phase: 'idle',
  grabX: 0,
  grabY: 0,
  dragPx: 0,
  speed: 0,
  tension: 0,
  attached: 100
};

interface InteractiveDailyPaperProps {
  date: Date;
  tasks: Task[];
  record: DayRecord;
  tearable: boolean;
  reducedMotion?: boolean;
  theme?: DailyPageTheme;
  showMiniMonth?: boolean;
  tearSound?: boolean;
  onDayClosed?: (record: DayRecord) => void;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShort(date: Date) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).format(date);
}

export function InteractiveDailyPaper({
  date,
  tasks,
  record,
  tearable,
  reducedMotion = false,
  theme = 'himekuri',
  showMiniMonth = true,
  tearSound = true,
  onDayClosed
}: InteractiveDailyPaperProps) {
  const [diagnostics, setDiagnostics] = useState<PaperDiagnostics>(silentDiagnostics);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [tearApproved, setTearApproved] = useState(false);
  const [carryIds, setCarryIds] = useState<string[]>([]);
  const [resetNonce, setResetNonce] = useState(0);
  const [detached, setDetached] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  const unfinished = useMemo(() => tasks.filter(task => !task.completedAt), [tasks]);
  const taskLines = useMemo(() => unfinished.map(task => task.title), [unfinished]);
  const tomorrow = useMemo(() => addDays(date, 1), [date]);

  useEffect(() => {
    paperAudio.setSample('clean');
  }, []);

  useEffect(() => {
    paperAudio.setEnabled(tearSound);
  }, [tearSound]);

  useEffect(() => {
    setDetached(false);
    setDecisionOpen(false);
    setTearApproved(false);
    setCarryIds(unfinished.map(task => task.id));
    setError('');
    setResetNonce(value => value + 1);
  }, [record.date]);

  function requestClose() {
    if (!tearable || record.status === 'closed' || decisionOpen || tearApproved) return;
    if (unfinished.length === 0) {
      setCarryIds([]);
      setTearApproved(true);
      return;
    }
    setCarryIds(unfinished.map(task => task.id));
    setDecisionOpen(true);
  }

  function toggleCarry(id: string) {
    setCarryIds(current => current.includes(id)
      ? current.filter(value => value !== id)
      : [...current, id]
    );
  }

  function approveTear() {
    setDecisionOpen(false);
    setTearApproved(true);
  }

  function cancelClose() {
    setDecisionOpen(false);
    setTearApproved(false);
    setResetNonce(value => value + 1);
  }

  async function finishClose() {
    if (closing || !tearable) return;
    setClosing(true);
    setError('');
    try {
      const next = await closeDay(record.date, tasks, carryIds);
      setDetached(true);
      setTearApproved(false);
      onDayClosed?.(next);
    } catch (reason) {
      console.error(reason);
      setError('The day could not be sealed. Your page is still intact.');
      setDetached(false);
      setTearApproved(false);
      setResetNonce(value => value + 1);
    } finally {
      setClosing(false);
    }
  }

  const shownDate = detached ? tomorrow : date;
  const shownTasks = detached ? [] : taskLines;
  const shownMemo = detached ? '' : record.memo;

  return (
    <div
      className={`interactive-daily-paper ${tearable ? 'is-tearable' : 'is-time-locked'} ${detached ? 'is-detached' : ''}`}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      <div className="interactive-daily-paper-stage" aria-label="Daily tear-off calendar">
        <Canvas
          key={`${record.date}-${resetNonce}`}
          orthographic
          camera={{ position: [0, 0, 9], zoom: 112, near: 0.1, far: 100 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={2.05} />
          <directionalLight position={[-3, 5, 8]} intensity={2.35} />
          <directionalLight position={[4, -2, 4]} intensity={0.72} />
          <PaperRig
            date={shownDate}
            taskLines={shownTasks}
            memo={shownMemo}
            theme={theme}
            showMiniMonth={showMiniMonth}
            onDiagnostics={setDiagnostics}
            onTearIntent={requestClose}
            allowTear={tearApproved}
            resetNonce={resetNonce}
            interactive={tearable && !detached && !closing}
            onDetached={() => { void finishClose(); }}
          />
        </Canvas>

        <AnimatePresence>
          {decisionOpen && (
            <motion.div
              className="paper-close-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="paper-close-card paper-carry-card"
                initial={{ opacity: 0, y: 14, scale: .97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: .98 }}
              >
                <button className="paper-close-x" onClick={cancelClose} aria-label="Cancel tear"><X size={15} /></button>
                <span className="paper-close-kicker">BEFORE YOU TEAR {formatShort(date).toUpperCase()}</span>
                <strong>What should travel into the next day?</strong>
                <p>Checked quests move forward. Unchecked quests remain part of this day's history. Once torn, this page cannot be reopened.</p>

                <div className="paper-carry-list">
                  {unfinished.map(task => {
                    const selected = carryIds.includes(task.id);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={selected ? 'paper-carry-row selected' : 'paper-carry-row'}
                        onClick={() => toggleCarry(task.id)}
                      >
                        <span className="paper-carry-check">{selected && <Check size={13} />}</span>
                        <span><b>{task.title}</b><small>{selected ? 'carry forward' : 'leave on this day'}</small></span>
                      </button>
                    );
                  })}
                </div>

                <button className="paper-close-choice primary paper-final-tear" onClick={approveTear}>
                  <span><b>Tear the page</b><small>{carryIds.length} quest{carryIds.length === 1 ? '' : 's'} will move forward.</small></span>
                  <ArrowRight size={17} />
                </button>
                <button className="paper-close-cancel" onClick={cancelClose}>Not yet</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="interactive-daily-paper-status" aria-live="polite">
        {error ? (
          <span className="paper-status-error">{error}</span>
        ) : !tearable ? (
          <span className="paper-time-lock"><Clock3 size={12} /> Tear unlocks after midnight</span>
        ) : diagnostics.phase === 'tearing' ? (
          <span>tearing · {Math.round(100 - diagnostics.attached)}%</span>
        ) : diagnostics.phase === 'awaiting' ? (
          <span>choose what carries forward</span>
        ) : (
          <span className="paper-ready">day complete · page ready</span>
        )}
      </div>
    </div>
  );
}
