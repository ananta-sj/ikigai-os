import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { journeyThemes } from '../src/data/journeyThemes.ts';

const read = (path: string) => fs.readFileSync(path, 'utf8');

test('Patch 21 keeps the active mobile dock label inside the capsule instead of a white tooltip tag', () => {
  const css = read('src/adaptive-ui-v032.css');
  const theme = read('src/theme-system.css');
  assert.match(css, /Patch 21 · mobile dock labels live inside the active capsule/);
  assert.match(css, /\.floating-nav-link\.active \.floating-nav-label \{[\s\S]*background:\s*transparent;[\s\S]*border-color:\s*transparent;[\s\S]*box-shadow:\s*none;/);
  assert.match(theme, /\.floating-nav-link:not\(\.active\) \.floating-nav-label/);
  assert.match(theme, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.floating-nav-link\.active \.floating-nav-label/);
});

test('Patch 21 preserves Journey construction identity on phone widths', () => {
  const page = read('src/pages/CalendarPage.tsx');
  const css = read('src/journey-calendar-v0285.css');
  assert.match(page, /journey0285-theme-signature/);
  assert.match(page, /activeTheme\.mark/);
  assert.match(page, /activeTheme\.name/);
  assert.match(css, /Patch 21 · Journey constructions survive phone widths/);
  assert.match(css, /@media \(max-width:760px\)/);

  for (const theme of journeyThemes) {
    assert.match(css, new RegExp(`journey-theme-${theme.id}`), `missing mobile construction hook for ${theme.id}`);
  }

  assert.match(css, /journey-theme-nihon-sakura[\s\S]*width:7px;[\s\S]*background:var\(--jc-accent\)/);
  assert.match(css, /journey-theme-fuji-seasonal[\s\S]*height:88px/);
  assert.match(css, /journey-theme-study-wall[\s\S]*flex-direction:column/);
  assert.match(css, /journey-theme-midnight-desk[\s\S]*gap:4px/);
  assert.match(css, /journey-theme-hanami-scroll[\s\S]*paired wood rails|Hanami Scroll · paired wood rails/);
  assert.match(css, /journey-theme-diwali-diya[\s\S]*illuminated night ledger|Diwali Diya · illuminated night ledger/);
});
