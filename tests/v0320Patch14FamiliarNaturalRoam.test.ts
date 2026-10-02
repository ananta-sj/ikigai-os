import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sanctuary = fs.readFileSync('src/components/sanctuary/SanctuaryWorld.tsx', 'utf8');

test('Sanctuary Familiar movement is slow, locally random and cannot immediately backtrack', () => {
  assert.match(sanctuary, /if \(index === currentIndex \|\| index === previousIndex\) return 0/);
  assert.match(sanctuary, /forwardSteps === 1 \? 6\.4 : forwardSteps === 2 \? 1\.45 : \.18/);
  assert.match(sanctuary, /const base = activity === 'lively' \? \.52 : \.38/);
  assert.match(sanctuary, /period === 'night' \? base \* \.78 : base/);
  assert.match(sanctuary, /Math\.max\(6\.5, routeDistance \/ residentWalkSpeed\(\)\)/);
});

test('Sanctuary Familiar lingers and rests long enough to read as a resident instead of a patrol bot', () => {
  assert.match(sanctuary, /duration: 6\.5/);
  assert.match(sanctuary, /lively \? 4\.2 \+ Math\.random\(\) \* 3\.8 : 7\.5 \+ Math\.random\(\) \* 6\.5/);
  assert.match(sanctuary, /const lingerChance = activity === 'lively' \? \.12 : \.28/);
  assert.match(sanctuary, /residentRoam\.duration = residentRestDuration\([\s\S]*?\) \* \.55/);
});

test('direction changes happen only after committed legs and reverse travel faces the direction of motion', () => {
  assert.match(sanctuary, /direction: 1 as 1 \| -1/);
  assert.match(sanctuary, /legsSinceTurn >= residentRoam\.turnAfter/);
  assert.match(sanctuary, /turnAfter = 2 \+ Math\.floor\(Math\.random\(\) \* 3\)/);
  assert.match(sanctuary, /residentRoam\.direction === 1 && deltaT <= 0/);
  assert.match(sanctuary, /residentRoam\.direction === -1 && deltaT >= 0/);
  assert.match(sanctuary, /route\.getPoint\(routeT, routePoint\)/);
  assert.match(sanctuary, /route\.getTangent\(routeT, routeTangent\)/);
  assert.match(sanctuary, /if \(walking && residentRoam\.deltaT < 0\) routeTangent\.multiplyScalar\(-1\)/);
  assert.doesNotMatch(sanctuary, /route\.getPointAt\(routeT, routePoint\)/);
  assert.doesNotMatch(sanctuary, /route\.getTangentAt\(routeT, routeTangent\)/);
});

test('Familiar position smoothing is frame-rate aware instead of fixed-per-frame lerp', () => {
  assert.match(sanctuary, /const positionLambda = reducedMotion \? 100 : walking \? 13 : 5\.2/);
  assert.match(sanctuary, /THREE\.MathUtils\.damp\(group\.current\.position\.x/);
  assert.match(sanctuary, /THREE\.MathUtils\.damp\(group\.current\.position\.z/);
  assert.doesNotMatch(sanctuary, /group\.current\.position\.lerp\(targetPosition/);
});
