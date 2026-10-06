import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Laptop,
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
  activateSystemMedia,
  beginSpotifyAuthorization,
  disableNowPlayingSource,
  disconnectSpotify,
  finishSpotifyAuthorization,
  refreshNowPlaying,
  selectSpotifySource,
  sendNowPlayingPlaybackAction,
  spotifyConnectionRemembered,
  spotifyGrantedScopes,
  spotifyHasConnection,
  spotifyRedirectUri,
  spotifyUsesNativeLoopback,
  subscribeSpotifyNativeAuthorization,
  systemMediaControlsEnabledOnThisDevice,
  systemMediaEnabledOnThisDevice,
  updateSystemMediaControls
} from '../lib/nowPlaying';
import { normalizeSpotifyClientId, spotifyRedirectUriIssue, spotifyScopesAllowControls } from '../lib/nowPlayingCore';
import { safeExternalHref } from '../lib/security';
import { systemMediaBridgeAvailable } from '../lib/tauriBridge';
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

type PlaybackAction = 'play' | 'pause' | 'next' | 'previous';

export function NowPlayingPage() {
  const runtime = useNowPlaying();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [clientId, setClientId] = useState('');
  const [allowControls, setAllowControls] = useState(false);
  const [systemAllowControls, setSystemAllowControls] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [spotifyAdvancedOpen, setSpotifyAdvancedOpen] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const sourceDialogRef = useDialogFocus<HTMLDivElement>(setupOpen, () => setSetupOpen(false));
  const nativeSystemMedia = systemMediaBridgeAvailable();

  useEffect(() => {
    let alive = true;
    void ensureSettings().then(next => {
      if (!alive) return;
      setSettings(next);
      setClientId(next.spotifyClientId ?? '');
      setAllowControls(Boolean(next.spotifyPlaybackControls));
      setSystemAllowControls(Boolean(next.systemMediaPlaybackControls) && systemMediaControlsEnabledOnThisDevice());
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
          await selectSpotifySource();
          const nextSettings = await ensureSettings();
          if (disposed) return;
          setSettings(nextSettings);
          setMessage('Spotify connected. Now Playing will follow the current item automatically.');
          setRemember(Boolean(result.remembered));
          setSetupOpen(false);
          void refreshNowPlaying();
        }
      } catch (error) {
        if (!disposed) {
          setMessage(error instanceof Error ? error.message : 'Spotify connection could not be completed.');
          setSetupOpen(true);
          setSpotifyAdvancedOpen(true);
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

  const spotifyGrantedControls = spotifyScopesAllowControls(spotifyGrantedScopes());
  const trackHref = runtime.item?.provider === 'spotify' ? safeExternalHref(runtime.item.externalUrl) : undefined;
  const redirectIssue = redirectUri ? spotifyRedirectUriIssue(redirectUri) : '';
  const normalizedClientId = normalizeSpotifyClientId(clientId);
  const setupReady = Boolean(normalizedClientId) && Boolean(redirectUri) && !redirectIssue;
  const nativeLoopback = spotifyUsesNativeLoopback();
  const spotifyDashboardHref = safeExternalHref(SPOTIFY_DASHBOARD);
  const spotifyConnected = spotifyHasConnection();
  const playbackProgress = useMemo(() => {
    const duration = runtime.item?.durationMs;
    const progress = runtime.item?.progressMs;
    if (!duration || progress === undefined) return null;
    return Math.max(0, Math.min(100, (progress / duration) * 100));
  }, [runtime.item?.durationMs, runtime.item?.progressMs]);

  const selectedProvider = settings?.nowPlayingProvider ?? runtime.provider;
  const systemEnabledOnDevice = systemMediaEnabledOnThisDevice();
  const grantedControls = selectedProvider === 'system'
    ? Boolean(settings?.systemMediaPlaybackControls)
    : selectedProvider === 'spotify'
      ? spotifyGrantedControls
      : false;
  const providerLabel = runtime.provider === 'system'
    ? 'SYSTEM MEDIA'
    : runtime.provider === 'spotify'
      ? 'SPOTIFY'
      : 'PLAYBACK';
  const stateLabel = runtime.refreshing
    ? 'Syncing'
    : runtime.error
      ? 'Needs attention'
      : runtime.item?.isPlaying
        ? 'Playing'
        : runtime.item
          ? 'Paused'
          : selectedProvider !== 'none'
            ? 'Waiting'
            : 'No source';

  const canAction = (action: PlaybackAction) => {
    const item = runtime.item;
    if (!item?.canControl) return false;
    if (item.provider !== 'system') return true;
    return item.controlCapabilities?.[action] === true;
  };

  async function copySetupValue(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      window.setTimeout(() => setCopiedField(current => current === key ? '' : current), 1500);
    } catch {
      setMessage('Copy was blocked. Select the value and copy it manually.');
    }
  }

  async function saveSpotifyPreferences(nextClientId = clientId, nextAllowControls = allowControls) {
    const normalized = normalizeSpotifyClientId(nextClientId);
    if (!normalized) throw new Error('Enter a valid Spotify Client ID.');
    const updated = await updateSettings({
      spotifyClientId: normalized,
      spotifyPlaybackControls: nextAllowControls
    });
    setSettings(updated);
    setClientId(normalized);
    return normalized;
  }

  async function connectSpotify() {
    setMessage('');
    setBusy(true);
    try {
      if (redirectIssue) throw new Error(redirectIssue);
      const normalized = await saveSpotifyPreferences();
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

  async function chooseSystemMedia() {
    setMessage('');
    setBusy(true);
    try {
      await activateSystemMedia(systemAllowControls);
      const nextSettings = await ensureSettings();
      setSettings(nextSettings);
      setMessage('Windows System Media is now the active source. Start playback in a Windows media app if nothing is shown yet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Windows System Media could not be enabled.');
    } finally {
      setBusy(false);
    }
  }

  async function changeSystemControls(enabled: boolean) {
    const previous = systemAllowControls;
    setSystemAllowControls(enabled);
    setBusy(true);
    try {
      await updateSystemMediaControls(enabled);
      const nextSettings = await ensureSettings();
      setSettings(nextSettings);
    } catch (error) {
      setSystemAllowControls(previous);
      setMessage(error instanceof Error ? error.message : 'Windows System Media permissions could not be updated.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseSpotify() {
    setBusy(true);
    setMessage('');
    try {
      await selectSpotifySource();
      const nextSettings = await ensureSettings();
      setSettings(nextSettings);
      setSetupOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Spotify could not be selected.');
    } finally {
      setBusy(false);
    }
  }

  async function stopSource() {
    setBusy(true);
    try {
      await disableNowPlayingSource();
      const nextSettings = await ensureSettings();
      setSettings(nextSettings);
      setMessage('Now Playing has no active source. No playback metadata is being read.');
    } finally {
      setBusy(false);
    }
  }

  async function act(action: PlaybackAction) {
    setMessage('');
    setBusy(true);
    try { await sendNowPlayingPlaybackAction(action); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Playback action failed.'); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    disconnectSpotify();
    setRemember(false);
    if (selectedProvider === 'spotify') await disableNowPlayingSource();
    const nextSettings = await ensureSettings();
    setSettings(nextSettings);
    setMessage('Spotify disconnected. Provider tokens were removed from this installation.');
  }

  async function toggleFamiliarMusic(enabled: boolean) {
    const updated = await updateSettings({ familiarMusicPresence: enabled });
    setSettings(updated);
  }

  const emptyCopy = selectedProvider === 'system'
    ? 'Start media in a Windows app that publishes system media controls. Ikigai will read the current title locally.'
    : selectedProvider === 'spotify'
      ? 'Start something in Spotify and it will appear here automatically.'
      : 'Choose a playback source once. After that, this room can stay this simple.';

  return (
    <div className="page now030-page">
      <div className="now0319-room">
        <header className="now0319-header">
          <span className="now0319-eyebrow"><Waves size={13} aria-hidden="true" /> NOW PLAYING</span>
          <div className="now0319-heading-row">
            <div>
              <h1>Just what&apos;s playing.</h1>
              <p>Choose a source once. Ikigai keeps Now Playing quiet, local where possible, and explicit about permissions.</p>
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
                <span>{providerLabel}</span>
                <b className={runtime.item?.isPlaying ? 'is-active' : ''}>{stateLabel}</b>
              </div>

              {runtime.item ? <>
                <div className="now0319-track">
                  <h2>{runtime.item.title}</h2>
                  {runtime.item.context ? <p>{runtime.item.context}</p> : null}
                  {runtime.item.deviceName ? <small>From {runtime.item.deviceName}</small> : null}
                </div>

                {playbackProgress !== null ? (
                  <div className="now0319-progress" role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playbackProgress)}>
                    <i style={{ width: `${playbackProgress}%` }} />
                    <div><span>{formatPlaybackTime(runtime.item.progressMs)}</span><span>{formatPlaybackTime(runtime.item.durationMs)}</span></div>
                  </div>
                ) : null}

                <div className="now0319-controls" aria-label="Playback controls">
                  {grantedControls ? <>
                    {canAction('previous') ? <button type="button" onClick={() => void act('previous')} disabled={busy} aria-label="Previous item"><SkipBack size={18} /></button> : null}
                    {canAction(runtime.item.isPlaying ? 'pause' : 'play') ? (
                      <button type="button" className="is-primary" onClick={() => void act(runtime.item!.isPlaying ? 'pause' : 'play')} disabled={busy} aria-label={runtime.item.isPlaying ? 'Pause playback' : 'Resume playback'}>
                        {runtime.item.isPlaying ? <Pause size={19} /> : <Play size={19} />}
                      </button>
                    ) : null}
                    {canAction('next') ? <button type="button" onClick={() => void act('next')} disabled={busy} aria-label="Next item"><SkipForward size={18} /></button> : null}
                  </> : null}
                  {trackHref ? <a href={trackHref} target="_blank" rel="noreferrer noopener" aria-label="Open current item in Spotify"><ExternalLink size={17} /></a> : null}
                </div>
              </> : (
                <div className="now0319-empty">
                  <h2>{selectedProvider !== 'none' ? 'Nothing playing right now.' : 'Nothing to show yet.'}</h2>
                  <p>{emptyCopy}</p>
                  {selectedProvider === 'none' ? (
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
              <p><strong>Private by default.</strong> Now Playing stores no listening history. Playback controls are separately opt-in, and metadata stays out of portable backups.</p>
            </div>

            <section className={`now033-source-card ${selectedProvider === 'system' ? 'is-selected' : ''}`} aria-label="Windows System Media source">
              <div className="now033-source-card-head">
                <span className="now033-source-icon"><Laptop size={18} aria-hidden="true" /></span>
                <div><strong>Windows System Media</strong><small>{nativeSystemMedia ? 'Recommended · local' : 'Installed Windows app only'}</small></div>
                {selectedProvider === 'system' ? <b>{systemEnabledOnDevice ? 'ACTIVE' : 'SAVED'}</b> : null}
              </div>
              <p>Reads the title and playback state Windows already exposes for the current media session. No Spotify developer app, Client ID, OAuth, or Spotify Premium is required for this source.</p>
              {nativeSystemMedia && selectedProvider === 'system' && !systemEnabledOnDevice ? (
                <div className="now033-source-unavailable" role="note">This source was saved in Ikigai settings, but this installation has not been given local permission to read Windows media yet. Choose <b>Use Windows System Media</b> below to enable it on this device.</div>
              ) : null}
              {nativeSystemMedia ? <>
                <label className="now030-check now033-source-permission">
                  <input
                    type="checkbox"
                    checked={systemAllowControls}
                    onChange={event => {
                      const enabled = event.target.checked;
                      if (selectedProvider === 'system' && systemEnabledOnDevice) void changeSystemControls(enabled);
                      else setSystemAllowControls(enabled);
                    }}
                    disabled={busy}
                  />
                  <span><strong>Allow playback controls</strong><small>Optional. When off, Ikigai only reads the current session. When on, it may send play/pause/previous/next only when the active media app exposes that exact control.</small></span>
                </label>
                <div className="now033-source-actions">
                  {selectedProvider === 'system' && systemEnabledOnDevice
                    ? <button type="button" className="ik-button ik-button-quiet" onClick={() => void stopSource()} disabled={busy}>Stop using this source</button>
                    : <button type="button" className="ik-button ik-button-primary" onClick={() => void chooseSystemMedia()} disabled={busy}>Use Windows System Media</button>}
                </div>
              </> : (
                <div className="now033-source-unavailable" role="note">Browser/PWA builds cannot read the Windows system media session or other apps directly. The installed Windows app can read this metadata locally without microphone or audio capture.</div>
              )}
            </section>

            <section className={`now033-source-card is-advanced ${selectedProvider === 'spotify' ? 'is-selected' : ''}`} aria-label="Spotify Web API advanced source">
              <button type="button" className="now033-advanced-toggle" aria-expanded={spotifyAdvancedOpen} onClick={() => setSpotifyAdvancedOpen(open => !open)}>
                <span><Music2 size={17} aria-hidden="true" /></span>
                <div><strong>Advanced: Spotify Web API</strong><small>Spotify Premium is required by Spotify for current Development Mode. Ikigai does not charge for this.</small></div>
                {selectedProvider === 'spotify' ? <b>ACTIVE</b> : null}
              </button>

              {spotifyAdvancedOpen ? <div className="now033-advanced-body">
                <p className="now033-premium-note"><strong>Use this only if you want Spotify&apos;s API integration.</strong> It is optional. The installed Windows source above is the normal path and does not require Spotify Premium.</p>

                {spotifyConnected ? <div className="now030-connected-copy">
                  <strong>Spotify authorization exists on this device.</strong>
                  <p>{spotifyGrantedControls ? 'Read + playback-control permission is active.' : 'Read-only playback permission is active.'}</p>
                  <small>{spotifyConnectionRemembered() ? 'Connection is remembered on this device.' : 'Connection lasts for this browser tab/session.'}</small>
                  <div className="now033-source-actions">
                    {selectedProvider !== 'spotify' ? <button type="button" className="ik-button ik-button-primary" onClick={() => void chooseSpotify()} disabled={busy}>Use Spotify</button> : null}
                    <button type="button" className="ik-button ik-button-quiet now030-disconnect" onClick={() => void disconnect()} disabled={busy}><Unplug size={15} /> Disconnect Spotify</button>
                  </div>
                </div> : <>
                  <section className="now0319-spotify-guide" aria-label="Spotify setup guide">
                    <button type="button" className="now0319-guide-toggle" aria-expanded={guideOpen} onClick={() => setGuideOpen(open => !open)}>
                      <BookOpen size={15} aria-hidden="true" />
                      <span><strong>{guideOpen ? 'Hide setup guide' : 'How to create the optional Spotify app'}</strong><small>Premium requirement, app details, redirect URI and Client ID.</small></span>
                    </button>

                    {guideOpen ? <div className="now0319-guide-body">
                      <ol>
                        <li>
                          <div><strong>Know the requirement first.</strong><p>Spotify currently requires the app owner to have Spotify Premium for Development Mode Web API access. If you do not want that requirement, use Windows System Media instead.</p></div>
                        </li>
                        <li>
                          <div><strong>Create a Spotify developer app.</strong><p>Open the Spotify Developer Dashboard, sign in, choose <b>Create app</b>, and enable the Web API option for this optional integration.</p></div>
                          {spotifyDashboardHref ? <a href={spotifyDashboardHref} target="_blank" rel="noreferrer noopener">Open Spotify Dashboard <ExternalLink size={12} /></a> : null}
                        </li>
                        <li>
                          <div><strong>Enter these suggested app details.</strong><p>These labels are only suggestions for your personal Ikigai setup.</p></div>
                          <div className="now0319-guide-values">
                            <div><span>APP NAME</span><code>{SPOTIFY_APP_NAME}</code><button type="button" onClick={() => void copySetupValue(SPOTIFY_APP_NAME, 'name')} aria-label="Copy Spotify app name">{copiedField === 'name' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                            <div><span>DESCRIPTION</span><code>{SPOTIFY_APP_DESCRIPTION}</code><button type="button" onClick={() => void copySetupValue(SPOTIFY_APP_DESCRIPTION, 'description')} aria-label="Copy Spotify app description">{copiedField === 'description' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                            <div><span>WEBSITE</span><code>{SPOTIFY_APP_WEBSITE}</code><button type="button" onClick={() => void copySetupValue(SPOTIFY_APP_WEBSITE, 'website')} aria-label="Copy Spotify website">{copiedField === 'website' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                            <div><span>API / SDK</span><code>Web API</code><button type="button" onClick={() => void copySetupValue('Web API', 'api')} aria-label="Copy Spotify API selection">{copiedField === 'api' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                          </div>
                        </li>
                        <li>
                          <div><strong>Register the redirect URI exactly.</strong><p>{nativeLoopback ? 'For the installed app, register the loopback URI shown below. Ikigai chooses a temporary 127.0.0.1 port during sign-in.' : 'Copy the exact address shown below into Redirect URIs. For local development, open Ikigai on 127.0.0.1, not localhost, because Spotify rejects localhost redirect URIs.'}</p></div>
                          <div className="now0319-guide-redirect"><code>{redirectUri || '/now-playing'}</code><button type="button" onClick={() => void copySetupValue(redirectUri, 'redirect')} disabled={!redirectUri}>{copiedField === 'redirect' ? <Check size={13} /> : <Copy size={13} />} Copy</button></div>
                          {redirectIssue ? <small className="now030-redirect-warning" role="status">{redirectIssue}</small> : null}
                        </li>
                        <li><div><strong>Copy only the Client ID.</strong><p>Paste the Client ID into Ikigai below. <b>Do not paste the Client Secret.</b> Ikigai uses Authorization Code + PKCE because an installed/browser client cannot safely keep a secret.</p></div></li>
                        <li><div><strong>Development Mode users.</strong><p>Spotify limits Development Mode access and requires test accounts to be authorized for the app. These are Spotify platform rules, not Ikigai charges.</p></div></li>
                      </ol>
                    </div> : null}
                  </section>

                  <label className="now030-field">
                    <span>Spotify Client ID</span>
                    <input value={clientId} onChange={event => setClientId(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Paste the Client ID, not the Client Secret" />
                    <small>The Client ID is public app identification. Ikigai never asks for the Client Secret.</small>
                  </label>
                  <div className="now030-redirect">
                    <span>{nativeLoopback ? 'REGISTER THIS REDIRECT URI' : 'REDIRECT URI'}</span>
                    <div><code>{redirectUri || '/now-playing'}</code><button type="button" onClick={() => void copySetupValue(redirectUri, 'redirect-compact')} disabled={!redirectUri} aria-label="Copy redirect URI">{copiedField === 'redirect-compact' ? <Check size={13} /> : <Copy size={13} />}</button></div>
                    <small>{nativeLoopback ? 'The installed app uses an ephemeral 127.0.0.1 port only during sign-in.' : 'The URI must exactly match Spotify settings. Local development must use 127.0.0.1 rather than localhost.'}</small>
                    {redirectIssue ? <small className="now030-redirect-warning" role="status">{redirectIssue}</small> : null}
                  </div>
                  <label className="now030-check">
                    <input type="checkbox" checked={allowControls} onChange={event => setAllowControls(event.target.checked)} />
                    <span><strong>Allow playback controls</strong><small>Add Spotify permission for play/pause and previous/next. Leave this off for read-only presence.</small></span>
                  </label>
                  <label className="now030-check">
                    <input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} />
                    <span><strong>Remember this connection on this device</strong><small>Stores Spotify OAuth tokens locally on this installation. Leave off on shared devices; tokens never enter Ikigai backups.</small></span>
                  </label>
                  {!normalizedClientId ? <small className="now033-connect-blocker" role="status">Enter the Spotify Client ID before connecting.</small> : null}
                  {redirectIssue ? <small className="now033-connect-blocker" role="status">Connect is disabled until the redirect URI is accepted. {redirectIssue}</small> : null}
                  <button type="button" className="ik-button ik-button-primary now030-connect" onClick={() => void connectSpotify()} disabled={!setupReady || busy} title={!setupReady ? (redirectIssue || 'Enter a valid Spotify Client ID first.') : undefined}>{busy ? 'Waiting for Spotify…' : 'Connect Spotify'}</button>
                </>}
              </div> : null}
            </section>

            {selectedProvider !== 'none' ? <button type="button" className="ik-button ik-button-quiet now033-stop-all" onClick={() => void stopSource()} disabled={busy}>Use no playback source</button> : null}

            <label className="now030-check now030-familiar-toggle">
              <input type="checkbox" checked={settings?.familiarMusicPresence ?? true} onChange={event => void toggleFamiliarMusic(event.target.checked)} />
              <span><strong>Familiar music presence</strong><small>When playback is active, the Familiar gets a calm generic music pose. It is not synchronized to the song, tempo, waveform, or beats.</small></span>
            </label>

            {message ? <p className="now0319-dialog-message" role="status">{message}</p> : null}
            <footer>No audio capture · no beat analysis · no listening history · provider tokens stay outside portable backups</footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
