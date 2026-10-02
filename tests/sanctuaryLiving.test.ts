import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveSanctuaryLivingState,
  sanctuaryRegionNarrative,
  type SanctuaryLivingSource
} from '../src/lib/sanctuaryLivingCore.ts';

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

test('an empty Ikigai dataset keeps every Sanctuary region quiet', () => {
  const state = deriveSanctuaryLivingState(source(), new Date('2026-09-26T12:00:00Z'));
  assert.equal(state.homeGrove.tier, 0);
  assert.equal(state.moonPond.tier, 0);
  assert.equal(state.quietPavilion.tier, 0);
  assert.equal(state.lookout.tier, 0);
  assert.equal(state.threshold.totalTraces, 0);
  assert.equal(state.homeGrove.flowerCount, 0);
  assert.equal(state.moonPond.lilyCount, 0);
  assert.equal(state.quietPavilion.lanternCount, 0);
});

test('recent completed work enriches Home Grove without changing stored data', () => {
  const state = deriveSanctuaryLivingState(source({
    completedTaskDates: [
      '2026-09-25T10:00:00Z',
      '2026-09-20T10:00:00Z',
      '2026-09-10T10:00:00Z',
      '2026-08-01T10:00:00Z'
    ]
  }), new Date('2026-09-26T12:00:00Z'));

  assert.equal(state.homeGrove.completedTasks, 4);
  assert.equal(state.homeGrove.recentCompletedTasks, 3);
  assert.ok(state.homeGrove.tier >= 1);
  assert.ok(state.homeGrove.flowerCount > 0);
  assert.match(sanctuaryRegionNarrative('home-grove', state), /4 completed tasks/);
});

test('reflection, memories, roadmap and career data develop distinct regions', () => {
  const reflections = Array.from({ length: 4 }, (_, index) => ({
    title: `Week ${index}`,
    wins: 'A useful win',
    friction: '',
    nextFocus: '',
    note: ''
  }));

  const state = deriveSanctuaryLivingState(source({
    reflections,
    memoryCount: 8,
    attachmentCount: 4,
    roadmapPhaseCount: 2,
    roadmapStatuses: ['done', 'done', 'active', 'planned'],
    careerProjectStatuses: ['building', 'released'],
    proofCount: 3,
    applicationStatuses: ['applied', 'interview', 'closed']
  }), new Date('2026-09-26T12:00:00Z'));

  assert.ok(state.moonPond.tier >= 2);
  assert.ok(state.moonPond.lilyCount >= 4);
  assert.ok(state.quietPavilion.tier >= 2);
  assert.ok(state.quietPavilion.lanternCount >= 3);
  assert.equal(state.lookout.roadmapDone, 2);
  assert.equal(state.lookout.roadmapActive, 1);
  assert.ok(state.lookout.routeMarkers >= 3);
  assert.ok(state.lookout.careerTier >= 2);
  assert.match(sanctuaryRegionNarrative('quiet-pavilion', state), /8 memories/);
  assert.match(sanctuaryRegionNarrative('lookout', state), /2 checkpoints/);
});

test('world projection caps decorative counts for long-lived datasets', () => {
  const state = deriveSanctuaryLivingState(source({
    completedTaskDates: Array.from({ length: 200 }, (_, index) => `2026-09-${String((index % 25) + 1).padStart(2, '0')}T10:00:00Z`),
    reflections: Array.from({ length: 50 }, () => ({ title: 'Reflection', wins: '', friction: '', nextFocus: '', note: '' })),
    memoryCount: 500,
    attachmentCount: 1000,
    roadmapPhaseCount: 30,
    roadmapStatuses: Array.from({ length: 80 }, () => 'done' as const),
    careerProjectStatuses: Array.from({ length: 30 }, () => 'released' as const),
    proofCount: 150,
    applicationStatuses: Array.from({ length: 20 }, () => 'applied' as const)
  }), new Date('2026-09-26T12:00:00Z'));

  assert.equal(state.homeGrove.tier, 4);
  assert.equal(state.homeGrove.flowerCount, 28);
  assert.equal(state.moonPond.lilyCount, 10);
  assert.equal(state.quietPavilion.lanternCount, 10);
  assert.equal(state.lookout.routeMarkers, 8);
  assert.equal(state.worldTier, 4);
});
