import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the physical calendar has one shared source of truth for Settings previews and Today', () => {
  const print = read('src/lib/dailyCalendarPrint.ts');
  const preview = read('src/components/settings/DailyCalendarPreview.tsx');
  const rig = read('src/components/paper/PaperRig.tsx');

  assert.match(print, /export function paintDailyCalendarSheet/);
  assert.match(preview, /paintDailyCalendarSheet\(context/);
  assert.match(rig, /paintDailyCalendarSheet\(context/);
  assert.match(preview, /context\.setTransform\(\.5, 0, 0, \.5, 0, 0\)/);
});

test('small-screen print is deliberately bolder instead of relying on invisible microtype', () => {
  const print = read('src/lib/dailyCalendarPrint.ts');

  assert.match(print, /meta:\s*26/);
  assert.match(print, /rule:\s*4/);
  assert.match(print, /font = `800 \$\{profile\.size === 'compact' \? 25 : 23\}px/);
  assert.match(print, /showMini:\s*false/);
});

test('size choices are object previews with large visual separation', () => {
  const css = read('src/design-system.css');
  const todayCss = read('src/daily-desk-v026.css');

  assert.match(css, /paper-size-choice\.size-compact \.paper-edition-preview \{ width:45px; \}/);
  assert.match(css, /paper-size-choice\.size-standard \.paper-edition-preview \{ width:66px; \}/);
  assert.match(css, /paper-size-choice\.size-large \.paper-edition-preview \{ width:91px; \}/);
  assert.match(todayCss, /--daily-paper-width:\s*132px/);
  assert.match(todayCss, /--daily-paper-width:\s*216px/);
  assert.match(todayCss, /--daily-paper-width:\s*318px/);
});

test('physical rig exposes layered page edges and a multi-part clamp', () => {
  const rig = read('src/components/paper/PaperRig.tsx');

  assert.match(rig, /HEIGHT \/ 2 - 0\.075/);
  assert.match(rig, /WIDTH \/ 2 \+ 0\.022/);
  assert.match(rig, /TOP_Y \+ 0\.03, 0\.278/);
  assert.match(rig, /TOP_Y - 0\.038, 0\.3/);
});

test('desk paper uses restrained lighting so print contrast is not washed out', () => {
  const interactive = read('src/components/InteractiveDailyPaper.tsx');

  assert.match(interactive, /presentation === 'desk' \? 0\.92 : 2\.05/);
  assert.match(interactive, /presentation === 'desk' \? 1\.32 : 2\.35/);
  assert.match(interactive, /presentation === 'desk' \? 0\.34 : 0\.72/);
});
