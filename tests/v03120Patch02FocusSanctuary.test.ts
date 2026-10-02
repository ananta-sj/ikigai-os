import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { focusBuiltInQuotes, shuffleFocusQuotes } from '../src/data/focusQuotes.ts';
import { gardenRewardHistoryDifficulties, gardenRewardTotals, plantStage } from '../src/lib/rewards.ts';
import { deriveSanctuaryLivingState, type SanctuaryLivingSource } from '../src/lib/sanctuaryLivingCore.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const taskSource = read('src/lib/tasks.ts');
const gardenPage = read('src/pages/GardenPage.tsx');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const focus = read('src/pages/FocusPage.tsx');
const focusCss = read('src/focus-v029.css');
const settings = read('src/lib/settings.ts');
const careerCss = read('src/career-v03120.css');
const types = read('src/types.ts');
const patch02 = read('MIGRATION_V0.31.20_PATCH_02.md');

function source(patch: Partial<SanctuaryLivingSource> = {}): SanctuaryLivingSource {
  return {
    completedTaskDates: [],
    reflections: [],
    memoryCount: 0,
    attachmentCount: 0,
    roadmapPhaseCount: 0,
    roadmapStatuses: [],
    careerProjectStatuses: [],
    proofCount: 0,
    applicationStatuses: [],
    ...patch
  };
}

test('Focus supports shuffled, fixed and disabled quote modes with side swapping', () => {
  assert.match(types, /FocusQuoteMode = 'shuffle' \| 'single' \| 'off'/);
  assert.match(types, /FocusQuoteSide = 'right' \| 'left'/);
  assert.match(focus, /\['shuffle', 'single', 'off'\]/);
  assert.match(focus, /swapFocusSides/);
  assert.match(focus, /quote-\$\{quoteSide\}/);
  assert.match(focusCss, /quote-right[\s\S]*?\.focus029-clock-pane[\s\S]*?order:\s*1/);
  assert.match(focusCss, /quote-left[\s\S]*?\.focus029-quote[\s\S]*?order:\s*1/);
  assert.match(focusCss, /font:\s*560 clamp\(30px, 4\.2vw, 66px\)/);
});

test('Focus custom quotes stay bounded and local in settings', () => {
  assert.ok(focusBuiltInQuotes.length >= 8);
  assert.match(types, /interface FocusCustomQuote/);
  assert.match(settings, /focusQuoteMode: 'shuffle'/);
  assert.match(settings, /value\.slice\(0, 40\)/);
  assert.match(settings, /slice\(0, 240\)/);
  assert.match(settings, /slice\(0, 80\)/);
  assert.match(focus, /customQuotes\.length >= 40/);
  assert.match(focus, /QUOTER/);
  assert.match(patch02, /custom quote/i);
});

test('quote shuffle is a permutation and does not mutate its input', () => {
  const input = ['a', 'b', 'c', 'd'];
  const sequence = [0.9, 0.1, 0.7];
  let index = 0;
  const output = shuffleFocusQuotes(input, () => sequence[index++] ?? 0.5);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...output].sort(), [...input].sort());
  assert.equal(new Set(output).size, input.length);
});

test('Garden reward math accounts for every task difficulty', () => {
  assert.deepEqual(gardenRewardTotals(['small', 'normal', 'hard', 'quest']), {
    growth: 132,
    water: 6,
    sunlight: 4,
    fertilizer: 3
  });
});

test('invalid Garden growth cannot turn into a false Bloom stage', () => {
  assert.equal(plantStage(Number.NaN).label, 'Dormant Seed');
  assert.equal(plantStage(-100).label, 'Dormant Seed');
  assert.equal(plantStage(Number.POSITIVE_INFINITY).label, 'Dormant Seed');
});

test('Garden stage boundaries cover the full Guardian Tree progression', () => {
  assert.equal(plantStage(0).label, 'Dormant Seed');
  assert.equal(plantStage(20).label, 'Awakening Seed');
  assert.equal(plantStage(50).label, 'Sprout');
  assert.equal(plantStage(105).label, 'Young Plant');
  assert.equal(plantStage(180).label, 'Sapling');
  assert.equal(plantStage(300).label, 'Young Tree');
  assert.equal(plantStage(500).label, 'Mature Tree');
  assert.equal(plantStage(800).label, 'Bloom');
});

