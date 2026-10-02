import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const nav = fs.readFileSync(new URL('../src/components/FloatingDock.tsx', import.meta.url), 'utf8');
const navCss = fs.readFileSync(new URL('../src/navigation-v028.css', import.meta.url), 'utf8');

test('desktop navigation restores the original icon-only floating dock', () => {
  assert.match(nav, /className="floating-dock"/);
  assert.match(nav, /floating-nav-icon/);
  assert.match(nav, /floating-nav-label/);
  assert.match(nav, /floating-dock-glow/);
  assert.doesNotMatch(nav, /ik-compass-nav/);
  assert.doesNotMatch(nav, /ik-ribbon-nav/);
  assert.doesNotMatch(nav, /ik-orbit-dock/);
});

test('the restored dock keeps magnetic pointer response and route preloading', () => {
  assert.match(nav, /--mag-x/);
  assert.match(nav, /--mag-y/);
  assert.match(nav, /--dock-y/);
  assert.match(nav, /preloadRoute/);
});

test('the shell reserves space for the floating dock without reintroducing a sidebar', () => {
  assert.match(navCss, /\.living-shell \.main-stage\s*\{[^}]*padding-left:\s*0\s*!important/s);
  assert.match(navCss, /\.living-shell \.page\s*\{[^}]*padding-left:\s*clamp\(/s);
});


test('brand keeps one status indicator instead of a duplicate pulse badge', () => {
  assert.match(nav, /floating-brand-copy/);
  assert.match(nav, /status-dot/);
  assert.match(navCss, /\.floating-brand-mark::after\s*\{[^}]*content:\s*none\s*!important/s);
  assert.doesNotMatch(navCss, /@keyframes\s+ik-dock-breathe/);
});
