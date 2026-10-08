import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectDemoDist } from '../scripts/audit-demo-dist.mjs';

test('renamed repository rejects a built demo still referencing the previous base', () => {
  const root = mkdtempSync(join(tmpdir(), 'ikigai-demo-'));
  try {
    mkdirSync(join(root, 'assets')); writeFileSync(join(root, 'assets/app.js'), '// synthetic fixture');
    writeFileSync(join(root, 'index.html'), '<script type="module" src="/ikigai-os/assets/app.js"></script>');
    assert.match(inspectDemoDist(root, '/ikigai-space/').join('\n'), /wrong repository base/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('demo artifact requires actual entry files rather than only correctly prefixed URLs', () => {
  const root = mkdtempSync(join(tmpdir(), 'ikigai-demo-'));
  try {
    writeFileSync(join(root, 'index.html'), '<script type="module" src="/ikigai-space/assets/app.js"></script>');
    assert.match(inspectDemoDist(root).join('\n'), /missing local file/);
    mkdirSync(join(root, 'assets')); writeFileSync(join(root, 'assets/app.js'), '// synthetic fixture');
    assert.deepEqual(inspectDemoDist(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
