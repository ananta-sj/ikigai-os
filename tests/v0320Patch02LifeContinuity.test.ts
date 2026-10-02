import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { reflectionHasWriting, roadmapThreadForRange } from '../src/lib/continuityCore.ts';
import type { RoadmapPhase, WeeklyReflection } from '../src/types.ts';

function read(path: string) { return fs.readFileSync(path, 'utf8'); }

function phase(id: string, title: string, startDate: string, endDate: string): RoadmapPhase {
  return {
    id,
    title,
    startDate,
    endDate,
    mode: 'green',
    intent: '',
    note: '',
    source: 'user',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  };
}

function reflection(patch: Partial<WeeklyReflection> = {}): WeeklyReflection {
  return {
    weekStart: '2026-09-28',
    title: '',
    wins: '',
    friction: '',
    nextFocus: '',
    note: '',
    updatedAt: '2026-09-28T00:00:00.000Z',
    ...patch
  };
}

test('continuity treats Reflection presence as writing, not record existence', () => {
  assert.equal(reflectionHasWriting(null), false);
  assert.equal(reflectionHasWriting(reflection()), false);
  assert.equal(reflectionHasWriting(reflection({ note: '   ' })), false);
  assert.equal(reflectionHasWriting(reflection({ nextFocus: 'Protect deep work.' })), true);
});

test('Roadmap continuity distinguishes one chapter, a transition and true overlap', () => {
  const first = phase('a', 'Foundations', '2026-09-01', '2026-09-30');
  const second = phase('b', 'Build', '2026-10-01', '2026-10-31');
  const single = roadmapThreadForRange([first, second], '2026-09-14', '2026-09-20', '2026-09-17');
  assert.equal(single.kind, 'single');
  assert.equal(single.primary?.id, 'a');

  const transition = roadmapThreadForRange([second, first], '2026-09-28', '2026-10-04', '2026-10-02');
  assert.equal(transition.kind, 'transition');
  assert.deepEqual(transition.phases.map(item => item.id), ['a', 'b']);
  assert.equal(transition.primary?.id, 'b');

  const overlap = roadmapThreadForRange([
    first,
    phase('c', 'Parallel proof', '2026-09-20', '2026-10-05')
  ], '2026-09-28', '2026-10-04', '2026-09-29');
  assert.equal(overlap.kind, 'overlap');
});

test('Journey and Reflection deep-link the same local week instead of duplicating data', () => {
  const journey = read('src/pages/CalendarPage.tsx');
  const reflectionPage = read('src/pages/ReflectionPage.tsx');
  const today = read('src/pages/TodayPage.tsx');

  assert.match(journey, /setContinuity\(null\);[\s\S]*loadDateContinuity\(selectedDate\)/);
  assert.match(journey, /setSearchParams\(\{ date: day\.date \}, \{ replace: true \}\)/);
  assert.match(journey, /to=\{`\/reflection\?week=\$\{/);
  assert.match(reflectionPage, /const weekParam = searchParams\.get\('week'\);[\s\S]*const requestedWeek = reflectionWeekParam\(weekParam\)/);
  assert.match(reflectionPage, /to=\{`\/calendar\?date=\$\{weekStart\}`\}/);
  assert.match(today, /to=\{`\/reflection\?week=\$\{currentWeekStart\}`\}/);
  assert.doesNotMatch(journey, /weeklyReflections\.put\(/);
  assert.doesNotMatch(reflectionPage, /roadmapPhases\.put\(/);
});

test('v0.32 continuity stays visually quiet and route-aware', () => {
  const journeyCss = read('src/journey-v026.css');
  const reflectionCss = read('src/reflection-career-v028.css');
  const familiar = read('src/lib/familiar.ts');
  const guides = read('src/data/pageGuides.ts');

  assert.match(journeyCss, /\.journey032-thread-lines a/);
  assert.match(journeyCss, /border-bottom:1px dotted/);
  assert.match(reflectionCss, /\.reflection032-continuity/);
  assert.match(reflectionCss, /border-top:1px solid var\(--ik-border\)/);
  assert.doesNotMatch(reflectionCss, /\.reflection032-continuity[\s\S]{0,260}box-shadow/);
  assert.match(familiar, /route: '\/calendar'[\s\S]*Weekly Reflection/);
  assert.match(familiar, /route: '\/reflection'[\s\S]*See the Journey/);
  assert.match(guides, /Follow the week/);
  assert.match(guides, /Keep the week in context/);
});


test('optional Roadmap continuity cannot block the core Reflection room', () => {
  const reflectionPage = read('src/pages/ReflectionPage.tsx');

  assert.match(reflectionPage, /const roadmapRequest = loadRoadmapThreadForWeek\(start\)[\s\S]*\.catch\(\(\) => \(\{ ok: false as const, nextRoadmapThread: null \}\)\)/);
  assert.match(reflectionPage, /Promise\.all\(\[[\s\S]*buildWeeklySnapshot\(start\),\s*getWeeklyReflection\(start\)\s*\]\)/);
  assert.doesNotMatch(reflectionPage, /Promise\.all\(\[[\s\S]{0,180}loadRoadmapThreadForWeek/);
  assert.match(reflectionPage, /roadmapThreadLoaded \? \(/);
  assert.match(reflectionPage, /if \(normalized !== weekStart\) \{[\s\S]*setSnapshot\(null\);[\s\S]*setReflection\(null\)/);
});
