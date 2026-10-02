import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { appThemes, isLightAppTheme } from '../src/data/themes.ts';
import { journeyThemes } from '../src/data/journeyThemes.ts';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.12 adds five opt-in workspace special editions without replacing the core materials', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.12'), `expected 0.31.12 or newer, got ${packageJson.version}`);
  const core = appThemes.filter(theme => theme.collection !== 'edition');
  const editions = appThemes.filter(theme => theme.collection === 'edition');
  assert.equal(core.length, 5);
  assert.deepEqual(editions.map(theme => theme.name), ['Hanami Atelier', 'Winter Hearth', 'Holi Pigment', 'Diwali Lantern', 'Momentum Board']);
  assert.equal(isLightAppTheme('hanami-atelier'), true);
  assert.equal(isLightAppTheme('winter-hearth'), true);
  assert.equal(isLightAppTheme('holi-pigment'), true);
  assert.equal(isLightAppTheme('diwali-lantern'), false);
  assert.equal(isLightAppTheme('momentum-board'), true);

  const css = read('src/theme-system.css');
  for (const id of ['hanami-atelier', 'winter-hearth', 'holi-pigment', 'diwali-lantern', 'momentum-board']) {
    assert.match(css, new RegExp(`data-ikigai-theme='${id}'`));
    assert.match(css, new RegExp(`data-preview-theme='${id}'`));
    assert.match(css, new RegExp(`app-theme-preview\\.${id}`));
  }
  assert.match(css, /special-edition workspace themes alter material character/);
});

test('Journey adds five themed calendar editions with distinct construction families', () => {
  const core = journeyThemes.filter(theme => theme.collection !== 'edition');
  const editions = journeyThemes.filter(theme => theme.collection === 'edition');
  assert.equal(core.length, 8);
  assert.equal(editions.length, 5);
  assert.deepEqual(editions.map(theme => theme.id), ['hanami-scroll', 'winter-advent', 'holi-powder', 'diwali-diya', 'momentum-month']);
  assert.deepEqual(editions.map(theme => theme.visual), ['hanami', 'winter', 'holi', 'diwali', 'momentum']);

  const calendarCss = read('src/journey-calendar-v0285.css');
  const settingsCss = read('src/design-system.css');
  for (const id of editions.map(theme => theme.id)) assert.match(calendarCss, new RegExp(`journey-theme-${id}`));
  for (const visual of editions.map(theme => theme.visual)) assert.match(settingsCss, new RegExp(`journey-calendar-demo-${visual}`));
  assert.match(calendarCss, /Hanami Scroll — long hanging print/);
  assert.match(calendarCss, /Winter Advent — card stock/);
  assert.match(calendarCss, /Holi Powder — loose poster/);
  assert.match(calendarCss, /Diwali Diya — illuminated night ledger/);
  assert.match(calendarCss, /Momentum Month — studio board/);
});

test('Settings separates core workspace materials from special editions and onboarding exposes the expanded choices', () => {
  const settings = read('src/pages/SettingsPage.tsx');
  const onboarding = read('src/pages/OnboardingPage.tsx');
  assert.match(settings, /Core materials/);
  assert.match(settings, /Special editions/);
  assert.match(settings, /Japanese spring · winter\/Christmas · Holi · Diwali · motivational studio/);
  assert.match(settings, /theme\.collection === 'edition'/);
  assert.match(onboarding, /Core constructions \+ seasonal editions/);
});
