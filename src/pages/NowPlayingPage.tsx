import { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  SkipBack,
  SkipForward,
  Unplug,
  Waves,
  X
} from 'lucide-react';
import { useDialogFocus } from '../components/ui/dialogFocus';
import { ensureSettings, updateSettings } from '../lib/settings';
import {
  beginSpotifyAuthorization,
  disconnectSpotify,
  finishSpotifyAuthorization,
  refreshNowPlaying,
  sendSpotifyPlaybackAction,
  spotifyConnectionRemembered,
  spotifyGrantedScopes,
  spotifyRedirectUri
} from '../lib/nowPlaying';
import { normalizeSpotifyClientId, spotifyRedirectUriIssue, spotifyScopesAllowControls } from '../lib/nowPlayingCore';
import { safeExternalHref } from '../lib/security';
import { useNowPlaying } from '../hooks/useNowPlaying';
import type { UserSettings } from '../types';
import '../now-playing-v030.css';

function formatPlaybackTime(value?: number) {
  if (!Number.isFinite(value) || value === undefined || value < 0) return '0:00';
  const seconds = Math.floor(value / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function NowPlayingPage() {
  const runtime = useNowPlaying();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [clientId, setClientId] = useState('');
  const [allowControls, setAllowControls] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const sourceDialogRef = useDialogFocus<HTMLDivElement>(setupOpen, () => setSetupOpen(false));

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(next => {
      if (!alive) return;
      setSettings(next);
      setClientId(next.spotifyClientId ?? '');
      setAllowControls(Boolean(next.spotifyPlaybackControls));
      setRemember(spotifyConnectionRemembered());
      setRedirectUri(spotifyRedirectUri());
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('code') && !params.has('error')) return;
    setBusy(true);
    void finishSpotifyAuthorization(window.location.search)
      .then(result => {
        if (result.handled) {
          setMessage('Spotify connected. Now Playing will follow the current item automatically.');
          setRemember(Boolean(result.remembered));
          setSetupOpen(false);
          void refreshNowPlaying();
        }
      })
      .catch(error => {
        setMessage(error instanceof Error ? error.message : 'Spotify connection could not be completed.');
        setSetupOpen(true);
      })
      .finally(() => {
        window.history.replaceState(null, '', window.location.pathname);
        setBusy(false);
      });
  }, []);

  const grantedControls = spotifyScopesAllowControls(spotifyGrantedScopes());
  const trackHref = safeExternalHref(runtime.item?.externalUrl);
  const redirectIssue = redirectUri ? spotifyRedirectUriIssue(redirectUri) : '';
  const setupReady = Boolean(normalizeSpotifyClientId(clientId)) && !redirectIssue;
  const playbackProgress = useMemo(() => {
    const duration = runtime.item?.durationMs;
    const progress = runtime.item?.progressMs;
    if (!duration || progress === undefined) return null;
    return Math.max(0, Math.min(100, (progress / duration) * 100));
  }, [runtime.item?.durationMs, runtime.item?.progressMs]);

  const stateLabel = runtime.refreshing
    ? 'Syncing'
    : runtime.error
      ? 'Needs attention'
      : runtime.item?.isPlaying
        ? 'Playing'
        : runtime.item
          ? 'Paused'
          : runtime.connected
            ? 'Waiting'
            : 'No source';

  async function saveProviderSettings(nextClientId = clientId, nextAllowControls = allowControls) {
    const normalized = normalizeSpotifyClientId(nextClientId);
    if (!normalized) throw new Error('Enter a valid Spotify client ID.');
    const updated = await updateSettings({
      nowPlayingProvider: 'spotify',
      spotifyClientId: normalized,
      spotifyPlaybackControls: nextAllowControls
    });
    setSettings(updated);
    setClientId(normalized);
    return normalized;
  }

  async function connect() {
    setMessage('');
    setBusy(true);
    try {
      const normalized = await saveProviderSettings();
      await beginSpotifyAuthorization({ clientId: normalized, allowControls, remember });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Spotify connection could not start.');
      setBusy(false);
    }
  }

  async function act(action: 'play' | 'pause' | 'next' | 'previous') {
    setMessage('');
    setBusy(true);
    try { await sendSpotifyPlaybackAction(action); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Playback action failed.'); }
    finally { setBusy(false); }
  }

  function disconnect() {
    disconnectSpotify();
    setRemember(false);
    setMessage('Spotify disconnected. Provider tokens were removed from this browser.');
  }

  async function toggleFamiliarMusic(enabled: boolean) {
    const updated = await updateSettings({ familiarMusicPresence: enabled });
    setSettings(updated);
  }

  return (
    <div className="page now030-page">
      <div className="now0319-room">
        <header className="now0319-header">
          <span className="now0319-eyebrow"><Waves size={13} aria-hidden="true" /> NOW PLAYING</span>
          <div className="now0319-heading-row">
            <div>
              <h1>Just what&apos;s playing.</h1>
              <p>Once a source is connected, Ikigai follows the current item automatically.</p>
            </div>
            <button type="button" className="now0319-source-button" onClick={() => setSetupOpen(true)}>
              <Settings2 size={15} aria-hidden="true" /> Source
            </button>
          </div>
        </header>

        <section className="now0319-stage" aria-label="Now Playing stage">
          <section className="now0319-widget" aria-live="polite">
            <div className={`now0319-art ${runtime.item?.isPlaying ? 'is-playing' : ''}`} aria-hidden="true">
              <span><Music2 size={34} /></span>
              <i /><i /><i />
            </div>

            <div className="now0319-content">
              <div className="now0319-topline">
                <span>{runtime.connected ? 'SPOTIFY' : 'PLAYBACK'}</span>
                <b className={runtime.item?.isPlaying ? 'is-active' : ''}>{stateLabel}</b>
              </div>

              {runtime.item ? <>
                <div className="now0319-track">
                  <h2>{runtime.item.title}</h2>
                  {runtime.item.context ? <p>{runtime.item.context}</p> : null}
                  {runtime.item.deviceName ? <small>On {runtime.item.deviceName}</small> : null}
                </div>

                {playbackProgress !== null ? (
                  <div className="now0319-progress" role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playbackProgress)}>
                    <i style={{ width: `${playbackProgress}%` }} />
                    <div><span>{formatPlaybackTime(runtime.item.progressMs)}</span><span>{formatPlaybackTime(runtime.item.durationMs)}</span></div>
                  </div>
                ) : null}

                <div className="now0319-controls" aria-label="Playback controls">
                  {grantedControls ? <button type="button" onClick={() => void act('previous')} disabled={busy} aria-label="Previous item"><SkipBack size={18} /></button> : null}
                  {grantedControls ? (
                    <button type="button" className="is-primary" onClick={() => void act(runtime.item!.isPlaying ? 'pause' : 'play')} disabled={busy} aria-label={runtime.item.isPlaying ? 'Pause playback' : 'Resume playback'}>
                      {runtime.item.isPlaying ? <Pause size={19} /> : <Play size={19} />}
                    </button>
                  ) : null}
                  {grantedControls ? <button type="button" onClick={() => void act('next')} disabled={busy} aria-label="Next item"><SkipForward size={18} /></button> : null}
                  {trackHref ? <a href={trackHref} target="_blank" rel="noreferrer noopener" aria-label="Open current item in Spotify"><ExternalLink size={17} /></a> : null}
                </div>
              </> : (
                <div className="now0319-empty">
                  <h2>{runtime.connected ? 'Nothing playing right now.' : 'Nothing to show yet.'}</h2>
                  <p>{runtime.connected
                    ? 'Start something in Spotify and it will appear here automatically.'
                    : 'Connect a playback source once. After that, this room can stay this simple.'}</p>
                  {!runtime.connected ? (
                    <button type="button" className="ik-button ik-button-primary" onClick={() => setSetupOpen(true)}>Connect a source</button>
                  ) : null}
                </div>
              )}

              {runtime.error ? (
                <div className="now0319-error" role="status">
                  <span>{runtime.error}</span>
                  <button type="button" onClick={() => void refreshNowPlaying()} disabled={runtime.refreshing || busy}><RefreshCw size={14} /> Try again</button>
                </div>
              ) : message && !setupOpen ? <p className="now0319-message">{message}</p> : null}
            </div>
          </section>

          <div className="now0319-footnote">
            <span>Metadata only · no audio capture</span>
            <span>{grantedControls ? 'Playback controls allowed' : 'View-only presence'}</span>
          </div>
        </section>
      </div>

      {setupOpen ? (
        <div className="now0319-source-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSetupOpen(false); }}>
          <div
            ref={sourceDialogRef}
            className="now030-setup now0319-source-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="now0319-source-title"
            tabIndex={-1}
          >
            <header>
              <div>
                <span>SOURCE</span>
                <h2 id="now0319-source-title">Playback connection</h2>
              </div>
              <button type="button" onClick={() => setSetupOpen(false)} aria-label="Close playback source settings"><X size={18} /></button>
            </header>

            <div className="now0319-capability-note">
              <Music2 size={17} aria-hidden="true" />
              <p><strong>Web limitation.</strong> Ikigai cannot read the Windows system media session or other apps directly. A connected provider can report what is playing without microphone or audio capture.</p>
            </div>

            {!runtime.connected ? <>
              <div className="now0319-provider-heading">
                <strong>Spotify</strong>
                <span>Authorization Code + PKCE</span>
              </div>
              <label className="now030-field">
                <span>Spotify client ID</span>
                <input value={clientId} onChange={event => setClientId(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Paste your app client ID" />
                <small>For this local/self-hosted build, create a Spotify developer app and register the exact redirect URI below. Spotify currently requires Premium for Development Mode Web API apps, and any additional test user must be on that app's allowlist.</small>
              </label>
              <div className="now030-redirect">
                <span>REDIRECT URI</span>
                <code>{redirectUri || '/now-playing'}</code>
                {redirectIssue ? <small className="now030-redirect-warning" role="status">{redirectIssue}</small> : null}
              </div>
              <label className="now030-check">
                <input type="checkbox" checked={allowControls} onChange={event => setAllowControls(event.target.checked)} />
                <span><strong>Allow playback controls</strong><small>Add permission for play/pause and previous/next. Leave this off for read-only presence.</small></span>
              </label>
              <label className="now030-check">
                <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />
                <span><strong>Remember this connection on this device</strong><small>Stores Spotify OAuth tokens in browser local storage. Leave off on shared devices; tokens never enter Ikigai backups.</small></span>
              </label>
              <button type="button" className="ik-button ik-button-primary now030-connect" onClick={() => void connect()} disabled={!setupReady || busy}>Connect Spotify</button>
            </> : <>
              <div className="now030-connected-copy">
                <strong>Spotify is connected.</strong>
                <p>{grantedControls ? 'Read + playback-control permission is active.' : 'Read-only playback permission is active.'}</p>
                <small>{spotifyConnectionRemembered() ? 'Connection is remembered on this device.' : 'Connection lasts for this browser tab/session.'}</small>
              </div>
              <button type="button" className="ik-button ik-button-quiet now030-disconnect" onClick={disconnect}><Unplug size={15} /> Disconnect Spotify</button>
            </>}

            <label className="now030-check now030-familiar-toggle">
              <input type="checkbox" checked={settings?.familiarMusicPresence ?? true} onChange={event => void toggleFamiliarMusic(event.target.checked)} />
              <span><strong>Familiar music presence</strong><small>When playback is active, the Familiar gets a calm generic music pose. It is not synchronized to the song, tempo, waveform, or beats.</small></span>
            </label>

            {message ? <p className="now0319-dialog-message" role="status">{message}</p> : null}
            <footer>No audio capture · no beat analysis · provider tokens stay outside portable backups</footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
