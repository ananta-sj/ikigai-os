import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Career and Roadmap capture sheets keep actions inside the dialog body instead of a detached footer', () => {
  const career = read('src/pages/CareerPage.tsx');
  const roadmap = read('src/pages/RoadmapPage.tsx');
  const css = read('src/workspace-dialog-v032.css');

  assert.equal((career.match(/<div className="ik-workspace-dialog__actions">/g) ?? []).length, 3);
  assert.equal((roadmap.match(/<div className="ik-workspace-dialog__actions">/g) ?? []).length, 2);
  assert.doesNotMatch(career, /<footer className="ik-workspace-dialog__actions">/);
  assert.doesNotMatch(roadmap, /<footer className="ik-workspace-dialog__actions">/);
  assert.match(career, /career-project-story-input" type="text"/);
  assert.match(css, /\.ik-workspace-dialog__actions\s*\{[\s\S]*?padding:\s*14px 0 0;[\s\S]*?background:\s*transparent;/);
  assert.match(css, /--ik-workspace-paper:/);
  assert.match(css, /\.ik-workspace-dialog__head[\s\S]*?background:\s*transparent;/);
  assert.match(css, /\.ik-workspace-dialog__body[\s\S]*?background:\s*transparent;/);
});

test('physical Today paper is opt-in and migrates safely through normal settings', () => {
  const types = read('src/types.ts');
  const settings = read('src/lib/settings.ts');

  assert.match(types, /todayPaperPhysics:\s*boolean;/);
  assert.match(settings, /todayPaperPhysics:\s*false,/);
  assert.match(settings, /todayPaperPhysics:\s*Boolean\(existing\.todayPaperPhysics\)/);
});

test('Today uses the real paper rig as an optional desk object without auto-opening the handoff over it', () => {
  const today = read('src/pages/TodayPage.tsx');
  const css = read('src/daily-desk-v026.css');

  assert.match(today, /settings\.showDailyPage && !settings\.todayPaperPhysics/);
  assert.match(today, /settings\?\.todayPaperPhysics && paperRecord && paperDateKey/);
  assert.match(today, /<InteractiveDailyPaper[\s\S]*?tearable=\{paperDateKey < today\}[\s\S]*?presentation="desk"/);
  assert.match(today, /manipulable=\{!settings\.reducedMotion\}/);
  assert.doesNotMatch(today, />PHYSICAL DAY PAGE</);
  assert.match(css, /\.daily026-paper-object\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?transform:\s*rotate\(/);
});

test('paper physics can flex an attached page without turning a normal pull into a tear request', () => {
  const interactive = read('src/components/InteractiveDailyPaper.tsx');
  const rig = read('src/components/paper/PaperRig.tsx');

  assert.match(interactive, /manipulable\?:\s*boolean;/);
  assert.match(interactive, /tearIntentEnabled=\{tearable\}/);
  assert.match(interactive, /interactive=\{manipulable && !detached && !closing\}/);
  assert.match(rig, /tearIntentEnabled\?:\s*boolean;/);
  assert.match(rig, /if \(tearIntentEnabled && phase\.current === 'pulling' && maxStress >= TEAR_THRESHOLD/);
});

test('desk paper carry-forward decision is a focus-safe body portal rather than a tiny canvas overlay', () => {
  const interactive = read('src/components/InteractiveDailyPaper.tsx');
  const css = read('src/paper-home.css');

  assert.match(interactive, /useDialogFocus<HTMLDivElement>\(decisionOpen, cancelClose\)/);
  assert.match(interactive, /aria-modal="true"/);
  assert.match(interactive, /presentation === 'desk' && typeof document !== 'undefined' \? createPortal\(tearDecision, document\.body\)/);
  assert.match(css, /\.paper-close-overlay--desk\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*460;/);
});

test('Settings exposes paper physics as optional and reuses the existing paper appearance controls', () => {
  const page = read('src/pages/SettingsPage.tsx');
  const guide = read('src/data/pageGuides.ts');

  assert.match(page, /<strong>Physical day page<\/strong>/);
  assert.match(page, /todayPaperPhysics:\s*event\.target\.checked/);
  assert.match(page, /className=\"paper-edition-picker\"/);
  assert.match(page, /aria-checked=\{selected\}/);
  assert.match(page, /dailyPageTheme:\s*theme\.id as DailyPageTheme/);
  assert.match(page, /checked=\{settings\.showMiniMonth\}/);
  assert.match(page, /checked=\{settings\.tearSound\}/);
  assert.match(guide, /title:\s*'Physical day page'/);
});
