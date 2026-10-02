import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFocusTimerPresetState,
  completeFocusTimerState,
  createDefaultFocusTimerState,
  focusTimerProgress,
  focusTimerRemainingMs,
  formatFocusTimer,
  pauseFocusTimerState,
  resetFocusTimerState,
  startFocusTimerState
} from '../src/lib/focusTimerCore.ts';

test('focus timer stores a real end timestamp so background time does not stretch', () => {
  const initial = createDefaultFocusTimerState(1_000_000);
  const running = startFocusTimerState(initial, 1_000_000);
  assert.equal(running.status, 'running');
  assert.equal(Date.parse(running.endsAt!), 1_000_000 + 25 * 60_000);
  assert.equal(focusTimerRemainingMs(running, 1_000_000 + 90_000), 23 * 60_000 + 30_000);
});

test('pause freezes the timestamp-derived remainder and resume creates a new end time', () => {
  const initial = createDefaultFocusTimerState(2_000_000);
  const running = startFocusTimerState(initial, 2_000_000);
  const paused = pauseFocusTimerState(running, 2_000_000 + 5 * 60_000);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingMs, 20 * 60_000);
  assert.equal(paused.endsAt, undefined);

  const resumed = startFocusTimerState(paused, 3_000_000);
  assert.equal(Date.parse(resumed.endsAt!), 3_000_000 + 20 * 60_000);
  assert.equal(resumed.startedAt, running.startedAt);
});

test('expired running timer settles once into a complete state', () => {
  const initial = applyFocusTimerPresetState(createDefaultFocusTimerState(0), { mode: 'rest', minutes: 5 }, 0);
  const running = startFocusTimerState(initial, 10_000);
  const completed = completeFocusTimerState(running, 10_000 + 5 * 60_000 + 1);
  assert.equal(completed.status, 'complete');
  assert.equal(completed.remainingMs, 0);
  assert.equal(completed.mode, 'rest');
  assert.ok(completed.completedAt);
  assert.strictEqual(completeFocusTimerState(completed, 999_999), completed);
});

test('preset changes reset the timer without auto-starting another round', () => {
  const initial = createDefaultFocusTimerState(0);
  const deep = applyFocusTimerPresetState(initial, { mode: 'focus', minutes: 50 }, 100);
  assert.equal(deep.status, 'idle');
  assert.equal(deep.durationMinutes, 50);
  assert.equal(deep.remainingMs, 50 * 60_000);

  const rest = applyFocusTimerPresetState(deep, { mode: 'rest', minutes: 5 }, 200);
  assert.equal(rest.status, 'idle');
  assert.equal(rest.mode, 'rest');
  assert.equal(rest.remainingMs, 5 * 60_000);
});

test('reset returns the current pace to a full idle timer', () => {
  const initial = createDefaultFocusTimerState(0);
  const running = startFocusTimerState(initial, 1_000);
  const paused = pauseFocusTimerState(running, 61_000);
  const reset = resetFocusTimerState(paused, 70_000);
  assert.equal(reset.status, 'idle');
  assert.equal(reset.remainingMs, 25 * 60_000);
  assert.equal(reset.startedAt, undefined);
});

test('formatting and progress stay bounded', () => {
  const initial = createDefaultFocusTimerState(0);
  assert.equal(formatFocusTimer(25 * 60_000), '25:00');
  assert.equal(formatFocusTimer(0), '00:00');
  const running = startFocusTimerState(initial, 0);
  assert.equal(focusTimerProgress(running, 0), 0);
  assert.equal(focusTimerProgress(running, 25 * 60_000), 1);
});
