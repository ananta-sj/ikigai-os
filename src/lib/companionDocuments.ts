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
  if (documents.length >= COMPANION_DOCUMENT_MAX_FILES) throw new Error(`Attach up to ${COMPANION_DOCUMENT_MAX_FILES} documents at a time.`);
  if (!file.size) throw new Error('The selected document is empty.');
  if (file.size > COMPANION_DOCUMENT_MAX_FILE_BYTES) throw new Error('Keep each attached document under 8 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracted = await extractCompanionDocument(bytes, file.name, file.type);
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
}

export function removeCompanionDocument(id: string) {
  const next = documents.filter(item => item.id !== id);
  if (next.length === documents.length) return;
  documents = next;
  emit();
}

export function clearCompanionDocuments() {
  if (!documents.length) return;
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
