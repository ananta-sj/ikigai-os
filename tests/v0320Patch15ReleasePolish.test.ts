import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const pet = read('src/components/CompanionPet.tsx');
const shell = read('src/components/AppShell.tsx');
const adaptive = read('src/adaptive-ui-v032.css');
const vite = read('vite.config.ts');
const cleanup = read('scripts/cleanup-retired.mjs');

const retiredCss = [
  'src/garden-v2.css',
  'src/home-v033.css',
  'src/journey-room-v0262.css',
  'src/journey-room-v0263.css',
  'src/journey-v070.css',
  'src/journey-v071.css',
  'src/sanctuary-v021.css'
];

test('retired source tombstones and proven-dead historical CSS are physically absent from the release tree', () => {
  assert.equal(fs.existsSync('src/data/featureManifest.ts'), false);
  for (const path of retiredCss) assert.equal(fs.existsSync(path), false, `${path} should be retired`);
  assert.match(cleanup, /createHash\('sha256'\)/);
  assert.match(cleanup, /featureManifest\.ts/);
  assert.match(cleanup, /PaperLabPage\.tsx/);
  assert.match(cleanup, /sanctuary-v021\.css/);
  assert.doesNotMatch(cleanup, /rmSync\([^\n]*(?:src\/App|src\/main|src\/pages\/TodayPage)/i);
});

test('Familiar autonomous motion is varied but bounded instead of a deterministic pose loop', () => {
  assert.match(pet, /type AmbientChoice = \{ pose: FamiliarPose; weight: number; hold: number \}/);
  assert.match(pet, /pool\.filter\(choice => choice\.pose !== lastPose\)/);
  assert.match(pet, /Math\.random\(\) \* total/);
  assert.match(pet, /document\.visibilityState === 'hidden'/);
  assert.match(pet, /const jitter = \.84 \+ Math\.random\(\) \* \.34/);
  assert.doesNotMatch(pet, /sequence\[index % sequence\.length\]/);
});

test('Familiar drawer participates in the shared dialog focus contract', () => {
  assert.match(pet, /useDialogFocus<HTMLElement>\(open, \(\) => setOpen\(false\)/);
  assert.match(pet, /ref=\{drawerRef\}[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(pet, /aria-labelledby="familiar-drawer-title"/);
  assert.match(pet, /id="familiar-drawer-title"/);
});

test('heavy Familiar runtime is split away from the initial shell chunk', () => {
  assert.match(shell, /const CompanionPet = lazy\(async \(\) =>/);
  assert.match(shell, /await import\('\.\/CompanionPet'\)/);
  assert.match(shell, /<Suspense fallback=\{null\}><CompanionPet \/><\/Suspense>/);
});

test('adaptive release layer clamps dialogs and installed-app overscroll without hiding room content', () => {
  assert.match(adaptive, /body :where\(\[role='dialog'\]\)/);
  assert.match(adaptive, /max-inline-size: calc\(100vw - max\(16px, env\(safe-area-inset-left\)\) - max\(16px, env\(safe-area-inset-right\)\)\)/);
  assert.match(adaptive, /scrollbar-gutter: stable/);
  assert.match(adaptive, /@media \(display-mode: standalone\)/);
  assert.match(adaptive, /overscroll-behavior-y: none/);
});

test('PWA release config keeps SPA navigation and Sanctuary assets usable offline and exposes installed shortcuts', () => {
  assert.match(vite, /navigateFallback:\s*'index\.html'/);
  assert.match(vite, /globPatterns:\s*\['\*\*\/\*\.\{js,css,html,ico,png,svg,webmanifest,glb\}'\]/);
  assert.match(vite, /categories:\s*\['productivity', 'lifestyle'\]/);
  assert.match(vite, /shortcuts:\s*\[/);
  for (const url of ['/', '/focus', '/garden', '/memories']) assert.match(vite, new RegExp(`url: '${url.replaceAll('/', '\\/')}'`));
});
