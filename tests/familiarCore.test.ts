import test from 'node:test';
import assert from 'node:assert/strict';
import { familiarPresenceCopy, familiarRouteContext, normalizeFamiliarName } from '../src/lib/familiar.ts';

test('familiar name normalization trims, collapses whitespace and keeps a safe default', () => {
  assert.equal(normalizeFamiliarName('  Momo   Leaf  '), 'Momo Leaf');
  assert.equal(normalizeFamiliarName('   '), 'Familiar');
  assert.equal(normalizeFamiliarName(null), 'Familiar');
  assert.equal(normalizeFamiliarName('abcdefghijklmnopqrstuvwxyz12345').length, 28);
});

test('familiar route context keeps Sanctuary and Companion roles distinct', () => {
  const sanctuary = familiarRouteContext('/garden');
  const companion = familiarRouteContext('/companion');
  assert.equal(sanctuary.label, 'SANCTUARY');
  assert.match(sanctuary.detail, /3D resident/);
  assert.equal(companion.label, 'COMPANION');
  assert.match(companion.title, /Conversation is one part/);
});

test('familiar route context always has a useful fallback', () => {
  const unknown = familiarRouteContext('/something-new');
  assert.equal(unknown.label, 'IKIGAI');
  assert.equal(unknown.actions.length, 2);
});

test('legacy activity values map to the new presence language', () => {
  assert.equal(familiarPresenceCopy('still').label, 'Quiet');
  assert.equal(familiarPresenceCopy('calm').label, 'Nearby');
  assert.equal(familiarPresenceCopy('lively').label, 'Playful');
  assert.equal(familiarPresenceCopy('hidden').label, 'Home only');
});
