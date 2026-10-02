import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FOCUS_TIMER_MAX_MINUTES,
  FOCUS_TIMER_PRESETS,
  applyFocusTimerPresetState,
  createDefaultFocusTimerState
} from '../src/lib/focusTimerCore.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const focusPage = read('src/pages/FocusPage.tsx');
const css = read('src/focus-v029.css');

test('v0.31.7 expands useful focus and rest presets without auto chaining', () => {
  assert.deepEqual(
    FOCUS_TIMER_PRESETS.filter(preset => preset.mode === 'focus').map(preset => preset.minutes),
    [15, 25, 45, 50, 90]
  );
  assert.deepEqual(
    FOCUS_TIMER_PRESETS.filter(preset => preset.mode === 'rest').map(preset => preset.minutes),
    [5, 10, 15, 20]
  );
  assert.match(focusPage, /Focus and rest never auto-chain/i);
});

test('custom duration accepts one to four hours and still resets to an idle explicit session', () => {
  assert.equal(FOCUS_TIMER_MAX_MINUTES, 240);
  const initial = createDefaultFocusTimerState(0);
  const custom = applyFocusTimerPresetState(initial, { mode: 'focus', minutes: 137 }, 100);
  assert.equal(custom.durationMinutes, 137);
  assert.equal(custom.remainingMs, 137 * 60_000);
  assert.equal(custom.status, 'idle');
  const clamped = applyFocusTimerPresetState(initial, { mode: 'rest', minutes: 999 }, 200);
  assert.equal(clamped.durationMinutes, 240);
});

test('Focus Room exposes native fullscreen with a CSS fallback and an in-room exit', () => {
  assert.match(focusPage, /requestFullscreen/);
  assert.match(focusPage, /document\.exitFullscreen/);
  assert.match(focusPage, /setFallbackImmersive\(true\)/);
  assert.match(focusPage, /Enter distraction-free fullscreen/);
  assert.match(focusPage, /Full screen/);
  assert.match(focusPage, /Exit focus view/);
  assert.match(css, /focus029-room\.is-distraction-free:not\(:fullscreen\)/);
  assert.match(css, /focus029-room:fullscreen/);
  assert.match(css, /focus029-note[\s\S]*display:\s*none/);
});
