import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const page = read('src/pages/GardenPage.tsx');
const data = read('src/data/sanctuary.ts');

test('Sanctuary atmosphere now has continuous local light and layered depth', () => {
  for (const component of ['AtmosphericLightRig', 'HorizonMist', 'BirdFlock', 'DriftingLeaves', 'ForegroundFraming']) {
    assert.match(world, new RegExp(`function ${component}\\b`));
  }
  assert.match(page, /sanctuaryDayProgress/);
  assert.match(page, /dayProgress=\{dayProgress\}/);
  assert.match(world, /solarAngle/);
  assert.match(world, /cinematicDrift=\{interactionMode === 'stillness'\}/);
});

test('Moon Pond has a real edge treatment rather than one flat transparent disc', () => {
  assert.match(world, /meshPhysicalMaterial/);
  assert.match(world, /clearcoat=\{\.72\}/);
  assert.match(world, /rippleRefs/);
  assert.match(world, /const reeds = useMemo/);
  assert.match(world, /const basin =/);
});

test('the establishing camera is intentionally offset to frame several Sanctuary districts', () => {
  assert.match(data, /slightly offset establishing shot/);
  assert.match(data, /target: \[-0\.45, 1\.08, -0\.8\]/);
  assert.match(data, /yaw: 0\.22/);
  assert.ok(!/target: \[0, 1\.0, 0\.8\]/.test(data));
});

test('ambient motion respects Reduced Motion and balanced quality', () => {
  assert.match(world, /lowPower \? 3 : 7/);
  assert.match(world, /lowPower \? 12 : 26/);
  assert.match(world, /if \(!flock\.current \|\| reducedMotion\) return/);
  assert.match(world, /const travel = reducedMotion \? 0/);
});
