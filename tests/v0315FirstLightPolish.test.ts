import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };

test('v0.31.5 moves editable-later guidance to one quiet global First Light footer', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.5'), `expected 0.31.5 or newer, got ${packageJson.version}`);
  const page = read('src/pages/OnboardingPage.tsx');
  const css = read('src/onboarding-v050.css');

  assert.match(page, /className=\{step === 0 \? 'onboarding-reassurance standalone' : 'onboarding-reassurance'\}/);
  assert.match(page, /Nothing here is permanent\./);
  assert.match(page, /Change or clear any choice later in Settings\./);
  assert.match(page, /External services are separate and only connect when you choose\./);
  assert.doesNotMatch(page, /className="onboarding-data-boundary"/);
  assert.match(css, /\.onboarding-reassurance\s*\{/);
  assert.match(css, /bottom:\s*max\(80px,\s*calc\(env\(safe-area-inset-bottom\) \+ 68px\)\)/);
});

test('v0.31.5 recomposes the final page as seed plus compact assurances with summary below', () => {
  const page = read('src/pages/OnboardingPage.tsx');
  const css = read('src/onboarding-v050.css');

  assert.match(page, /<div className="ready-layout">/);
  assert.match(page, /<div className="onboarding-ready-panel">[\s\S]*?<\/div>\s*<div className="onboarding-ready-summary"/);
  assert.match(css, /grid-template-areas:\s*\n\s*"seed assurances"\s*\n\s*"summary summary"/);
  assert.match(css, /\.ready-layout \.onboarding-ready-panel\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /\.ready-layout > \.onboarding-ready-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
  assert.match(css, /\.plant-step \.onboarding-step-head\s*\{[\s\S]*text-align:\s*center/);
});
