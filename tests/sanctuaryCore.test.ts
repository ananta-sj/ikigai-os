import assert from 'node:assert/strict';
import test from 'node:test';
import { sanctuaryHomeCamera, sanctuaryRegions } from '../src/data/sanctuary.ts';

test('sanctuary regions are unique and have finite camera presets', () => {
  assert.equal(sanctuaryRegions.length, 5);
  assert.equal(new Set(sanctuaryRegions.map(region => region.id)).size, sanctuaryRegions.length);

  for (const region of sanctuaryRegions) {
    assert.equal(region.position.length, 3);
    assert.ok(region.position.every(Number.isFinite));
    assert.equal(region.camera.target.length, 3);
    assert.ok(region.camera.target.every(Number.isFinite));
    assert.ok(Number.isFinite(region.camera.yaw));
    assert.ok(Number.isFinite(region.camera.pitch));
    assert.ok(region.camera.distance > 0);
  }
});

test('sanctuary home camera is valid and comfortably outside the world center', () => {
  assert.ok(sanctuaryHomeCamera.target.every(Number.isFinite));
  assert.ok(Number.isFinite(sanctuaryHomeCamera.yaw));
  assert.ok(Number.isFinite(sanctuaryHomeCamera.pitch));
  assert.ok(sanctuaryHomeCamera.distance >= 10);
});
