import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
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
  spotifyRedirectUri,
  spotifyUsesNativeLoopback,
  subscribeSpotifyNativeAuthorization
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

const SPOTIFY_APP_NAME = 'Ikigai OS';
const SPOTIFY_APP_DESCRIPTION = 'Personal local-first life OS with a private Now Playing view using Spotify playback metadata.';
const SPOTIFY_APP_WEBSITE = 'https://ananta-sj.github.io/ikigai-os/';
const SPOTIFY_DASHBOARD = 'https://developer.spotify.com/dashboard';

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
  const [guideOpen, setGuideOpen] = useState(false);
  const [copiedField, setCopiedField] = useState('');
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
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const completeAuthorization = async (search: string, cleanBrowserUrl: boolean) => {
      if (disposed) return;
      setBusy(true);
      try {
        const result = await finishSpotifyAuthorization(search);
        if (!disposed && result.handled) {
          setMessage('Spotify connected. Now Playing will follow the current item automatically.');
          setRemember(Boolean(result.remembered));
          setSetupOpen(false);
          void refreshNowPlaying();
        }
      } catch (error) {
        if (!disposed) {
          setMessage(error instanceof Error ? error.message : 'Spotify connection could not be completed.');
          setSetupOpen(true);
        }
      } finally {
        if (cleanBrowserUrl) window.history.replaceState(null, '', window.location.pathname);
        if (!disposed) setBusy(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('error')) {
      void completeAuthorization(window.location.search, true);
    }

    void subscribeSpotifyNativeAuthorization(search => {
      void completeAuthorization(search, false);
    }).then(stop => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const grantedControls = spotifyScopesAllowControls(spotifyGrantedScopes());
  const trackHref = safeExternalHref(runtime.item?.externalUrl);
  const redirectIssue = redirectUri ? spotifyRedirectUriIssue(redirectUri) : '';
  const setupReady = Boolean(normalizeSpotifyClientId(clientId)) && !redirectIssue;
  const nativeLoopback = spotifyUsesNativeLoopback();
  const spotifyDashboardHref = safeExternalHref(SPOTIFY_DASHBOARD);
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

  async function copySetupValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      window.setTimeout(() => setCopiedField(current => current === key ? '' : current), 1500);
    } catch {
      setMessage('Copy was blocked by the browser. Select the value and copy it manually.');
    }
  }

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
      if (spotifyUsesNativeLoopback()) {
        setMessage('Spotify sign-in opened in your default browser. Finish there, then return to Ikigai.');
        setBusy(false);
      }
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
            <span>{grantedControls ? 'Playback controls allowed' : 'Read-only presence'}</span>
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
              <p><strong>Provider connection.</strong> Ikigai cannot read the Windows system media session or other apps directly. A connected Spotify provider can report what is playing without microphone or audio capture. In the installed Windows app, sign-in opens in your default browser and returns through a private 127.0.0.1 callback.</p>
            </div>

            {!runtime.connected ? <>
              <div className="now0319-provider-heading">
                <strong>Spotify</strong>
                <span>Authorization Code + PKCE</span>
              </div>

              <section className="now0319-spotify-guide" aria-label="Spotify setup guide">
                <button type="button" className="now0319-guide-toggle" aria-expanded={guideOpen} onClick={() => setGuideOpen(open => !open)}>
                  <BookOpen size={15} aria-hidden="true" />
                  <span><strong>{guideOpen ? 'Hide setup guide' : 'How to create the Spotify app'}</strong><small>App name, description, Web API, redirect URI and Client ID.</small></span>
                </button>

                {guideOpen ? <div className="now0319-guide-body">
                  <ol>
                    <li>
                      <div><strong>Create a Spotify developer app.</strong><p>Open the Spotify Developer Dashboard, sign in, choose <b>Create app</b>, and accept Spotify&apos;s developer terms.</p></div>
                      {spotifyDashboardHref ? <a href={spotifyDashboardHref} target="_blank" rel="noreferrer noopener">Open Spotify Dashboard <ExternalLink size={12} /></a> : null}
                    </li>
                    <li>
                      <div><strong>Enter these app details.</strong><p>These values are suggestions for your personal Ikigai setup. They do not affect your local Ikigai data.</p></div>
                      <div className="now0319-guide-values">
                        <div><span>APP NAME</span><code>{SPOTIFY_APP_NAME}</code><button type="button" onClick={() => void copySetupValue(SPOTIFY_APP_NAME, 'name')} aria-label="Copy Spotify app name">{copiedField === 'name' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                        <div><span>DESCRIPTION</span><code>{SPOTIFY_APP_DESCRIPTION}</code><button type="button" onClick={() => void copySetupValue(SPOTIFY_APP_DESCRIPTION, 'description')} aria-label="Copy Spotify app description">{copiedField === 'description' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                        <div><span>WEBSITE</span><code>{SPOTIFY_APP_WEBSITE}</code><button type="button" onClick={() => void copySetupValue(SPOTIFY_APP_WEBSITE, 'website')} aria-label="Copy Spotify website">{copiedField === 'website' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                        <div><span>API / SDK</span><code>Web API</code><button type="button" onClick={() => void copySetupValue('Web API', 'api')} aria-label="Copy Spotify API selection">{copiedField === 'api' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                      </div>
                    </li>
                    <li>
                      <div><strong>Register the redirect URI exactly.</strong><p>{nativeLoopback ? 'For the installed app, Spotify lets Ikigai register the loopback address without a port. At sign-in, Ikigai chooses a temporary local port on 127.0.0.1 and Spotify returns only to this device.' : 'Copy this exact address into Redirect URIs in the Spotify app settings. Spelling, scheme, path and trailing slash must match.'}</p></div>
                      <div className="now0319-guide-redirect"><code>{redirectUri || '/now-playing'}</code><button type="button" onClick={() => void copySetupValue(redirectUri, 'redirect')} disabled={!redirectUri}>{copiedField === 'redirect' ? <Check size={13} /> : <Copy size={13} />} Copy</button></div>
                      {redirectIssue ? <small className="now030-redirect-warning" role="status">{redirectIssue}</small> : null}
                    </li>
                    <li><div><strong>Save the app, then copy only the Client ID.</strong><p>Paste the Client ID into Ikigai below. <b>Do not paste the Client Secret.</b> Ikigai uses PKCE because a desktop/browser client cannot safely keep a secret.</p></div></li>
                    <li><div><strong>Development Mode notes.</strong><p>The app owner needs Spotify Premium for current Development Mode Web API access. If another Spotify account will test the app, add that account to the app&apos;s allowed users in the Spotify Dashboard.</p></div></li>
                  </ol>
                </div> : null}
              </section>

              <label className="now030-field">
                <span>Spotify client ID</span>
                <input value={clientId} onChange={event => setClientId(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Paste the Client ID, not the Client Secret" />
                <small>Client ID is safe to identify the Spotify app. Ikigai never asks for the Client Secret.</small>
              </label>
              <div className="now030-redirect">
                <span>{nativeLoopback ? 'REGISTER THIS REDIRECT URI' : 'REDIRECT URI'}</span>
                <div><code>{redirectUri || '/now-playing'}</code><button type="button" onClick={() => void copySetupValue(redirectUri, 'redirect-compact')} disabled={!redirectUri} aria-label="Copy redirect URI">{copiedField === 'redirect-compact' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                <small>{nativeLoopback ? 'The installed app uses an ephemeral 127.0.0.1 port only during sign-in. Register the no-port URI shown above.' : 'This must exactly match one of the Redirect URIs in your Spotify developer app.'}</small>
                {redirectIssue ? <small className="now030-redirect-warning" role="status">{redirectIssue}</small> : null}
              </div>
              <label className="now030-check">
                <input type="checkbox" checked={allowControls} onChange={event => setAllowControls(event.target.checked)} />
                <span><strong>Allow playback controls</strong><small>Add Spotify permission for play/pause and previous/next. Leave this off for read-only presence.</small></span>
              </label>
              <label className="now030-check">
                <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />
                <span><strong>Remember this connection on this device</strong><small>Stores Spotify OAuth tokens in local storage on this installation. Leave off on shared devices; tokens never enter Ikigai backups.</small></span>
              </label>
              <button type="button" className="ik-button ik-button-primary now030-connect" onClick={() => void connect()} disabled={!setupReady || busy}>{busy ? 'Waiting for Spotify…' : 'Connect Spotify'}</button>
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
