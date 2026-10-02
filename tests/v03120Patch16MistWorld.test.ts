import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const ambientLife = read('src/components/sanctuary/SanctuaryAmbientLife.tsx');

test('Patch 16 turns the outside world into a continuous mist expanse', () => {
  assert.match(world, /planeGeometry args=\{\[92, 92\]\}/);
  assert.match(world, /const curtainHeight = 14/);
  assert.match(world, /const curtains: Array<\{ position:/);
  assert.match(world, /opacity=\{lowPower \? \.9 : \.88\}/);
  assert.match(world, /opacity=\{lowPower \? \.64 : \.58\}/);
  assert.match(world, /Four overlapping curtains make the terrestrial world beyond Sanctuary intentionally unknowable/);
});

test('authored terrestrial horizon scenery is no longer mounted outside the garden', () => {
  assert.doesNotMatch(world, /<DistantMountainLandscape\b/);
  assert.doesNotMatch(world, /<DistantVillage\b/);
  assert.doesNotMatch(world, /<CloudBank\b/);
  assert.doesNotMatch(world, /<HorizonMist\b/);
  assert.match(world, /Beyond the garden there is no authored terrestrial scene: only mist, sky, and ambient life/);
});

test('celestial and living ambient entities remain readable against the mist', () => {
  assert.match(world, /<mesh renderOrder=\{4\}><sphereGeometry args=\{\[1\.08,24,16\]\}/);
  assert.match(world, /<mesh renderOrder=\{4\}><sphereGeometry args=\{\[\.72,20,14\]\}/);
  assert.match(world, /scale=\{star\.scale\} renderOrder=\{4\}/);
  assert.match(world, /renderOrder=\{4\}><planeGeometry args=\{\[\.18,\.045\]\}/);
  assert.match(world, /<SanctuaryTimeLife period=\{period\}/);
  assert.match(ambientLife, /function PondFireflies\(/);
  assert.match(ambientLife, /function DayVisitor\(/);
});
