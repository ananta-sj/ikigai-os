import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/NowPlayingPage.tsx');
const css = read('src/now-playing-v030.css');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.9 makes Now Playing glance-first instead of provider-form-first', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.9'), `expected 0.31.9 or newer, got ${packageJson.version}`);
  assert.match(page, /Just what&apos;s playing\./);
  assert.match(page, /Connect a source/);
  assert.match(page, /setupOpen \? \(/);
  assert.match(page, /className="now0319-widget"/);
  assert.match(css, /Provider setup stays secondary/);
});

test('source setup states the web system-media limitation without pretending to capture audio', () => {
  assert.match(page, /cannot read the Windows system media session or other apps directly/i);
  assert.match(page, /without microphone or audio capture/i);
  assert.match(page, /No audio capture/);
  assert.doesNotMatch(page, /getUserMedia|getDisplayMedia|AudioContext|MediaRecorder/);
});

test('connected playback gets a compact media-widget surface with progress and authorized controls', () => {
  assert.match(page, /role="progressbar"/);
  assert.match(page, /Previous item/);
  assert.match(page, /Pause playback/);
  assert.match(page, /Open current item in Spotify/);
  assert.match(page, /grantedControls \?/);
});

test('provider configuration remains keyboard-modal and scroll-bounded', () => {
  assert.match(page, /useDialogFocus<HTMLDivElement>\(setupOpen/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /aria-modal="true"/);
  assert.match(css, /\.now0319-source-dialog[^}]*max-height:/);
  assert.match(css, /\.room-fit-shell \.now030-setup \{ overflow:auto; \}/);
});
