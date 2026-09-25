import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
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
  Search
} from 'lucide-react';
import { IkButton } from '../components/ui/IkButton';
import { PageHeader } from '../components/ui/PageHeader';
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
import '../roadmap-career-v090.css';

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

function ProofModal({ projects, roadmap, onClose, onCreated }: {
  projects: CareerProject[];
  roadmap: RoadmapItem[];
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ProofKind>('project');
  const [date, setDate] = useState(localDateKey());
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [projectId, setProjectId] = useState('');
  const [roadmapItemId, setRoadmapItemId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await createProofItem({ title, kind, date, url, note, projectId: projectId || undefined, roadmapItemId: roadmapItemId || undefined });
    await onCreated();
    onClose();
  }

  return (
    <div className="ik-modal-backdrop career-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <form className="ik-surface career-modal" onSubmit={submit}>
        <div className="career-modal-head"><div><span className="ik-section-kicker">ADD PROOF</span><h2>Record something you can point to.</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <label>Evidence title<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="Project demo, course certificate…" /></label>
        <div className="career-form-grid"><label>Kind<select value={kind} onChange={event => setKind(event.target.value as ProofKind)}>{Object.entries(proofKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label></div>
        <label>Link<input value={url} onChange={event => setUrl(event.target.value)} placeholder="https://… (optional)" /></label>
        <div className="career-form-grid"><label>Project<select value={projectId} onChange={event => setProjectId(event.target.value)}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Roadmap checkpoint<select value={roadmapItemId} onChange={event => setRoadmapItemId(event.target.value)}><option value="">None</option>{roadmap.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
        <label>What this proves<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="What can someone verify or understand from this artifact?" /></label>
        <div className="career-modal-actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton variant="primary" type="submit" disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Keep proof'}</IkButton></div>
      </form>
    </div>
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!company.trim() || !role.trim()) return;
    setSaving(true);
    await createApplication({ company, role, status, deadline, sourceUrl, note });
    await onCreated();
    onClose();
  }

  return (
    <div className="ik-modal-backdrop career-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <form className="ik-surface career-modal" onSubmit={submit}>
        <div className="career-modal-head"><div><span className="ik-section-kicker">OPPORTUNITY</span><h2>Add it before it disappears into tabs.</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="career-form-grid"><label>Organization<input autoFocus value={company} onChange={event => setCompany(event.target.value)} placeholder="Company / lab / program" /></label><label>Role<input value={role} onChange={event => setRole(event.target.value)} placeholder="Role, program, collaboration…" /></label></div>
        <div className="career-form-grid"><label>Status<select value={status} onChange={event => setStatus(event.target.value as ApplicationStatus)}>{Object.entries(appStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Deadline<input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></label></div>
        <label>Source link<input value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://…" /></label>
        <label>Notes<textarea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Why it fits, referral, requirements, next action…" /></label>
        <div className="career-modal-actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton variant="primary" type="submit" disabled={saving || !company.trim() || !role.trim()}>{saving ? 'Adding…' : 'Add opportunity'}</IkButton></div>
      </form>
    </div>
  );
}

function ProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> | void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await createCareerProject({ title, summary, targetDate, repoUrl, demoUrl });
    await onCreated();
    onClose();
  }

  return (
    <div className="ik-modal-backdrop career-modal-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}>
      <form className="ik-surface career-modal" onSubmit={submit}>
        <div className="career-modal-head"><div><span className="ik-section-kicker">PROJECT SHELF</span><h2>Add a project worth showing.</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <label>Project name<input autoFocus value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>One-line story<textarea rows={3} value={summary} onChange={event => setSummary(event.target.value)} placeholder="What it does and why it matters." /></label>
        <label>Target date<input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label>
        <div className="career-form-grid"><label>Repository<input value={repoUrl} onChange={event => setRepoUrl(event.target.value)} placeholder="https://github.com/…" /></label><label>Demo<input value={demoUrl} onChange={event => setDemoUrl(event.target.value)} placeholder="https://…" /></label></div>
        <div className="career-modal-actions"><IkButton variant="quiet" onClick={onClose}>Cancel</IkButton><IkButton variant="primary" type="submit" disabled={saving || !title.trim()}>{saving ? 'Adding…' : 'Add project'}</IkButton></div>
      </form>
    </div>
  );
}

export function CareerPage() {
  const [projects, setProjects] = useState<CareerProject[]>([]);
  const [proof, setProof] = useState<ProofItem[]>([]);
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [showProof, setShowProof] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [showProject, setShowProject] = useState(false);

  async function refresh() {
    await ensureCareerWorkspace();
    const [nextProjects, nextProof, nextApplications, nextRoadmap] = await Promise.all([listCareerProjects(), listProofItems(), listApplications(), listRoadmapItems()]);
    setProjects(nextProjects);
    setProof(nextProof);
    setApplications(nextApplications);
    setRoadmap(nextRoadmap);
  }

  useEffect(() => { void refresh(); }, []);

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

        <section className="career-principle">
          <span><Sparkles size={18} /></span>
          <div><b>Evidence is the unit of progress here.</b><p>A course matters when it changed what you can do. A project matters when someone can inspect it. An application matters when it has a next action.</p></div>
        </section>

        <section className="career-section project-shelf">
          <header><div><span className="ik-section-kicker">PROJECT SHELF</span><h2>The work that carries your story.</h2></div><button type="button" onClick={() => setShowProject(true)}><Plus size={14} /> Add project</button></header>
          <div className="career-project-grid">
            {projects.map(project => (
              <article key={project.id} className="career-project ik-surface">
                <div className="career-project-top"><span className="career-project-mark"><Rocket size={18} /></span><select value={project.status} onChange={event => void updateCareerProject(project.id, { status: event.target.value as CareerProjectStatus }).then(refresh)} aria-label={`Status for ${project.title}`}>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <h3>{project.title}</h3>
                <p>{project.summary || 'Add a concise explanation of what this project proves.'}</p>
                <div className="career-project-meta"><span>{proofByProject.get(project.id) ?? 0} proof linked</span>{project.targetDate ? <span>Target {formatDate(project.targetDate)}</span> : <span>No target date</span>}</div>
                <div className="career-project-links">
                  {project.repoUrl ? <a href={project.repoUrl} target="_blank" rel="noreferrer"><TerminalSquare size={13} /> Repository <ExternalLink size={11} /></a> : <span><TerminalSquare size={13} /> Repository not linked</span>}
                  {project.demoUrl ? <a href={project.demoUrl} target="_blank" rel="noreferrer"><Link2 size={13} /> Demo <ExternalLink size={11} /></a> : <span><Link2 size={13} /> Demo not linked</span>}
                </div>
                <details className="career-project-edit"><summary>Edit links / target</summary><div><label>Repository<input defaultValue={project.repoUrl ?? ''} onBlur={event => void updateCareerProject(project.id, { repoUrl: event.target.value }).then(refresh)} placeholder="https://…" /></label><label>Demo<input defaultValue={project.demoUrl ?? ''} onBlur={event => void updateCareerProject(project.id, { demoUrl: event.target.value }).then(refresh)} placeholder="https://…" /></label><label>Target<input type="date" defaultValue={project.targetDate ?? ''} onBlur={event => void updateCareerProject(project.id, { targetDate: event.target.value || undefined }).then(refresh)} /></label></div></details>
              </article>
            ))}
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
                  <article key={item.id} className="proof-row">
                    <span className="proof-kind"><FileText size={15} /> {proofKindLabels[item.kind]}</span>
                    <div className="proof-copy"><h3>{item.title}</h3><p>{item.note || [project?.title, checkpoint?.title].filter(Boolean).join(' · ') || 'Recorded evidence.'}</p><small>{formatDate(item.date)}{project ? ` · ${project.title}` : ''}</small></div>
                    <div className="proof-actions">{item.url ? <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><Link2 size={14} /></a> : null}<button type="button" onClick={async () => { if (!window.confirm('Delete this proof item?')) return; await deleteProofItem(item.id); await refresh(); }} aria-label={`Delete ${item.title}`}><Trash2 size={14} /></button></div>
                  </article>
                );
              }) : <div className="career-empty"><Check size={23} /><h3>No proof recorded yet.</h3><p>Start with one artifact you would actually show another person.</p></div>}
            </div>
          </section>

          <section className="career-section opportunity-desk ik-surface">
            <header><div><span className="ik-section-kicker">OPPORTUNITY DESK</span><h2>Applications with a next action.</h2></div><button type="button" onClick={() => setShowApplication(true)}><Plus size={14} /> Add</button></header>
            <div className="application-list">
              {applications.length ? applications.map(item => (
                <article key={item.id} className={`application-row status-${item.status}`}>
                  <div className="application-main"><span className="application-company"><Search size={14} /> {item.company}</span><h3>{item.role}</h3><p>{item.note || 'No note yet.'}</p><small>{item.deadline ? `Deadline ${formatDate(item.deadline)}` : 'No deadline saved'}{item.appliedAt ? ` · Applied ${formatDate(item.appliedAt)}` : ''}</small></div>
                  <div className="application-actions"><select value={item.status} onChange={event => void updateApplicationStatus(item.id, event.target.value as ApplicationStatus).then(refresh)}>{Object.entries(appStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a> : null}<button type="button" onClick={async () => { if (!window.confirm('Delete this opportunity?')) return; await deleteApplication(item.id); await refresh(); }}><Trash2 size={14} /></button></span></div>
                </article>
              )) : <div className="career-empty"><Send size={23} /><h3>No opportunities tracked.</h3><p>When a role looks relevant, capture it here before opening fifteen tabs.</p></div>}
            </div>
          </section>
        </div>
      </div>

      {showProof ? <ProofModal projects={projects} roadmap={roadmap} onClose={() => setShowProof(false)} onCreated={refresh} /> : null}
      {showApplication ? <ApplicationModal onClose={() => setShowApplication(false)} onCreated={refresh} /> : null}
      {showProject ? <ProjectModal onClose={() => setShowProject(false)} onCreated={refresh} /> : null}
    </div>
  );
}
