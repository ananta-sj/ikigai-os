import type { NowPlayingItem, NowPlayingRuntime, NowPlayingProvider } from '../types';
import { ensureSettings, updateSettings } from './settings';
import { boundedRequest, readBoundedResponseText, TransportFailure } from './companionTransportCore';
import {
  controlSystemMedia,
  isTauriRuntime,
  listenSpotifyOAuthCallback,
  openSpotifyAuthorization,
  readSystemMedia,
  startSpotifyOAuthLoopback
} from './tauriBridge';
import {
  normalizeSpotifyClientId,
  parseSpotifyPlayback,
  parseSystemMediaSnapshot,
  spotifyScopeString,
  spotifyScopesAllowControls,
  spotifyTokenStorageOrder,
  spotifyRedirectUriIssue
} from './nowPlayingCore';

const SPOTIFY_AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_ROOT = 'https://api.spotify.com/v1';
const SPOTIFY_SESSION_TOKEN_KEY = 'ikigai-now-playing.spotify.session-token-v1';
const SPOTIFY_LOCAL_TOKEN_KEY = 'ikigai-now-playing.spotify.local-token-v1';
const SPOTIFY_PKCE_KEY = 'ikigai-now-playing.spotify.pkce-v1';
const SYSTEM_MEDIA_DEVICE_ENABLED_KEY = 'ikigai-now-playing.system-media.enabled-v1';
const SYSTEM_MEDIA_DEVICE_CONTROLS_KEY = 'ikigai-now-playing.system-media.controls-v1';
export const NOW_PLAYING_EVENT = 'ikigai-now-playing-changed';

interface SpotifyTokenBundle {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

interface SpotifyTokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
}

interface SpotifyPkceState {
  verifier: string;
  state: string;
  clientId: string;
  remember: boolean;
  redirectUri: string;
}

let runtime: NowPlayingRuntime = {
  provider: 'none',
  connected: false,
  item: null,
  refreshing: false
};
let cooldownUntil = 0;
let refreshEpoch = 0;

function storage(kind: 'session' | 'local') {
  if (typeof window === 'undefined') return null;
  try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch { return null; }
}

function readJson<T>(kind: 'session' | 'local', key: string): T | null {
  try {
    const raw = storage(kind)?.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(kind: 'session' | 'local', key: string, value: unknown) {
  try {
    storage(kind)?.setItem(key, JSON.stringify(value));
    return storage(kind)?.getItem(key) !== null;
  } catch {
    return false;
  }
}

function removeStored(kind: 'session' | 'local', key: string) {
  try { storage(kind)?.removeItem(key); } catch { /* best-effort */ }
}

function readDeviceFlag(key: string) {
  try { return storage('local')?.getItem(key) === '1'; } catch { return false; }
}

function writeDeviceFlag(key: string, enabled: boolean) {
  try {
    const target = storage('local');
    if (!target) return false;
    if (enabled) target.setItem(key, '1');
    else target.removeItem(key);
    return enabled ? target.getItem(key) === '1' : target.getItem(key) === null;
  } catch {
    return false;
  }
}

export function systemMediaEnabledOnThisDevice() {
  return readDeviceFlag(SYSTEM_MEDIA_DEVICE_ENABLED_KEY);
}

export function systemMediaControlsEnabledOnThisDevice() {
  return systemMediaEnabledOnThisDevice() && readDeviceFlag(SYSTEM_MEDIA_DEVICE_CONTROLS_KEY);
}

function setSystemMediaDeviceConsent(enabled: boolean, controls = false) {
  const sourceStored = writeDeviceFlag(SYSTEM_MEDIA_DEVICE_ENABLED_KEY, enabled);
  const controlsStored = writeDeviceFlag(SYSTEM_MEDIA_DEVICE_CONTROLS_KEY, enabled && controls);
  if (enabled && (!sourceStored || !controlsStored)) {
    writeDeviceFlag(SYSTEM_MEDIA_DEVICE_ENABLED_KEY, false);
    writeDeviceFlag(SYSTEM_MEDIA_DEVICE_CONTROLS_KEY, false);
    throw new Error('Ikigai Space could not save the local Windows System Media permission on this device.');
  }
}

function emit(next: NowPlayingRuntime) {
  runtime = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<NowPlayingRuntime>(NOW_PLAYING_EVENT, { detail: next }));
  }
  return next;
}

