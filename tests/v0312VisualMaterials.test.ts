import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { appThemes } from '../src/data/themes.ts';
import { gardenThemes } from '../src/data/gardenThemes.ts';
import { journeyThemes } from '../src/data/journeyThemes.ts';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.2 keeps Washi and gives the other workspace themes distinct material identities', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.2'), `expected 0.31.2 or newer, got ${packageJson.version}`);
  assert.deepEqual(appThemes.filter(theme => theme.collection !== 'edition').map(theme => theme.name), ['Cedar Study', 'Washi Sanctuary', 'Indigo Draft', 'Sumi Workshop', 'Moonlit Ledger']);
  const css = read('src/theme-system.css');
  for (const token of ['--ik-scroll-track', '--ik-scroll-thumb', '--ik-scroll-thumb-hover', '--ik-scroll-radius']) assert.match(css, new RegExp(token));
  assert.match(css, /data-ikigai-theme='washi-sanctuary'[\s\S]*::-webkit-scrollbar-thumb/);
  assert.match(css, /data-ikigai-theme='kyoto-blueprint'[\s\S]*::-webkit-scrollbar-track/);
  assert.match(css, /data-ikigai-theme='neon-kernel'[\s\S]*::-webkit-scrollbar-thumb/);
});

test('Familiar materials are real surface choices and the left nook no longer uses the removed sidebar width', () => {
  const page = read('src/pages/CompanionPage.tsx');
  const avatarCss = read('src/companion-pet.css');
  const editorCss = read('src/companion-v120.css');
  for (const material of ['Ceramic', 'Terracotta', 'Moss', 'Moonstone', 'Ink clay']) assert.match(page, new RegExp(material));
  assert.match(page, /Opaque pearlescent shell/);
  for (const material of ['natural', 'terracotta', 'moss', 'dream', 'minimal']) assert.match(editorCss, new RegExp(`companion-material-sample\\.material-${material}`));
  assert.match(avatarCss, /theme-natural[\s\S]*Opaque|theme-natural[\s\S]*Ceramic/i);
  assert.match(avatarCss, /theme-dream[\s\S]*backdrop-filter:\s*none/);
  assert.match(avatarCss, /theme-terracotta[\s\S]*#c98262/);
  assert.match(avatarCss, /theme-moss[\s\S]*#60785a/);
  assert.match(avatarCss, /familiar-avatar-tail[\s\S]*opacity:\s*1/);
  const leftRule = avatarCss.match(/\.ik-familiar-shell\.side-left\s*\{[^}]+\}/)?.[0] ?? '';
  assert.doesNotMatch(leftRule, /ik-sidebar-width/);
  assert.match(leftRule, /left:\s*max\(102px/);
});

test('Journey ships eight physical calendar materials including letterpress, kraft and newsprint', () => {
  assert.equal(journeyThemes.filter(theme => theme.collection !== 'edition').length, 8);
  for (const id of ['letterpress-ledger', 'kraft-clip', 'newsprint-month']) assert.ok(journeyThemes.some(theme => theme.id === id));
  const css = read('src/journey-calendar-v0285.css');
  assert.match(css, /journey-theme-letterpress-ledger/);
  assert.match(css, /journey-theme-kraft-clip/);
  assert.match(css, /journey-theme-newsprint-month/);
  assert.match(css, /journey-theme-fuji-seasonal[\s\S]*clip-path/);
});

test('Sanctuary atmospheres are grounded gardens and World settings live outside the canvas', () => {
  assert.deepEqual(gardenThemes.map(theme => theme.label), ['Cedar Rain', 'Moon Courtyard', 'Sakura Mist', 'Autumn Tea Garden']);
  const page = read('src/pages/GardenPage.tsx');
  const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
  const barIndex = page.indexOf('className="sanctuary-world-bar"');
  const stageIndex = page.indexOf('sanctuary-stage sanctuary-depth-stage');
  assert.ok(barIndex >= 0 && stageIndex > barIndex, 'world settings bar should be outside and before the 3D stage');
  assert.match(page, />World settings</);
  assert.match(page, /Garden atmosphere/);
  const controlsCss = read('src/sanctuary-v023.css');
  assert.match(controlsCss, /sanctuary-world-controls[\s\S]*background:color-mix\(in srgb,var\(--ik-surface-strong\)/);
  assert.match(controlsCss, /sanctuary-theme-swatches \{[^}]*grid-template-columns:repeat\(3,1fr\)/);
  assert.doesNotMatch(world, /const clusters|const clouds|const columns/);
  assert.match(world, /const lanterns/);
  assert.match(world, /const blossomTrees/);
  assert.match(world, /const teaGarden/);
});

test('desktop shell and Focus room reserve a brand-safe content zone', () => {
  const nav = read('src/navigation-v028.css');
  const focus = read('src/focus-v029.css');
  assert.match(nav, /padding-left:\s*clamp\(180px,\s*13vw,\s*214px\)/);
  assert.match(focus, /padding:[^;]+clamp\(184px,\s*14vw,\s*224px\)/);
  assert.match(focus, /@media \(max-width: 980px\)[\s\S]*padding-left:\s*176px/);
});
