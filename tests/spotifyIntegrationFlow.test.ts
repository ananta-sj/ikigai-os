import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #items = new Map<string, string>();
  getItem(key: string) { return this.#items.get(key) ?? null; }
  setItem(key: string, value: string) { this.#items.set(key, String(value)); }
  removeItem(key: string) { this.#items.delete(key); }
  clear() { this.#items.clear(); }
  key(index: number) { return [...this.#items.keys()][index] ?? null; }
  get length() { return this.#items.size; }
}

test('Spotify PKCE callback and playback refresh work end-to-end against mocked provider responses', async () => {
  const sessionStorage = new MemoryStorage();
  const localStorage = new MemoryStorage();
  let assignedUrl = '';

  const fakeWindow = {
    sessionStorage,
    localStorage,
    location: {
      origin: 'http://127.0.0.1:5173',
      pathname: '/now-playing',
      search: '',
      assign(value: string) { assignedUrl = value; }
    },
    dispatchEvent() { return true; },
    addEventListener() {},
    removeEventListener() {}
  };

  Object.defineProperty(globalThis, 'window', { value: fakeWindow, configurable: true });

  const provider = await import('../src/lib/nowPlaying.ts');

  await provider.beginSpotifyAuthorization({
    clientId: 'abcDEF1234567890',
    allowControls: false,
    remember: false
  });

  const authorization = new URL(assignedUrl);
  assert.equal(authorization.origin + authorization.pathname, 'https://accounts.spotify.com/authorize');
  assert.equal(authorization.searchParams.get('response_type'), 'code');
  assert.equal(authorization.searchParams.get('redirect_uri'), 'http://127.0.0.1:5173/now-playing');
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(authorization.searchParams.get('code_challenge'));
  const state = authorization.searchParams.get('state');
  assert.ok(state);

  let tokenBody = '';
  let playbackRequested = false;
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://accounts.spotify.com/api/token') {
        tokenBody = String(init?.body ?? '');
        return new Response(JSON.stringify({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          scope: 'user-read-currently-playing user-read-playback-state'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === 'https://api.spotify.com/v1/me/player') {
        playbackRequested = true;
        assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer access-token');
        return new Response(JSON.stringify({
          is_playing: true,
          progress_ms: 42000,
          device: { name: 'Desk speaker' },
          item: {
            type: 'track',
            name: 'Mock Track',
            duration_ms: 180000,
            artists: [{ name: 'Mock Artist' }],
            external_urls: { spotify: 'https://open.spotify.com/track/mock' }
          }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }
  });

  try {
    const result = await provider.finishSpotifyAuthorization(`?code=authorization-code&state=${encodeURIComponent(state!)}`);
    assert.equal(result.handled, true);
    assert.equal(result.remembered, false);
    assert.match(tokenBody, /grant_type=authorization_code/);
    assert.match(tokenBody, /code_verifier=/);
    assert.match(tokenBody, /redirect_uri=http%3A%2F%2F127\.0\.0\.1%3A5173%2Fnow-playing/);
    assert.ok(sessionStorage.getItem('ikigai-now-playing.spotify.session-token-v1'));
    assert.equal(localStorage.getItem('ikigai-now-playing.spotify.local-token-v1'), null);

    const runtime = await provider.refreshNowPlaying();
    assert.equal(playbackRequested, true);
    assert.equal(runtime.connected, true);
    assert.equal(runtime.item?.title, 'Mock Track');
    assert.equal(runtime.item?.context, 'Mock Artist');
    assert.equal(runtime.item?.isPlaying, true);
    assert.equal(runtime.item?.canControl, false);
  } finally {
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: originalFetch });
    delete (globalThis as { window?: unknown }).window;
  }
});

