import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const app = read('src/App.tsx');
const shell = read('src/components/AppShell.tsx');
const preload = read('src/lib/routePreload.ts');
const garden = read('src/pages/GardenPage.tsx');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const readme = read('Readme.md');
const releaseAudit = read('scripts/audit-release.mjs');

test('the shipped router has no hidden product-internals route', () => {
  assert.doesNotMatch(app, /NerdsPage|\/nerds/);
  assert.doesNotMatch(shell, /\/nerds|Workshop Ledger/);
  assert.doesNotMatch(preload, /\/nerds|NerdsPage/);
});

test('Sanctuary no longer opens implementation data from scenery or keyboard shortcuts', () => {
  assert.doesNotMatch(garden, /\/nerds|NerdsPage|featureManifest|preloadRoute/);
  assert.doesNotMatch(world, /Workshop|workshop|onWorkshopInteract/);
  assert.match(world, /TeaHouse/);
  assert.match(garden, /enterTeaHouse/);
});

test('release verification remains outside the product surface', () => {
  assert.doesNotMatch(releaseAudit, /featureManifest|FEATURE_MANIFEST_VERSION/);
  assert.doesNotMatch(readme, /\/nerds|For Nerds|Workshop Ledger|featureManifest/);
});
