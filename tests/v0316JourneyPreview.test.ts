import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.6 adds a full Journey calendar preview to Settings', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.6'), `expected 0.31.6 or newer, got ${packageJson.version}`);
  const page = read('src/pages/SettingsPage.tsx');
  const css = read('src/design-system.css');

  assert.match(page, /previewJourneyTheme/);
  assert.match(page, /journey-calendar-demo/);
  assert.match(page, /data-preview-journey-theme=\{previewJourneyTheme\}/);
  assert.match(page, /Hover or focus a skin below to preview a full month here/);
  assert.match(css, /\.journey-calendar-demo-stage/);
  assert.match(css, /\.journey-calendar-demo-grid/);
  for (const visual of ['nihon', 'landscape', 'study', 'washi', 'night', 'letterpress', 'kraft', 'newsprint']) {
    assert.match(css, new RegExp(`journey-calendar-demo-${visual}`));
  }
});

test('Journey preview is temporary on hover/focus and click remains the saved action', () => {
  const page = read('src/pages/SettingsPage.tsx');
  assert.match(page, /onPointerEnter=\{\(\) => setPreviewJourneyTheme\(theme\.id\)\}/);
  assert.match(page, /journey-theme-picker[\s\S]*onPointerLeave=\{\(\) =>/);
  assert.match(page, /onFocus=\{\(\) => setPreviewJourneyTheme\(theme\.id\)\}/);
  assert.match(page, /journey-theme-picker[\s\S]*onBlur=\{event =>/);
  assert.match(page, /onClick=\{\(\) => \{ setPreviewJourneyTheme\(theme\.id\); void patch\(\{ journeyCalendarTheme: theme\.id \}\); \}\}/);
});
