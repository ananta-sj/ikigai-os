import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  Rocket,
  TerminalSquare,
  Link2,
  Plus,
  Send,
  Trash2,
  Sparkles,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { IkButton } from '../components/ui/IkButton';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { SafeExternalLink } from '../components/ui/SafeExternalLink';
import { useDialogFocus } from '../components/ui/dialogFocus';
import { useConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  createApplication,
  createCareerProject,
  createProofItem,
  deleteApplication,
  deleteProofItem,
  ensureCareerWorkspace,
  listApplications,
  listCareerProjects,
  listProofItems,
  listRoadmapItems,
  localDateKey,
  updateApplicationStatus,
  updateCareerProject
} from '../lib/career';
import type {
  ApplicationStatus,
  CareerApplication,
  CareerProject,
  CareerProjectStatus,
  ProofItem,
  ProofKind,
  RoadmapItem
} from '../types';
import { ensureSettings, updateSettings } from '../lib/settings';
import { loadGitHubPublicActivity, normalizeGitHubUsername, type GitHubPublicActivity } from '../lib/github';
import { workspaceIdParam } from '../lib/workspaceContinuityCore';
import '../roadmap-career-v090.css';
import '../reflection-career-v028.css';
import '../workspace-dialog-v032.css';

const projectStatusLabels: Record<CareerProjectStatus, string> = {
  idea: 'Idea',
  building: 'Building',
  beta: 'Beta',
  released: 'Released',
  maintaining: 'Maintaining',
  archived: 'Archived'
};

const proofKindLabels: Record<ProofKind, string> = {
  project: 'Project',
  certificate: 'Certificate',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  resume: 'Resume',
  demo: 'Demo',
  writing: 'Writing',
  internship: 'Internship',
  other: 'Other'
};

const appStatusLabels: Record<ApplicationStatus, string> = {
  watching: 'Watching',
  preparing: 'Preparing',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  closed: 'Closed'
};

function formatDate(value?: string) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function githubLevel(count: number) {
  if (count >= 7) return 4;
  if (count >= 4) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
}

