import test from 'node:test';
import assert from 'node:assert/strict';
import { guidedRoutePaths, pageGuides } from '../src/data/pageGuides.ts';

const expectedRoutes = ['/', '/calendar', '/focus', '/now-playing', '/garden', '/roadmap', '/reflection', '/memories', '/career', '/companion', '/settings'];

test('every main application route has a page guide', () => {
  assert.deepEqual([...guidedRoutePaths].sort(), [...expectedRoutes].sort());
});

test('page guides include practical feature guidance rather than title-only help', () => {
  for (const path of expectedRoutes) {
    const guide = pageGuides[path];
    assert.ok(guide, `${path} should have a guide`);
    assert.ok(guide.summary.length >= 40, `${path} should explain the room`);
    assert.ok(guide.features.length >= 3, `${path} should document key features`);
    for (const feature of guide.features) {
      assert.ok(feature.title.trim().length > 0);
      assert.ok(feature.detail.trim().length >= 25);
    }
  }
});

test('Settings guide tells users how to disable the guide layer', () => {
  assert.match(pageGuides['/settings'].customize, /turn this Guide button off/i);
});
