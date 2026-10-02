import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const journey = fs.readFileSync(new URL('../src/pages/CalendarPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/journey-calendar-v0285.css', import.meta.url), 'utf8');

test('Journey uses the focused calendar instead of the experimental study world', () => {
  assert.doesNotMatch(journey, /JourneyStudyScene/);
  assert.doesNotMatch(journey, /journey-room-v0263\.css/);
  assert.match(journey, /journey0285-calendar-wrap/);
  assert.match(journey, /journey0285-grid/);
});

test('date interaction keeps the temporary paper sheet rather than a permanent inspector', () => {
  assert.match(journey, /onClick=\{\(\) => selectDay\(day\)\}/);
  assert.match(journey, /sheetOpen && selected/);
  assert.match(journey, /<DaySheet/);
  assert.doesNotMatch(journey, /journey-inspector/);
  assert.match(css, /temporary paper, never a permanent inspector\/sidebar/);
});

test('physical month navigation remains available without the oversized 3D fold', () => {
  assert.doesNotMatch(journey, /rotateX:/);
  assert.match(journey, /journey0285-page-turn prev/);
  assert.match(journey, /journey0285-page-turn next/);
  assert.match(journey, /AnimatePresence mode=\"wait\"/);
});
