import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(path: string) { return fs.readFileSync(path, 'utf8'); }

const today = read('src/pages/TodayPage.tsx');
const css = read('src/daily-desk-v026.css');
const pkg = JSON.parse(read('package.json'));

test('v0.33 release keeps the explicit package boundary and preserves v0.32 migration history', () => {
  assert.equal(pkg.version, '0.33.0');
  assert.match(read('Readme.md'), /Current version:\*\* `v0\.33\.0/);
  assert.equal(fs.existsSync('MIGRATION_V0.33.0.md'), true);
  assert.equal(fs.existsSync('MIGRATION_V0.32.0.md'), true);
  assert.match(read('tests/versionGate.ts'), /versionAtLeast/);
});

test('Today reads existing Roadmap and Reflection context without creating a new persistence path', () => {
  assert.match(today, /listRoadmapPhases\(\)/);
  assert.match(today, /db\.weeklyReflections\.get\(weekStartKey\(dateFromKey\(today\)\)\)/);
  assert.match(today, /setCurrentPhase\(phaseForDate\(roadmapPhases, today\) \?\? null\)/);
  assert.doesNotMatch(today, /db\.weeklyReflections\.put\(/);
  assert.doesNotMatch(today, /createRoadmapPhase\(/);
});

test('Today continuity stays a quiet paper thread instead of a dashboard panel', () => {
  assert.match(today, /THREADS FROM TODAY/);
  assert.match(today, /to="\/roadmap"/);
  assert.match(today, /\/reflection/);
  assert.match(today, /No chapter covers today\./);
  assert.match(today, /One sentence is enough\./);
  assert.match(css, /\.daily032-thread/);
  assert.match(css, /border-bottom:1px dotted/);
});
