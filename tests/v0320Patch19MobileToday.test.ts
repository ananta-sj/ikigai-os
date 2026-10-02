import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const today = read('src/pages/TodayPage.tsx');
const desk = read('src/daily-desk-v026.css');
const familiar = read('src/components/CompanionPet.tsx');
const familiarCss = read('src/companion-pet.css');

test('phone Today uses an explicit two-leaf notebook instead of stacking the desktop spread', () => {
  assert.match(today, /daily026-mobile-leaf-tabs/);
  assert.match(today, /mobile-leaf-\$\{mobileLeaf\}/);
  assert.match(desk, /@media \(max-width:680px\)[\s\S]*daily026-mobile-leaf-tabs[\s\S]*display:grid/);
  assert.match(desk, /mobile-leaf-tasks \.daily026-page-sheet\.tasks/);
  assert.match(desk, /mobile-leaf-notes \.daily026-page-sheet\.notes/);
  assert.match(desk, /daily026-page-sheet[\s\S]*display:none/);
});

test('phone desk objects join the mobile flow instead of overlapping the notebook and dock', () => {
  assert.match(desk, /daily026-sanctuary-postcard[\s\S]*position:relative/);
  assert.match(desk, /daily026-handoff-tab[\s\S]*position:relative/);
  assert.match(desk, /daily026-eraser \{ display:none; \}/);
  assert.match(desk, /paper-size-large \.daily026-paper-object[\s\S]*68vw/);
});

test('Familiar reserves the mobile dock zone even after free placement', () => {
  assert.match(familiarCss, /--familiar-bottom-guard/);
  assert.match(familiarCss, /max\(104px, calc\(env\(safe-area-inset-bottom\) \+ 94px\)\)/);
  assert.match(familiar, /100dvh - var\(--familiar-bottom-guard/);
});
