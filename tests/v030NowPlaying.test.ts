import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const shell = read('src/components/AppShell.tsx');
const dock = read('src/components/FloatingDock.tsx');
const page = read('src/pages/NowPlayingPage.tsx');
const provider = read('src/lib/nowPlaying.ts');
const familiar = read('src/components/CompanionPet.tsx');
const avatar = read('src/components/familiar/FamiliarAvatar.tsx');
const sync = read('src/lib/sync.ts');
const backup = read('src/lib/backup.ts');
const reset = read('src/lib/reset.ts');
const settings = read('src/lib/settings.ts');

test('v0.30 registers Now Playing in the existing route and Living Dock contracts', () => {
  assert.match(app, /path:\s*['"]\/now-playing['"]/);
  assert.match(dock, /\['Now Playing', '\/now-playing', Music2\]/);
  assert.match(shell, /'\/now-playing': 'Now Playing'/);
  assert.match(shell, /<GlobalNowPlaying\s*\/>/);
});

test('spotify authorization uses PKCE and separates read access from playback control', () => {
  assert.match(provider, /code_challenge_method:\s*'S256'/);
  assert.match(provider, /code_verifier/);
  assert.match(provider, /state !== pkce\.state/);
  assert.match(provider, /spotifyTokenStorageOrder\(remember\)/);
  assert.match(page, /Allow playback controls/);
  assert.match(page, /read-only presence/i);
});

test('provider tokens stay outside Dexie sync and portable backup tables', () => {
  assert.match(provider, /sessionStorage|window\.sessionStorage/);
  assert.match(provider, /localStorage|window\.localStorage/);
  assert.doesNotMatch(sync, /spotify.*token|nowPlayingToken/i);
  assert.doesNotMatch(backup, /spotify.*token|nowPlayingToken/i);
  assert.match(reset, /clearNowPlayingCredentials\(\)/);
  assert.match(settings, /spotifyPlaybackControls:\s*false/);
});

test('Now Playing does not implement prohibited audio analysis or visual synchronization', () => {
  assert.doesNotMatch(provider, /audio-features|audio-analysis|analysernode|getbytefrequencydata|getfloatfrequencydata|beat.?sync|waveform/i);
  assert.doesNotMatch(read('src/now-playing-v030.css'), /beat.?sync|waveform/i);
  assert.match(page, /No audio capture/i);
  assert.match(page, /not synchronized to the song, tempo, waveform, or beats/i);
});

test('Familiar music presence is generic and driven only by active playback state', () => {
  assert.match(familiar, /next\.item\?\.isPlaying/);
  assert.match(familiar, /familiarMusicPresence/);
  assert.match(avatar, /'music'/);
  assert.match(read('src/companion-pet.css'), /familiar-music/);
});
