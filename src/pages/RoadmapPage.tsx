import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  CircleDashed,
  Flag,
  GraduationCap,
  BriefcaseBusiness,
  Pencil,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { IkButton } from '../components/ui/IkButton';
import { LANE_LABELS, MODE_COPY } from '../data/roadmapPlan';
import {
  createRoadmapItem,
  createRoadmapPhase,
  deleteRoadmapItem,
  deleteRoadmapPhase,
  listCareerProjects,
  listProofItems,
  listRoadmapItems,
  listRoadmapPhases,
  localDateKey,
  phaseForDate,
  phaseProgress,
  saveRoadmapNotes,
  setRoadmapStatus,
  updateRoadmapPhase
} from '../lib/career';
import type { CareerProject, ProofItem, RoadmapItem, RoadmapItemStatus, RoadmapLane, RoadmapMode, RoadmapPhase } from '../types';
import '../roadmap-career-v090.css';

const laneIcons: Record<RoadmapLane, typeof BookOpen> = {
  learning: BookOpen,
  project: Rocket,
  proof: Sparkles,
  career: BriefcaseBusiness,
  university: GraduationCap
};

const statusLabels: Record<RoadmapItemStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  done: 'Done',
  paused: 'Paused'
};

function formatShortDate(value?: string) {
  if (!value) return 'No fixed date';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function PhaseModal({ phase, onClose, onSaved }: {
  phase?: RoadmapPhase;
  onClose: () => void;
  onSaved: (phase: RoadmapPhase) => Promise<void> | void;
}) {
  const today = localDateKey();
  const [title, setTitle] = useState(phase?.title ?? '');
  const [startDate, setStartDate] = useState(phase?.startDate ?? today);
  const [endDate, setEndDate] = useState(phase?.endDate ?? addDays(today, 27));
  const [mode, setMode] = useState<RoadmapMode>(phase?.mode ?? 'green');
  const [intent, setIntent] = useState(phase?.intent ?? '');
  const [note, setNote] = useState(phase?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (phase) {
        await updateRoadmapPhase(phase.id, { title, startDate, endDate, mode, intent, note });
        await onSaved({ ...phase, title: title.trim(), startDate, endDate, mode, intent: intent.trim(), note: note.trim(), updatedAt: new Date().toISOString() });
      } else {
        const created = await createRoadmapPhase({ title, startDate, endDate, mode, intent, note, source: 'user' });
        await onSaved(created);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the phase.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ik-modal-backdrop roadmap-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="ik-surface roadmap-modal" onSubmit={submit}>
        <div className="roadmap-modal-head">
          <div><span className="ik-section-kicker">{phase ? 'EDIT PHASE' : 'NEW PHASE'}</span><h2>{phase ? 'Shape this period.' : 'Create a period that matters.'}</h2><p>Dates and labels come from you. Ikigai does not pre-fill a life plan.</p></div>
          <button type="button" className="roadmap-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <label>Phase name<input value={title} onChange={event => setTitle(event.target.value)} autoFocus placeholder="e.g. Build the prototype" /></label>
        <div className="roadmap-form-grid">
          <label>Start date<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
          <label>End date<input type="date" min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
        </div>
        <label>Working mode<select value={mode} onChange={event => setMode(event.target.value as RoadmapMode)}>{Object.entries(MODE_COPY).map(([value, copy]) => <option key={value} value={value}>{copy.label} — {copy.short}</option>)}</select></label>
        <label>What is this phase for?<textarea value={intent} onChange={event => setIntent(event.target.value)} rows={3} placeholder="A short outcome or direction for this period." /></label>
        <label>Optional operating note<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} placeholder="Constraints, boundaries, or something worth remembering." /></label>
        {error ? <p className="roadmap-form-error">{error}</p> : null}
        <div className="roadmap-modal-actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton type="submit" variant="primary" disabled={saving || !title.trim()}>{saving ? 'Saving…' : phase ? 'Save phase' : 'Create phase'}</IkButton></div>
      </form>
    </div>
  );
}

function AddCheckpointModal({ phase, projects, onClose, onCreated }: {
  phase: RoadmapPhase;
  projects: CareerProject[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [lane, setLane] = useState<RoadmapLane>('learning');
  const [targetDate, setTargetDate] = useState(phase.endDate);
  const [projectId, setProjectId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await createRoadmapItem({ phaseId: phase.id, title, detail, lane, targetDate, projectId: projectId || undefined });
    await onCreated();
    onClose();
  }

  return (
    <div className="ik-modal-backdrop roadmap-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="ik-surface roadmap-modal" onSubmit={submit}>
        <div className="roadmap-modal-head">
          <div><span className="ik-section-kicker">CHECKPOINT</span><h2>Add something to “{phase.title}”.</h2><p>A checkpoint is optional. Use one when it makes the outcome easier to recognize.</p></div>
          <button type="button" className="roadmap-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <label>Checkpoint<input value={title} onChange={event => setTitle(event.target.value)} autoFocus placeholder="What should exist by the end of this phase?" /></label>
        <label>Why it matters<textarea value={detail} onChange={event => setDetail(event.target.value)} rows={3} placeholder="Keep it concrete and observable." /></label>
        <div className="roadmap-form-grid">
          <label>Lane<select value={lane} onChange={event => setLane(event.target.value as RoadmapLane)}>{Object.entries(LANE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Target date<input type="date" min={phase.startDate} max={phase.endDate} value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
        </div>
        <label>Linked project<select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
        <div className="roadmap-modal-actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton type="submit" variant="primary" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add checkpoint'}</IkButton></div>
      </form>
    </div>
  );
}

export function RoadmapPage() {
  const today = localDateKey();
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [projects, setProjects] = useState<CareerProject[]>([]);
  const [proof, setProof] = useState<ProofItem[]>([]);
  const [phaseId, setPhaseId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [phaseModal, setPhaseModal] = useState<'create' | 'edit' | null>(null);
  const [adding, setAdding] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  async function refresh(preferredPhaseId?: string) {
    const [nextPhases, nextItems, nextProjects, nextProof] = await Promise.all([listRoadmapPhases(), listRoadmapItems(), listCareerProjects(), listProofItems()]);
    setPhases(nextPhases);
    setItems(nextItems);
    setProjects(nextProjects);
    setProof(nextProof);
    setPhaseId(current => {
      if (preferredPhaseId && nextPhases.some(phase => phase.id === preferredPhaseId)) return preferredPhaseId;
      if (current && nextPhases.some(phase => phase.id === current)) return current;
      return phaseForDate(nextPhases, today)?.id ?? nextPhases[0]?.id ?? null;
    });
  }

  useEffect(() => { void refresh(); }, []);

  const currentPhase = phaseForDate(phases, today);
  const phase = phases.find(item => item.id === phaseId);
  const phaseItems = useMemo(() => phase ? items.filter(item => item.phaseId === phase.id).sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999')) : [], [items, phase]);
  const selectedItem = items.find(item => item.id === selectedItemId);
  const selectedProject = selectedItem?.projectId ? projects.find(project => project.id === selectedItem.projectId) : undefined;
  const selectedProof = selectedItem ? proof.filter(item => item.roadmapItemId === selectedItem.id) : [];
  const done = phaseItems.filter(item => item.status === 'done').length;
  const active = phaseItems.filter(item => item.status === 'active').length;
  const progress = phase ? (phase === currentPhase ? phaseProgress(phase, today) : today > phase.endDate ? 1 : 0) : 0;

  useEffect(() => { setSelectedItemId(phaseItems[0]?.id ?? null); }, [phaseId, phaseItems.length]);
  useEffect(() => { setNoteDraft(selectedItem?.notes ?? ''); }, [selectedItem?.id, selectedItem?.notes]);

  async function updateStatus(item: RoadmapItem, status: RoadmapItemStatus) {
    await setRoadmapStatus(item.id, status);
    await refresh();
  }

  async function saveNotes() {
    if (!selectedItem) return;
    await saveRoadmapNotes(selectedItem.id, noteDraft);
    await refresh();
  }

  async function removePhase() {
    if (!phase) return;
    const count = items.filter(item => item.phaseId === phase.id).length;
    const message = count ? `Delete “${phase.title}” and its ${count} checkpoint${count === 1 ? '' : 's'}?` : `Delete “${phase.title}”?`;
    if (!window.confirm(message)) return;
    await deleteRoadmapPhase(phase.id);
    await refresh();
  }

  const rangeStart = phases[0]?.startDate;
  const rangeEnd = phases.at(-1)?.endDate;

  return (
    <div className="page roadmap-page">
      <div className="ik-page-width">
        <PageHeader
          eyebrow={<><Flag size={12} /> ROADMAP</>}
          title="Build the plan around your life."
          description="Create your own phases, dates and checkpoints. Ikigai starts blank and only reflects the structure you choose."
          actions={<><IkButton variant="quiet" onClick={() => setPhaseModal('create')}><Plus size={15} /> New phase</IkButton>{phase ? <IkButton variant="primary" onClick={() => setAdding(true)}><Plus size={15} /> Add checkpoint</IkButton> : null}</>}
          meta={<><span>{rangeStart && rangeEnd ? `${formatShortDate(rangeStart)} → ${formatShortDate(rangeEnd)}` : 'No phases yet'}</span><span>·</span><span>{items.filter(item => item.status === 'done').length} checkpoints closed</span></>}
        />

        {!phases.length ? (
          <section className="roadmap-first-phase ik-surface">
            <div className="roadmap-first-phase-mark"><MapIcon /></div>
            <span className="ik-section-kicker">BLANK ROADMAP</span>
            <h2>Start with one period that matters.</h2>
            <p>A semester, launch, training block, recovery period, job search, or anything else can be a phase. Nothing is preloaded.</p>
            <IkButton variant="primary" onClick={() => setPhaseModal('create')}><Plus size={15} /> Create first phase</IkButton>
          </section>
        ) : (
          <>
            <section className="roadmap-now ik-surface" data-mode={currentPhase?.mode ?? 'green'}>
              <div className="roadmap-now-mode"><ShieldCheck size={17} /><span>{currentPhase ? MODE_COPY[currentPhase.mode].label : 'BETWEEN'}</span></div>
              <div className="roadmap-now-copy">
                <span className="ik-section-kicker">RIGHT NOW</span>
                <h2>{currentPhase?.title ?? 'No phase covers today.'}</h2>
                <p>{currentPhase?.intent || (currentPhase ? 'This phase has no description yet.' : 'You can leave gaps between phases. Create another only when it helps.')}</p>
              </div>
              {currentPhase ? <div className="roadmap-now-progress"><span><b>{Math.round(phaseProgress(currentPhase, today) * 100)}%</b> through this phase</span><i><em style={{ width: `${Math.round(phaseProgress(currentPhase, today) * 100)}%` }} /></i><small>{currentPhase.startDate} → {currentPhase.endDate}</small></div> : null}
            </section>

            <div className="roadmap-workspace">
              <aside className="roadmap-spine" aria-label="Roadmap phases">
                <div className="roadmap-spine-head"><span className="ik-section-kicker">YOUR PHASES</span><small>Select a period to inspect or edit it.</small></div>
                {phases.map((item, index) => {
                  const isCurrent = item.id === currentPhase?.id;
                  const isSelected = item.id === phase?.id;
                  const phaseEntries = items.filter(entry => entry.phaseId === item.id);
                  const completed = phaseEntries.filter(entry => entry.status === 'done').length;
                  return (
                    <button key={item.id} type="button" className={`roadmap-phase-tab ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`} onClick={() => setPhaseId(item.id)} data-mode={item.mode}>
                      <span className="roadmap-phase-index">{`${index + 1}`.padStart(2, '0')}</span>
                      <span className="roadmap-phase-copy"><b>{item.title}</b><small>{formatShortDate(item.startDate)} — {formatShortDate(item.endDate)}</small></span>
                      <span className="roadmap-phase-count">{completed}/{phaseEntries.length}</span>
                    </button>
                  );
                })}
                <button type="button" className="roadmap-add-phase-inline" onClick={() => setPhaseModal('create')}><Plus size={13} /> Add phase</button>
              </aside>

              {phase ? <main className="roadmap-sheet ik-surface">
                <header className="roadmap-sheet-head" data-mode={phase.mode}>
                  <div>
                    <span className="roadmap-mode-stamp">{MODE_COPY[phase.mode].label} · {MODE_COPY[phase.mode].short}</span>
                    <h2>{phase.title}</h2>
                    <p>{phase.intent || 'No phase description yet.'}</p>
                  </div>
                  <div className="roadmap-sheet-side">
                    <div className="roadmap-sheet-dates"><CalendarDays size={16} /><b>{formatShortDate(phase.startDate)} → {formatShortDate(phase.endDate)}</b><small>{Math.round(progress * 100)}% calendar elapsed</small></div>
                    <div className="roadmap-phase-actions"><button type="button" onClick={() => setPhaseModal('edit')}><Pencil size={13} /> Edit phase</button><button type="button" className="danger" onClick={() => void removePhase()}><Trash2 size={13} /> Delete</button></div>
                  </div>
                </header>

                {phase.note ? <div className="roadmap-chapter-note"><span>OPERATING NOTE</span><p>{phase.note}</p></div> : null}

                <div className="roadmap-checkpoint-head"><div><span className="ik-section-kicker">CHECKPOINTS</span><p>{done} done · {active} active · {phaseItems.length} total</p></div><button type="button" onClick={() => setAdding(true)}><Plus size={14} /> Add here</button></div>

                <div className="roadmap-checkpoints">
                  {phaseItems.length ? phaseItems.map(item => {
                    const Icon = laneIcons[item.lane];
                    const linkedProject = item.projectId ? projects.find(project => project.id === item.projectId) : undefined;
                    const evidenceCount = proof.filter(entry => entry.roadmapItemId === item.id).length;
                    return (
                      <article key={item.id} className={`roadmap-checkpoint ${selectedItem?.id === item.id ? 'selected' : ''} status-${item.status}`} onClick={() => setSelectedItemId(item.id)}>
                        <div className="roadmap-checkpoint-icon"><Icon size={16} /></div>
                        <div className="roadmap-checkpoint-copy">
                          <div className="roadmap-checkpoint-meta"><span>{LANE_LABELS[item.lane]}</span>{linkedProject ? <span>{linkedProject.title}</span> : null}{evidenceCount ? <span>{evidenceCount} proof linked</span> : null}</div>
                          <h3>{item.title}</h3>
                          <p>{item.detail}</p>
                        </div>
                        <div className="roadmap-checkpoint-controls" onClick={event => event.stopPropagation()}>
                          <small>{formatShortDate(item.targetDate)}</small>
                          <select aria-label={`Status for ${item.title}`} value={item.status} onChange={event => void updateStatus(item, event.target.value as RoadmapItemStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                        </div>
                      </article>
                    );
                  }) : <div className="roadmap-empty"><CircleDashed size={22} /><h3>No checkpoints here yet.</h3><p>A phase can stand on its own. Add checkpoints only when they make the outcome clearer.</p></div>}
                </div>

                {selectedItem ? (
                  <section className="roadmap-inspector">
                    <div className="roadmap-inspector-copy">
                      <span className="ik-section-kicker">CHECKPOINT NOTE</span>
                      <h3>{selectedItem.title}</h3>
                      <p>{selectedProject ? `Linked to ${selectedProject.title}. ` : ''}{selectedProof.length ? `${selectedProof.length} proof item${selectedProof.length === 1 ? '' : 's'} linked.` : 'No proof linked yet.'}</p>
                    </div>
                    <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} onBlur={() => void saveNotes()} placeholder="Decision, blocker, restart point, or what you learned…" />
                    <div className="roadmap-inspector-actions"><span>Saved locally on blur.</span><button type="button" className="danger" onClick={async () => { if (!window.confirm('Delete this checkpoint?')) return; await deleteRoadmapItem(selectedItem.id); await refresh(); }}><Trash2 size={13} /> Delete</button></div>
                  </section>
                ) : null}
              </main> : null}
            </div>
          </>
        )}
      </div>
      {phaseModal === 'create' ? <PhaseModal onClose={() => setPhaseModal(null)} onSaved={created => refresh(created.id)} /> : null}
      {phaseModal === 'edit' && phase ? <PhaseModal phase={phase} onClose={() => setPhaseModal(null)} onSaved={saved => refresh(saved.id)} /> : null}
      {adding && phase ? <AddCheckpointModal phase={phase} projects={projects} onClose={() => setAdding(false)} onCreated={() => refresh(phase.id)} /> : null}
    </div>
  );
}

function MapIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2V6Z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4v13M16 7v13" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
