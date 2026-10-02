import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const mark = read('src/components/IkigaiMark.tsx');
const dock = read('src/components/FloatingDock.tsx');
const settings = read('src/pages/SettingsPage.tsx');
const onboarding = read('src/pages/OnboardingPage.tsx');
const app = read('src/App.tsx');
const themes = read('src/data/themes.ts');
const themeCss = read('src/theme-system.css');

test('v0.31.13 defines one reusable theme-independent Ikigai Seed mark', () => {
  assert.match(mark, /export function IkigaiMark/);
  assert.match(mark, /viewBox="0 0 24 24"/);
  assert.match(mark, /stroke="currentColor"/);
  assert.match(mark, /fill="currentColor"/);
});

test('product brand surfaces use the canonical mark instead of theme glyphs', () => {
  assert.match(dock, /<IkigaiMark/);
  assert.match(settings, /workspace-theme-demo-brand[\s\S]*<IkigaiMark/);
  assert.doesNotMatch(settings, /workspace-theme-demo-brand[^\n]*previewDefinition\.mark/);
  assert.match(onboarding, /onboarding-brand-mark[\s\S]*<IkigaiMark/);
  assert.match(onboarding, /arrival-symbol[\s\S]*<IkigaiMark/);
  assert.match(app, /ik-loading-mark[\s\S]*<IkigaiMark/);
});

test('workspace marks remain theme labels rather than product logos', () => {
  assert.match(themes, /mark: '森'/);
  assert.match(themes, /mark: '紙'/);
  assert.match(settings, /theme\.mark/);
  assert.match(themeCss, /--ik-brand-surface:/);
  assert.match(themeCss, /\.floating-brand-mark[\s\S]*var\(--ik-brand-surface\)/);
});

test('favicon and install icons share the canonical asset family', () => {
  const index = read('index.html');
  assert.match(index, /href="\/ikigai-mark\.svg"/);
  assert.ok(existsSync(new URL('../public/ikigai-mark.svg', import.meta.url)));
  assert.ok(existsSync(new URL('../public/icon-192.png', import.meta.url)));
  assert.ok(existsSync(new URL('../public/icon-512.png', import.meta.url)));
});
