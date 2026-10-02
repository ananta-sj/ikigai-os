import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const page = read('src/pages/GardenPage.tsx');
const data = read('src/data/sanctuary.ts');
const css = read('src/sanctuary-v023.css');

test('Sanctuary keeps the richer original landscape without a second progress system', () => {
  for (const component of ['DistantMountainLandscape', 'DistantVillage', 'CloudBank', 'BlossomGrove', 'GardenStream', 'PondBridge', 'QuietStreet']) {
    assert.match(world, new RegExp(`function ${component}\\b`));
  }
  assert.match(world, /const koi = useRef<THREE\.Group>/);
  assert.match(world, /function TeaHouse\b/);
  assert.match(world, /function ScenicSeats\b/);
  assert.doesNotMatch(world, /nagomi/i);
});

test('benches enter named Stillness views and the street keeps dedicated scenic compositions', () => {
  assert.match(data, /'lantern-street'/);
  assert.match(data, /'tea-house'/);
  assert.match(data, /label: 'Lantern street'/);
  assert.match(data, /label: 'Tea house window'/);
  assert.match(world, /onStillnessRequest\?: \(view: SanctuaryStillViewId\) => void/);
  assert.match(world, /onSit=\{interactionMode === 'explore' \? onStillnessRequest : undefined\}/);
  assert.match(page, /function enterStillness\(viewId\?: SanctuaryStillViewId\)/);
  assert.match(page, /onStillnessRequest=\{enterStillness\}/);
});

test('the street tea house is an ambient Sanctuary interaction rather than a route to product internals', () => {
  assert.match(page, /function enterTeaHouse\(\)/);
  assert.match(page, /enterStillness\('tea-house'\)/);
  assert.match(world, /onTeaHouseInteract\?: \(\) => void/);
  assert.match(world, /event\.key\.toLowerCase\(\) === 's'/);
  assert.doesNotMatch(world, /Workshop|workshop/);
});

test('persistent Sanctuary guidance stays quiet and Stillness can disappear into the scenery', () => {
  assert.match(page, /sanctuary-world-hint/);
  assert.match(page, /click a bench to sit/);
  assert.match(page, /the tea house is open/);
  assert.match(page, /stillHudVisible/);
  assert.match(css, /\.sanctuary-stillness-hud\.is-hidden/);
  assert.match(css, /pointer-events:none/);
});
