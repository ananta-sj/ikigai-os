import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { versionAtLeast } from './versionGate.ts';

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const packageJson = JSON.parse(read('package.json')) as { version: string; scripts: Record<string, string> };
const workflow = read('.github/workflows/release-gate.yml');
const releaseAudit = read('scripts/audit-release.mjs');
const readme = read('Readme.md');
const roadmap = read('REIMAGINE_ROADMAP.md');
const migration = read('MIGRATION_V0.31.14.md');
const evidence = read('RELEASE_EVIDENCE_V0.32.md');

test('v0.31.14 release preflight remains present in later v0.31 builds without prematurely cutting v0.32', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.14'), `expected 0.31.14 or newer, got ${packageJson.version}`);
  assert.match(packageJson.scripts['audit:release'], /scripts\/audit-release\.mjs/);
  assert.match(packageJson.scripts.verify, /audit:release/);
  assert.match(readme, /v0\.31\.14 release candidate preflight/i);
  assert.match(roadmap, /v0\.31\.14 release candidate preflight/);
  assert.match(roadmap, /do \*\*not\*\* cut v0\.32 from source checks alone/i);
  assert.match(migration, /release candidate preflight/i);
});

test('release workflow proves clean install and verification across supported Node boundaries', () => {
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /'20\.19\.0'/);
  assert.match(workflow, /'22\.12\.0'/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm run verify/);
  assert.match(workflow, /run:\s*npm run audit:deps/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /path:\s*dist/);
});

test('release audit guards version, PWA, CI and manual evidence contracts', () => {
  assert.match(releaseAudit, /MIGRATION_V\$\{version\}\.md/);
  assert.match(releaseAudit, /icon-192\.png/);
  assert.match(releaseAudit, /icon-512\.png/);
  assert.match(releaseAudit, /Journey ghost-sheet regression check/);
  assert.match(releaseAudit, /RELEASE_EVIDENCE_V0\.32\.md/);
});

test('v0.32 evidence ledger keeps non-source release gates explicit', () => {
  for (const heading of [
    '## Automated gate',
    '## Browser matrix',
    '## Assistive technology',
    '## Touch / mobile',
    '## PWA / offline / update',
    '## Hostile-data browser checks',
    '## Sanctuary performance',
    '## Release decision'
  ]) assert.ok(evidence.includes(heading), `missing ${heading}`);
});
