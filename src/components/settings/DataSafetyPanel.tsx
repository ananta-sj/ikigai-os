import { useEffect, useRef, useState } from 'react';
import { downloadBackup, readBackupFile, restoreBackup, type BackupPreview, type RestoreMode } from '../../lib/backup';
import { auditDataIntegrity, repairSafeIntegrityIssues, type IntegrityReport } from '../../lib/integrity';
import { getSyncOverview, rebuildSyncManifest, updateSyncState } from '../../lib/sync';
import { ProductDiagnosticsPanel } from './ProductDiagnosticsPanel';
import { useConfirmDialog } from '../ui/ConfirmDialog';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function formatStamp(value?: string) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DataSafetyPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getSyncOverview>> | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { confirm, confirmDialog } = useConfirmDialog();

  async function refresh() {
    const next = await getSyncOverview();
    setOverview(next);
    setDeviceName(next.state.deviceName);
  }

  useEffect(() => { void refresh(); }, []);

  async function exportNow() {
    setBusy(true); setError(''); setMessage('Preparing backup…');
    try {
      const result = await downloadBackup();
      setMessage(`Backup downloaded · ${formatBytes(result.bytes)} · ${result.bundle.tables.memoryAttachments?.length ?? 0} vault attachments included.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Backup export failed.');
      setMessage('');
    } finally { setBusy(false); }
  }

  async function chooseBackup(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setMessage('Checking checksum and backup structure…'); setPreview(null);
    try {
      const next = await readBackupFile(file);
      setPreview(next);
      setMessage('Backup verified. Choose how to restore it.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that backup.');
      setMessage('');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function restore(mode: RestoreMode) {
    if (!preview) return;
    if (mode === 'replace' && !(await confirm({ title: 'Replace local data?', message: 'Replace local Ikigai Space data with this backup? The restore is validated first and applied atomically, but it will replace the current local dataset.', confirmLabel: 'Replace local data', tone: 'danger' }))) return;
    setBusy(true); setError(''); setMessage(mode === 'replace' ? 'Validating and replacing local data…' : 'Validating and merging backup…');
    try {
      const result = await restoreBackup(preview.bundle, mode);
      const recovered = result.recoveredRoadmapPhases ? ` · ${result.recoveredRoadmapPhases} roadmap phase${result.recoveredRoadmapPhases === 1 ? '' : 's'} recovered` : '';
      setMessage(result.maintenanceWarning
        ? `Restore complete · ${result.restoredRecords} records${recovered}. ${result.maintenanceWarning}`
        : `Restore complete · ${result.restoredRecords} records${recovered}. Reloading Ikigai Space…`);
      window.setTimeout(() => window.location.reload(), result.maintenanceWarning ? 1600 : 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Restore failed. Your current local dataset was not replaced.');
      setMessage('');
      setBusy(false);
    }
  }

  async function runIntegrityAudit() {
    setBusy(true); setError(''); setMessage('Checking local data relationships…');
    try {
      const report = await auditDataIntegrity();
      setIntegrity(report);
      setMessage(report.healthy
        ? `Local data check passed · ${report.totalRecords} records inspected.`
        : `Local data check found ${report.issues.length} issue type${report.issues.length === 1 ? '' : 's'}. No data was changed.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not inspect local data.');
      setMessage('');
    } finally { setBusy(false); }
  }

  async function repairIntegrity() {
    if (!integrity?.repairableCount) return;
    if (!(await confirm({ title: 'Repair safe issues?', message: 'Repair only the safe structural issues Ikigai Space found? This does not delete life records or Vault files. Missing Vault metadata is recovered into placeholder memories.', confirmLabel: 'Repair safe issues' }))) return;
    setBusy(true); setError(''); setMessage('Repairing safe structural issues…');
    try {
      const result = await repairSafeIntegrityIssues();
      setIntegrity(result.report);
      setMessage(result.report.healthy
        ? `Repair complete · ${result.repaired} safe fix${result.repaired === 1 ? '' : 'es'} applied. Local data now passes the integrity check.`
        : `Repair complete · ${result.repaired} safe fix${result.repaired === 1 ? '' : 'es'} applied. ${result.report.issues.length} issue type${result.report.issues.length === 1 ? '' : 's'} still need manual review.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not repair local data.');
      setMessage('');
    } finally { setBusy(false); }
  }

  async function saveDeviceName() {
    const value = deviceName.trim().slice(0, 80) || 'This browser';
    setDeviceName(value);
    await updateSyncState({ deviceName: value });
    setMessage('Device label saved locally.');
    await refresh();
  }

  async function buildManifest() {
    setBusy(true); setError(''); setMessage('Rebuilding local sync diagnostics…');
    try {
      const result = await rebuildSyncManifest();
      setMessage(`Local sync diagnostics rebuilt · ${result.records} records.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rebuild local sync diagnostics.');
      setMessage('');
    } finally { setBusy(false); }
  }

  const integrityState = !integrity ? 'Not checked' : integrity.healthy ? 'Healthy' : `${integrity.issues.length} issue${integrity.issues.length === 1 ? '' : 's'}`;

  return (
    <section className="glass-panel ik-surface settings-card data-safety-card">
      <div className="settings-section-heading">
        <div>
          <span className="eyebrow">YOUR DATA · LOCAL FIRST</span>
          <h3>Backup & restore</h3>
          <p>Keep a portable copy of Ikigai Space. Cloud sync is optional and is not connected in this version.</p>
        </div>
      </div>

      <div className="data-safety-clean-grid">
        <div className="data-safety-clean-card">
          <div className="data-safety-clean-head">
            <div>
              <strong>Portable backup</strong>
              <small>Checksum-verified local file containing your Ikigai Space data and Memory Vault attachments.</small>
            </div>
            <span className="data-safety-state is-ready">Ready</span>
          </div>

          <div className="data-safety-actions">
            <button type="button" className="ik-button ik-button-primary" disabled={busy} onClick={exportNow}>Create backup</button>
            <button type="button" className="ik-button ik-button-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>Restore from backup</button>
            <input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" onChange={event => void chooseBackup(event.target.files?.[0])} />
          </div>

          <div className="data-safety-meta-row">
            <span>Last backup <strong>{formatStamp(overview?.state.lastBackupAt)}</strong></span>
            <span>Last restore <strong>{formatStamp(overview?.state.lastRestoreAt)}</strong></span>
          </div>

          {preview && (
            <div className="backup-preview">
              <div><strong>Verified backup</strong><small>{preview.sourceDeviceName} · {formatStamp(preview.exportedAt)}</small></div>
              <div className="backup-preview-stats"><span>{preview.totalRecords} records</span><span>{formatBytes(preview.fileBytes)}</span><span>{preview.counts.memoryAttachments ?? 0} attachments</span></div>
              <p><strong>Merge</strong> keeps unrelated local records. <strong>Replace</strong> swaps the current dataset inside one database transaction after every attachment has decoded successfully.</p>
              <div className="data-safety-actions">
                <button type="button" className="ik-button ik-button-secondary" disabled={busy} onClick={() => void restore('merge')}>Merge</button>
                <button type="button" className="ik-button ik-button-quiet danger-soft" disabled={busy} onClick={() => void restore('replace')}>Replace local data</button>
              </div>
            </div>
          )}
        </div>

        <div className="data-safety-clean-card cloud-sync-card">
          <div className="data-safety-clean-head">
            <div>
              <strong>Cloud sync</strong>
              <small>Not connected. Nothing is uploaded or sent anywhere.</small>
            </div>
            <span className="data-safety-state">Off</span>
          </div>
          <p className="data-safety-cloud-copy">Ikigai Space remains fully usable offline. When multi-device sync is added, it will be opt-in and live here.</p>
          <button type="button" className="ik-button ik-button-quiet" disabled>Connect a provider · Later</button>
        </div>
      </div>

      <div className="data-integrity-card">
        <div className="data-safety-clean-head">
          <div>
            <strong>Local data integrity</strong>
            <small>Checks relationships between tasks, Garden state, Vault files, Roadmap phases and proof links. The check itself never changes data.</small>
          </div>
          <span className={integrity?.healthy ? 'data-safety-state is-ready' : integrity ? 'data-safety-state is-attention' : 'data-safety-state'}>{integrityState}</span>
        </div>

        <div className="data-safety-actions">
          <button type="button" className="ik-button ik-button-secondary" disabled={busy} onClick={() => void runIntegrityAudit()}>{integrity ? 'Check again' : 'Check local data'}</button>
          {Boolean(integrity?.repairableCount) && <button type="button" className="ik-button ik-button-primary" disabled={busy} onClick={() => void repairIntegrity()}>Repair safe issues</button>}
        </div>

        {integrity && !integrity.healthy && (
          <div className="data-integrity-issues" aria-live="polite">
            {integrity.issues.map(item => (
              <div key={item.code} className={`data-integrity-issue is-${item.severity}`}>
                <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                <span>{item.count} · {item.repairable ? 'safe repair' : 'review'}</span>
              </div>
            ))}
          </div>
        )}

        {integrity?.healthy && <p className="data-integrity-healthy">No broken references or structural inconsistencies were found across {integrity.totalRecords} local records.</p>}
      </div>

      <ProductDiagnosticsPanel />

      <details className="data-safety-advanced">
        <summary>Advanced local sync diagnostics</summary>
        <div className="data-safety-advanced-body">
          <p>These are implementation details for future multi-device sync. You do not need them for normal use.</p>
          <label className="sync-device-field">
            <span>Device label</span>
            <div><input value={deviceName} maxLength={80} onChange={event => setDeviceName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void saveDeviceName(); }} /><button type="button" className="ik-button ik-button-quiet" onClick={() => void saveDeviceName()}>Save</button></div>
          </label>
          <div className="data-safety-diagnostic-grid">
            <span><small>Pending local changes</small><strong>{overview?.pending ?? 0}</strong></span>
            <span><small>Change mix</small><strong>{overview?.upserts ?? 0} updates · {overview?.deletes ?? 0} deletes</strong></span>
            <span><small>Local manifest</small><strong>{overview?.state.lastManifestHash ? `${overview.state.lastManifestHash.slice(0, 12)}…` : 'Not built'}</strong></span>
          </div>
          <button type="button" className="ik-button ik-button-secondary" disabled={busy} onClick={buildManifest}>Rebuild diagnostics</button>
        </div>
      </details>

      {(message || error) && <div className={error ? 'data-safety-message is-error' : 'data-safety-message'} role="status">{error || message}</div>}
      {confirmDialog}
    </section>
  );
}
