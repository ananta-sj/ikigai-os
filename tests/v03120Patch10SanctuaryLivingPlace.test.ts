import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const page = read('src/pages/GardenPage.tsx');
const audio = read('src/lib/sanctuaryAudio.ts');

test('Sanctuary foliage shares one wind field and reduced motion avoids per-frame grass work', () => {
  assert.match(world, /function sanctuaryWindAt\(/);
  assert.match(world, /const wind = animate \? sanctuaryWindAt\(time, item\.x, item\.z\) : 0/);
  assert.match(world, /function BlossomGrove[\s\S]*?sanctuaryWindAt\(clock\.elapsedTime, 7, 2\.5\)/);
  assert.match(world, /function ForegroundFraming[\s\S]*?sanctuaryWindAt\(clock\.elapsedTime, 11, 7\)/);
  assert.match(world, /useFrame\(\(\{ clock \}\) => \{\s*if \(reducedMotion\) return;\s*writeMatrices/);
});

test('Sanctuary Familiar now walks the landscape, rests in stillness and keeps an opaque tail', () => {
  assert.match(world, /const restAnchors = useMemo<Record<SanctuaryStillViewId/);
  assert.match(world, /const walking = !fixedRest/);
  assert.match(world, /THREE\.MathUtils\.damp\(group\.current\.position\.x/);
  assert.match(world, /THREE\.MathUtils\.damp\(group\.current\.position\.z/);
  assert.match(world, /const desiredYaw = \(walking \? Math\.atan2\(routeTangent\.x, routeTangent\.z\) : restingYaw\) \+ yawOffset/);
  assert.doesNotMatch(world, /group\.current\.lookAt\(camera\.position/);
  assert.match(world, /transparent=\{false\} opacity=\{1\}/);
  assert.match(page, /stillnessViewId=\{stillness \? stillView\.id : null\}/);
});

test('Sanctuary ambience changes by district without adding a second audio toggle', () => {
  assert.match(audio, /SanctuaryAudioZone = 'grove' \| 'pond' \| 'pavilion' \| 'street' \| 'lookout'/);
  assert.match(audio, /function zoneProfile\(zone: SanctuaryAudioZone\)/);
  assert.match(audio, /signature = `\$\{theme\}:\$\{period\}:\$\{zone\}`/);
  assert.match(page, /function sanctuaryAudioZoneFor/);
  assert.match(page, /startSanctuaryAmbience\(theme, period, ambientZone\)/);
  assert.equal((page.match(/sanctuaryAmbientSound/g) ?? []).length >= 2, true);
});

test('Lantern Street, tea house and pavilion have authored place details rather than empty shells', () => {
  assert.match(world, /function StreetLanternLine\(/);
  assert.match(world, /function PavilionGarden\(/);
  assert.match(world, /noren-/);
  assert.match(world, /clearcoat=\{\.52\}/);
  assert.match(world, /<PavilionGarden palette=\{palette\} period=\{period\} lowPower=\{lowPower\} \/>/);
});
