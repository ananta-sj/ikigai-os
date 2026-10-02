import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const shell = read('src/components/AppShell.tsx');
const pet = read('src/components/CompanionPet.tsx');
const petCss = read('src/companion-pet.css');
const dialogFocus = read('src/components/ui/dialogFocus.ts');
const adaptive = read('src/adaptive-ui-v032.css');
const today = read('src/pages/TodayPage.tsx');
const sanctuary = read('src/pages/GardenPage.tsx');
const cleanup = read('scripts/cleanup-retired.mjs');

const retiredSources = [
  'src/components/DailyPage.tsx',
  'src/components/LogProgressModal.tsx',
  'src/components/garden/GardenWorld.tsx',
  'src/components/journey/JourneyRoom3D.tsx',
  'src/components/journey/JourneyStudyScene.tsx',
  'src/pages/PlaceholderPage.tsx',
  'src/lib/garden.ts',
  'src/lib/growth.ts',
  'src/data/roadmap.ts'
];

test('room navigation opens the next room at its own beginning', () => {
  assert.match(shell, /document\.scrollingElement\?\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
  assert.match(shell, /mainRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});

test('free Familiar placement remains inside dynamic safe-area viewport bounds', () => {
  assert.match(pet, /100dvh/);
  assert.match(pet, /safe-area-inset-top/);
  assert.match(pet, /safe-area-inset-bottom/);
  assert.match(pet, /var\(--familiar-shell-size\)/);
  assert.match(petCss, /--familiar-shell-size: 86px/);
  assert.match(petCss, /--familiar-shell-size: 72px/);
});

test('modal focus contract also prevents background scroll without turning the Familiar drawer into a modal page', () => {
  assert.match(dialogFocus, /acquireBodyScrollLock/);
  assert.match(dialogFocus, /body\.style\.overflow = 'hidden'/);
  assert.match(dialogFocus, /bodyScrollLocks \+= 1/);
  assert.match(pet, /lockScroll: false/);
});

test('phone typing temporarily yields screen space to the active field', () => {
  assert.match(adaptive, /body:has\(input:focus, textarea:focus, select:focus\) \.floating-dock/);
  assert.match(adaptive, /body:has\(input:focus, textarea:focus, select:focus\) \.ik-familiar-shell:not\(\.is-open\)/);
  assert.match(adaptive, /\[data-ikigai-motion='reduced'\] \.floating-dock/);
});

test('time-sensitive rooms resynchronize immediately after device sleep or tab return', () => {
  for (const source of [today, sanctuary]) {
    assert.match(source, /visibilitychange/);
    assert.match(source, /window\.addEventListener\('focus'/);
    assert.match(source, /document\.visibilityState === 'visible'/);
  }
});

test('obsolete pre-v0.32 prototype and gamification source paths are absent', () => {
  for (const path of retiredSources) assert.equal(fs.existsSync(path), false, `${path} should be retired`);
  assert.match(cleanup, /createHash\('sha256'\)/);
  assert.match(cleanup, /DailyPage\.tsx/);
  assert.match(cleanup, /GardenWorld\.tsx/);
  assert.match(cleanup, /growth\.ts/);
  assert.doesNotMatch(cleanup, /rmSync\([^\n]*(?:src\/App|src\/main|src\/pages\/TodayPage|src\/pages\/GardenPage)/i);
});
