import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('src/daily-desk-v026.css', 'utf8');

test('Patch 22 keeps the phone notebook leaf opaque over the dark desk', () => {
  assert.match(css, /Patch 22 · mobile notebook paper stays paper/);
  assert.match(css, /@media \(max-width:680px\)[\s\S]*\.daily026-page-sheet \{[\s\S]*#f5eddc;/);
  assert.match(css, /\.daily026-page-sheet\.tasks,[\s\S]*\.daily026-page-sheet\.notes \{[\s\S]*background-color:#f5eddc;/);
});
