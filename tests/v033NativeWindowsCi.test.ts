import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(
  new URL('../.github/workflows/native-windows.yml', import.meta.url),
  'utf8'
);

test('native Windows workflow is isolated to the v0.33 native branch plus manual runs', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /branches:\s*\n\s*-\s*v0\.33-native/);
  assert.doesNotMatch(workflow, /branches:\s*\n\s*-\s*main/);
});

test('native Windows workflow keeps verification in front of packaging', () => {
  assert.match(workflow, /node-version:\s*'22\.12\.0'/);
  assert.match(workflow, /run:\s*npm ci/);
  assert.match(workflow, /run:\s*npm run verify/);
  assert.match(workflow, /run:\s*npm run audit:deps/);
});

test('native Windows workflow builds only NSIS and stores it as a workflow artifact', () => {
  assert.match(workflow, /dtolnay\/rust-toolchain@stable/);
  assert.match(workflow, /tauri-apps\/tauri-action@v1/);
  assert.match(workflow, /args:\s*--bundles nsis/);
  assert.match(workflow, /uploadWorkflowArtifacts:\s*true/);
  assert.doesNotMatch(workflow, /releaseName:/);
  assert.doesNotMatch(workflow, /tagName:/);
});
