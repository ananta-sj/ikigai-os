import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const career = fs.readFileSync(new URL('../src/pages/CareerPage.tsx', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../src/components/FloatingDock.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('Career does not import the unsupported Lucide Github brand icon', () => {
  assert.doesNotMatch(career, /\bGithub\b/);
  assert.match(career, /TerminalSquare/);
});

test('desktop navigation no longer falls back to the old Orbit Dock', () => {
  assert.doesNotMatch(nav, /ik-orbit-dock/);
  assert.match(nav, /Today/);
  assert.match(nav, /Journey/);
  assert.match(nav, /Sanctuary/);
  assert.match(nav, /Companion/);
});

test('router provides a friendly route-level recovery surface', () => {
  assert.match(app, /function RouteErrorPage/);
  assert.match(app, /errorElement:\s*<RouteErrorPage\s*\/>/);
  assert.doesNotMatch(app, /Unexpected Application Error!/);
});
