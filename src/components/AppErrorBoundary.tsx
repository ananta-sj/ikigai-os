import { Component, type ErrorInfo, type ReactNode } from 'react';
import { downloadBackup } from '../lib/backup';

interface Props {
  children: ReactNode;
}

interface State {
  error?: Error;
  backupState: 'idle' | 'working' | 'done' | 'failed';
  backupMessage: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { backupState: 'idle', backupMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { error, backupState: 'idle', backupMessage: '' };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep diagnostics local. Avoid sending crash details anywhere implicitly.
    console.error('Ikigai Space UI recovered from a render error.');
  }

  private async saveBackup() {
    this.setState({ backupState: 'working', backupMessage: 'Preparing local backup…' });
    try {
      const result = await downloadBackup();
      this.setState({ backupState: 'done', backupMessage: `Backup downloaded (${Math.max(1, Math.round(result.bytes / 1024))} KB).` });
    } catch (cause) {
      this.setState({
        backupState: 'failed',
        backupMessage: cause instanceof Error ? cause.message : 'Backup could not be created from this recovery screen.'
      });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="ik-crash-shell" role="alert">
        <section className="ik-crash-card">
          <span className="eyebrow">LOCAL RECOVERY MODE</span>
          <h1>Ikigai Space hit a display error.</h1>
          <p>Your local database is separate from this screen. Reloading usually restores the interface without deleting your data.</p>

          <div className="ik-crash-actions">
            <button type="button" className="ik-button ik-button-primary" onClick={() => window.location.reload()}>Reload Ikigai Space</button>
            <button type="button" className="ik-button ik-button-secondary" disabled={this.state.backupState === 'working'} onClick={() => void this.saveBackup()}>
              {this.state.backupState === 'working' ? 'Preparing backup…' : 'Download backup first'}
            </button>
            <button type="button" className="ik-button ik-button-quiet" onClick={() => window.location.assign('/settings')}>Open Settings</button>
          </div>

          {this.state.backupMessage && <p className={this.state.backupState === 'failed' ? 'ik-crash-note is-error' : 'ik-crash-note'}>{this.state.backupMessage}</p>}

          <details className="ik-crash-details">
            <summary>Technical detail</summary>
            <code>{this.state.error.message || 'Unknown render error'}</code>
          </details>
        </section>
      </main>
    );
  }
}
