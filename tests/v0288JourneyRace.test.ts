import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/CalendarPage.tsx', import.meta.url), 'utf8');

test('Journey ignores stale async month snapshots during rapid navigation', () => {
  assert.match(source, /const monthRequestRef = useRef\(0\)/);
  assert.match(source, /const requestId = \+\+monthRequestRef\.current/);
  assert.match(source, /if \(requestId !== monthRequestRef\.current\) return/);
});
