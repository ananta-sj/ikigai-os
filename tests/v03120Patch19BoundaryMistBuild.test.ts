import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const world = readFileSync(new URL('../src/components/sanctuary/SanctuaryWorld.tsx', import.meta.url), 'utf8');

test('Patch 19 boundary mist sampling avoids impossible literal-count guards', () => {
  assert.match(world, /const longSideCount = lowPower \? 8 : 12;/);
  assert.match(world, /const shortSideCount = lowPower \? 7 : 10;/);
  assert.match(world, /const t = index \/ \(longSideCount - 1\);/);
  assert.match(world, /const t = index \/ \(shortSideCount - 1\);/);
  assert.doesNotMatch(world, /longSideCount === 1/);
  assert.doesNotMatch(world, /shortSideCount === 1/);
});
