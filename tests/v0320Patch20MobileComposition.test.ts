import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');

test('Patch 20 compacts Today into a phone-first stationery composition', () => {
  const css = read('src/daily-desk-v026.css');
  assert.match(css, /Patch 20 · phone-first Today composition/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /daily026-desk:has\(\.daily026-paper-object\) \.daily026-sanctuary-postcard/);
  assert.match(css, /\.daily026-empty-task \{[\s\S]*min-height:52px/);
  assert.match(css, /\.daily026-paper-object,[\s\S]*width:min\(118px,33vw\)/);
});

test('Patch 20 gives desktop Now Playing a fuller intentional stage without adding product controls', () => {
  const css = read('src/now-playing-v030.css');
  assert.match(css, /Patch 20 · make the listening room feel composed, not vacant/);
  assert.match(css, /width:min\(100%,1040px\)/);
  assert.match(css, /min-height:390px/);
  assert.match(css, /now0319-stage::before/);
});
