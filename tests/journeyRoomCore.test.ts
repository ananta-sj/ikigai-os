import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDayIndexFromUv, journeyRoomFocusLabel } from '../src/lib/journeyRoomCore.ts';

test('calendar UV mapping ignores non-grid areas', () => {
  assert.equal(calendarDayIndexFromUv(0.5, 0.9), null); // title/header area in top-down coordinates
  assert.equal(calendarDayIndexFromUv(0.01, 0.5), null);
});

test('calendar UV mapping resolves first and last grid cells', () => {
  // Convert intended top-down points to Three.js bottom-up UV Y.
  assert.equal(calendarDayIndexFromUv(0.06, 1 - 0.32), 0);
  assert.equal(calendarDayIndexFromUv(0.94, 1 - 0.88), 41);
});

test('journey room focus labels remain meaningful', () => {
  assert.match(journeyRoomFocusLabel('calendar'), /click a date/i);
  assert.match(journeyRoomFocusLabel('plant'), /Sanctuary/i);
  assert.match(journeyRoomFocusLabel('overview'), /drag to look around/i);
});
