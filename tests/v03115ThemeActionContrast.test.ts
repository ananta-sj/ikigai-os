import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { appThemes } from '../src/data/themes.ts';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };
const themeCss = read('src/theme-system.css');
const designCss = read('src/design-system.css');

function themeToken(id: string, token: string) {
  const selector = `:root[data-ikigai-theme='${id}']`;
  let offset = 0;
  while (true) {
    const index = themeCss.indexOf(selector, offset);
    if (index < 0) break;
    const open = themeCss.indexOf('{', index + selector.length);
    const close = themeCss.indexOf('}', open + 1);
    if (open < 0 || close < 0) break;
    const block = themeCss.slice(open + 1, close);
    const match = block.match(new RegExp(`--${token}\\s*:\\s*(#[0-9a-fA-F]{6})`));
    if (match) return match[1];
    offset = close + 1;
  }
  throw new Error(`Missing --${token} for ${id}`);
}

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function darkenHex(hex: string, amount: number) {
  const value = hex.slice(1);
  const channels = [0, 2, 4].map(index => Math.round(parseInt(value.slice(index, index + 2), 16) * (1 - amount)));
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

test('v0.31.15 gives every workspace theme a contrast-safe filled action pair', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.15'), `expected 0.31.15 or newer, got ${packageJson.version}`);
  assert.equal(appThemes.length, 10);

  for (const theme of appThemes) {
    const fill = themeToken(theme.id, 'ik-action-fill');
    const ink = themeToken(theme.id, 'ik-action-ink');
    const background = themeToken(theme.id, 'ik-bg');
    assert.ok(contrast(fill, ink) >= 4.5, `${theme.name} action text contrast must be >= 4.5:1`);
    assert.ok(contrast(fill, background) >= 3, `${theme.name} filled action must remain visually distinct from its workspace background`);
    const hoverFill = darkenHex(fill, 0.06);
    assert.ok(contrast(hoverFill, ink) >= 4.5, `${theme.name} hover action text contrast must remain >= 4.5:1`);
    assert.ok(contrast(hoverFill, background) >= 3, `${theme.name} hover fill must remain visually distinct from its workspace background`);
  }
});

test('Quiet control style no longer washes out semantic primary actions', () => {
  assert.match(designCss, /data-ikigai-ui-style='quiet'\] \.ik-button:not\(\.ik-button-primary\)/);
  assert.match(designCss, /data-ikigai-ui-style='quiet'\] \.button:not\(\.primary\)/);
  assert.doesNotMatch(designCss, /data-ikigai-ui-style='quiet'\] \.ik-button,\s*\n:root\[data-ikigai-ui-style='quiet'\] \.button,/);
  assert.match(designCss, /\.ik-button-primary,[\s\S]*background: var\(--ik-action-fill, var\(--ik-accent\)\)/);
});

test('filled shared affordances use the semantic action tokens instead of raw accent contrast', () => {
  const files = [
    'src/design-system.css',
    'src/home-v040.css',
    'src/focus-v029.css',
    'src/now-playing-v030.css',
    'src/companion-v120.css',
    'src/companion-pet.css',
    'src/onboarding-v050.css',
    'src/navigation-guide-v027.css',
    'src/reimagine.css'
  ];
  for (const path of files) {
    const css = read(path);
    assert.match(css, /--ik-action-(?:fill|ink)|var\(--ik-action-(?:fill|ink)/, `${path} should participate in the shared action-token contract`);
  }
});

test('filled action hover states preserve the semantic action contrast contract', () => {
  const nowPlayingCss = read('src/now-playing-v030.css');
  const companionCss = read('src/companion-v120.css');
  assert.match(nowPlayingCss, /\.now0319-controls \.is-primary:hover,[\s\S]*color:var\(--ik-action-ink/);
  assert.match(nowPlayingCss, /\.now0319-controls \.is-primary:hover,[\s\S]*background:color-mix\(in srgb,var\(--ik-action-fill/);
  assert.match(companionCss, /\.companion-proposal-apply:hover \{ filter: brightness\(\.94\); \}/);
  assert.doesNotMatch(companionCss, /\.companion-proposal-apply:hover \{ filter: brightness\(1\.0[1-9]\); \}/);
});
