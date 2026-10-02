import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('physical calendar size is a persisted normalized preference', () => {
  const types = read('src/types.ts');
  const settings = read('src/lib/settings.ts');

  assert.match(types, /export type DailyCalendarSize = 'compact' \| 'standard' \| 'large';/);
  assert.match(types, /dailyCalendarSize:\s*DailyCalendarSize;/);
  assert.match(settings, /dailyCalendarSize:\s*'standard'/);
  assert.match(settings, /function normalizeDailyCalendarSize/);
  assert.match(settings, /value === 'compact' \|\| value === 'large' \? value : 'standard'/);
  assert.match(settings, /dailyCalendarSize:\s*normalizeDailyCalendarSize\(existing\.dailyCalendarSize\)/);
});

test('Settings exposes calendar size as a visual physical-object choice', () => {
  const page = read('src/pages/SettingsPage.tsx');

  assert.match(page, /<strong>Calendar size<\/strong>/);
  assert.match(page, /className="paper-size-picker" role="radiogroup" aria-label="Physical calendar size"/);
  assert.match(page, /\['compact', 'Compact', 'Quiet date object'\]/);
  assert.match(page, /\['standard', 'Standard', 'Balanced desk presence'\]/);
  assert.match(page, /\['large', 'Large', 'Full tactile calendar'\]/);
  assert.match(page, /<DailyCalendarPreview theme=\{settings\.dailyPageTheme\} size=\{size\} sampleTasks \/>/);
});

test('Today passes calendar size into both layout and physics rendering', () => {
  const today = read('src/pages/TodayPage.tsx');
  const interactive = read('src/components/InteractiveDailyPaper.tsx');

  assert.match(today, /paper-size-\$\{settings\.dailyCalendarSize\}/);
  assert.match(today, /data-paper-size=\{settings\.dailyCalendarSize\}/);
  assert.match(today, /deskSize=\{settings\.dailyCalendarSize\}/);
  assert.match(interactive, /deskSize\?: DailyCalendarSize/);
  assert.match(interactive, /paper-size-\$\{deskSize\}/);
  assert.match(interactive, /deskSize=\{deskSize\}/);
});

test('desk print density adapts substantially instead of merely scaling the same bitmap', () => {
  const print = read('src/lib/dailyCalendarPrint.ts');

  assert.match(print, /size === 'compact'[\s\S]*?tasks:\s*0,[\s\S]*?memoLines:\s*2/);
  assert.match(print, /size === 'large'[\s\S]*?tasks:\s*3,[\s\S]*?memoLines:\s*5/);
  assert.match(print, /showMini:\s*false/);
  assert.match(print, /const tasksVisible = taskLines\.slice\(0, profile\.tasks\)/);
  assert.match(print, /const ruledStart = y \+ 88;[\s\S]*?const ruledGap = \(height - 118\) \/ Math\.max\(1, profile\.memoLines\)/);
});

test('desk object adds physical hanger clamp and visible page-stack details', () => {
  const rig = read('src/components/paper/PaperRig.tsx');

  assert.match(rig, /function CalendarHanger/);
  assert.match(rig, /new THREE\.CatmullRomCurve3/);
  assert.match(rig, /<tubeGeometry args=\{\[cordCurve, 28, 0\.022, 8, false\]\} \/>/);
  assert.match(rig, /\{desk && <CalendarHanger color=\{themeDef\.accent\} \/>\}/);
  assert.match(rig, /x=\{0\.045\}[\s\S]*?rotationZ=\{-0\.011\}/);
  assert.match(rig, /WIDTH \/ 2 \+ 0\.022/);
});

test('desk CSS gives compact standard and large visibly different footprints', () => {
  const css = read('src/daily-desk-v026.css');

  assert.match(css, /paper-size-compact[\s\S]*?--daily-paper-width:\s*132px/);
  assert.match(css, /--daily-paper-width:\s*216px/);
  assert.match(css, /paper-size-large[\s\S]*?--daily-paper-width:\s*318px/);
  assert.match(css, /--daily-paper-reserve:\s*404px/);
  assert.match(css, /padding-right:\s*var\(--daily-paper-reserve\)/);
});
