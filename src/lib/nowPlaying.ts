import type { NowPlayingItem, NowPlayingRuntime } from '../types';
import {
  normalizeSpotifyClientId,
  parseSpotifyPlayback,
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
  provider: 'spotify',
  connected: false,
  item: null,
  refreshing: false
};
let cooldownUntil = 0;
let refreshInFlight: Promise<NowPlayingRuntime> | null = null;

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

function emit(next: NowPlayingRuntime) {
  runtime = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<NowPlayingRuntime>(NOW_PLAYING_EVENT, { detail: next }));
  }
  return next;
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
  return `${window.location.origin}/now-playing`;
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
  const redirectUri = spotifyRedirectUri();
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
  window.location.assign(`${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`);
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

async function tokenRequest(body: URLSearchParams) {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json().catch(() => ({})) as SpotifyTokenResponse & { error_description?: string };
  if (!response.ok) throw new Error(payload.error_description || `Spotify sign-in failed (HTTP ${response.status}).`);
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
    // Authorization codes/verifiers are single-use. Do not leave the verifier
    // around after either a successful exchange or a failed callback attempt.
    removeStored('session', SPOTIFY_PKCE_KEY);
  }
  const tokens = parseTokenResponse(payload);
  if (!storeTokens(tokens, pkce.remember)) {
    throw new Error('Spotify connected, but this browser blocked the local token storage needed to keep the session.');
  }
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
  if (!entry) throw new Error('Connect Spotify to use Now Playing.');
  const response = await fetch(`${SPOTIFY_API_ROOT}${path}`, {
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
        : 'Spotify asked Ikigai to slow down.',
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
  const connected = spotifyHasConnection();
  if (runtime.connected !== connected) runtime = { ...runtime, connected, item: connected ? runtime.item : null };
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

export async function refreshNowPlaying(): Promise<NowPlayingRuntime> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    if (!spotifyHasConnection()) return emit({ provider: 'spotify', connected: false, item: null, refreshing: false });
    if (Date.now() < cooldownUntil) return runtime;
    emit({ ...runtime, connected: true, refreshing: true, error: undefined });
    try {
      const response = await spotifyFetch('/me/player');
      if (response.status === 204) return emit({ provider: 'spotify', connected: true, item: null, refreshing: false, lastUpdatedAt: new Date().toISOString() });
      const payload = await response.json() as Parameters<typeof parseSpotifyPlayback>[0];
      const item = parseSpotifyPlayback(payload, spotifyScopesAllowControls(spotifyGrantedScopes()));
      return emit({ provider: 'spotify', connected: true, item, refreshing: false, lastUpdatedAt: new Date().toISOString() });
    } catch (error) {
      if (error instanceof SpotifyRequestError && error.status === 429) {
        cooldownUntil = Date.now() + (error.retryAfterSeconds ?? 30) * 1000;
      }
      const message = error instanceof Error ? error.message : 'Spotify playback could not be refreshed.';
      return emit({ ...runtime, connected: spotifyHasConnection(), refreshing: false, error: message });
    }
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
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

export function disconnectSpotify() {
  removeStored('session', SPOTIFY_SESSION_TOKEN_KEY);
  removeStored('local', SPOTIFY_LOCAL_TOKEN_KEY);
  removeStored('session', SPOTIFY_PKCE_KEY);
  removeStored('session', 'ikigai-now-playing.spotify.client-id-v1');
  removeStored('local', 'ikigai-now-playing.spotify.client-id-v1');
  cooldownUntil = 0;
  emit({ provider: 'spotify', connected: false, item: null, refreshing: false });
}

export function clearNowPlayingCredentials() {
  disconnectSpotify();
}

export function nowPlayingItemIsActive(item: NowPlayingItem | null | undefined) {
  return Boolean(item?.isPlaying);
}
