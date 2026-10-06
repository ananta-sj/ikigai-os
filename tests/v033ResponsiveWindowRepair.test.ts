import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const onboarding = read('src/pages/OnboardingPage.tsx');
const onboardingCss = read('src/onboarding-v050.css');
const adaptiveCss = read('src/adaptive-ui-v032.css');

test('v0.33 First Light resets carried scroll when moving between pages', () => {
  assert.match(onboarding, /const worldRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(onboarding, /worldRef\.current\?\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
  assert.match(onboarding, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'auto' \}\)/);
  assert.match(onboarding, /\[loaded, step\]/);
  assert.match(onboarding, /<div ref=\{worldRef\} className="onboarding-world">/);
});

test('v0.33 Paper and Time auto-fits the actual themed board without double-scaling it', () => {
  assert.match(onboarding, /const journeyPreviewStageRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(onboarding, /const journeyPreviewCanvasRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(onboarding, /const journeyPreviewBoardRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(onboarding, /const board = journeyPreviewBoardRef\.current/);
  assert.match(onboarding, /const naturalWidth = Math\.max\(1, board\.offsetWidth\)/);
  assert.match(onboarding, /const naturalHeight = Math\.max\(1, board\.offsetHeight\)/);
  assert.match(onboarding, /observer\?\.observe\(board\)/);
  assert.match(onboarding, /ref=\{journeyPreviewBoardRef\} className="journey-calendar-demo-board"/);
  assert.match(onboardingCss, /\.onboarding-journey-fit-canvas \{[\s\S]*?width:\s*920px/);
  assert.match(onboardingCss, /transform-origin:\s*top center/);
  assert.match(onboardingCss, /\.onboarding-journey-live \.journey-calendar-demo-stage > \.journey-calendar-demo-board/);
  assert.doesNotMatch(onboardingCss, /\.onboarding-journey-live \.journey-calendar-demo-board\s*\{[\s\S]{0,120}?width:\s*min\(100%,\s*250px\)/);
  assert.match(onboardingCss, /\.onboarding-time-preview-grid \{[\s\S]*?align-items:\s*start/);
});

test('v0.33 Settings tabs return to normal flow on narrow or short desktop windows', () => {
  assert.match(adaptiveCss, /@media \(max-width: 1100px\), \(max-height: 760px\)/);
  assert.match(adaptiveCss, /\.settings-subnav \{[\s\S]*?position:\s*static/);
  assert.match(adaptiveCss, /\.settings-subnav \{[\s\S]*?overflow-x:\s*auto/);
  assert.match(adaptiveCss, /\.settings-subnav button \{ flex:\s*0 0 auto; \}/);
});

test('v0.33 responsive CSS contains real line breaks rather than escaped newline artifacts', () => {
  assert.doesNotMatch(onboardingCss, /\\n\\n\/\* v0\.33 responsive repair/);
  assert.doesNotMatch(adaptiveCss, /\\n\\n\/\* v0\.33 responsive repair/);
});

