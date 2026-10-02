import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveSanctuaryDepthState,
  resolveSanctuaryQuality,
  sanctuaryDayPeriod,
  sanctuaryDayProgress,
  visibleSanctuarySecrets
} from '../src/lib/sanctuaryDepthCore.ts';
import { emptySanctuaryLivingState } from '../src/lib/sanctuaryLivingCore.ts';


test('sanctuary day progress is a bounded local-time fraction', () => {
  assert.equal(sanctuaryDayProgress(new Date(2026, 8, 26, 0, 0, 0)), 0);
  assert.equal(sanctuaryDayProgress(new Date(2026, 8, 26, 12, 0, 0)), .5);
  const late = sanctuaryDayProgress(new Date(2026, 8, 26, 23, 59, 59));
  assert.ok(late > .99 && late < 1);
});

test('sanctuary day period follows local clock bands', () => {
  assert.equal(sanctuaryDayPeriod(new Date(2026, 8, 26, 6, 0)), 'dawn');
  assert.equal(sanctuaryDayPeriod(new Date(2026, 8, 26, 12, 0)), 'day');
  assert.equal(sanctuaryDayPeriod(new Date(2026, 8, 26, 18, 0)), 'dusk');
  assert.equal(sanctuaryDayPeriod(new Date(2026, 8, 26, 23, 0)), 'night');
});

test('quality preference can override automatic device detection', () => {
  assert.equal(resolveSanctuaryQuality('auto', true), 'balanced');
  assert.equal(resolveSanctuaryQuality('auto', false), 'lush');
  assert.equal(resolveSanctuaryQuality('lush', true), 'lush');
  assert.equal(resolveSanctuaryQuality('balanced', false), 'balanced');
});

test('secrets appear only when their world conditions exist', () => {
  const quiet = emptySanctuaryLivingState();
  assert.deepEqual(visibleSanctuarySecrets(quiet, 'day'), ['old-cairn']);
  assert.deepEqual(visibleSanctuarySecrets(quiet, 'night'), ['old-cairn']);

  const developed = structuredClone(quiet);
  developed.moonPond.tier = 2;
  developed.quietPavilion.memories = 1;
  assert.deepEqual(visibleSanctuarySecrets(developed, 'night'), ['old-cairn', 'moon-moth', 'paper-crane']);
  assert.deepEqual(visibleSanctuarySecrets(developed, 'day'), ['old-cairn', 'paper-crane']);
});

test('depth state composes period, quality and secret visibility', () => {
  const living = emptySanctuaryLivingState();
  const state = deriveSanctuaryDepthState(living, {
    now: new Date(2026, 8, 26, 18, 30),
    quality: 'auto',
    lowPowerDetected: true
  });
  assert.equal(state.period, 'dusk');
  assert.equal(state.quality, 'balanced');
  assert.deepEqual(state.visibleSecrets, ['old-cairn']);
});

import { achievementDefinitions } from '../src/data/achievements.ts';
import { sanctuaryArtifactPlacementById } from '../src/data/sanctuaryArtifacts.ts';

test('every current achievement has a finite Sanctuary landmark placement', () => {
  for (const definition of achievementDefinitions) {
    const placement = sanctuaryArtifactPlacementById[definition.id];
    assert.ok(placement, `missing placement for ${definition.id}`);
    assert.equal(placement.position.length, 2);
    assert.ok(placement.position.every(Number.isFinite));
  }
});
