import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Morning Handoff uses the shared keyboard-safe dialog focus contract', () => {
  const today = read('src/pages/TodayPage.tsx');
  const css = read('src/daily-desk-v026.css');

  assert.match(today, /useDialogFocus<HTMLElement>\(handoffOpen/);
  assert.match(today, /ref=\{handoffDialogRef\} tabIndex=\{-1\}/);
  assert.match(today, /aria-labelledby="daily026-handoff-title"/);
  assert.match(today, /id="daily026-handoff-title"/);
  assert.match(css, /daily026-handoff-close:focus-visible/);
});

test('Sanctuary first arrival blocks world interaction and traps focus as a real modal', () => {
  const garden = read('src/pages/GardenPage.tsx');
  const css = read('src/sanctuary-v023.css');

  assert.match(garden, /useDialogFocus<HTMLElement>\(introOpen, dismissIntro\)/);
  assert.match(garden, /className="sanctuary-arrival-backdrop"/);
  assert.match(garden, /ref=\{arrivalDialogRef\} tabIndex=\{-1\}/);
  assert.match(garden, /aria-modal="true" aria-labelledby="sanctuary-arrival-title"/);
  assert.match(css, /\.sanctuary-arrival-backdrop\s*\{[\s\S]*?inset:0;[\s\S]*?place-items:center;/);
  assert.match(css, /\.sanctuary-arrival button:focus-visible/);
});

test('retired Nerd stubs are absent from the current source tree and the overlay cleanup is narrowly scoped', () => {
  assert.equal(existsSync(new URL('../src/pages/NerdsPage.tsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/nerds-v0311.css', import.meta.url)), false);

  const cleanup = read('scripts/cleanup-retired.mjs');
  assert.match(cleanup, /src\/pages\/NerdsPage\.tsx/);
  assert.match(cleanup, /src\/nerds-v0311\.css/);
  assert.match(cleanup, /createHash\('sha256'\)/);
  assert.match(cleanup, /aff6e513fd39402eac279d58394329a94e0aefb7b75f344481a7708f7bd7938a/);
  assert.match(cleanup, /26fda73f8b14a71dd2272ae1fec141f3ea71e2b298359cdd8ff78a334c03b8ea/);
  assert.doesNotMatch(cleanup, /rmSync\([^\n]*(?:src\/App|src\/main|src\/pages\/TodayPage)/);
});

test('Sanctuary resident is no longer mislabeled as a prototype internally', () => {
  const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
  assert.match(world, /function SanctuaryFamiliar\(/);
  assert.match(world, /familiarEnabled \? <SanctuaryFamiliar/);
  assert.doesNotMatch(world, /PrototypeFamiliar/);
});
