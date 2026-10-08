import test from 'node:test';
import assert from 'node:assert/strict';
import { appPath } from '../src/lib/appPaths';

test('native/root build keeps public assets and recovery/reset routes at root', () => {
  for (const path of ['/', '/settings', '/welcome', '/assets/sanctuary/guardian_tree.glb', '/audio/tear/reference-a.ogg']) {
    assert.equal(appPath(path, '/'), path);
  }
});

test('renamed Pages demo keeps public assets and recovery/reset routes inside its base', () => {
  for (const path of ['/', '/settings', '/welcome', '/assets/sanctuary/guardian_tree.glb', '/audio/tear/reference-a.ogg']) {
    assert.equal(appPath(path, '/ikigai-space/'), '/ikigai-space' + path);
  }
});

test('base joining preserves query/hash and accepts a base without a trailing slash', () => {
  assert.equal(appPath('settings?view=data#restore', '/ikigai-space'), '/ikigai-space/settings?view=data#restore');
  assert.equal(appPath('//welcome', '/ikigai-space/'), '/ikigai-space/welcome');
});
