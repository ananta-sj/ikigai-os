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

function tauriGlobal(): TauriGlobal | null {
  if (typeof window === 'undefined') return null;
  return ((window as Window & { __TAURI__?: TauriGlobal }).__TAURI__ ?? null);
}

export function isTauriRuntime() {
  return Boolean(tauriGlobal()?.core?.invoke);
}

export async function startSpotifyOAuthLoopback() {
  const invoke = tauriGlobal()?.core?.invoke;
  if (!invoke) throw new Error('The native Spotify callback bridge is unavailable in this build.');
  return invoke<string>('start_spotify_oauth_listener');
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