function emitIfCurrent(epoch: number, next: NowPlayingRuntime) {
  return epoch === refreshEpoch ? emit(next) : runtime;
}

function currentTokens(): { tokens: SpotifyTokenBundle; remembered: boolean } | null {
  const sessionTokens = readJson<SpotifyTokenBundle>('session', SPOTIFY_SESSION_TOKEN_KEY);
  if (sessionTokens?.accessToken) return { tokens: sessionTokens, remembered: false };
  const localTokens = readJson<SpotifyTokenBundle>('local', SPOTIFY_LOCAL_TOKEN_KEY);
  if (localTokens?.accessToken) return { tokens: localTokens, remembered: true };
  return null;
}

function storeTokens(tokens: SpotifyTokenBundle, remember: boolean) {
  removeStored('session', SPOTIFY_SESSION_TOKEN_KEY);
  removeStored('local', SPOTIFY_LOCAL_TOKEN_KEY);
  for (const kind of spotifyTokenStorageOrder(remember)) {
    const key = kind === 'local' ? SPOTIFY_LOCAL_TOKEN_KEY : SPOTIFY_SESSION_TOKEN_KEY;
    if (writeJson(kind, key, tokens)) return true;
  }
  return false;
}

function randomUrlSafe(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary = '';
  data.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256UrlSafe(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const bytes = new Uint8Array(digest);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function spotifyRedirectUri() {
  if (typeof window === 'undefined') return '';
  if (isTauriRuntime()) return 'http://127.0.0.1/spotify/callback';

  const baseUrl = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return new URL(`${baseUrl.replace(/\/?$/, '/')}now-playing`, window.location.origin).toString();
}

export function spotifyUsesNativeLoopback() {
  return isTauriRuntime();
}

export function subscribeSpotifyNativeAuthorization(handler: (search: string) => void) {
  return listenSpotifyOAuthCallback(handler);
}

export function spotifyConnectionRemembered() {
  return Boolean(readJson<SpotifyTokenBundle>('local', SPOTIFY_LOCAL_TOKEN_KEY));
}

export function spotifyHasConnection() {
  return Boolean(currentTokens());
}

export function spotifyGrantedScopes() {
  return currentTokens()?.tokens.scope ?? '';
}

export async function beginSpotifyAuthorization(input: { clientId: string; allowControls: boolean; remember: boolean }) {
  const clientId = normalizeSpotifyClientId(input.clientId);
  if (!clientId) throw new Error('Enter a valid Spotify client ID first.');
  if (typeof window === 'undefined' || !crypto?.subtle) throw new Error('This browser cannot start the secure Spotify sign-in flow.');

  const verifier = randomUrlSafe(64);
  const state = randomUrlSafe(24);
  const native = isTauriRuntime();
  const redirectUri = native ? await startSpotifyOAuthLoopback(state) : spotifyRedirectUri();
  const redirectIssue = spotifyRedirectUriIssue(redirectUri);
  if (redirectIssue) throw new Error(redirectIssue);
  const pkce: SpotifyPkceState = { verifier, state, clientId, remember: input.remember, redirectUri };
  rememberSpotifyClientIdForTokens(clientId, input.remember);
  if (!writeJson('session', SPOTIFY_PKCE_KEY, pkce)) throw new Error('Browser session storage is required to complete Spotify sign-in safely.');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: spotifyScopeString(input.allowControls),
    redirect_uri: redirectUri,
    state,
    code_challenge_method: 'S256',
    code_challenge: await sha256UrlSafe(verifier)
  });
  const authorizationUrl = `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
  if (native) await openSpotifyAuthorization(authorizationUrl);
  else window.location.assign(authorizationUrl);
}

function parseTokenResponse(raw: SpotifyTokenResponse, previous?: SpotifyTokenBundle): SpotifyTokenBundle {
  const accessToken = typeof raw.access_token === 'string' ? raw.access_token : '';
  if (!accessToken) throw new Error('Spotify did not return an access token.');
  const expiresIn = typeof raw.expires_in === 'number' && Number.isFinite(raw.expires_in) ? Math.max(30, raw.expires_in) : 3600;
  return {
    accessToken,
    refreshToken: typeof raw.refresh_token === 'string' && raw.refresh_token ? raw.refresh_token : previous?.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    scope: typeof raw.scope === 'string' ? raw.scope : previous?.scope ?? ''
  };
}

async function mediaRequest(url: string, init: RequestInit) {
  try {
    return await boundedRequest({
      request: signal => fetch(url, { ...init, signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store' }),
      timeoutMs: 20000,
      consume: async (response, signal) => new Response((await readBoundedResponseText(response, signal)) || null, { status: response.status, statusText: response.statusText, headers: response.headers })
    });
  } catch (error) {
    if (error instanceof TransportFailure) throw new Error(error.kind === 'timeout' ? 'Spotify took too long to respond. Check your connection and try again.' : 'Could not reach Spotify. Check your connection and try again.');
    throw error;
  }
}

async function tokenRequest(body: URLSearchParams) {
  const response = await mediaRequest(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json().catch(() => ({})) as SpotifyTokenResponse & { error_description?: string };
  if (!response.ok) throw new Error(`Spotify sign-in failed (HTTP ${response.status}). Check app permissions and connect again.`);
  return payload;
}

export async function finishSpotifyAuthorization(search = typeof window === 'undefined' ? '' : window.location.search) {
  const params = new URLSearchParams(search);
  if (!params.has('code') && !params.has('error')) return { handled: false as const };

  const pkce = readJson<SpotifyPkceState>('session', SPOTIFY_PKCE_KEY);
  const state = params.get('state') ?? '';
  if (!pkce || !state || state !== pkce.state) {
    removeStored('session', SPOTIFY_PKCE_KEY);
    throw new Error('Spotify sign-in could not be verified. Start the connection again.');
  }

  const oauthError = params.get('error');
  if (oauthError) {
    removeStored('session', SPOTIFY_PKCE_KEY);
    throw new Error(oauthError === 'access_denied' ? 'Spotify connection was cancelled.' : `Spotify returned ${oauthError}.`);
  }

  const code = params.get('code') ?? '';
  if (!code) {
    removeStored('session', SPOTIFY_PKCE_KEY);
    throw new Error('Spotify sign-in did not return an authorization code. Start the connection again.');
  }

  let payload: SpotifyTokenResponse;
  try {
    payload = await tokenRequest(new URLSearchParams({
      client_id: pkce.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: pkce.redirectUri,
      code_verifier: pkce.verifier
    }));
  } finally {
    removeStored('session', SPOTIFY_PKCE_KEY);
  }

  const tokens = parseTokenResponse(payload);
  if (!storeTokens(tokens, pkce.remember)) {
    throw new Error('Spotify connected, but this browser blocked the local token storage needed to keep the session.');
  }

  // OAuth/token exchange is intentionally independent from Dexie settings.
  // The UI persists Spotify as the selected provider only after this secure
  // callback succeeds. Keeping these concerns separate also lets the provider
  // integration be exercised in headless environments without IndexedDB.
  refreshEpoch += 1;
  emit({ provider: 'spotify', connected: true, item: null, refreshing: false });
  return { handled: true as const, remembered: pkce.remember, scope: tokens.scope };
}

function clientIdForRefresh() {
  try {
    return storage('local')?.getItem('ikigai-now-playing.spotify.client-id-v1')
      ?? storage('session')?.getItem('ikigai-now-playing.spotify.client-id-v1')
      ?? '';
  } catch { return ''; }
}

export function rememberSpotifyClientIdForTokens(clientId: string, remember: boolean) {
  const clean = normalizeSpotifyClientId(clientId);
  if (!clean) return;
  const key = 'ikigai-now-playing.spotify.client-id-v1';
  removeStored('session', key);
  removeStored('local', key);
  for (const kind of spotifyTokenStorageOrder(remember)) {
    try {
      const target = storage(kind);
      target?.setItem(key, clean);
      if (target?.getItem(key) === clean) return;
    } catch { /* try only the next non-persistent fallback, when permitted */ }
  }
}

async function usableTokens() {
  const entry = currentTokens();
  if (!entry) return null;
  if (entry.tokens.expiresAt > Date.now() + 30_000) return entry;
  const clientId = clientIdForRefresh();
  if (!clientId || !entry.tokens.refreshToken) {
    disconnectSpotify();
    throw new Error('Spotify session expired. Connect again.');
  }
  const payload = await tokenRequest(new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: entry.tokens.refreshToken
  }));
  const tokens = parseTokenResponse(payload, entry.tokens);
  if (!storeTokens(tokens, entry.remembered)) {
    disconnectSpotify();
    throw new Error('Spotify refreshed the session, but this browser blocked local token storage. Connect again after enabling site storage.');
  }
  return { tokens, remembered: entry.remembered };
}

class SpotifyRequestError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function spotifyFetch(path: string, init?: RequestInit) {
  const entry = await usableTokens();
  if (!entry) throw new Error('Connect Spotify to use this source.');
  const response = await mediaRequest(`${SPOTIFY_API_ROOT}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${entry.tokens.accessToken}` }
  });
  if (response.status === 429) {
    const retry = Number(response.headers.get('Retry-After'));
    const payload = await response.clone().json().catch(() => null) as { error?: { reason?: unknown } } | null;
    const quotaExceeded = payload?.error?.reason === 'QUOTA_EXCEEDED';
    throw new SpotifyRequestError(
      429,
      quotaExceeded
        ? 'This Spotify development account has reached its shared Web API quota. Try again after the quota window resets.'
        : 'Spotify asked Ikigai Space to slow down.',
      Number.isFinite(retry) ? retry : 30
    );
  }
  if (response.status === 401) {
    disconnectSpotify();
    throw new SpotifyRequestError(401, 'Spotify session expired. Connect again.');
  }
  if (response.status === 403) throw new SpotifyRequestError(403, 'Spotify did not allow that playback action for this account or device.');
  if (!response.ok) throw new SpotifyRequestError(response.status, `Spotify request failed (HTTP ${response.status}).`);
  return response;
}

export function getNowPlayingRuntime() {
  return runtime;
}

export function subscribeNowPlaying(listener: (next: NowPlayingRuntime) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const next = (event as CustomEvent<NowPlayingRuntime>).detail;
    if (next) listener(next);
  };
  window.addEventListener(NOW_PLAYING_EVENT, handler);
  return () => window.removeEventListener(NOW_PLAYING_EVENT, handler);
}

async function refreshSystemMedia(epoch: number, allowControls: boolean) {
  if (!systemMediaEnabledOnThisDevice()) {
    return emitIfCurrent(epoch, {
      provider: 'system',
      connected: false,
      item: null,
      refreshing: false,
      error: 'Windows System Media is saved as the preferred source, but it is not enabled on this device. Open Source and choose Use Windows System Media.'
    });
  }
  if (!isTauriRuntime()) {
    return emitIfCurrent(epoch, {
      provider: 'system',
      connected: false,
      item: null,
      refreshing: false,
      error: 'Windows System Media is available only in the installed Windows app. Browser/PWA builds cannot read the Windows system media session or other apps directly.'
    });
  }

  emitIfCurrent(epoch, { provider: 'system', connected: true, item: runtime.provider === 'system' ? runtime.item : null, refreshing: true });
  try {
    const snapshot = await readSystemMedia();
    if (!snapshot.supported) {
      return emitIfCurrent(epoch, {
        provider: 'system',
        connected: false,
        item: null,
        refreshing: false,
        error: 'This Windows build does not expose the System Media session API to Ikigai Space.'
      });
    }
    const item = parseSystemMediaSnapshot(snapshot, allowControls);
    return emitIfCurrent(epoch, {
      provider: 'system',
      connected: true,
      item,
      refreshing: false,
      lastUpdatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Windows System Media could not be refreshed.';
    return emitIfCurrent(epoch, { provider: 'system', connected: false, item: null, refreshing: false, error: message });
  }
}

async function refreshSpotify(epoch: number) {
  if (!spotifyHasConnection()) {
    return emitIfCurrent(epoch, { provider: 'spotify', connected: false, item: null, refreshing: false });
  }
  if (Date.now() < cooldownUntil) return runtime;

  emitIfCurrent(epoch, { provider: 'spotify', connected: true, item: runtime.provider === 'spotify' ? runtime.item : null, refreshing: true });
  try {
    const response = await spotifyFetch('/me/player');
    if (response.status === 204) {
      return emitIfCurrent(epoch, { provider: 'spotify', connected: true, item: null, refreshing: false, lastUpdatedAt: new Date().toISOString() });
    }
    const payload = await response.json() as Parameters<typeof parseSpotifyPlayback>[0];
    const item = parseSpotifyPlayback(payload, spotifyScopesAllowControls(spotifyGrantedScopes()));
    return emitIfCurrent(epoch, { provider: 'spotify', connected: true, item, refreshing: false, lastUpdatedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof SpotifyRequestError && error.status === 429) {
      cooldownUntil = Date.now() + (error.retryAfterSeconds ?? 30) * 1000;
    }
    const message = error instanceof Error ? error.message : 'Spotify playback could not be refreshed.';
    return emitIfCurrent(epoch, { provider: 'spotify', connected: spotifyHasConnection(), item: null, refreshing: false, error: message });
  }
}

export async function refreshNowPlaying(): Promise<NowPlayingRuntime> {
  const epoch = ++refreshEpoch;

  // Once a provider is active in this runtime, refresh it directly. Settings
  // are the durable startup/selection record, not a dependency of every poll.
  // This avoids unnecessary IndexedDB reads and keeps provider refreshes
  // resilient if storage is temporarily unavailable after startup.
  if (runtime.provider === 'system') {
    return refreshSystemMedia(epoch, systemMediaControlsEnabledOnThisDevice());
  }
  if (runtime.provider === 'spotify') {
    return refreshSpotify(epoch);
  }

  const settings = await ensureSettings();
  if (epoch !== refreshEpoch) return runtime;

  if (settings.nowPlayingProvider === 'system') {
    return refreshSystemMedia(epoch, settings.systemMediaPlaybackControls && systemMediaControlsEnabledOnThisDevice());
  }
  if (settings.nowPlayingProvider === 'spotify') {
    return refreshSpotify(epoch);
  }
  return emitIfCurrent(epoch, { provider: 'none', connected: false, item: null, refreshing: false });
}

export async function activateSystemMedia(allowControls = false) {
  if (!isTauriRuntime()) throw new Error('Windows System Media is available only in the installed Windows app.');
  setSystemMediaDeviceConsent(true, allowControls);
  await updateSettings({
    nowPlayingProvider: 'system',
    systemMediaPlaybackControls: allowControls
  });
  refreshEpoch += 1;
  emit({ provider: 'system', connected: true, item: null, refreshing: false });
  return refreshNowPlaying();
}

export async function updateSystemMediaControls(enabled: boolean) {
  if (!systemMediaEnabledOnThisDevice()) {
    throw new Error('Enable Windows System Media on this device before changing playback controls.');
  }
  setSystemMediaDeviceConsent(true, enabled);
  await updateSettings({ systemMediaPlaybackControls: enabled });
  const settings = await ensureSettings();
  return settings.nowPlayingProvider === 'system' ? refreshNowPlaying() : runtime;
}

export async function selectSpotifySource() {
  if (!spotifyHasConnection()) throw new Error('Connect Spotify before selecting it as the source.');
  await updateSettings({ nowPlayingProvider: 'spotify' });
  refreshEpoch += 1;
  emit({ provider: 'spotify', connected: true, item: runtime.provider === 'spotify' ? runtime.item : null, refreshing: false });
  return refreshNowPlaying();
}

export async function disableNowPlayingSource() {
  setSystemMediaDeviceConsent(false);
  await updateSettings({ nowPlayingProvider: 'none', systemMediaPlaybackControls: false });
  refreshEpoch += 1;
  return emit({ provider: 'none', connected: false, item: null, refreshing: false });
}

export async function sendSystemMediaPlaybackAction(action: 'play' | 'pause' | 'next' | 'previous') {
  const settings = await ensureSettings();
  if (settings.nowPlayingProvider !== 'system' || !settings.systemMediaPlaybackControls || !systemMediaControlsEnabledOnThisDevice()) {
    throw new Error('Enable Windows System Media playback controls on this device first.');
  }
  const item = runtime.provider === 'system' ? runtime.item : null;
  if (!item?.sourceId) throw new Error('The current Windows media source is no longer available.');

  const allowed = action === 'play'
    ? item.controlCapabilities?.play
    : action === 'pause'
      ? item.controlCapabilities?.pause
      : action === 'next'
        ? item.controlCapabilities?.next
        : item.controlCapabilities?.previous;
  if (!allowed) throw new Error(`The current Windows media source does not offer the ${action} control.`);

  const accepted = await controlSystemMedia(action, item.sourceId);
  if (!accepted) throw new Error(`Windows did not accept the ${action} control for the current media source.`);
  await new Promise(resolve => setTimeout(resolve, 180));
  return refreshNowPlaying();
}

export async function sendSpotifyPlaybackAction(action: 'play' | 'pause' | 'next' | 'previous') {
  if (!spotifyScopesAllowControls(spotifyGrantedScopes())) throw new Error('Reconnect Spotify with playback controls enabled first.');
  const request = action === 'next'
    ? ['/me/player/next', 'POST'] as const
    : action === 'previous'
      ? ['/me/player/previous', 'POST'] as const
      : action === 'play'
        ? ['/me/player/play', 'PUT'] as const
        : ['/me/player/pause', 'PUT'] as const;
  await spotifyFetch(request[0], { method: request[1] });
  await new Promise(resolve => setTimeout(resolve, 350));
  return refreshNowPlaying();
}

export async function sendNowPlayingPlaybackAction(action: 'play' | 'pause' | 'next' | 'previous') {
  const provider: NowPlayingProvider = runtime.provider;
  if (provider === 'system') return sendSystemMediaPlaybackAction(action);
  if (provider === 'spotify') return sendSpotifyPlaybackAction(action);
  throw new Error('Choose a playback source first.');
}

export function disconnectSpotify() {
  removeStored('session', SPOTIFY_SESSION_TOKEN_KEY);
  removeStored('local', SPOTIFY_LOCAL_TOKEN_KEY);
  removeStored('session', SPOTIFY_PKCE_KEY);
  removeStored('session', 'ikigai-now-playing.spotify.client-id-v1');
  removeStored('local', 'ikigai-now-playing.spotify.client-id-v1');
  cooldownUntil = 0;
  if (runtime.provider === 'spotify') {
    refreshEpoch += 1;
    emit({ provider: 'spotify', connected: false, item: null, refreshing: false });
  }
}

export function clearNowPlayingCredentials() {
  disconnectSpotify();
  setSystemMediaDeviceConsent(false);
}

export function nowPlayingItemIsActive(item: NowPlayingItem | null | undefined) {
  return Boolean(item?.isPlaying);
}