function ProofModal({ projects, roadmap, initialProjectId, initialRoadmapItemId, onClose, onCreated }: {
  projects: CareerProject[];
  roadmap: RoadmapItem[];
  initialProjectId?: string;
  initialRoadmapItemId?: string;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ProofKind>('project');
  const [date, setDate] = useState(localDateKey());
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [roadmapItemId, setRoadmapItemId] = useState(initialRoadmapItemId ?? '');
  const [saving, setSaving] = useState(false);
  const dialogRef = useDialogFocus<HTMLFormElement>(true, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await createProofItem({ title, kind, date, url, note, projectId: projectId || undefined, roadmapItemId: roadmapItemId || undefined });
    await onCreated();
    onClose();
  }

  return createPortal(
    <div className="ik-workspace-dialog-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <form ref={dialogRef} tabIndex={-1} className="ik-surface ik-workspace-dialog ik-workspace-dialog--proof" role="dialog" aria-modal="true" aria-labelledby="career-proof-modal-title" onSubmit={submit}>
        <header className="ik-workspace-dialog__head">
          <div className="ik-workspace-dialog__intro">
            <span className="ik-section-kicker">ADD PROOF</span>
            <h2 id="career-proof-modal-title">Record something you can point to.</h2>
            <p>Save the artifact now. Add context only when it helps later.</p>
          </div>
          <button className="ik-workspace-dialog__close" type="button" onClick={onClose} aria-label="Close"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="ik-workspace-dialog__body">
          <label className="ik-workspace-dialog__field ik-workspace-dialog__field--hero">Evidence title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Project demo, course certificate…" /></label>
          <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
            <label className="ik-workspace-dialog__field">Kind<select value={kind} onChange={event => setKind(event.target.value as ProofKind)}>{Object.entries(proofKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="ik-workspace-dialog__field">Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
          </div>
          <details className="ik-workspace-dialog__details">
            <summary><span>More details</span><small>optional</small></summary>
            <div className="ik-workspace-dialog__details-body">
              <label className="ik-workspace-dialog__field">Link<input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label>
              <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
                <label className="ik-workspace-dialog__field">Project<select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
                <label className="ik-workspace-dialog__field">Roadmap checkpoint<select value={roadmapItemId} onChange={event => setRoadmapItemId(event.target.value)}><option value="">None</option>{roadmap.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              </div>
              <label className="ik-workspace-dialog__field">What this proves<textarea rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="What can someone verify or understand from this artifact?" /></label>
            </div>
          </details>
          <div className="ik-workspace-dialog__actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton variant="primary" type="submit" disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Keep proof'}</IkButton></div>
        </div>
      </form>
    </div>,
    document.body
  );
}

function ApplicationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> | void }) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('watching');
  const [deadline, setDeadline] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useDialogFocus<HTMLFormElement>(true, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!company.trim() || !role.trim()) return;
    setSaving(true);
    await createApplication({ company, role, status, deadline, sourceUrl, note });
    await onCreated();
    onClose();
  }

  return createPortal(
    <div className="ik-workspace-dialog-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <form ref={dialogRef} tabIndex={-1} className="ik-surface ik-workspace-dialog ik-workspace-dialog--opportunity" role="dialog" aria-modal="true" aria-labelledby="career-application-modal-title" onSubmit={submit}>
        <header className="ik-workspace-dialog__head">
          <div className="ik-workspace-dialog__intro">
            <span className="ik-section-kicker">OPPORTUNITY</span>
            <h2 id="career-application-modal-title">Add it before it disappears into tabs.</h2>
            <p>Keep the opportunity and its next action in one quiet place.</p>
          </div>
          <button className="ik-workspace-dialog__close" type="button" onClick={onClose} aria-label="Close"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="ik-workspace-dialog__body">
          <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
            <label className="ik-workspace-dialog__field ik-workspace-dialog__field--hero">Organization<input value={company} onChange={event => setCompany(event.target.value)} placeholder="Company / lab / program" /></label>
            <label className="ik-workspace-dialog__field ik-workspace-dialog__field--hero">Role<input value={role} onChange={event => setRole(event.target.value)} placeholder="Role, program, collaboration…" /></label>
          </div>
          <details className="ik-workspace-dialog__details">
            <summary><span>Tracking details</span><small>optional</small></summary>
            <div className="ik-workspace-dialog__details-body">
              <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
                <label className="ik-workspace-dialog__field">Status<select value={status} onChange={event => setStatus(event.target.value as ApplicationStatus)}>{Object.entries(appStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="ik-workspace-dialog__field">Deadline<input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></label>
              </div>
              <label className="ik-workspace-dialog__field">Source link<input value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://…" /></label>
              <label className="ik-workspace-dialog__field">Notes<textarea rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Why it fits, referral, requirements, next action…" /></label>
            </div>
          </details>
          <div className="ik-workspace-dialog__actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton variant="primary" type="submit" disabled={saving || !company.trim() || !role.trim()}>{saving ? 'Adding…' : 'Add opportunity'}</IkButton></div>
        </div>
      </form>
    </div>,
    document.body
  );
}

function ProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> | void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useDialogFocus<HTMLFormElement>(true, onClose);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await createCareerProject({ title, summary, targetDate, repoUrl, demoUrl });
    await onCreated();
    onClose();
  }

  return createPortal(
    <div className="ik-workspace-dialog-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <form ref={dialogRef} tabIndex={-1} className="ik-surface ik-workspace-dialog ik-workspace-dialog--project" role="dialog" aria-modal="true" aria-labelledby="career-project-modal-title" onSubmit={submit}>
        <header className="ik-workspace-dialog__head">
          <div className="ik-workspace-dialog__intro">
            <span className="ik-section-kicker">PROJECT</span>
            <h2 id="career-project-modal-title">Add a project worth showing.</h2>
            <p>Start with the work itself. The supporting details can wait.</p>
          </div>
          <button className="ik-workspace-dialog__close" type="button" onClick={onClose} aria-label="Close"><X size={17} aria-hidden="true" /></button>
        </header>
        <div className="ik-workspace-dialog__body">
          <label className="ik-workspace-dialog__field ik-workspace-dialog__field--hero">Project name<input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Personal portfolio redesign" /></label>
          <details className="ik-workspace-dialog__details">
            <summary><span>More details</span><small>optional</small></summary>
            <div className="ik-workspace-dialog__details-body">
              <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--story">
                <label className="ik-workspace-dialog__field career-project-story">One-line story<input className="career-project-story-input" type="text" value={summary} onChange={event => setSummary(event.target.value)} placeholder="What it does and why it matters." maxLength={180} /></label>
                <label className="ik-workspace-dialog__field career-project-target">Target date<input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
              </div>
              <div className="ik-workspace-dialog__grid ik-workspace-dialog__grid--two">
                <label className="ik-workspace-dialog__field">Repository<input value={repoUrl} onChange={event => setRepoUrl(event.target.value)} placeholder="https://github.com/…" /></label>
                <label className="ik-workspace-dialog__field">Demo<input value={demoUrl} onChange={event => setDemoUrl(event.target.value)} placeholder="https://…" /></label>
              </div>
            </div>
          </details>
          <div className="ik-workspace-dialog__actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton variant="primary" type="submit" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add project'}</IkButton></div>
        </div>
      </form>
    </div>,
    document.body
  );
}

