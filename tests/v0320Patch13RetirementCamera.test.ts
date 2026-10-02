import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const app = read('src/App.tsx');
const styles = read('src/styles.css');
const sanctuary = read('src/components/sanctuary/SanctuaryWorld.tsx');
const cleanup = read('scripts/cleanup-retired.mjs');

test('Paper Lab is retired from the shipped product while old bookmarks return to Today', () => {
  assert.doesNotMatch(app, /lazyNamed\(\(\) => import\('\.\/pages\/PaperLabPage'\)/);
  assert.match(app, /path:\s*'\/paper-lab',[\s\S]*?<Navigate to="\/" replace \/>/);
  assert.equal(fs.existsSync('src/pages/PaperLabPage.tsx'), false);
  assert.match(cleanup, /src\/pages\/PaperLabPage\.tsx/);
  assert.match(cleanup, /9130ad252df1002337521acf92cd4cc61468f946a7259d062537b8846d6e5236/);
  assert.doesNotMatch(styles, /\.paper-lab-(?:page|header|workbench|diagnostics|button)/);
});

test('Sanctuary orbit stays directly under the pointer instead of double-damping drag input', () => {
  assert.match(sanctuary, /if \(dragging\.current && !reducedMotion\) \{[\s\S]*?pose\.current\.yaw = goal\.current\.yaw;[\s\S]*?pose\.current\.pitch = goal\.current\.pitch;[\s\S]*?pose\.current\.distance = goal\.current\.distance;[\s\S]*?target\.current\.copy\(targetGoal\.current\);/);
  assert.match(sanctuary, /const cameraT = reducedMotion \|\| dragging\.current\s*\? 1/);
  assert.match(sanctuary, /inertia\.current\.yaw = THREE\.MathUtils\.damp\(inertia\.current\.yaw, 0, 7\.2, dt\)/);
  assert.match(sanctuary, /camera\.position\.lerp\(desired, cameraT\)/);
});

test('Sanctuary Familiar roams between safe authored stops instead of following a visible circular loop', () => {
  assert.doesNotMatch(sanctuary, /cycleIndex\s*=\s*Math\.floor\(elapsed\s*\/\s*cycleLength\)/);
  assert.match(sanctuary, /chooseNextResidentStop/);
  assert.match(sanctuary, /forwardSteps === 1 \? 6\.4 : forwardSteps === 2 \? 1\.45 : \.18/);
  assert.match(sanctuary, /index === currentIndex \|\| index === previousIndex/);
  assert.match(sanctuary, /Math\.random\(\) \* total/);
  assert.match(sanctuary, /residentRestDuration/);
  assert.match(sanctuary, /residentRoam\.phase = 'walk'/);
  assert.match(sanctuary, /residentRoam\.phase = 'rest'/);
  assert.match(sanctuary, /route\.getPoint\(routeT, routePoint\)/);
});
