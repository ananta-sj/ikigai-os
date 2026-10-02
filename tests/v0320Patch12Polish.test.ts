import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const pet = read('src/components/CompanionPet.tsx');
const avatar = read('src/components/familiar/FamiliarAvatar.tsx');
const petCss = read('src/companion-pet.css');
const designCss = read('src/design-system.css');
const documentsCss = read('src/companion-documents-v032.css');
const sanctuary = read('src/components/sanctuary/SanctuaryWorld.tsx');

test('Familiar uses a richer resident motion vocabulary instead of four repeated loops', () => {
  assert.match(avatar, /'stretch'/);
  assert.match(avatar, /'sleepy'/);
  assert.match(avatar, /'greet'/);
  assert.match(avatar, /'hop'/);
  assert.match(avatar, /'peek'/);
  assert.match(avatar, /className="familiar-avatar-motion"/);
  assert.match(avatar, /className="familiar-avatar-gesture"/);
  assert.match(pet, /window\.setTimeout/);
  assert.doesNotMatch(pet, /const timer = window\.setInterval\(\(\) => \{\s*if \(open \|\| interactionPose\) return;\s*setAmbientPose\(sequence/);
  assert.match(pet, /temporaryPose\('hop', 900\)/);
  assert.match(petCss, /@keyframes familiar-motion-stretch/);
  assert.match(petCss, /@keyframes familiar-motion-greet/);
  assert.match(petCss, /@keyframes familiar-motion-hop/);
  assert.match(petCss, /pose-celebrate \.familiar-avatar-gesture \{ animation: familiar-motion-celebrate [^;]+ 2 both;/);
  assert.match(petCss, /pose-stretch \.familiar-avatar-gesture \{ animation: familiar-motion-stretch [^;]+ 1 both;/);
  assert.match(petCss, /pose-greet \.familiar-avatar-gesture \{ animation: familiar-motion-greet [^;]+ 1 both;/);
  assert.match(petCss, /pose-hop \.familiar-avatar-gesture \{ animation: familiar-motion-hop [^;]+ 1 both;/);
});

test('Reduced Motion still disables the new Familiar motion layer', () => {
  assert.match(petCss, /\[data-ikigai-motion='reduced'\] \.familiar-avatar-motion/);
  assert.match(pet, /if \(reduced \|\| activity === 'still'\)/);
});

test('floating Familiar input surfaces are viewport-contained even after free placement', () => {
  assert.match(petCss, /max-inline-size: calc\(100vw - max\(16px, env\(safe-area-inset-left\)\) - max\(16px, env\(safe-area-inset-right\)\)\)/);
  assert.match(petCss, /\.familiar-compose \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 40px/);
  assert.match(petCss, /\.familiar-compose textarea \{[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%/);
  assert.match(documentsCss, /\.companion032-document-tray \{ min-width: 0; max-width: 100%; \}/);
  assert.match(designCss, /\.app-shell :where\(input, textarea, select\) \{\s*min-width: 0;\s*max-width: 100%;/);
});

test('Sanctuary resident has stop-specific idle behavior and damped scale transitions', () => {
  assert.match(sanctuary, /restingId === 'watch-koi'/);
  assert.match(sanctuary, /restingId === 'lantern-pause'/);
  assert.match(sanctuary, /restingId === 'tea-step'/);
  assert.match(sanctuary, /restingId === 'guardian-rest'/);
  assert.match(sanctuary, /group\.current\.rotation\.z = THREE\.MathUtils\.damp/);
  assert.match(sanctuary, /group\.current\.scale\.y = THREE\.MathUtils\.damp/);
});


test('adaptive shell reserves safe areas, keyboard-safe inputs and app-sized touch targets', () => {
  const adaptive = read('src/adaptive-ui-v032.css');
  const main = read('src/main.tsx');
  const html = read('index.html');
  assert.match(main, /import '\.\/adaptive-ui-v032\.css'/);
  assert.match(adaptive, /env\(safe-area-inset-left\)/);
  assert.match(adaptive, /@media \(pointer: coarse\)/);
  assert.match(adaptive, /min-width: 44px/);
  assert.match(adaptive, /max-height: 560px/);
  assert.match(adaptive, /orientation: landscape/);
  assert.match(adaptive, /flex-direction:row/);
  assert.match(adaptive, /@media \(max-width: 380px\)/);
  assert.match(adaptive, /font-size: max\(16px, 1em\)/);
  assert.match(adaptive, /scroll-margin-block: 96px/);
  assert.ok((adaptive.match(/!important\s*;/g) ?? []).length <= 1, 'adaptive layer should win through cascade/specificity, not override stacks');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /interactive-widget=resizes-content/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /apple-touch-icon/);
});

test('mobile navigation keeps the current room discoverable and centered', () => {
  const dock = read('src/components/FloatingDock.tsx');
  const adaptive = read('src/adaptive-ui-v032.css');
  assert.match(dock, /useLocation/);
  assert.match(dock, /dock\.scrollTo/);
  assert.match(dock, /prefers-reduced-motion: reduce/);
  assert.match(dock, /max-height: 560px/);
  assert.match(adaptive, /\.floating-nav-link\.active \{/);
  assert.match(adaptive, /\.floating-nav-link\.active \.floating-nav-label/);
});

test('installed mobile shell follows the active theme and uses maskable app icons', () => {
  const shell = read('src/components/AppShell.tsx');
  const vite = read('vite.config.ts');
  assert.match(shell, /theme-color/);
  assert.match(shell, /apple-mobile-web-app-status-bar-style/);
  assert.match(vite, /purpose:\s*'any maskable'/);
  assert.match(vite, /orientation:\s*'any'/);
  assert.match(vite, /scope:\s*'\/'/);
});

test('capture surfaces become safe-area-aware bottom sheets on phones', () => {
  const workspace = read('src/workspace-dialog-v032.css');
  const memory = read('src/memories-v080.css');
  const focus = read('src/focus-v029.css');
  const nowPlaying = read('src/now-playing-v030.css');
  assert.match(workspace, /env\(safe-area-inset-bottom\)/);
  assert.match(workspace, /border-radius:\s*24px 24px 14px 14px/);
  assert.match(workspace, /\.ik-workspace-dialog::before/);
  assert.match(memory, /place-items:end center/);
  assert.match(memory, /\.memory-capture-modal::before/);
  assert.match(focus, /env\(safe-area-inset-top\)/);
  assert.match(nowPlaying, /env\(safe-area-inset-right\)/);
});


test('Journey day sheet stays centered and viewport-contained on desktop', () => {
  const journey = read('src/journey-calendar-v0285.css');
  assert.match(journey, /\.journey0285-stage \.journey026-day-sheet \{[\s\S]*?z-index:72/);
  assert.match(journey, /top:50%/);
  assert.match(journey, /transform:translateY\(-50%\)/);
  assert.match(journey, /max-height:min\(calc\(100% - 48px\),calc\(100dvh - 128px\)\)/);
  assert.match(journey, /overscroll-behavior:contain/);
});

test('AppShell remains the only main landmark inside normal rooms', () => {
  const sources = [
    read('src/pages/TodayPage.tsx'),
    read('src/pages/RoadmapPage.tsx'),
    read('src/pages/CompanionPage.tsx'),
    read('src/pages/MemoriesPage.tsx'),
    read('src/pages/NowPlayingPage.tsx')
  ];
  for (const source of sources) assert.doesNotMatch(source, /<main\b/);
  assert.match(read('src/components/AppShell.tsx'), /<main[\s\S]*?id="ikigai-main"/);
});
