import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.11 keeps the Journey Settings preview footprint stable on desktop', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.11'), `expected 0.31.11 or newer, got ${packageJson.version}`);
  const css = read('src/design-system.css');
  assert.match(css, /v0\.31\.11 · keep Journey preview geometry/);
  assert.match(css, /@media \(min-width: 761px\)[\s\S]*\.journey-calendar-demo-stage \{[\s\S]*height:\s*520px;[\s\S]*min-height:\s*520px;[\s\S]*overflow:\s*hidden;[\s\S]*contain:\s*layout paint;/);
});

test('temporary Journey preview resets at picker boundaries, not between adjacent cards', () => {
  const page = read('src/pages/SettingsPage.tsx');
  assert.match(page, /className="journey-theme-picker"[\s\S]*onPointerLeave=\{\(\) =>/);
  assert.match(page, /onBlur=\{event =>[\s\S]*currentTarget\.contains\(event\.relatedTarget as Node \| null\)/);
  assert.match(page, /onPointerEnter=\{\(\) => setPreviewJourneyTheme\(theme\.id\)\}/);
  assert.match(page, /onFocus=\{\(\) => setPreviewJourneyTheme\(theme\.id\)\}/);
  assert.doesNotMatch(page, /onPointerLeave=\{\(\) => setPreviewJourneyTheme\(settings\?\.journeyCalendarTheme \?\? theme\.id\)\}/);
});
