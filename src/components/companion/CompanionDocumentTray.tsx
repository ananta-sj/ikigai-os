import { useEffect, useRef, useState } from 'react';
import { FileText, LoaderCircle, Paperclip, X } from 'lucide-react';
import {
  addCompanionDocument,
  companionDocumentAccept,
  companionDocumentsBusy,
  listCompanionDocuments,
  removeCompanionDocument,
  subscribeCompanionDocuments,
  type CompanionDocumentAttachment
} from '../../lib/companionDocuments';
import '../../companion-documents-v032.css';

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function kindLabel(document: CompanionDocumentAttachment) {
  if (document.kind === 'docx') return 'Word';
  if (document.kind === 'pdf') return 'PDF';
  if (document.kind === 'markdown') return 'Markdown';
  return 'Text';
}

export function useCompanionDocumentsBusy() {
  const [busy, setBusy] = useState(companionDocumentsBusy);
  useEffect(() => subscribeCompanionDocuments(() => setBusy(companionDocumentsBusy())), []);
  return busy;
}

export function CompanionDocumentTray({ compact = false, disabled = false }: { compact?: boolean; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState(() => listCompanionDocuments());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => subscribeCompanionDocuments(setDocuments), []);

  async function addFiles(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true);
    setError('');
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        await addCompanionDocument(file);
      } catch (cause) {
        failures.push(`${file.name}: ${cause instanceof Error ? cause.message : 'Could not read this document.'}`);
      }
    }
    if (failures.length) setError(failures.join(' '));
    if (inputRef.current) inputRef.current.value = '';
    setBusy(false);
  }

  return (
    <section className={`companion032-document-tray ${compact ? 'is-compact' : ''}`} aria-label="Documents for the next Familiar message">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={companionDocumentAccept}
        multiple
        tabIndex={-1}
        onChange={event => void addFiles(event.target.files)}
      />

      <div className="companion032-document-row">
        <button
          type="button"
          className="companion032-attach-button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          aria-label="Attach a document to the next Familiar message"
          title="Parsed locally; extracted text is sent through the configured AI connection with your next message."
        >
          {busy ? <LoaderCircle size={14} className="spin" /> : <Paperclip size={14} />}
          <span>{busy ? 'Reading…' : compact ? 'Attach' : 'Attach document'}</span>
        </button>
        {!compact ? <small>PDF · Word .docx · Markdown · text</small> : null}
      </div>

      {documents.length ? (
        <div className="companion032-document-list">
          {documents.map(document => compact ? (
            <span key={document.id} className="companion032-document-chip">
              <FileText size={12} />
              <b>{document.name}</b>
              <button type="button" onClick={() => removeCompanionDocument(document.id)} disabled={disabled} aria-label={`Remove ${document.name}`}><X size={11} /></button>
            </span>
          ) : (
            <details key={document.id} className="companion032-document-item">
              <summary>
                <span><FileText size={13} /><b>{document.name}</b></span>
                <span>{kindLabel(document)} · {formatBytes(document.size)}{document.truncated ? ' · text capped' : ''}</span>
              </summary>
              <div className="companion032-document-preview">
                <p>{document.text.slice(0, 1800)}{document.text.length > 1800 ? '…' : ''}</p>
                <button type="button" onClick={() => removeCompanionDocument(document.id)} disabled={disabled}><X size={12} /> Remove</button>
              </div>
            </details>
          ))}
        </div>
      ) : null}

      {!compact && documents.length ? <p className="companion032-document-privacy">Extracted text stays in memory only and is cleared after a successful reply. It follows the configured AI connection with that message; remote mode sends it to the trusted endpoint. The original file is never stored. The AI reply and approved proposals remain normal Companion history.</p> : null}
      {compact && documents.length ? <small className="companion032-document-compact-note">Next AI message only · extracted text follows this AI connection · file not saved</small> : null}
      {error ? <p className="companion032-document-error" role="alert">{error}</p> : null}
    </section>
  );
}
