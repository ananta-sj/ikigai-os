import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };
const designCss = read('src/design-system.css');
const navigationCss = read('src/navigation-v028.css');
const dock = read('src/components/FloatingDock.tsx');
const migration = read('MIGRATION_V0.31.16.md');

test('v0.31.16 suppresses document-style text selection inside the app shell', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.16'), `expected 0.31.16 or newer, got ${packageJson.version}`);
  assert.match(designCss, /\.app-shell\s*\{[\s\S]*?-webkit-user-select:\s*none;[\s\S]*?user-select:\s*none;/);
});

test('editable text surfaces explicitly retain native selection behavior', () => {
  assert.match(designCss, /\.app-shell\s+:where\([\s\S]*?input,[\s\S]*?textarea,[\s\S]*?\[contenteditable='true'\],[\s\S]*?\[contenteditable='plaintext-only'\],[\s\S]*?\[data-ikigai-selectable='true'\][\s\S]*?\)\s*\{[\s\S]*?user-select:\s*text;/);
});

test('Living Dock and brand navigation block native anchor drag behavior', () => {
  assert.match(dock, /className="floating-brand"[\s\S]*?draggable=\{false\}[\s\S]*?onDragStart=\{event => event\.preventDefault\(\)\}/);
  assert.match(dock, /className="floating-dock"[\s\S]*?onDragStart=\{event => event\.preventDefault\(\)\}/);
  assert.match(dock, /aria-label=\{label\}[\s\S]*?draggable=\{false\}[\s\S]*?className=\{\(\{ isActive \}\)/);
  assert.match(navigationCss, /\.floating-brand,[\s\S]*?\.floating-dock \*[\s\S]*?\{[\s\S]*?-webkit-user-drag:\s*none;/);
});

test('interaction guardrails remain documented in release evidence rather than an in-app inventory', () => {
  assert.match(migration, /text selection/i);
  assert.match(migration, /drag/i);
});
