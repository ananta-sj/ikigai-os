import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const readme = read('Readme.md');
const smoke = read('UI_SMOKE_CHECKLIST_V0.31.md');
const evidence = read('RELEASE_EVIDENCE_V0.32.md');

test('Patch 17 release docs describe the current Sanctuary boundary and quality contract', () => {
  assert.match(readme, /Patch 17 release-closure sync/);
  assert.match(readme, /mist-sealed world boundary/);
  assert.match(readme, /Patch 16 mist-world closure/);
  assert.doesNotMatch(readme, /layered horizon mist/);

  assert.match(smoke, /Auto\/Balanced\/Lush quality modes/);
  assert.match(smoke, /all four Sanctuary boundaries remain fully concealed by mist|Orbit low toward north, south, east and west boundaries/);
  assert.doesNotMatch(smoke, /Sanctuary Low\/Balanced\/High quality modes/);

  assert.match(evidence, /v0\.32\.0/);
  assert.match(evidence, /mist-sealed perimeter/);
  assert.match(evidence, /Auto\/Balanced\/Lush/);
  assert.doesNotMatch(evidence, /Integrated-GPU laptop tested in Low\/Balanced\/High/);
});

test('Patch 17 keeps visual acceptance explicitly browser-bound rather than claiming source proof', () => {
  assert.match(smoke, /Source tests cannot prove the resulting 3D composition/);
  assert.match(evidence, /no browser\/device item below should be checked from source evidence alone/);
  assert.match(evidence, /fresh `dist` artifact audit|fresh `dist` artifact/i);
  assert.match(smoke, /Career.*Add project.*Add proof.*Opportunity.*Roadmap.*Create\/Edit phase.*Add checkpoint/s);
  assert.match(smoke, /Patch-12 camera-floor protection/);
});
