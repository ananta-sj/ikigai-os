import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  FileText,
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
  Trash2,
  X
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { IkButton } from '../components/ui/IkButton';
import { useDialogFocus } from '../components/ui/dialogFocus';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
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
import { workspaceIdParam } from '../lib/workspaceContinuityCore';
import '../roadmap-career-v090.css';
import '../workspace-dialog-v032.css';

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
  const dialogRef = useDialogFocus<HTMLFormElement>(true, onClose);

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

  return createPortal(
    <div className="ik-workspace-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form ref={dialogRef} tabIndex={-1} className="ik-surface ik-workspace-dialog ik-workspace-dialog--roadmap-phase" role="dialog" aria-modal="true" aria-labelledby="roadmap-phase-modal-title" onSubmit={submit}>
        <header className="ik-workspace-dialog__head">
          <div><span className="ik-section-kicker">{phase ? 'EDIT PHASE' : 'NEW PHASE'}</span><h2 id="roadmap-phase-modal-title">{phase ? 'Shape this period.' : 'Create a period that matters.'}</h2><p>Dates and labels come from you. Ikigai Space does not pre-fill a life plan.</p></div>
          <button type="button" className="ik-workspace-dialog__close" onClick={onClose} aria-label="Close"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="ik-workspace-dialog__body">
          <label className="ik-workspace-dialog__field ik-workspace-dialog__field--hero">Phase name<input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Build the prototype" /></label>
          <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
            <label className="ik-workspace-dialog__field">Start date<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label>
            <label className="ik-workspace-dialog__field">End date<input type="date" min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
          </div>
          <details className="ik-workspace-dialog__details">
            <summary><span>More context</span><small>optional</small></summary>
            <div className="ik-workspace-dialog__details-body">
              <label className="ik-workspace-dialog__field">Working mode<select value={mode} onChange={event => setMode(event.target.value as RoadmapMode)}>{Object.entries(MODE_COPY).map(([value, copy]) => <option key={value} value={value}>{copy.label} — {copy.short}</option>)}</select></label>
              <label className="ik-workspace-dialog__field">What is this phase for?<textarea value={intent} onChange={event => setIntent(event.target.value)} rows={3} placeholder="A short outcome or direction for this period." /></label>
              <label className="ik-workspace-dialog__field">Operating note<textarea value={note} onChange={event => setNote(event.target.value)} rows={2} placeholder="Constraints, boundaries, or something worth remembering." /></label>
            </div>
          </details>
          {error ? <p className="roadmap-form-error">{error}</p> : null}
          <div className="ik-workspace-dialog__actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton type="submit" variant="primary" disabled={saving || !title.trim()}>{saving ? 'Saving…' : phase ? 'Save phase' : 'Create phase'}</IkButton></div>
        </div>
      </form>
    </div>,
    document.body
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
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus<HTMLFormElement>(true, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (saving) return;
    setError('');
    setSaving(true);
    try {
      await createRoadmapItem({ phaseId: phase.id, title, detail, lane, targetDate, projectId: projectId || undefined });
      await onCreated();
      onClose();
    } catch {
      setError('Ikigai Space could not finish saving this checkpoint. Check available storage and try again. Your draft is preserved; check the list before retrying.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="ik-workspace-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <form ref={dialogRef} tabIndex={-1} className="ik-surface ik-workspace-dialog ik-workspace-dialog--roadmap-checkpoint" role="dialog" aria-modal="true" aria-labelledby="roadmap-checkpoint-modal-title" onSubmit={submit}>
        <header className="ik-workspace-dialog__head">
          <div><span className="ik-section-kicker">CHECKPOINT</span><h2 id="roadmap-checkpoint-modal-title">Add something to “{phase.title}”.</h2><p>A checkpoint is optional. Use one when it makes the outcome easier to recognize.</p></div>
          <button type="button" className="ik-workspace-dialog__close" onClick={onClose} aria-label="Close"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="ik-workspace-dialog__body">
          <label className="ik-workspace-dialog__field ik-workspace-dialog__field--hero">Checkpoint<input value={title} onChange={event => setTitle(event.target.value)} placeholder="What should exist by the end of this phase?" /></label>
          <label className="ik-workspace-dialog__field">Target date<input type="date" min={phase.startDate} max={phase.endDate} value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
          <details className="ik-workspace-dialog__details">
            <summary><span>More context</span><small>optional</small></summary>
            <div className="ik-workspace-dialog__details-body">
              <label className="ik-workspace-dialog__field">Why it matters<textarea value={detail} onChange={event => setDetail(event.target.value)} rows={3} placeholder="Keep it concrete and observable." /></label>
              <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
                <label className="ik-workspace-dialog__field">Lane<select value={lane} onChange={event => setLane(event.target.value as RoadmapLane)}>{Object.entries(LANE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="ik-workspace-dialog__field">Linked project<select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
              </div>
            </div>
          </details>
          {error ? <p className="roadmap-form-error" role="alert">{error}</p> : null}
          <div className="ik-workspace-dialog__actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton type="submit" variant="primary" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add checkpoint'}</IkButton></div>
        </div>
      </form>
    </div>,
    document.body
  );
}

export function RoadmapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = localDateKey();
  const requestedPhaseId = workspaceIdParam(searchParams.get('phase'));
  const requestedCheckpointId = workspaceIdParam(searchParams.get('checkpoint'));
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [projects, setProjects] = useState<CareerProject[]>([]);
  const [proof, setProof] = useState<ProofItem[]>([]);
  const [phaseId, setPhaseId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [phaseModal, setPhaseModal] = useState<'create' | 'edit' | null>(null);
  const [adding, setAdding] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  async function refresh(preferredPhaseId?: string) {
    const [nextPhases, nextItems, nextProjects, nextProof] = await Promise.all([listRoadmapPhases(), listRoadmapItems(), listCareerProjects(), listProofItems()]);
    setPhases(nextPhases);
    setItems(nextItems);
    setProjects(nextProjects);
    setProof(nextProof);
    const linkedCheckpoint = requestedCheckpointId ? nextItems.find(item => item.id === requestedCheckpointId) : undefined;
    setPhaseId(current => {
      if (linkedCheckpoint && nextPhases.some(phase => phase.id === linkedCheckpoint.phaseId)) return linkedCheckpoint.phaseId;
      if (requestedPhaseId && nextPhases.some(phase => phase.id === requestedPhaseId)) return requestedPhaseId;
      if (preferredPhaseId && nextPhases.some(phase => phase.id === preferredPhaseId)) return preferredPhaseId;
      if (current && nextPhases.some(phase => phase.id === current)) return current;
      return phaseForDate(nextPhases, today)?.id ?? nextPhases[0]?.id ?? null;
    });
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (requestedCheckpointId) {
      const linked = items.find(item => item.id === requestedCheckpointId);
      if (linked && linked.phaseId !== phaseId && phases.some(phase => phase.id === linked.phaseId)) {
        setPhaseId(linked.phaseId);
        return;
      }
    }
    if (requestedPhaseId && requestedPhaseId !== phaseId && phases.some(phase => phase.id === requestedPhaseId)) setPhaseId(requestedPhaseId);
  }, [requestedCheckpointId, requestedPhaseId, items, phases, phaseId]);

  const currentPhase = phaseForDate(phases, today);
  const phase = phases.find(item => item.id === phaseId);
  const phaseItems = useMemo(() => phase ? items.filter(item => item.phaseId === phase.id).sort((a, b) => (a.targetDate ?? '9999').localeCompare(b.targetDate ?? '9999')) : [], [items, phase]);
  const selectedItem = phaseItems.find(item => item.id === selectedItemId);
  const selectedProject = selectedItem?.projectId ? projects.find(project => project.id === selectedItem.projectId) : undefined;
  const selectedProof = selectedItem ? proof.filter(item => item.roadmapItemId === selectedItem.id) : [];
  const done = phaseItems.filter(item => item.status === 'done').length;
  const active = phaseItems.filter(item => item.status === 'active').length;
  const progress = phase ? (phase === currentPhase ? phaseProgress(phase, today) : today > phase.endDate ? 1 : 0) : 0;

  useEffect(() => {
    const requested = requestedCheckpointId ? phaseItems.find(item => item.id === requestedCheckpointId) : undefined;
    setSelectedItemId(current => requested?.id ?? (current && phaseItems.some(item => item.id === current) ? current : phaseItems[0]?.id ?? null));
  }, [phaseId, phaseItems, requestedCheckpointId]);
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
    if (!(await confirm({ title: 'Delete phase?', message, confirmLabel: 'Delete phase', tone: 'danger' }))) return;
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
          description="Create your own phases, dates and checkpoints. Ikigai Space starts blank and only reflects the structure you choose."
          actions={<><IkButton variant="quiet" onClick={() => setPhaseModal('create')}><Plus size={15} /> New phase</IkButton>{phase ? <IkButton variant="primary" onClick={() => setAdding(true)}><Plus size={15} /> Add checkpoint</IkButton> : null}</>}
          meta={<><span>{rangeStart && rangeEnd ? `${formatShortDate(rangeStart)} → ${formatShortDate(rangeEnd)}` : 'No phases yet'}</span><span>·</span><span>{items.filter(item => item.status === 'done').length} checkpoints closed</span></>}
        />

        {!phases.length ? (
          <EmptyState
            className="roadmap-first-phase ik-surface"
            icon={<MapIcon />}
            eyebrow="BLANK ROADMAP"
            title="Start with one period that matters."
            description="A semester, launch, training block, recovery period, job search, or anything else can be a phase. Nothing is preloaded."
            action={<IkButton variant="primary" onClick={() => setPhaseModal('create')}><Plus size={15} /> Create first phase</IkButton>}
          />
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
                    <button key={item.id} type="button" className={`roadmap-phase-tab ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`} onClick={() => { setPhaseId(item.id); setSearchParams({ phase: item.id }, { replace: true }); }} data-mode={item.mode}>
                      <span className="roadmap-phase-index">{`${index + 1}`.padStart(2, '0')}</span>
                      <span className="roadmap-phase-copy"><b>{item.title}</b><small>{formatShortDate(item.startDate)} — {formatShortDate(item.endDate)}</small></span>
                      <span className="roadmap-phase-count">{completed}/{phaseEntries.length}</span>
                    </button>
                  );
                })}
                <button type="button" className="roadmap-add-phase-inline" onClick={() => setPhaseModal('create')}><Plus size={13} /> Add phase</button>
              </aside>

              {phase ? <section className="roadmap-sheet ik-surface" aria-label="Selected roadmap phase">
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
                      <article key={item.id} className={`roadmap-checkpoint ${selectedItem?.id === item.id ? 'selected' : ''} status-${item.status}`}>
                        <button type="button" className="roadmap-checkpoint-select" onClick={() => { setSelectedItemId(item.id); setSearchParams({ checkpoint: item.id }, { replace: true }); }} aria-pressed={selectedItem?.id === item.id}>
                          <span className="roadmap-checkpoint-icon"><Icon size={16} /></span>
                          <span className="roadmap-checkpoint-copy">
                            <span className="roadmap-checkpoint-meta"><span>{LANE_LABELS[item.lane]}</span>{linkedProject ? <span>{linkedProject.title}</span> : null}{evidenceCount ? <span>{evidenceCount} proof linked</span> : null}</span>
                            <span className="roadmap-checkpoint-title">{item.title}</span>
                            <span className="roadmap-checkpoint-detail">{item.detail}</span>
                          </span>
                        </button>
                        <div className="roadmap-checkpoint-controls">
                          <small>{formatShortDate(item.targetDate)}</small>
                          <select aria-label={`Status for ${item.title}`} value={item.status} onChange={event => void updateStatus(item, event.target.value as RoadmapItemStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                        </div>
                      </article>
                    );
                  }) : <EmptyState
                    compact
                    className="roadmap-empty"
                    icon={<CircleDashed size={22} />}
                    title="No checkpoints here yet."
                    description="A phase can stand on its own. Add checkpoints only when they make the outcome clearer."
                    action={<IkButton size="sm" variant="quiet" onClick={() => setAdding(true)}><Plus size={13} /> Add checkpoint</IkButton>}
                  />}
                </div>

                {selectedItem ? (
                  <section className="roadmap-inspector">
                    <div className="roadmap-inspector-copy">
                      <span className="ik-section-kicker">CHECKPOINT NOTE</span>
                      <h3>{selectedItem.title}</h3>
                      <p>{selectedProject ? `Linked to ${selectedProject.title}. ` : ''}{selectedProof.length ? `${selectedProof.length} proof item${selectedProof.length === 1 ? '' : 's'} linked.` : 'No proof linked yet.'}</p>
                    </div>
                    <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} onBlur={() => void saveNotes()} placeholder="Decision, blocker, restart point, or what you learned…" />
                    <div className="roadmap032-evidence-thread" aria-label="Checkpoint evidence trail">
                      <div className="roadmap032-evidence-head"><span><FileText size={12} /> EVIDENCE TRAIL</span><small>{selectedProof.length ? `${selectedProof.length} linked` : 'quiet for now'}</small></div>
                      {selectedProof.length ? <div className="roadmap032-evidence-list">{selectedProof.slice(0, 4).map(item => <Link key={item.id} to={`/career?proof=${encodeURIComponent(item.id)}`}><span>{item.title}</span><small>{formatShortDate(item.date)}</small></Link>)}</div> : <p>Proof stays in Career. This checkpoint only keeps the connection visible.</p>}
                      <div className="roadmap032-evidence-actions">
                        <Link to={`/career?addProof=1&checkpoint=${encodeURIComponent(selectedItem.id)}${selectedProject ? `&project=${encodeURIComponent(selectedProject.id)}` : ''}`}>{selectedProof.length ? 'Add another proof' : 'Add proof in Career'} <ChevronRight size={12} /></Link>
                        {selectedProject ? <Link to={`/career?project=${encodeURIComponent(selectedProject.id)}`}>Open linked project <ChevronRight size={12} /></Link> : null}
                      </div>
                    </div>
                    <div className="roadmap-inspector-actions"><span>Saved locally on blur.</span><button type="button" className="danger" onClick={async () => { if (!(await confirm({ title: 'Delete checkpoint?', message: 'Delete this checkpoint?', confirmLabel: 'Delete checkpoint', tone: 'danger' }))) return; const remainingPhaseId = selectedItem.phaseId; await deleteRoadmapItem(selectedItem.id); setSearchParams({ phase: remainingPhaseId }, { replace: true }); await refresh(remainingPhaseId); }}><Trash2 size={13} /> Delete</button></div>
                  </section>
                ) : null}
              </section> : null}
            </div>
          </>
        )}
      </div>
      {phaseModal === 'create' ? <PhaseModal onClose={() => setPhaseModal(null)} onSaved={created => refresh(created.id)} /> : null}
      {phaseModal === 'edit' && phase ? <PhaseModal phase={phase} onClose={() => setPhaseModal(null)} onSaved={saved => refresh(saved.id)} /> : null}
      {adding && phase ? <AddCheckpointModal phase={phase} projects={projects} onClose={() => setAdding(false)} onCreated={() => refresh(phase.id)} /> : null}
      {confirmDialog}
    </div>
  );
}

function MapIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 5-2 8 3 5-2v13l-5 2-8-3-5 2V6Z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4v13M16 7v13" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
