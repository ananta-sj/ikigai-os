import { AlertTriangle, CheckCircle2, Info, ScanSearch, XCircle } from 'lucide-react';
import { useState } from 'react';
import { runProductDiagnostics, type DiagnosticStatus, type ProductDiagnosticsReport } from '../../lib/diagnostics';

function iconFor(status: DiagnosticStatus) {
  if (status === 'pass') return <CheckCircle2 size={15} />;
  if (status === 'fail') return <XCircle size={15} />;
  if (status === 'warn') return <AlertTriangle size={15} />;
  return <Info size={15} />;
}

function bytes(value?: number) {
  if (value === undefined) return 'Unknown';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function ProductDiagnosticsPanel() {
  const [report, setReport] = useState<ProductDiagnosticsReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setBusy(true);
    setError('');
    try {
      setReport(await runProductDiagnostics());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ikigai Space could not run local diagnostics.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="product-diagnostics-card">
      <div className="data-safety-clean-head">
        <div>
          <strong>Product diagnostics</strong>
          <small>Checks browser capabilities that Ikigai Space depends on without reading task text, memories, attachments or API keys.</small>
        </div>
        <span className={report?.summary.fail ? 'data-safety-state is-attention' : report ? 'data-safety-state is-ready' : 'data-safety-state'}>
          {report ? `${report.summary.pass} pass · ${report.summary.warn} warn` : 'Not run'}
        </span>
      </div>

      <div className="data-safety-actions">
        <button type="button" className="ik-button ik-button-secondary" disabled={busy} onClick={() => void run()}>
          <ScanSearch size={14} /> {busy ? 'Running checks…' : report ? 'Run again' : 'Run diagnostics'}
        </button>
      </div>

      {report ? (
        <div className="product-diagnostics-results" aria-live="polite">
          {report.items.map(row => (
            <div key={row.id} className={`product-diagnostic-row is-${row.status}`}>
              <span className="product-diagnostic-icon">{iconFor(row.status)}</span>
              <div><strong>{row.label}</strong><small>{row.detail}</small></div>
              <b>{row.status}</b>
            </div>
          ))}
          {report.storage ? (
            <p className="product-diagnostics-foot">Browser-reported storage: {bytes(report.storage.usage)} used of {bytes(report.storage.quota)}. This is device/browser quota information only.</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="data-safety-message is-error" role="alert">{error}</p> : null}
    </div>
  );
}
