import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };
const focus = read('src/pages/FocusPage.tsx');
const focusCss = read('src/focus-v029.css');
const reflection = read('src/pages/ReflectionPage.tsx');
const reflectionCss = read('src/reflection-v060.css');
const reflectionCareerCss = read('src/reflection-career-v028.css');
const career = read('src/pages/CareerPage.tsx');
const workspaceCss = read('src/roadmap-career-v090.css');
const reimagineCss = read('src/reimagine.css');
const careerRepairCss = read('src/career-v03120.css');
const workspaceDialogCss = read('src/workspace-dialog-v032.css');
const types = read('src/types.ts');
const settings = read('src/lib/settings.ts');
const migration = read('MIGRATION_V0.31.18.md');

test('v0.31.18 records the layout-scale iteration', () => {
  assert.match(migration, /Focus/i);
  assert.match(migration, /Reflection/i);
  assert.match(migration, /Career/i);
});

test('Focus distraction-free canvas is wider without inflating the timer dial', () => {
  assert.match(focusCss, /is-distraction-free \.focus029-workspace,[\s\S]*?width:\s*min\(100%, 1580px\)/);
  assert.match(focusCss, /is-distraction-free \.focus029-dial,[\s\S]*?width:\s*min\(50dvh, 440px\)/);
});

test('Focus quotations remain optional, attributed, and persisted locally', () => {
  assert.match(types, /focusQuotes:\s*boolean/);
  assert.match(types, /focusQuoteMode:\s*FocusQuoteMode/);
  assert.match(settings, /focusQuotes:\s*true/);
  assert.match(settings, /focusQuoteMode:\s*'shuffle'/);
  assert.match(settings, /normalizeFocusQuoteMode\(existing\.focusQuoteMode, existing\.focusQuotes\)/);
  assert.match(focus, /focusBuiltInQuotes/);
  assert.match(focus, /activeQuote\.author/);
  assert.match(focus, /FOCUS NOTE/);
  assert.match(focus, /updateSettings\(\{ focusQuoteMode: next, focusQuotes: next !== 'off' \}\)/);
  assert.doesNotMatch(focus, /You have power over your mind/);
});

test('Reflection week range opens a bounded mini calendar and future weeks are navigable', () => {
  assert.match(reflection, /WEEK_PICKER_MIN_YEAR = 1970/);
  assert.match(reflection, /WEEK_PICKER_MAX_YEAR = 9999/);
  assert.match(reflection, /className="week-picker" role="dialog" aria-label="Choose week"/);
  assert.match(reflection, /chooseWeek\(dayWeek\)/);
  assert.match(reflection, /WEEK_PICKER_MIN_WEEK/);
  assert.match(reflection, /WEEK_PICKER_MAX_WEEK/);
  assert.match(reflection, /weekStart < WEEK_PICKER_MAX_WEEK \? addDaysKey\(weekStart, 7\) : weekStart/);
  assert.match(reflection, /disabled=\{weekStart >= WEEK_PICKER_MAX_WEEK\}/);
  assert.match(reflectionCss, /\.week-picker-grid/);
  assert.match(reflectionCss, /\.week-picker-grid button\.is-selected-week/);
});

test('Deeper reflection uses semantic layout instead of four equal boxes', () => {
  assert.match(reflection, /reflection-v028-deeper-wide/);
  assert.match(reflection, /reflection-v028-deeper-title/);
  assert.match(reflection, /answer only what feels useful/);
  assert.match(reflectionCareerCss, /\.reflection-v028-deeper-wide\s*\{\s*grid-column:\s*1 \/ -1/);
  assert.match(reflectionCareerCss, /\.reflection-v028-deeper-title[\s\S]*?max-width:\s*560px/);
});

test('Career activity stays spacious while Career and Roadmap editors use the isolated workspace dialog', () => {
  assert.match(career, /career-github-activity-head/);
  assert.match(reflectionCareerCss, /--github-cell:\s*clamp\(16px, 1\.8vw, 26px\)/);
  assert.match(career, /ik-workspace-dialog--project/);
  assert.match(career, /ik-workspace-dialog--proof/);
  assert.match(career, /ik-workspace-dialog--opportunity/);
  assert.match(career, /className="ik-workspace-dialog__close"/);
  assert.match(career, /<summary><span>More details<\/span><small>optional<\/small><\/summary>/);
  assert.match(career, /career-project-story/);
  assert.match(career, /career-project-target/);
  assert.match(workspaceCss, /roadmap-modal-phase\s*\{\s*--ik-editor-width:\s*780px/);
  assert.match(workspaceDialogCss, /\.ik-workspace-dialog--project\s*\{\s*--ik-workspace-dialog-width:\s*600px/);
  assert.match(workspaceDialogCss, /\.ik-workspace-dialog--proof\s*\{\s*--ik-workspace-dialog-width:\s*570px/);
  assert.match(workspaceDialogCss, /\.ik-workspace-dialog__details\s*\{[\s\S]*?border:\s*0;/);
  assert.match(reimagineCss, /memory-capture-modal \{ width:min\(620px/);
  assert.match(careerRepairCss, /Career Workspace Repair/);
});
