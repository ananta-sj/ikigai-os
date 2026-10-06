type TauriEvent<T> = { payload: T };
type TauriUnlisten = () => void;

type TauriGlobal = {
  core?: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
  event?: {
    listen<T>(event: string, handler: (event: TauriEvent<T>) => void): Promise<TauriUnlisten>;
  };
};

export interface SystemMediaSnapshot {
  supported: boolean;
  available: boolean;
  sourceId?: string;
  sourceLabel?: string;
  title?: string;
  artist?: string;
  albumTitle?: string;
  isPlaying: boolean;
  durationMs?: number;
  progressMs?: number;
  canPlay: boolean;
  canPause: boolean;
  canNext: boolean;
  canPrevious: boolean;
}

function tauriGlobal(): TauriGlobal | null {
  if (typeof window === 'undefined') return null;
  return ((window as Window & { __TAURI__?: TauriGlobal }).__TAURI__ ?? null);
}

export function isTauriRuntime() {
  return Boolean(tauriGlobal()?.core?.invoke);
}

export function systemMediaBridgeAvailable() {
  if (!isTauriRuntime() || typeof navigator === 'undefined') return false;
  return /Windows/i.test(navigator.userAgent);
}

export async function readSystemMedia() {
  const invoke = tauriGlobal()?.core?.invoke;
  if (!invoke) {
    return {
      supported: false,
      available: false,
      isPlaying: false,
      canPlay: false,
      canPause: false,
      canNext: false,
      canPrevious: false
    } satisfies SystemMediaSnapshot;
  }
  return invoke<SystemMediaSnapshot>('read_system_media');
}

export async function controlSystemMedia(action: 'play' | 'pause' | 'next' | 'previous', expectedSourceId: string) {
  const invoke = tauriGlobal()?.core?.invoke;
  if (!invoke) throw new Error('Windows System Media is available only in the installed Windows app.');
  return invoke<boolean>('control_system_media', { action, expectedSourceId });
}

export async function startSpotifyOAuthLoopback(state: string) {
  const invoke = tauriGlobal()?.core?.invoke;
  if (!invoke) throw new Error('The native Spotify callback bridge is unavailable in this build.');
  return invoke<string>('start_spotify_oauth_listener', { state });
}

export async function openSpotifyAuthorization(url: string) {
  const invoke = tauriGlobal()?.core?.invoke;
  if (!invoke) throw new Error('The native browser bridge is unavailable in this build.');
  await invoke<void>('open_external_url', { url });
}

export async function listenSpotifyOAuthCallback(handler: (search: string) => void): Promise<TauriUnlisten> {
  const listen = tauriGlobal()?.event?.listen;
  if (!listen) return () => undefined;
  return listen<string>('ikigai://spotify-oauth', event => {
    if (typeof event.payload === 'string') handler(event.payload);
  });
}