test('Garden reconciliation recognizes reopened earned tasks but rejects invalid/future reward evidence', () => {
  const now = new Date('2026-09-28T12:00:00Z');
  assert.deepEqual(gardenRewardHistoryDifficulties([
    { difficulty: 'small', gardenRewardedAt: '2026-09-20T10:00:00Z' },
    { difficulty: 'normal', completedAt: '2026-09-27T10:00:00Z' },
    { difficulty: 'hard', completedAt: 'not-a-date' },
    { difficulty: 'quest', gardenRewardedAt: '2099-01-01T00:00:00Z' }
  ], now), ['small', 'normal']);
});

test('Garden earning is stamped once and reopening deliberately preserves the stamp', () => {
  assert.match(types, /gardenRewardedAt\?:\s*string/);
  assert.match(taskSource, /shouldReward = !task\.gardenRewardedAt/);
  assert.match(taskSource, /gardenRewardedAt: completedAt/);
  assert.match(taskSource, /reopenTask[\s\S]*?completedAt:\s*undefined/);
  assert.doesNotMatch(taskSource, /reopenTask[\s\S]*?gardenRewardedAt:\s*undefined/);
  assert.match(taskSource, /reconciledGarden/);
  assert.match(taskSource, /Math\.max\(base\.growth, minimum\.growth\)/);
});

test('Sanctuary projection rejects malformed and implausibly future completion timestamps', () => {
  const state = deriveSanctuaryLivingState(source({
    completedTaskDates: [
      '2026-09-25T10:00:00Z',
      'not-a-date',
      '2099-01-01T00:00:00Z'
    ]
  }), new Date('2026-09-26T12:00:00Z'));
  assert.equal(state.homeGrove.completedTasks, 1);
  assert.equal(state.homeGrove.activeDays, 1);
});

test('open Sanctuary observes growth, projection sources and achievement unlocks live', () => {
  assert.match(gardenPage, /liveQuery\(\(\) => db\.garden\.get\('main'\)\)/);
  assert.match(gardenPage, /liveQuery\(\(\) => loadSanctuaryLivingState\(\)\)/);
  assert.match(gardenPage, /db\.tasks\.toArray\(\)/);
  assert.match(gardenPage, /db\.proofItems\.toArray\(\)/);
  assert.match(gardenPage, /db\.weeklyReflections\.toArray\(\)/);
  assert.match(gardenPage, /db\.careerApplications\.toArray\(\)/);
  assert.match(gardenPage, /db\.achievementUnlocks\.toArray\(\)/);
});

test('region travel can recenter the same region and renderer has non-destructive recovery', () => {
  assert.match(gardenPage, /setRequestedRegionKey\(key => key \+ 1\)/);
  assert.match(world, /requestedRegionKey\?:\s*number/);
  assert.match(world, /\[requestedRegion, requestedRegionKey\]/);
  assert.match(world, /class SanctuaryRenderBoundary/);
  assert.match(world, /Sanctuary 3D is unavailable here/);
  assert.match(world, /The Sanctuary world could not finish rendering/);
});

test('Sanctuary reduced-motion and discovery persistence cover ambient world details', () => {
  assert.match(world, /function SanctuaryScene\([\s\S]*?reducedMotion = false,/);
  assert.match(world, /function GroundDetails\(\{ lowPower, palette, reducedMotion \}/);
  assert.match(world, /reducedMotion \? 0 : Math\.sin\(clock\.elapsedTime/);
  assert.match(gardenPage, /const latest = await ensureSettings\(\)/);
  assert.match(gardenPage, /new Set\(\[\.\.\.latest\.sanctuaryDiscoveries, id\]\)/);
  assert.match(world, /resetKey=\{`\$\{theme\}:\$\{resolvedQuality\}`\}/);
});

test('Career editors are isolated, centered and keep project story/date compact', () => {
  assert.match(careerCss, /place-items:\s*center !important/);
  assert.match(careerCss, /border-radius:\s*26px !important/);
  assert.match(careerCss, /career-editor__grid--story[^{]*\{[^}]*grid-template-columns:/);
  assert.match(careerCss, /career-project-story-input[\s\S]*?height:\s*44px !important/);
});

test('bundled Sanctuary GLB landmarks have valid binary glTF headers', () => {
  for (const filename of ['guardian_tree.glb', 'reflection_bench.glb', 'quiet_pavilion.glb', 'waystone_gate.glb']) {
    const path = fileURLToPath(new URL(`../public/assets/sanctuary/${filename}`, import.meta.url));
    const bytes = readFileSync(path);
    assert.ok(bytes.length > 20, `${filename} should not be empty`);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'glTF', `${filename} should be a GLB file`);
  }
});
