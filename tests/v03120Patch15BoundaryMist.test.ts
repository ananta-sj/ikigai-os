import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');

test('Sanctuary still wraps every terrain edge in a deterministic mist boundary', () => {
  assert.match(world, /function BoundaryMist\(/);
  assert.match(world, /const halfWidth = TERRAIN_WIDTH \/ 2/);
  assert.match(world, /const halfDepth = TERRAIN_DEPTH \/ 2/);
  assert.match(world, /addLongSide\(-1\)/);
  assert.match(world, /addLongSide\(1\)/);
  assert.match(world, /addShortSide\(-1\)/);
  assert.match(world, /addShortSide\(1\)/);
  assert.match(world, /<BoundaryMist palette=\{palette\} lowPower=\{lowPower\} reducedMotion=\{Boolean\(reducedMotion\)\} \/>/);
});

test('boundary atmosphere remains bounded and quality aware after the denser world-edge pass', () => {
  assert.match(world, /const longSideCount = lowPower \? 8 : 12/);
  assert.match(world, /const shortSideCount = lowPower \? 7 : 10/);
  assert.match(world, /const curtainHeight = 14/);
  assert.match(world, /instancedMesh ref=\{bankMesh\}/);
  assert.match(world, /depthWrite=\{false\}/);
});

test('boundary atmosphere respects Reduced Motion and only drifts as decoration', () => {
  assert.match(world, /if \(!root\.current \|\| reducedMotion\) return/);
  assert.match(world, /clock\.elapsedTime \* \.009/);
  assert.match(world, /clock\.elapsedTime \* \.008/);
  assert.match(world, /clock\.elapsedTime \* \.014/);
});
