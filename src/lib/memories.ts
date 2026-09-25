import { db } from '../db';
import type { MemoryAttachment, MemoryAttachmentKind, Task, VaultMemory, VaultMemoryKind } from '../types';
import { queueSyncChange, queueSyncChanges } from './sync';

export const MAX_MEMORY_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_MEMORY_CAPTURE_BYTES = 60 * 1024 * 1024;

export interface MemoryDraft {
  title: string;
  body: string;
  date: string;
  linkUrl?: string;
  tags: string[] | string;
  taskId?: string;
}

function attachmentKind(file: Pick<File, 'type' | 'name'>): MemoryAttachmentKind {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'file';
}

export function normalizeTags(input: string[] | string): string[] {
  const values = Array.isArray(input) ? input : input.split(',');
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const tag = value.trim().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, 32);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= 12) break;
  }
  return result;
}

export function normalizeLink(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function deriveMemoryKind(memory: Pick<VaultMemory, 'body' | 'linkUrl'>, attachments: Pick<MemoryAttachment, 'kind'>[]): VaultMemoryKind {
  const signals = new Set<string>();
  if (memory.body.trim()) signals.add('note');
  if (memory.linkUrl) signals.add('link');
  if (attachments.some(item => item.kind === 'image')) signals.add('photo');
  if (attachments.some(item => item.kind !== 'image')) signals.add('file');
  if (signals.size > 1) return 'mixed';
  if (signals.has('photo')) return 'photo';
  if (signals.has('file')) return 'file';
  if (signals.has('link')) return 'link';
  return 'note';
}

export function validateMemoryFiles(files: File[]): string | null {
  if (files.some(file => file.size > MAX_MEMORY_FILE_BYTES)) {
    return 'One of those files is larger than 25 MB. Keep individual vault files under that limit for now.';
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_MEMORY_CAPTURE_BYTES) {
    return 'That capture is over 60 MB in total. Add the files in smaller groups.';
  }
  return null;
}

function makeAttachment(memoryId: string, file: File): MemoryAttachment {
  return {
    id: crypto.randomUUID(),
    memoryId,
    name: file.name || 'Untitled file',
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    kind: attachmentKind(file),
    blob: file,
    createdAt: new Date().toISOString()
  };
}

export async function createMemory(draft: MemoryDraft, files: File[] = []): Promise<VaultMemory> {
  const fileError = validateMemoryFiles(files);
  if (fileError) throw new Error(fileError);

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const base: VaultMemory = {
    id,
    title: draft.title.trim().slice(0, 160) || 'Untitled memory',
    body: draft.body.trim(),
    date: draft.date,
    linkUrl: normalizeLink(draft.linkUrl),
    tags: normalizeTags(draft.tags),
    taskId: draft.taskId || undefined,
    kind: 'note',
    createdAt: now,
    updatedAt: now
  };
  const attachments = files.map(file => makeAttachment(id, file));
  const memory = { ...base, kind: deriveMemoryKind(base, attachments) };

  await db.transaction('rw', db.memories, db.memoryAttachments, async () => {
    await db.memories.add(memory);
    if (attachments.length) await db.memoryAttachments.bulkAdd(attachments);
  });

  await queueSyncChanges([
    { table: 'memories', recordId: memory.id },
    ...attachments.map(item => ({ table: 'memoryAttachments' as const, recordId: item.id }))
  ]);
  return memory;
}

export async function updateMemory(id: string, draft: MemoryDraft): Promise<VaultMemory | undefined> {
  const existing = await db.memories.get(id);
  if (!existing) return undefined;
  const attachments = await db.memoryAttachments.where('memoryId').equals(id).toArray();
  const nextBase: VaultMemory = {
    ...existing,
    title: draft.title.trim().slice(0, 160) || 'Untitled memory',
    body: draft.body.trim(),
    date: draft.date,
    linkUrl: normalizeLink(draft.linkUrl),
    tags: normalizeTags(draft.tags),
    taskId: draft.taskId || undefined,
    updatedAt: new Date().toISOString()
  };
  const next = { ...nextBase, kind: deriveMemoryKind(nextBase, attachments) };
  await db.memories.put(next);
  await queueSyncChange('memories', id);
  return next;
}

export async function addMemoryAttachments(memoryId: string, files: File[]): Promise<MemoryAttachment[]> {
  const fileError = validateMemoryFiles(files);
  if (fileError) throw new Error(fileError);
  if (!files.length) return [];

  const attachments = files.map(file => makeAttachment(memoryId, file));
  await db.transaction('rw', db.memories, db.memoryAttachments, async () => {
    await db.memoryAttachments.bulkAdd(attachments);
    const memory = await db.memories.get(memoryId);
    if (!memory) return;
    const all = await db.memoryAttachments.where('memoryId').equals(memoryId).toArray();
    await db.memories.update(memoryId, {
      kind: deriveMemoryKind(memory, all),
      updatedAt: new Date().toISOString()
    });
  });
  await queueSyncChanges([
    { table: 'memories', recordId: memoryId },
    ...attachments.map(item => ({ table: 'memoryAttachments' as const, recordId: item.id }))
  ]);
  return attachments;
}

export async function removeMemoryAttachment(attachmentId: string): Promise<void> {
  const attachment = await db.memoryAttachments.get(attachmentId);
  if (!attachment) return;
  await db.transaction('rw', db.memories, db.memoryAttachments, async () => {
    await db.memoryAttachments.delete(attachmentId);
    const memory = await db.memories.get(attachment.memoryId);
    if (!memory) return;
    const rest = await db.memoryAttachments.where('memoryId').equals(attachment.memoryId).toArray();
    await db.memories.update(memory.id, {
      kind: deriveMemoryKind(memory, rest),
      updatedAt: new Date().toISOString()
    });
  });
  await queueSyncChanges([
    { table: 'memoryAttachments', recordId: attachmentId, operation: 'delete' },
    { table: 'memories', recordId: attachment.memoryId }
  ]);
}

export async function deleteMemory(memoryId: string): Promise<void> {
  let attachmentIds: string[] = [];
  await db.transaction('rw', db.memories, db.memoryAttachments, async () => {
    const attachments = await db.memoryAttachments.where('memoryId').equals(memoryId).primaryKeys();
    attachmentIds = attachments.map(id => String(id));
    if (attachmentIds.length) await db.memoryAttachments.bulkDelete(attachmentIds);
    await db.memories.delete(memoryId);
  });
  await queueSyncChanges([
    { table: 'memories', recordId: memoryId, operation: 'delete' },
    ...attachmentIds.map(recordId => ({ table: 'memoryAttachments' as const, recordId, operation: 'delete' as const }))
  ]);
}

export async function listMemories(): Promise<VaultMemory[]> {
  return db.memories.orderBy('date').reverse().toArray();
}

export async function attachmentsFor(memoryId: string): Promise<MemoryAttachment[]> {
  return db.memoryAttachments.where('memoryId').equals(memoryId).sortBy('createdAt');
}

export async function memoryTasks(): Promise<Task[]> {
  const tasks = await db.tasks.toArray();
  return tasks.sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
}

export async function memoryAttachmentMap(memories: VaultMemory[]): Promise<Map<string, MemoryAttachment[]>> {
  const map = new Map<string, MemoryAttachment[]>();
  if (!memories.length) return map;
  const all = await db.memoryAttachments.toArray();
  for (const attachment of all) {
    const bucket = map.get(attachment.memoryId) ?? [];
    bucket.push(attachment);
    map.set(attachment.memoryId, bucket);
  }
  for (const bucket of map.values()) bucket.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return map;
}

export function formatMemoryBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
