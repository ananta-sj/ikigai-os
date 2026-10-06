import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpotifyClientId,
  parseSpotifyPlayback,
  parseSystemMediaSnapshot,
  projectPlaybackPositionMs,
  spotifyScopeString,
  spotifyScopesAllowControls,
  spotifyTokenStorageOrder,
  spotifyRedirectUriIssue
} from '../src/lib/nowPlayingCore.ts';

test('spotify client ids are normalized without accepting URL-shaped or secret-like values', () => {
  assert.equal(normalizeSpotifyClientId('  abcDEF1234567890  '), 'abcDEF1234567890');
  assert.equal(normalizeSpotifyClientId('https://example.com/client'), '');
  assert.equal(normalizeSpotifyClientId('short'), '');
});

test('read-only is the default spotify scope and controls are separately opt-in', () => {
  const readOnly = spotifyScopeString(false);
  assert.match(readOnly, /user-read-currently-playing/);
  assert.match(readOnly, /user-read-playback-state/);
  assert.doesNotMatch(readOnly, /user-modify-playback-state/);
  const withControls = spotifyScopeString(true);
  assert.equal(spotifyScopesAllowControls(withControls), true);
});

test('spotify playback payloads become a compact provider-neutral item', () => {
  const item = parseSpotifyPlayback({
    is_playing: true,
    progress_ms: 12_300,
    device: { name: 'Desk speaker' },
    item: {
      type: 'track',
      name: 'Quiet Work',
      duration_ms: 180_000,
      artists: [{ name: 'Artist One' }, { name: 'Artist Two' }],
      external_urls: { spotify: 'https://open.spotify.com/track/example' }
    }
  }, false, '2026-09-26T12:00:00.000Z');
  assert.deepEqual(item, {
    provider: 'spotify',
    itemType: 'track',
    title: 'Quiet Work',
    context: 'Artist One, Artist Two',
    isPlaying: true,
    durationMs: 180000,
    progressMs: 12300,
    externalUrl: 'https://open.spotify.com/track/example',
    deviceName: 'Desk speaker',
    canControl: false,
    fetchedAt: '2026-09-26T12:00:00.000Z'
  });
});

test('playback parser rejects missing items and unsafe external urls', () => {
  assert.equal(parseSpotifyPlayback({ is_playing: false, item: null }, false), null);
  const item = parseSpotifyPlayback({ item: { type: 'episode', name: 'Episode', show: { name: 'Show' }, external_urls: { spotify: 'javascript:alert(1)' } } }, true);
  assert.equal(item?.externalUrl, undefined);
  assert.equal(item?.itemType, 'episode');
  assert.equal(item?.context, 'Show');
});


test('non-remembered spotify credentials never fall back to persistent storage', () => {
  assert.deepEqual(spotifyTokenStorageOrder(false), ['session']);
  assert.deepEqual(spotifyTokenStorageOrder(true), ['local', 'session']);
});


test('spotify redirect uri guard follows the current loopback and https contract', () => {
  assert.match(spotifyRedirectUriIssue('http://localhost:5173/now-playing'), /no longer accepts localhost/i);
  assert.equal(spotifyRedirectUriIssue('http://127.0.0.1:5173/now-playing'), '');
  assert.equal(spotifyRedirectUriIssue('https://example.com/now-playing'), '');
  assert.match(spotifyRedirectUriIssue('http://example.com/now-playing'), /must use HTTPS/i);
});

test('windows system media parsing is bounded and playback controls stay opt-in', () => {
  const readOnly = parseSystemMediaSnapshot({
    supported: true,
    available: true,
    sourceId: 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify',
    sourceLabel: 'Spotify',
    title: 'Current track',
    artist: 'Current artist',
    albumTitle: 'Current album',
    isPlaying: true,
    durationMs: 180_000,
    progressMs: 999_999,
    canPlay: true,
    canPause: true,
    canNext: true,
    canPrevious: true
  }, false, '2026-10-06T00:00:00.000Z');

  assert.equal(readOnly?.provider, 'system');
  assert.equal(readOnly?.itemType, 'media');
  assert.equal(readOnly?.progressMs, 180_000);
  assert.equal(readOnly?.canControl, false);
  assert.equal(readOnly?.controlCapabilities, undefined);

  const controlled = parseSystemMediaSnapshot({
    available: true,
    sourceId: 'player.example!app',
    sourceLabel: 'Player',
    title: 'Current track',
    isPlaying: false,
    canPlay: true,
    canPause: false,
    canNext: false,
    canPrevious: true
  }, true);
  assert.equal(controlled?.canControl, true);
  assert.deepEqual(controlled?.controlCapabilities, { play: true, pause: false, next: false, previous: true });
});

test('windows system media rejects unsafe source identity for controls', () => {
  const item = parseSystemMediaSnapshot({
    available: true,
    sourceId: 'player\u0000spoof',
    title: 'Track',
    canPlay: true
  }, true);
  assert.equal(item?.sourceId, undefined);
  assert.equal(item?.canControl, false);
});


test('playback position projects locally while playing and freezes while paused', () => {
  const playing = {
    durationMs: 180_000,
    fetchedAt: '2026-10-06T12:00:00.000Z',
    isPlaying: true,
    progressMs: 15_000
  };
  assert.equal(projectPlaybackPositionMs(playing, Date.parse('2026-10-06T12:00:05.000Z')), 20_000);
  assert.equal(projectPlaybackPositionMs(playing, Date.parse('2026-10-06T12:10:00.000Z')), 180_000);

  const paused = { ...playing, isPlaying: false };
  assert.equal(projectPlaybackPositionMs(paused, Date.parse('2026-10-06T12:00:05.000Z')), 15_000);
});

test('playback position projection tolerates invalid timestamps and missing snapshots', () => {
  assert.equal(projectPlaybackPositionMs(null, Date.now()), undefined);
  assert.equal(projectPlaybackPositionMs({
    durationMs: 60_000,
    fetchedAt: 'not-a-date',
    isPlaying: true,
    progressMs: 12_000
  }, Date.now()), 12_000);
});

