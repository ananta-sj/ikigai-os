import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const ambientLife = read('src/components/sanctuary/SanctuaryAmbientLife.tsx');
const tasks = read('src/lib/tasks.ts');
const rewards = read('src/lib/rewards.ts');

test('Patch 11 gives Stillness its own repeatable cinematic camera travel without trapping user input', () => {
  assert.match(world, /type CameraTransition =/);
  assert.match(world, /applyCamera\(requestedCamera, \{ cinematic: true \}\)/);
  assert.match(world, /targetProgress = THREE\.MathUtils\.smoothstep/);
  assert.match(world, /poseProgress = THREE\.MathUtils\.smootherstep/);
  assert.match(world, /const cancelCameraTransition = \(\) =>/);
  assert.match(world, /if \(immediate \|\| reducedMotion\)/);
  assert.match(world, /cancelCameraTransition\(\);[\s\S]*?setPointerCapture/);
});

test('Moon Pond gains layered shore, environment-toned water and cheap koi depth cues', () => {
  assert.match(world, /const shore = new THREE\.Color/);
  assert.match(world, /ringGeometry args=\{\[\.91,1,64\]\}/);
  assert.match(world, /const waterSurface = new THREE\.Color\(palette\.water\)\.lerp\(new THREE\.Color\(palette\.sky\)/);
  assert.match(world, /const skySheen =/);
  assert.match(world, /color="#27362f" transparent opacity=\{\.12\}/);
  assert.match(world, /color="#fff4dd" transparent opacity=\{\.2\}/);
});

test('time-sensitive ambient life stays bounded and disappears under Reduced Motion', () => {
  assert.match(ambientLife, /function PondFireflies/);
  assert.match(ambientLife, /const count = lowPower \? 6 : 11/);
  assert.match(ambientLife, /function DayVisitor/);
  assert.match(ambientLife, /const visibleFor = lowPower \? 7 : 11/);
  assert.match(ambientLife, /if \(reducedMotion\) return null/);
  assert.match(ambientLife, /period === 'night' \|\| period === 'dusk'/);
  assert.match(ambientLife, /period === 'day'/);
  assert.match(world, /<SanctuaryTimeLife period=\{period\}/);
});

test('the Familiar now rests at authored world interactions rather than one generic pause point', () => {
  for (const stop of ['guardian-rest', 'watch-koi', 'pavilion-step', 'lantern-pause', 'tea-step', 'lookout-rest']) {
    assert.match(world, new RegExp(stop));
  }
  assert.match(world, /chooseNextResidentStop/);
  assert.match(world, /if \(period === 'night'\)/);
  assert.match(world, /residentRestDuration/);
  assert.match(world, /restingId === 'watch-koi'/);
  assert.match(world, /restingId === 'lantern-pause'/);
  assert.match(world, /let restingYaw: number = destinationStop\.yaw/);
  assert.doesNotMatch(world, /group\.current\.lookAt\(camera\.position/);
});

test('Patch 11 keeps the reward ledger contract untouched while street light pools remain decorative', () => {
  assert.match(tasks, /gardenRewardedAt/);
  assert.match(rewards, /growth:\s*8/);
  assert.match(rewards, /growth:\s*18/);
  assert.match(rewards, /growth:\s*36/);
  assert.match(rewards, /growth:\s*70/);
  assert.match(world, /function WarmLightPool/);
  assert.match(world, /<WarmLightPool position=\{\[\.28,\.025,1\.02\]\}/);
});

test('Sanctuary camera cannot cross below terrain or the Moon Pond surface', () => {
  assert.match(world, /const CAMERA_MIN_PITCH = \.015/);
  assert.match(world, /function cameraFloorHeight\(x: number, z: number\)/);
  assert.match(world, /const pondDx = \(x \+ 7\) \/ 2\.9/);
  assert.match(world, /desired\.y = Math\.max\(desired\.y, cameraFloorHeight\(desired\.x, desired\.z\)\)/);
  assert.match(world, /camera\.position\.y = Math\.max\(camera\.position\.y, cameraFloorHeight\(camera\.position\.x, camera\.position\.z\)\)/);
  assert.match(world, /state\.pitch \+ dy \* \.0037, CAMERA_MIN_PITCH, \.5/);
  assert.match(world, /event\.key === 'ArrowUp' \? -\.07 : \.07\), CAMERA_MIN_PITCH, \.5/);
});
