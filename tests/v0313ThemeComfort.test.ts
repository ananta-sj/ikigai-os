import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { appThemes, isLightAppTheme } from '../src/data/themes.ts';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.3 adds an in-place keyboard-accessible workspace theme preview', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.3'), `expected 0.31.3 or newer, got ${packageJson.version}`);
  const page = read('src/pages/SettingsPage.tsx');
  const css = read('src/theme-system.css');
  assert.match(page, /workspace-theme-demo/);
  assert.match(page, /data-preview-theme=\{previewTheme\}/);
  assert.match(page, /onPointerEnter=\{\(\) => setPreviewTheme\(theme\.id\)\}/);
  assert.match(page, /onFocus=\{\(\) => setPreviewTheme\(theme\.id\)\}/);
  assert.match(page, /Hover or focus a theme below to preview it here/);
  for (const id of ['midnight-grove', 'washi-sanctuary', 'kyoto-blueprint', 'neon-kernel', 'moonlit-garden']) {
    assert.match(css, new RegExp(`workspace-theme-demo\\[data-preview-theme='${id}'\\]`));
  }
});

test('workspace material family is no longer four near-black themes around Washi', () => {
  const coreThemes = appThemes.filter(theme => theme.collection !== 'edition');
  assert.deepEqual(coreThemes.map(theme => theme.name), ['Cedar Study', 'Washi Sanctuary', 'Indigo Draft', 'Sumi Workshop', 'Moonlit Ledger']);
  assert.equal(coreThemes.filter(theme => theme.scheme === 'light').length, 4);
  assert.equal(coreThemes.filter(theme => theme.scheme === 'dark').length, 1);
  for (const id of ['midnight-grove', 'washi-sanctuary', 'kyoto-blueprint', 'neon-kernel'] as const) assert.equal(isLightAppTheme(id), true);
  assert.equal(isLightAppTheme('moonlit-garden'), false);
  const shell = read('src/components/AppShell.tsx');
  const onboarding = read('src/pages/OnboardingPage.tsx');
  assert.match(shell, /isLightAppTheme\(settings\.appTheme\)/);
  assert.match(onboarding, /isLightAppTheme\(appTheme\)/);
});

test('Sanctuary dusk and night remain readable instead of collapsing into near-black', () => {
  const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
  const themes = read('src/data/gardenThemes.ts');
  assert.match(world, /function AtmosphericLightRig/);
  assert.match(world, /isNight \? \.68 : isDusk \? \.82 : \.9/);
  assert.match(world, /keyIntensity = isNight \? \.82 : isDusk \? 1\.52/);
  assert.match(world, /isNight \? 17 : isDusk \? 18 : 19/);
  assert.match(world, /isNight \? 38 : isDusk \? 42 : 45/);
  assert.match(themes, /Cedar Rain[\s\S]*dusk:[\s\S]*sky:'#737a70'/);
  assert.match(themes, /Cedar Rain[\s\S]*night:[\s\S]*sky:'#34423d'/);
});
