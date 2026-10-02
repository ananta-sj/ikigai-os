import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const legacyCss = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('legacy navigation styles stay scoped and cannot break semantic nav elements', () => {
  assert.match(legacyCss, /\.sidebar nav\s*\{/);
  assert.doesNotMatch(legacyCss, /(^|\n)nav\s*\{/);
});
