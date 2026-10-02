import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const shell = read('src/components/AppShell.tsx');
const dock = read('src/components/FloatingDock.tsx');
const focus = read('src/pages/FocusPage.tsx');
const timer = read('src/lib/focusTimer.ts');
const css = read('src/focus-v029.css');
const db = read('src/db.ts');

test('v0.29 registers Focus Room in the existing route and Living Dock contracts', () => {
  assert.match(app, /path:\s*['"]\/focus['"]/);
  assert.match(dock, /\['Focus', '\/focus', TimerReset\]/);
  assert.match(shell, /'\/focus': 'Focus Room'/);
  assert.match(shell, /<GlobalFocusTimer\s*\/>/);
});

test('focus timer is device-local persistent state rather than a second sync product', () => {
  assert.match(db, /focusTimer!:\s*Table<FocusTimerState/);
  assert.match(db, /this\.version\(13\)/);
  assert.match(db, /focusTimer:\s*'id, updatedAt'/);
  assert.doesNotMatch(read('src/lib/sync.ts'), /'focusTimer'/);
});

test('focus room keeps deliberate sessions pressure-free', () => {
  assert.match(focus, /Focus and rest never auto-chain/i);
  assert.match(focus, /No score · no streak · no automatic next round/i);
  assert.doesNotMatch(focus, /\bXP\b|streak count|leaderboard/i);
});

test('timer supports opt-in completion notifications without exposing the intention', () => {
  assert.match(timer, /Notification\.requestPermission/);
  assert.match(timer, /Focus session complete/);
  assert.match(timer, /Your focus block has ended\./);
  assert.doesNotMatch(timer, /state\.intention.*new Notification/s);
});

test('global timer styling is available even when Focus Room has not been opened', () => {
  assert.match(read('src/components/GlobalFocusTimer.tsx'), /import '\.\.\/focus-v029\.css'/);
  assert.match(css, /\.focus029-global/);
  assert.match(css, /data-ikigai-motion='reduced'/);
});
