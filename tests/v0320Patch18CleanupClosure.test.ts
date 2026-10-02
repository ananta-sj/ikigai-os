import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
const cleanup = read('scripts/cleanup-retired.mjs');

const retired = [
  'src/pages/NerdsPage.tsx',
  'src/nerds-v0311.css',
  'src/pages/PaperLabPage.tsx',
  'src/data/featureManifest.ts',
  'src/garden-v2.css',
  'src/home-v033.css',
  'src/journey-room-v0262.css',
  'src/journey-room-v0263.css',
  'src/journey-v070.css',
  'src/journey-v071.css',
  'src/sanctuary-v021.css',
  'src/components/DailyPage.tsx',
  'src/components/LogProgressModal.tsx',
  'src/components/garden/GardenWorld.tsx',
  'src/components/journey/JourneyRoom3D.tsx',
  'src/components/journey/JourneyStudyScene.tsx',
  'src/pages/PlaceholderPage.tsx',
  'src/lib/garden.ts',
  'src/lib/growth.ts',
  'src/data/roadmap.ts'
];

test('verify performs cross-platform retired-source cleanup before release audits', () => {
  assert.equal(pkg.scripts?.['cleanup:retired'], 'node scripts/cleanup-retired.mjs');
  assert.match(pkg.scripts?.verify ?? '', /^npm run cleanup:retired && npm run audit:release/);
});

test('unified cleanup is hash guarded, idempotent and covers every historical retirement', () => {
  assert.match(cleanup, /createHash\('sha256'\)/);
  assert.match(cleanup, /if \(!existsSync\(absolutePath\)\) continue/);
  assert.match(cleanup, /const expectedHashes = Array\.isArray\(expected\) \? expected : \[expected\]/);
  assert.match(cleanup, /Keeping locally modified/);
  assert.match(cleanup, /process\.exitCode = 2/);
  for (const path of retired) assert.match(cleanup, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('/', '\\/')));
});

test('the clean release tree contains none of the retired sources', () => {
  for (const path of retired) assert.equal(fs.existsSync(path), false, `${path} should be absent after cleanup`);
});

test('historical cleanup tests no longer require old patch-specific PowerShell helpers', () => {
  for (const path of [
    'tests/v0320Patch05Polish.test.ts',
    'tests/v0320Patch15ReleasePolish.test.ts',
    'tests/v0320Patch17FinalStabilization.test.ts'
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /APPLY_V0\.32\.0_PATCH_(?:05|15|17)_CLEANUP\.ps1/);
    assert.match(source, /scripts\/cleanup-retired\.mjs/);
  }
});
