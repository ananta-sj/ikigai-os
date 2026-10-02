import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/pages/CalendarPage.tsx', import.meta.url), 'utf8');

test('Journey uses the focused physical calendar rather than a study-world scene', () => {
  assert.doesNotMatch(source, /JourneyStudyScene/);
  assert.doesNotMatch(source, /JourneyRoom3D/);
  assert.match(source, /journey0285-calendar-wrap/);
});

test('Journey keeps the day sheet and direct calendar planning path', () => {
  assert.match(source, /<DaySheet/);
  assert.match(source, /onClick=\{\(\) => selectDay\(day\)\}/);
});
