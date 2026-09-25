import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  BookOpen,
  Download,
  File,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  Link2,
  Paperclip,
  Pencil,
  Plus,
  Rows3,
  Search,
  Tag,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { IkButton } from '../components/ui/IkButton';
import { PageHeader } from '../components/ui/PageHeader';
import { toDateKey } from '../lib/date';
import {
  addMemoryAttachments,
  createMemory,
  deleteMemory,
  formatMemoryBytes,
  memoryAttachmentMap,
  memoryTasks,
  normalizeLink,
  removeMemoryAttachment,
  updateMemory,
  validateMemoryFiles,
  type MemoryDraft
} from '../lib/memories';
import { db } from '../db';
import type { MemoryAttachment, Task, VaultMemory, VaultMemoryKind } from '../types';
import '../memories-v080.css';

type ViewMode = 'timeline' | 'gallery';

const kindLabels: Record<VaultMemoryKind, string> = {
  note: 'Note',
  photo: 'Photo',
  file: 'File',
  link: 'Link',
  mixed: 'Mixed'
};

function memoryIcon(kind: VaultMemoryKind, size = 16) {
  if (kind === 'photo') return <ImageIcon size={size} />;
  if (kind === 'file') return <FileText size={size} />;
  if (kind === 'link') return <Link2 size={size} />;
  if (kind === 'mixed') return <Archive size={size} />;
  return <BookOpen size={size} />;
}

function formatMemoryDate(key: string, compact = false) {
  const [year, month, day] = key.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-IN', compact
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  ).format(value);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function useObjectUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function MemoryImage({ attachment, alt, className = '' }: { attachment: MemoryAttachment; alt: string; className?: string }) {
  const src = useObjectUrl(attachment.blob);
  if (!src) return <div className={`memory-image-placeholder ${className}`}><ImageIcon size={22} /></div>;
  return <img className={className} src={src} alt={alt} loading="lazy" />;
}

function AttachmentDownload({ attachment, children, className = '' }: { attachment: MemoryAttachment; children: ReactNode; className?: string }) {
  const href = useObjectUrl(attachment.blob);
  if (!href) return null;
  return <a className={className} href={href} download={attachment.name}>{children}</a>;
}

