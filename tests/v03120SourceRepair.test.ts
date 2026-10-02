import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const navigation = read('src/navigation-v028.css');
const viteEnv = read('src/vite-env.d.ts');
const repairTest = read('tests/v03120SourceRepair.test.ts');
const spotify = read('src/lib/nowPlaying.ts');
const vite = read('vite.config.ts');

test('living dock uses the softer capsule silhouette', () => {
  assert.match(navigation, /\.floating-dock\s*\{[\s\S]*border-radius:\s*30px\s*!important/);
});

test('source repair keeps Vite asset typing and Spotify regression coverage in code rather than a product inventory', () => {
  assert.match(viteEnv, /vite\/client/);
  assert.match(repairTest, /Spotify local development rejects localhost/);
});

test('Spotify local development rejects localhost and Vite binds explicit loopback', () => {
  assert.match(spotify, /spotifyRedirectUriIssue/);
  assert.match(vite, /host:\s*'127\.0\.0\.1'/);
});