export function CareerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<CareerProject[]>([]);
  const [proof, setProof] = useState<ProofItem[]>([]);
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [showProof, setShowProof] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubActivity, setGithubActivity] = useState<GitHubPublicActivity | null>(null);
  const [githubState, setGithubState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [githubError, setGithubError] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();
  const requestedProofId = workspaceIdParam(searchParams.get('proof'));
  const requestedProjectId = workspaceIdParam(searchParams.get('project'));
  const requestedCheckpointId = workspaceIdParam(searchParams.get('checkpoint'));
  const requestedAddProof = searchParams.get('addProof') === '1';

  async function refresh() {
    await ensureCareerWorkspace();
    const [nextProjects, nextProof, nextApplications, nextRoadmap] = await Promise.all([listCareerProjects(), listProofItems(), listApplications(), listRoadmapItems()]);
    setProjects(nextProjects);
    setProof(nextProof);
    setApplications(nextApplications);
    setRoadmap(nextRoadmap);
    setWorkspaceLoaded(true);
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { void ensureSettings().then(settings => setGithubUsername(settings.careerGithubUsername ?? '')); }, []);

  useEffect(() => {
    if (!requestedAddProof || !workspaceLoaded) return;
    setShowProof(true);
  }, [requestedAddProof, requestedCheckpointId, requestedProjectId, workspaceLoaded]);

  useEffect(() => {
    const id = requestedProofId ? `career-proof-${requestedProofId}` : requestedProjectId ? `career-project-${requestedProjectId}` : null;
    if (!id) return;
    const node = document.getElementById(id);
    if (!node) return;
    window.requestAnimationFrame(() => node.scrollIntoView({ block: 'center' }));
  }, [requestedProofId, requestedProjectId, proof.length, projects.length]);

  function closeProofModal() {
    setShowProof(false);
    if (!requestedAddProof && !requestedCheckpointId && !requestedProjectId) return;
    const next = new URLSearchParams(searchParams);
    next.delete('addProof');
    next.delete('checkpoint');
    next.delete('project');
    setSearchParams(next, { replace: true });
  }

  async function loadGithub(event?: FormEvent) {
    event?.preventDefault();
    const normalized = normalizeGitHubUsername(githubUsername);
    if (!normalized) { setGithubError('Enter a valid GitHub username.'); setGithubState('error'); return; }
    setGithubState('loading');
    setGithubError('');
    try {
      const activity = await loadGitHubPublicActivity(normalized);
      setGithubUsername(normalized);
      setGithubActivity(activity);
      setGithubState('idle');
      await updateSettings({ careerGithubUsername: normalized });
    } catch (error) {
      setGithubActivity(null);
      setGithubState('error');
      setGithubError(error instanceof Error ? error.message : 'GitHub activity could not be loaded.');
    }
  }

  const activeApplications = applications.filter(item => !['closed'].includes(item.status));
  const proofByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of proof) if (item.projectId) map.set(item.projectId, (map.get(item.projectId) ?? 0) + 1);
    return map;
  }, [proof]);

  return (
    <div className="page career-page">
      <div className="ik-page-width">
        <PageHeader
          eyebrow={<><BriefcaseBusiness size={12} /> CAREER · PROOF WALL</>}
          title="Proof, not promises."
          description="Projects, certificates, public artifacts and applications belong in one place so career claims can point to something real."
          actions={<><IkButton variant="quiet" onClick={() => setShowApplication(true)}><Send size={14} /> Opportunity</IkButton><IkButton variant="primary" onClick={() => setShowProof(true)}><Plus size={14} /> Add proof</IkButton></>}
          meta={<><span>{projects.length} projects</span><span>·</span><span>{proof.length} proof artifacts</span><span>·</span><span>{activeApplications.length} open opportunities</span></>}
        />

        <section className="career-hub-v028" aria-label="Connected career signals">
          <article className="career-github-card ik-surface">
            <div className="career-github-head">
              <div className="career-github-title"><span><TerminalSquare size={22} /></span><div><h2>GitHub activity</h2><p>Optional public activity view. Nothing is imported into your Ikigai records.</p></div></div>
              <form className="career-github-form" onSubmit={loadGithub}>
                <input value={githubUsername} onChange={event => setGithubUsername(event.target.value)} placeholder="GitHub username" aria-label="GitHub username" autoCapitalize="none" autoCorrect="off" />
                <button type="submit" disabled={githubState === 'loading'}>{githubState === 'loading' ? <><RefreshCw size={13} /> Loading</> : githubActivity ? <><RefreshCw size={13} /> Refresh</> : <><TerminalSquare size={13} /> Show activity</>}</button>
              </form>
            </div>
            {githubState === 'error' ? <p className="career-github-error" role="alert">{githubError}</p> : null}
            {githubActivity ? <div className="career-github-body">
              <div className="career-github-profile"><div><strong>{githubActivity.profile.name || githubActivity.profile.login}</strong><small>@{githubActivity.profile.login} · {githubActivity.profile.publicRepos} public repos · {githubActivity.profile.followers} followers</small>{githubActivity.profile.bio ? <small>{githubActivity.profile.bio}</small> : null}</div><SafeExternalLink href={githubActivity.profile.htmlUrl}>Open GitHub <ExternalLink size={11} /></SafeExternalLink></div>
              <div className="career-github-stage">
                <div className="career-github-emblem" aria-hidden="true"><b className="career-github-monogram">GH</b><span>PUBLIC</span></div>
                <div className="career-github-activity">
                  <div className="career-github-activity-head"><div><span>RECENT PUBLIC ACTIVITY</span><small>Approx. 13 weeks · unauthenticated public events</small></div><strong>{githubActivity.eventCount}</strong></div>
                  <div className="career-github-grid" aria-label="Recent public GitHub activity over approximately thirteen weeks">
                    {githubActivity.days.map(day => <span key={day.date} className="career-github-day" data-level={githubLevel(day.count)} title={`${day.date}: ${day.count} public event${day.count === 1 ? '' : 's'}`} />)}
                  </div>
                  <div className="career-github-legend" aria-hidden="true"><span>Quiet</span><i data-level="0" /><i data-level="1" /><i data-level="2" /><i data-level="3" /><i data-level="4" /><span>Active</span></div>
                </div>
              </div>
              <small className="career-github-note">{githubActivity.note} Exact private/public contribution totals require GitHub authorization; this view deliberately avoids asking for a token.</small>
            </div> : <p className="career-github-empty">Enter a username only if you want this page to show GitHub activity. Career works normally without it.</p>}
          </article>
        </section>

        <section className="career-principle">
          <span><Sparkles size={18} /></span>
          <div><b>Evidence is the unit of progress here.</b><p>A course matters when it changed what you can do. A project matters when someone can inspect it. An application matters when it has a next action.</p></div>
        </section>

        <section className="career-section project-shelf">
          <header><div><span className="ik-section-kicker">PROJECT SHELF</span><h2>The work that carries your story.</h2></div><button type="button" onClick={() => setShowProject(true)}><Plus size={14} /> Add project</button></header>
          <div className="career-project-grid">
            {projects.length ? projects.map(project => (
              <article id={`career-project-${project.id}`} key={project.id} className={`career-project ik-surface ${requestedProjectId === project.id ? 'is-linked-focus' : ''}`}>
                <div className="career-project-top"><span className="career-project-mark"><Rocket size={18} /></span><select value={project.status} onChange={event => void updateCareerProject(project.id, { status: event.target.value as CareerProjectStatus }).then(refresh)} aria-label={`Status for ${project.title}`}>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <h3>{project.title}</h3>
                <p>{project.summary || 'Add a concise explanation of what this project proves.'}</p>
                <div className="career-project-meta"><span>{proofByProject.get(project.id) ?? 0} proof linked</span>{project.targetDate ? <span>Target {formatDate(project.targetDate)}</span> : <span>No target date</span>}</div>
                <div className="career-project-links">
                  {project.repoUrl ? <SafeExternalLink href={project.repoUrl}><TerminalSquare size={13} /> Repository <ExternalLink size={11} /></SafeExternalLink> : <span><TerminalSquare size={13} /> Repository not linked</span>}
                  {project.demoUrl ? <SafeExternalLink href={project.demoUrl}><Link2 size={13} /> Demo <ExternalLink size={11} /></SafeExternalLink> : <span><Link2 size={13} /> Demo not linked</span>}
                </div>
                <details className="career-project-edit"><summary>Edit links / target</summary><div><label>Repository<input defaultValue={project.repoUrl ?? ''} onBlur={event => void updateCareerProject(project.id, { repoUrl: event.target.value }).then(refresh)} placeholder="https://…" /></label><label>Demo<input defaultValue={project.demoUrl ?? ''} onBlur={event => void updateCareerProject(project.id, { demoUrl: event.target.value }).then(refresh)} placeholder="https://…" /></label><label>Target<input type="date" defaultValue={project.targetDate ?? ''} onBlur={event => void updateCareerProject(project.id, { targetDate: event.target.value || undefined }).then(refresh)} /></label></div></details>
              </article>
            )) : <EmptyState
              compact
              className="career-empty career-project-empty"
              icon={<Rocket size={22} />}
              eyebrow="PROJECT SHELF"
              title="No projects on the shelf yet."
              description="Add something you are building, maintaining, or preparing to show. It can stay private and unfinished."
              action={<IkButton size="sm" variant="quiet" onClick={() => setShowProject(true)}><Plus size={13} /> Add first project</IkButton>}
            />}
          </div>
        </section>

        <div className="career-two-column">
          <section className="career-section proof-ledger ik-surface">
            <header><div><span className="ik-section-kicker">PROOF LEDGER</span><h2>Things you can point to.</h2></div><button type="button" onClick={() => setShowProof(true)}><Plus size={14} /> Add</button></header>
            <div className="proof-list">
              {proof.length ? proof.map(item => {
                const project = item.projectId ? projects.find(entry => entry.id === item.projectId) : undefined;
                const checkpoint = item.roadmapItemId ? roadmap.find(entry => entry.id === item.roadmapItemId) : undefined;
                return (
                  <article id={`career-proof-${item.id}`} key={item.id} className={`proof-row ${requestedProofId === item.id ? 'is-linked-focus' : ''}`}>
                    <span className="proof-kind"><FileText size={15} /> {proofKindLabels[item.kind]}</span>
                    <div className="proof-copy">
                      <h3>{item.title}</h3>
                      <p>{item.note || [project?.title, checkpoint?.title].filter(Boolean).join(' · ') || 'Recorded evidence.'}</p>
                      <small>{formatDate(item.date)}{project ? ` · ${project.title}` : ''}</small>
                      <div className="career032-proof-thread" aria-label="Proof continuity">
                        {checkpoint ? <Link to={`/roadmap?checkpoint=${encodeURIComponent(checkpoint.id)}`}>Roadmap checkpoint <ArrowUpRight size={11} /></Link> : null}
                        <Link to={`/calendar?date=${item.date}`}>Journey date <ArrowUpRight size={11} /></Link>
                      </div>
                    </div>
                    <div className="proof-actions">{item.url ? <SafeExternalLink href={item.url} aria-label={`Open ${item.title}`}><Link2 size={14} /></SafeExternalLink> : null}<button type="button" onClick={async () => { if (!(await confirm({ title: 'Delete proof?', message: 'Delete this proof item?', confirmLabel: 'Delete proof', tone: 'danger' }))) return; await deleteProofItem(item.id); if (requestedProofId === item.id) { const next = new URLSearchParams(searchParams); next.delete('proof'); setSearchParams(next, { replace: true }); } await refresh(); }} aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button></div>
                  </article>
                );
              }) : <EmptyState
                compact
                className="career-empty"
                icon={<Check size={23} />}
                title="No proof recorded yet."
                description="Start with one artifact you would actually show another person."
                action={<IkButton size="sm" variant="quiet" onClick={() => setShowProof(true)}><Plus size={13} /> Add proof</IkButton>}
              />}
            </div>
          </section>

          <section className="career-section opportunity-desk ik-surface">
            <header><div><span className="ik-section-kicker">OPPORTUNITY DESK</span><h2>Applications with a next action.</h2></div><button type="button" onClick={() => setShowApplication(true)}><Plus size={14} /> Add</button></header>
            <div className="application-list">
              {applications.length ? applications.map(item => (
                <article key={item.id} className={`application-row status-${item.status}`}>
                  <div className="application-main"><span className="application-company"><Search size={14} /> {item.company}</span><h3>{item.role}</h3><p>{item.note || 'No note yet.'}</p><small>{item.deadline ? `Deadline ${formatDate(item.deadline)}` : 'No deadline saved'}{item.appliedAt ? ` · Applied ${formatDate(item.appliedAt)}` : ''}</small></div>
                  <div className="application-actions"><select value={item.status} onChange={event => void updateApplicationStatus(item.id, event.target.value as ApplicationStatus).then(refresh)}>{Object.entries(appStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{item.sourceUrl ? <SafeExternalLink href={item.sourceUrl} aria-label={`Open source for ${item.company}`}><ExternalLink size={14} /></SafeExternalLink> : null}<button type="button" onClick={async () => { if (!(await confirm({ title: 'Delete opportunity?', message: 'Delete this opportunity?', confirmLabel: 'Delete opportunity', tone: 'danger' }))) return; await deleteApplication(item.id); await refresh(); }}><Trash2 size={14} /></button></span></div>
                </article>
              )) : <EmptyState
                compact
                className="career-empty"
                icon={<Send size={23} />}
                title="No opportunities tracked."
                description="When a role looks relevant, capture it here before opening fifteen tabs."
                action={<IkButton size="sm" variant="quiet" onClick={() => setShowApplication(true)}><Plus size={13} /> Add opportunity</IkButton>}
              />}
            </div>
          </section>
        </div>
      </div>

      {showProof ? <ProofModal projects={projects} roadmap={roadmap} initialProjectId={requestedProjectId && projects.some(item => item.id === requestedProjectId) ? requestedProjectId : undefined} initialRoadmapItemId={requestedCheckpointId && roadmap.some(item => item.id === requestedCheckpointId) ? requestedCheckpointId : undefined} onClose={closeProofModal} onCreated={refresh} /> : null}
      {showApplication ? <ApplicationModal onClose={() => setShowApplication(false)} onCreated={refresh} /> : null}
      {showProject ? <ProjectModal onClose={() => setShowProject(false)} onCreated={refresh} /> : null}
      {confirmDialog}
    </div>
  );
}
