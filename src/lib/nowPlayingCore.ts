import type { NowPlayingItem } from '../types';

export const SPOTIFY_READ_SCOPES = ['user-read-currently-playing', 'user-read-playback-state'] as const;
export const SPOTIFY_CONTROL_SCOPE = 'user-modify-playback-state' as const;

export function normalizeSpotifyClientId(value: unknown) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return /^[A-Za-z0-9]{8,80}$/.test(normalized) ? normalized : '';
}

export function spotifyScopes(allowControls: boolean) {
  return allowControls
    ? [...SPOTIFY_READ_SCOPES, SPOTIFY_CONTROL_SCOPE]
    : [...SPOTIFY_READ_SCOPES];
}

export function spotifyScopeString(allowControls: boolean) {
  return spotifyScopes(allowControls).join(' ');
}

export function spotifyScopesAllowControls(scope: string | undefined) {
  if (!scope) return false;
  return scope.split(/\s+/).includes(SPOTIFY_CONTROL_SCOPE);
}

export function spotifyTokenStorageOrder(remember: boolean): Array<'session' | 'local'> {
  return remember ? ['local', 'session'] : ['session'];
}

export function spotifyRedirectUriIssue(value: string) {
  try {
    const uri = new URL(value);
    if (uri.hostname === 'localhost') {
      return 'Spotify no longer accepts localhost redirect URIs. Open this dev build on 127.0.0.1 (for example http://127.0.0.1:5173) and register that exact /now-playing redirect URI.';
    }
    if (uri.protocol !== 'https:' && uri.hostname !== '127.0.0.1' && uri.hostname !== '[::1]' && uri.hostname !== '::1') {
      return 'Spotify redirect URIs must use HTTPS unless the app is running on an explicit loopback IP address.';
    }
    return '';
  } catch {
    return 'The Spotify redirect URI is invalid.';
  }
}

function cleanText(value: unknown, max = 180) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export interface SpotifyPlaybackPayload {
  is_playing?: unknown;
  progress_ms?: unknown;
  device?: { name?: unknown } | null;
  item?: {
    type?: unknown;
    name?: unknown;
    duration_ms?: unknown;
    artists?: Array<{ name?: unknown }>;
    show?: { name?: unknown };
    external_urls?: { spotify?: unknown };
  } | null;
}

export function parseSpotifyPlayback(payload: SpotifyPlaybackPayload, canControl: boolean, fetchedAt = new Date().toISOString()): NowPlayingItem | null {
  const raw = payload?.item;
  if (!raw || typeof raw !== 'object') return null;
  const title = cleanText(raw.name, 220);
  if (!title) return null;

  const itemType = raw.type === 'episode' ? 'episode' : 'track';
  const artistNames = Array.isArray(raw.artists)
    ? raw.artists.map(artist => cleanText(artist?.name, 100)).filter(Boolean).slice(0, 8)
    : [];
  const context = itemType === 'episode'
    ? cleanText(raw.show?.name, 180)
    : artistNames.join(', ');
  const durationMs = typeof raw.duration_ms === 'number' && Number.isFinite(raw.duration_ms)
    ? Math.max(0, Math.round(raw.duration_ms))
    : undefined;
  const progressMs = typeof payload.progress_ms === 'number' && Number.isFinite(payload.progress_ms)
    ? Math.max(0, Math.round(payload.progress_ms))
    : undefined;

  return {
    provider: 'spotify',
    itemType,
    title,
    context,
    isPlaying: payload.is_playing === true,
    durationMs,
    progressMs,
    externalUrl: safeHttpsUrl(raw.external_urls?.spotify),
    deviceName: cleanText(payload.device?.name, 100) || undefined,
    canControl,
    fetchedAt
  };
}
