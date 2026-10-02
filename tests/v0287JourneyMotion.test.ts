import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/CalendarPage.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/journey-calendar-v0285.css', import.meta.url), 'utf8');

test('Journey month change avoids the oversized 3D fold animation', () => {
  assert.doesNotMatch(source, /rotateX/);
  assert.doesNotMatch(source, /popLayout/);
  assert.match(source, /AnimatePresence mode=\"wait\"/);
});

test('Journey calendar wrapper no longer adds perspective for month transitions', () => {
  assert.doesNotMatch(css, /perspective:\s*1900px/);
});
