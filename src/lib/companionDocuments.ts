import {
  COMPANION_DOCUMENT_MAX_FILE_BYTES,
  COMPANION_DOCUMENT_MAX_FILES,
  COMPANION_DOCUMENT_MAX_TOTAL_TEXT_CHARS,
  extractCompanionDocument,
  type CompanionDocumentKind
} from './companionDocumentCore';

export interface CompanionDocumentAttachment {
  id: string;
  name: string;
  kind: CompanionDocumentKind;
  mimeType: string;
  size: number;
  text: string;
  truncated: boolean;
  addedAt: string;
}

export interface CompanionDocumentRequestItem {
  name: string;
  kind: CompanionDocumentKind;
  text: string;
  truncated: boolean;
}

const EVENT = 'ikigai-companion-documents-changed';
let documents: CompanionDocumentAttachment[] = [];
let pendingReads = 0;
let generation = 0;

export function companionDocumentsBusy() { return pendingReads > 0; }

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT));
}

export function listCompanionDocuments() {
  return documents.map(item => ({ ...item }));
}

export function subscribeCompanionDocuments(listener: (items: CompanionDocumentAttachment[]) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handle = () => listener(listCompanionDocuments());
  window.addEventListener(EVENT, handle);
  return () => window.removeEventListener(EVENT, handle);
}

export async function addCompanionDocument(file: File) {
  if (documents.length + pendingReads >= COMPANION_DOCUMENT_MAX_FILES) throw new Error(`Attach up to ${COMPANION_DOCUMENT_MAX_FILES} documents at a time.`);
  if (!file.size) throw new Error('The selected document is empty.');
  if (file.size > COMPANION_DOCUMENT_MAX_FILE_BYTES) throw new Error('Keep each attached document under 8 MB.');
  pendingReads += 1;
  const currentGeneration = generation;
  emit();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
  const extracted = await Promise.race([
    file.arrayBuffer().then(buffer => extractCompanionDocument(new Uint8Array(buffer), file.name, file.type)),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Reading this document took too long. Try a smaller file or a text export.')), 20000); })
  ]);
  if (generation !== currentGeneration) throw new Error('This document read was cancelled when the attachments were cleared.');
  const attachment: CompanionDocumentAttachment = {
    id: crypto.randomUUID(),
    name: file.name.slice(0, 180),
    kind: extracted.kind,
    mimeType: file.type.slice(0, 120),
    size: file.size,
    text: extracted.text,
    truncated: extracted.truncated,
    addedAt: new Date().toISOString()
  };
  documents = [...documents, attachment];
  emit();
  return attachment;
  } finally { clearTimeout(timer); pendingReads -= 1; emit(); }
}

export function removeCompanionDocument(id: string) {
  const next = documents.filter(item => item.id !== id);
  if (next.length === documents.length) return;
  documents = next;
  emit();
}

export function clearCompanionDocuments() {
  if (!documents.length && !pendingReads) return;
  generation += 1;
  documents = [];
  emit();
}

export function companionDocumentsForRequest(): CompanionDocumentRequestItem[] {
  let remaining = COMPANION_DOCUMENT_MAX_TOTAL_TEXT_CHARS;
  const output: CompanionDocumentRequestItem[] = [];
  for (const document of documents.slice(0, COMPANION_DOCUMENT_MAX_FILES)) {
    if (remaining <= 0) break;
    const text = document.text.slice(0, remaining);
    remaining -= text.length;
    output.push({ name: document.name, kind: document.kind, text, truncated: document.truncated || text.length < document.text.length });
  }
  return output;
}

export const companionDocumentAccept = '.pdf,.docx,.md,.markdown,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain';
