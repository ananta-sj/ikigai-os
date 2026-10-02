import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const sourceFiles = (dir: string): string[] => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = path.join(dir, entry.name);
  return entry.isDirectory() ? sourceFiles(rel) : [rel];
});

test('v0.31 removes legacy viewport, autofocus and native-confirm debt', () => {
  const files = sourceFiles('src');
  const css = files.filter(file => file.endsWith('.css')).map(read).join('\n');
  const tsx = files.filter(file => file.endsWith('.tsx')).map(read).join('\n');
  assert.equal(/\b100vh\b/.test(css), false);
  assert.equal(/\bautoFocus\b/.test(tsx), false);
  assert.equal(/window\.confirm\s*\(/.test(tsx), false);
});

test('confirmation dialogs use native modal semantics and conservative initial focus', () => {
  const dialog = read('src/components/ui/ConfirmDialog.tsx');
  assert.match(dialog, /<dialog/);
  assert.match(dialog, /showModal\(\)/);
  assert.match(dialog, /onCancel=/);
  assert.match(dialog, /cancelRef\.current\?\.focus/);
  assert.doesNotMatch(dialog, /autoFocus/);
});

test('custom modal focus helper traps Tab, supports Escape and restores the opener', () => {
  const helper = read('src/components/ui/dialogFocus.ts');
  assert.match(helper, /event\.key !== 'Tab'/);
  assert.match(helper, /event\.key === 'Escape'/);
  assert.match(helper, /previous\?\.isConnected/);
  assert.match(helper, /FOCUSABLE_SELECTOR/);
});

test('Roadmap checkpoint selection uses a native button beside its status control', () => {
  const roadmap = read('src/pages/RoadmapPage.tsx');
  assert.match(roadmap, /<button type="button" className="roadmap-checkpoint-select"/);
  assert.match(roadmap, /aria-pressed=\{selectedItem\?\.id === item\.id\}/);
  assert.doesNotMatch(roadmap, /roadmap-checkpoint .*role="button"/);
});

test('UI audit makes the v0.31 interaction fixes regression-blocking', () => {
  const audit = read('scripts/audit-ui.mjs');
  assert.match(audit, /autoFocus is disallowed after the v0\.31 modal-focus pass/);
  assert.match(audit, /native confirm is disallowed after v0\.31/);
  assert.match(audit, /100vh is disallowed after the v0\.31 responsive pass/);
});
