import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.8 marks Today, Journey, Focus and Now Playing as viewport-fit rooms', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.8'), `expected 0.31.8 or newer, got ${packageJson.version}`);
  const shell = read('src/components/AppShell.tsx');
  assert.match(shell, /roomFitRoutes = new Set\(\['\/', '\/calendar', '\/focus', '\/now-playing'\]\)/);
  assert.match(shell, /room-fit-shell/);
});

test('desktop room-fit is gated away from large accessibility scales', () => {
  const nav = read('src/navigation-v028.css');
  assert.match(nav, /min-width:\s*1100px/);
  assert.match(nav, /min-height:\s*700px/);
  assert.match(nav, /data-ikigai-ui-scale='large'/);
  assert.match(nav, /data-ikigai-ui-scale='oversized'/);
  assert.match(nav, /data-ikigai-text-scale='large'/);
  assert.match(nav, /data-ikigai-text-scale='xlarge'/);
  assert.match(nav, /room-fit-shell \.main-stage[\s\S]*overflow:\s*hidden/);
});

test('all four room styles compact the primary viewport and bound real detail overflow', () => {
  const today = read('src/daily-desk-v026.css');
  const journey = read('src/journey-calendar-v0285.css');
  const focus = read('src/focus-v029.css');
  const nowPlaying = read('src/now-playing-v030.css');

  assert.match(today, /room-fit-shell \.daily026-page[\s\S]*height:100dvh/);
  assert.match(today, /room-fit-shell \.daily026-page-sheet[\s\S]*overflow:auto/);

  assert.match(journey, /room-fit-shell \.journey0285-page[\s\S]*height:100dvh/);
  assert.match(journey, /grid-template-rows:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(journey, /journey026-day-sheet[\s\S]*overflow:auto/);

  assert.match(focus, /room-fit-shell \.focus029-page[\s\S]*height:100dvh/);
  assert.match(focus, /room-fit-shell \.focus029-note[\s\S]*overflow:auto/);

  assert.match(nowPlaying, /room-fit-shell \.now030-page[\s\S]*height:100dvh/);
  assert.match(nowPlaying, /room-fit-shell \.now030-setup[\s\S]*overflow:auto/);
});

test('compact-room behavior is enforced directly by shell and room styles', () => {
  const shell = read('src/components/AppShell.tsx');
  assert.match(shell, /roomFitRoutes = new Set\(\['\/', '\/calendar', '\/focus', '\/now-playing'\]\)/);
  for (const path of ['src/daily-desk-v026.css', 'src/journey-calendar-v0285.css', 'src/focus-v029.css', 'src/now-playing-v030.css']) {
    assert.match(read(path), /room-fit-shell/);
  }
});
