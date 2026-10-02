import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { journeyThemes } from '../src/data/journeyThemes.ts';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.10 turns Journey skins into eight distinct calendar constructions', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.10'), `expected 0.31.10 or newer, got ${packageJson.version}`);
  const coreThemes = journeyThemes.filter(theme => theme.collection !== 'edition');
  assert.equal(coreThemes.length, 8);
  assert.deepEqual(coreThemes.map(theme => theme.subtitle), [
    'Hanging print · bilingual dates',
    'Scenic poster · calendar below',
    'Side-bound study planner',
    'Handmade sheet · open rhythm',
    'Desk pad · modular day tiles',
    'Bound ledger · split-page month',
    'Clipboard planner · tall sheet',
    'Broadsheet · editorial columns'
  ]);

  const css = read('src/journey-calendar-v0285.css');
  assert.match(css, /v0\.31\.10 · Journey skins are different calendar constructions/);
  assert.match(css, /journey-theme-nihon-sakura[\s\S]*writing-mode:\s*vertical-rl/);
  assert.match(css, /journey-theme-fuji-seasonal[\s\S]*height:\s*235px/);
  assert.match(css, /journey-theme-study-wall[\s\S]*flex-direction:\s*column/);
  assert.match(css, /journey-theme-washi-minimal[\s\S]*clip-path:\s*polygon/);
  assert.match(css, /journey-theme-midnight-desk[\s\S]*\.journey0285-grid \{ gap:\s*7px/);
  assert.match(css, /journey-theme-letterpress-ledger[\s\S]*grid-template-columns:\s*178px minmax\(0,1fr\)/);
  assert.match(css, /journey-theme-kraft-clip[\s\S]*width:\s*min\(790px/);
  assert.match(css, /journey-theme-newsprint-month[\s\S]*border-top:\s*2px solid var\(--jc-ink\)/);
});

test('Settings and First Light previews expose the same structural differences', () => {
  const settingsCss = read('src/design-system.css');
  const onboarding = read('src/pages/OnboardingPage.tsx');
  const onboardingCss = read('src/onboarding-v050.css');

  for (const visual of ['nihon', 'landscape', 'study', 'washi', 'night', 'letterpress', 'kraft', 'newsprint']) {
    assert.match(settingsCss, new RegExp(`journey-calendar-demo-${visual}`));
  }
  assert.match(settingsCss, /journey-calendar-demo-letterpress[\s\S]*grid-template-columns:\s*142px minmax\(0,1fr\)/);
  assert.match(settingsCss, /journey-calendar-demo-washi[\s\S]*clip-path:\s*polygon/);
  assert.match(settingsCss, /journey-theme-choice\.midnight-desk[\s\S]*gap:\s*3px/);
  assert.match(onboarding, /className=\{journeyCalendarTheme === theme\.id \? `\$\{theme\.id\} selected` : theme\.id\}/);
  assert.match(onboardingCss, /v0\.31\.10 · First Light calendar choices hint at distinct constructions/);
});