function CaptureMemoryModal({
  memory,
  tasks,
  onClose,
  onSaved
}: {
  memory?: VaultMemory;
  tasks: Task[];
  onClose: () => void;
  onSaved: (memoryId: string) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(memory?.title ?? '');
  const [date, setDate] = useState(memory?.date ?? toDateKey());
  const [body, setBody] = useState(memory?.body ?? '');
  const [linkUrl, setLinkUrl] = useState(memory?.linkUrl ?? '');
  const [tags, setTags] = useState(memory?.tags.join(', ') ?? '');
  const [taskId, setTaskId] = useState(memory?.taskId ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  function chooseFiles(next: FileList | null) {
    const selected = Array.from(next ?? []);
    const combined = [...files, ...selected];
    const message = validateMemoryFiles(combined);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setFiles(combined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Give this memory a short title so you can find it later.');
      return;
    }
    if (!date) {
      setError('Choose the day this memory belongs to.');
      return;
    }
    if (linkUrl.trim() && !normalizeLink(linkUrl)) {
      setError('That link needs to start with http:// or https://.');
      return;
    }
    const fileError = validateMemoryFiles(files);
    if (fileError) {
      setError(fileError);
      return;
    }

    setSaving(true);
    try {
      const draft: MemoryDraft = {
        title,
        body,
        date,
        linkUrl,
        tags,
        taskId: taskId || undefined
      };
      if (memory) {
        await updateMemory(memory.id, draft);
        if (files.length) await addMemoryAttachments(memory.id, files);
        await onSaved(memory.id);
      } else {
        const created = await createMemory(draft, files);
        await onSaved(created.id);
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ikigai could not save that memory.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div className="memory-modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.form
        className="memory-capture-modal ik-surface"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-capture-title"
        initial={{ opacity: 0, y: 16, scale: .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: .99 }}
      >
        <div className="memory-modal-head">
          <div>
            <span className="ik-section-kicker">{memory ? 'EDIT MEMORY' : 'CAPTURE MEMORY'}</span>
            <h2 id="memory-capture-title">{memory ? 'Adjust the record.' : 'Put something somewhere safe.'}</h2>
          </div>
          <button type="button" className="memory-icon-button" onClick={onClose} aria-label="Close memory editor" disabled={saving}><X size={18} /></button>
        </div>

        <div className="memory-form-grid">
          <label className="memory-field memory-field-wide">
            <span>Title</span>
            <input className="ik-field" autoFocus value={title} onChange={event => setTitle(event.target.value)} maxLength={160} placeholder="The thing you want to remember" />
          </label>
          <label className="memory-field">
            <span>Date</span>
            <input className="ik-field" type="date" value={date} onChange={event => setDate(event.target.value)} />
          </label>
          <label className="memory-field">
            <span>Related quest <small>optional</small></span>
            <select className="ik-field" value={taskId} onChange={event => setTaskId(event.target.value)}>
              <option value="">No linked quest</option>
              {tasks.slice(0, 120).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </label>
          <label className="memory-field memory-field-wide">
            <span>What happened?</span>
            <textarea className="ik-field memory-body-input" value={body} onChange={event => setBody(event.target.value)} placeholder="Write as much or as little as the moment needs…" />
          </label>
          <label className="memory-field">
            <span>Link <small>optional</small></span>
            <input className="ik-field" type="url" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} placeholder="https://…" />
          </label>
          <label className="memory-field">
            <span>Tags</span>
            <input className="ik-field" value={tags} onChange={event => setTags(event.target.value)} placeholder="project, study, idea" />
          </label>
        </div>

        <div className="memory-file-drop">
          <div className="memory-file-drop-copy">
            <UploadCloud size={19} />
            <div><strong>Photos, screenshots, PDFs or files</strong><small>Stored inside this browser. 25 MB per file · 60 MB per capture.</small></div>
          </div>
          <label className="ik-button ik-button-quiet ik-button-sm">
            <Paperclip size={14} /> Add files
            <input hidden type="file" multiple onChange={event => { chooseFiles(event.target.files); event.currentTarget.value = ''; }} />
          </label>
        </div>

        {files.length ? (
          <div className="memory-staged-files">
            {files.map((file, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`}>
                <span><File size={13} /><b>{file.name}</b><small>{formatMemoryBytes(file.size)}</small></span>
                <button type="button" onClick={() => setFiles(current => current.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}><X size={13} /></button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <p className="memory-form-error" role="alert">{error}</p> : null}
        <div className="memory-modal-actions">
          <span>LOCAL ONLY · ATTACHMENTS NEVER LEAVE THE DEVICE BY THIS FEATURE</span>
          <div>
            <IkButton type="button" variant="quiet" onClick={onClose} disabled={saving}>Cancel</IkButton>
            <IkButton type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : memory ? 'Save changes' : 'Keep memory'}</IkButton>
          </div>
        </div>
      </motion.form>
    </motion.div>
  );
}

function MemoryCover({ memory, attachments }: { memory: VaultMemory; attachments: MemoryAttachment[] }) {
  const image = attachments.find(item => item.kind === 'image');
  if (image) return <MemoryImage attachment={image} alt="" className="memory-cover-image" />;
  return (
    <div className={`memory-cover-symbol kind-${memory.kind}`}>
      {memoryIcon(memory.kind, 25)}
      <span>{kindLabels[memory.kind]}</span>
    </div>
  );
}

function MemoryCard({ memory, attachments, selected, onSelect, gallery = false }: {
  memory: VaultMemory;
  attachments: MemoryAttachment[];
  selected: boolean;
  onSelect: () => void;
  gallery?: boolean;
}) {
  return (
    <button type="button" className={`memory-card ${selected ? 'selected' : ''} ${gallery ? 'gallery' : ''}`} onClick={onSelect}>
      {gallery ? <MemoryCover memory={memory} attachments={attachments} /> : null}
      <div className="memory-card-copy">
        <div className="memory-card-meta">
          <span>{memoryIcon(memory.kind, 13)} {kindLabels[memory.kind]}</span>
          <time>{formatMemoryDate(memory.date, true)}</time>
        </div>
        <h3>{memory.title}</h3>
        {memory.body ? <p>{memory.body}</p> : memory.linkUrl ? <p>{memory.linkUrl.replace(/^https?:\/\//, '')}</p> : <p>{attachments.length} attachment{attachments.length === 1 ? '' : 's'} kept here.</p>}
        <div className="memory-card-foot">
          <span>{memory.tags.slice(0, 3).map(tag => <i key={tag}>#{tag}</i>)}</span>
          {attachments.length ? <b><Paperclip size={11} /> {attachments.length}</b> : null}
        </div>
      </div>
    </button>
  );
}

function AttachmentPreview({ attachment, onRemove }: { attachment: MemoryAttachment; onRemove: () => void }) {
  if (attachment.kind === 'image') {
    return (
      <figure className="memory-detail-image">
        <MemoryImage attachment={attachment} alt={attachment.name} />
        <figcaption>
          <span><b>{attachment.name}</b><small>{formatMemoryBytes(attachment.size)}</small></span>
          <span>
            <AttachmentDownload attachment={attachment} className="memory-attachment-action" ><Download size={13} /><span>Download</span></AttachmentDownload>
            <button type="button" className="memory-attachment-action danger" onClick={onRemove}><Trash2 size={13} /><span>Remove</span></button>
          </span>
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="memory-file-row">
      <span className="memory-file-icon">{attachment.kind === 'pdf' ? <FileText size={18} /> : <File size={18} />}</span>
      <span className="memory-file-copy"><b>{attachment.name}</b><small>{attachment.mimeType || 'File'} · {formatMemoryBytes(attachment.size)}</small></span>
      <AttachmentDownload attachment={attachment} className="memory-icon-button" ><Download size={15} /></AttachmentDownload>
      <button type="button" className="memory-icon-button danger" onClick={onRemove} aria-label={`Remove ${attachment.name}`}><Trash2 size={15} /></button>
    </div>
  );
}

function MemoryDetail({ memory, attachments, task, onEdit, onDeleted, onAttachmentRemoved }: {
  memory?: VaultMemory;
  attachments: MemoryAttachment[];
  task?: Task;
  onEdit: () => void;
  onDeleted: () => Promise<void> | void;
  onAttachmentRemoved: (id: string) => Promise<void> | void;
}) {
  if (!memory) {
    return (
      <aside className="memory-detail ik-surface">
        <div className="memory-detail-empty">
          <Archive size={28} />
          <span className="ik-section-kicker">ARCHIVE DRAWER</span>
          <h2>Select a memory.</h2>
          <p>The full record, attachments and linked quest will open here.</p>
        </div>
      </aside>
    );
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this attachment from the memory?')) return;
    await onAttachmentRemoved(id);
  }

  async function removeMemory() {
    if (!window.confirm('Delete this memory and its local attachments? This cannot be undone.')) return;
    await onDeleted();
  }

  return (
    <aside className="memory-detail ik-surface">
      <div className="memory-detail-head">
        <span className="memory-kind-badge">{memoryIcon(memory.kind, 13)} {kindLabels[memory.kind]}</span>
        <div>
          <button type="button" className="memory-icon-button" onClick={onEdit} aria-label="Edit memory"><Pencil size={15} /></button>
          <button type="button" className="memory-icon-button danger" onClick={() => void removeMemory()} aria-label="Delete memory"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="memory-detail-title">
        <time>{formatMemoryDate(memory.date)}</time>
        <h2>{memory.title}</h2>
        {memory.tags.length ? <div className="memory-detail-tags">{memory.tags.map(tag => <span key={tag}>#{tag}</span>)}</div> : null}
      </div>

      {memory.body ? <div className="memory-detail-body">{memory.body.split('\n').map((line, index) => <p key={`${line}-${index}`}>{line || '\u00a0'}</p>)}</div> : null}

      {task ? (
        <div className="memory-linked-record">
          <span><BookOpen size={14} /> RELATED QUEST</span>
          <b>{task.title}</b>
          <small>{task.category}{task.completedAt ? ' · completed' : ' · open'}</small>
        </div>
      ) : null}

      {memory.linkUrl ? (
        <a className="memory-link-card" href={memory.linkUrl} target="_blank" rel="noreferrer noopener">
          <Link2 size={16} />
          <span><small>LINK KEPT WITH THIS MEMORY</small><b>{memory.linkUrl.replace(/^https?:\/\//, '')}</b></span>
        </a>
      ) : null}

      {attachments.length ? (
        <div className="memory-attachments">
          <div className="memory-detail-section-head"><span>ATTACHMENTS</span><b>{attachments.length}</b></div>
          {attachments.map(attachment => <AttachmentPreview key={attachment.id} attachment={attachment} onRemove={() => void remove(attachment.id)} />)}
        </div>
      ) : null}

      <div className="memory-detail-stamp">
        <Archive size={14} />
        <span>Stored locally · updated {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(memory.updatedAt))}</span>
      </div>
    </aside>
  );
}

export function MemoriesPage() {
  const [memories, setMemories] = useState<VaultMemory[]>([]);
  const [attachments, setAttachments] = useState<Map<string, MemoryAttachment[]>>(new Map());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [view, setView] = useState<ViewMode>('timeline');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [composer, setComposer] = useState<{ open: boolean; memory?: VaultMemory }>({ open: false });
  const [loading, setLoading] = useState(true);

  async function reload(preferredId?: string) {
    const nextMemories = await db.memories.orderBy('date').reverse().toArray();
    const [nextAttachments, nextTasks] = await Promise.all([memoryAttachmentMap(nextMemories), memoryTasks()]);
    setMemories(nextMemories);
    setAttachments(nextAttachments);
    setTasks(nextTasks);
    setSelectedId(current => {
      const desired = preferredId ?? current;
      if (desired && nextMemories.some(memory => memory.id === desired)) return desired;
      return nextMemories[0]?.id;
    });
    setLoading(false);
  }

  useEffect(() => { void reload(); }, []);

  const taskById = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const memory of memories) for (const tag of memory.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [memories]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return memories.filter(memory => {
      if (tagFilter && !memory.tags.some(tag => tag.toLocaleLowerCase() === tagFilter.toLocaleLowerCase())) return false;
      if (!needle) return true;
      const task = memory.taskId ? taskById.get(memory.taskId) : undefined;
      const haystack = [memory.title, memory.body, memory.linkUrl ?? '', memory.tags.join(' '), task?.title ?? ''].join('\n').toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [memories, query, tagFilter, taskById]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId) setSelectedId(undefined);
      return;
    }
    if (!selectedId || !filtered.some(memory => memory.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = memories.find(memory => memory.id === selectedId);
  const selectedAttachments = selected ? attachments.get(selected.id) ?? [] : [];
  const totalBytes = useMemo(() => [...attachments.values()].flat().reduce((sum, item) => sum + item.size, 0), [attachments]);

  const grouped = useMemo(() => {
    const map = new Map<string, VaultMemory[]>();
    for (const memory of filtered) {
      const month = memory.date.slice(0, 7);
      const bucket = map.get(month) ?? [];
      bucket.push(memory);
      map.set(month, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  async function removeSelected() {
    if (!selected) return;
    await deleteMemory(selected.id);
    await reload();
  }

  async function removeAttachment(id: string) {
    await removeMemoryAttachment(id);
    await reload(selectedId);
  }

  return (
    <div className="page memories-page">
      <div className="ik-page-width">
        <PageHeader
          eyebrow={<><Archive size={13} /> MEMORY VAULT · LOCAL ARCHIVE</>}
          title="Keep what mattered."
          description="Notes, photos, screenshots, files and links — attached to the days and quests that gave them meaning."
          actions={<IkButton variant="primary" onClick={() => setComposer({ open: true })}><Plus size={15} /> Capture memory</IkButton>}
          meta={<><span>{memories.length} memories</span><span>·</span><span>{formatMemoryBytes(totalBytes)} attachments stored locally</span></>}
        />

        <section className="memory-toolbar" aria-label="Memory filters">
          <label className="memory-search">
            <Search size={16} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search words, tags, links or linked quests…" aria-label="Search memories" />
            {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button> : null}
          </label>
          <div className="memory-view-switch" role="group" aria-label="Memory view">
            <button type="button" className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}><Rows3 size={14} /> Timeline</button>
            <button type="button" className={view === 'gallery' ? 'active' : ''} onClick={() => setView('gallery')}><Grid3X3 size={14} /> Gallery</button>
          </div>
        </section>

        {allTags.length ? (
          <div className="memory-tag-rail" aria-label="Filter memories by tag">
            <button type="button" className={!tagFilter ? 'active' : ''} onClick={() => setTagFilter('')}><Archive size={11} /> All</button>
            {allTags.slice(0, 14).map(([tag, count]) => (
              <button type="button" key={tag} className={tagFilter === tag ? 'active' : ''} onClick={() => setTagFilter(current => current === tag ? '' : tag)}><Tag size={10} /> {tag}<small>{count}</small></button>
            ))}
          </div>
        ) : null}

        <div className="memory-room">
          <main className="memory-archive">
            {loading ? (
              <div className="memory-empty-state"><Archive size={28} /><h2>Opening the archive…</h2></div>
            ) : !memories.length ? (
              <div className="memory-empty-state ik-surface-flat">
                <Archive size={32} />
                <span className="ik-section-kicker">EMPTY, FOR NOW</span>
                <h2>The first thing you keep becomes the beginning.</h2>
                <p>A photo from a project, a thought after an exam, a PDF you want attached to a chapter of your life — anything worth finding again.</p>
                <IkButton variant="primary" onClick={() => setComposer({ open: true })}><Plus size={15} /> Capture the first memory</IkButton>
              </div>
            ) : !filtered.length ? (
              <div className="memory-empty-state ik-surface-flat"><Search size={28} /><h2>Nothing in the vault matches that.</h2><p>Try another word or clear the active tag.</p></div>
            ) : view === 'gallery' ? (
              <div className="memory-gallery">
                {filtered.map(memory => <MemoryCard key={memory.id} memory={memory} attachments={attachments.get(memory.id) ?? []} selected={selectedId === memory.id} onSelect={() => setSelectedId(memory.id)} gallery />)}
              </div>
            ) : (
              <div className="memory-timeline">
                {grouped.map(([month, entries]) => (
                  <section className="memory-month" key={month}>
                    <div className="memory-month-label"><span>{monthLabel(`${month}-01`)}</span><i /></div>
                    <div className="memory-month-entries">
                      {entries.map(memory => (
                        <div className="memory-timeline-row" key={memory.id}>
                          <div className="memory-date-pin"><b>{Number(memory.date.slice(-2))}</b><span>{new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(new Date(`${memory.date}T12:00:00`))}</span></div>
                          <MemoryCard memory={memory} attachments={attachments.get(memory.id) ?? []} selected={selectedId === memory.id} onSelect={() => setSelectedId(memory.id)} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>

          <MemoryDetail
            memory={selected}
            attachments={selectedAttachments}
            task={selected?.taskId ? taskById.get(selected.taskId) : undefined}
            onEdit={() => selected && setComposer({ open: true, memory: selected })}
            onDeleted={removeSelected}
            onAttachmentRemoved={removeAttachment}
          />
        </div>
      </div>

      <AnimatePresence>
        {composer.open ? <CaptureMemoryModal memory={composer.memory} tasks={tasks} onClose={() => setComposer({ open: false })} onSaved={async id => reload(id)} /> : null}
      </AnimatePresence>
    </div>
  );
}
