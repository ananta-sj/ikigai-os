import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Today calendar themes are authored desk editions instead of one colour-swapped layout', () => {
  const print = read('src/lib/dailyCalendarPrint.ts');

  for (const fn of [
    'drawTraditionalHimekuri',
    'drawEditorialDesk',
    'drawWinterDesk',
    'drawFestiveDesk',
    'drawSakuraDesk',
    'drawMinimalDesk'
  ]) assert.match(print, new RegExp(`function ${fn}`));

  assert.match(print, /switch \(theme\.layout\)/);
  assert.match(print, /case 'editorial':[\s\S]*?drawEditorialDesk/);
  assert.match(print, /case 'winter':[\s\S]*?drawWinterDesk/);
  assert.match(print, /case 'festive':[\s\S]*?drawFestiveDesk/);
  assert.match(print, /case 'sakura':[\s\S]*?drawSakuraDesk/);
  assert.match(print, /case 'minimal':[\s\S]*?drawMinimalDesk/);
  assert.match(print, /drawTraditionalHimekuri\(context, date, theme, profile/);
});

test('calendar edition picker renders the exact same printed face as Today', () => {
  const settings = read('src/pages/SettingsPage.tsx');
  const preview = read('src/components/settings/DailyCalendarPreview.tsx');
  const rig = read('src/components/paper/PaperRig.tsx');

  assert.match(settings, /<strong>Calendar edition<\/strong>/);
  assert.match(settings, /className="paper-edition-picker"/);
  assert.match(settings, /role="radiogroup" aria-label="Physical day page edition"/);
  assert.match(settings, /<DailyCalendarPreview theme=\{theme\.id\} size=\{settings\.dailyCalendarSize\} \/>/);
  assert.match(preview, /paintDailyCalendarSheet\(context/);
  assert.match(rig, /paintDailyCalendarSheet\(context, \{ date, theme: themeId, size: deskSize/);
});

test('settings switches reserve a dedicated control column and cannot shrink into copy', () => {
  const css = read('src/design-system.css');

  assert.match(css, /\.settings-page \.setting-row \{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) 54px/);
  assert.match(css, /\.settings-page \.setting-row input\[type='checkbox'\] \{[\s\S]*?min-width:\s*46px/);
  assert.match(css, /flex:\s*0 0 46px/);
  assert.match(css, /justify-self:\s*end/);
});

test('Today keeps cup and physical calendar in separate desktop zones', () => {
  const css = read('src/daily-desk-v026.css');

  assert.match(css, /@media \(min-width: 1121px\)[\s\S]*?\.daily026-desk\.has-physical-paper \.daily026-cup/);
  assert.match(css, /right:\s*calc\(var\(--daily-paper-width\) \+ 62px\)/);
  assert.match(css, /\.daily026-desk\.has-physical-paper \.daily026-paper-object \{[\s\S]*?top:\s*calc\(var\(--daily-paper-top\) \+ 14px\)/);
});

test('existing persisted paper theme ids stay intact while their descriptions describe composition', () => {
  const themes = read('src/data/paperThemes.ts');
  for (const id of ['himekuri', 'warm-paper', 'winter-study', 'christmas', 'sakura-dawn', 'minimal-mono']) {
    assert.match(themes, new RegExp(`id: '${id}'`));
  }
  assert.match(themes, /Vermilion · market calendar/);
  assert.match(themes, /Letterpress · study desk/);
  assert.match(themes, /Indigo · quiet grid/);
  assert.match(themes, /Evergreen · winter print/);
  assert.match(themes, /Blush · spring print/);
  assert.match(themes, /Monochrome · typographic grid/);
});
