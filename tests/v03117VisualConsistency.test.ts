import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { appThemes } from '../src/data/themes.ts';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };
const themeCss = read('src/theme-system.css');
const designCss = read('src/design-system.css');
const uiAudit = read('scripts/audit-ui.mjs');

function themeBlock(id: string) {
  const selector = `:root[data-ikigai-theme='${id}']`;
  let offset = 0;
  while (true) {
    const index = themeCss.indexOf(selector, offset);
    if (index < 0) break;
    const open = themeCss.indexOf('{', index + selector.length);
    const close = themeCss.indexOf('}', open + 1);
    if (open < 0 || close < 0) break;
    const block = themeCss.slice(open + 1, close);
    if (block.includes('--ik-bg')) return block;
    offset = close + 1;
  }
  throw new Error(`Missing theme block for ${id}`);
}

function themeToken(id: string, token: string) {
  const block = themeBlock(id);
  const match = block.match(new RegExp(`--${token}\\s*:\\s*(#[0-9a-fA-F]{6}|rgba?\\([^;]+\\))`));
  if (!match) throw new Error(`Missing --${token} for ${id}`);
  return match[1];
}

type Rgb = { r: number; g: number; b: number; a: number };
function parseColor(value: string): Rgb {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1
    };
  }
  const match = trimmed.match(/rgba?\(([^)]+)\)/);
  if (!match) throw new Error(`Unsupported color ${value}`);
  const parts = match[1].split(',').map(part => Number(part.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

function composite(foreground: Rgb, background: Rgb): Rgb {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha
  };
}

function mix(first: Rgb, second: Rgb, firstWeight: number): Rgb {
  return {
    r: first.r * firstWeight + second.r * (1 - firstWeight),
    g: first.g * firstWeight + second.g * (1 - firstWeight),
    b: first.b * firstWeight + second.b * (1 - firstWeight),
    a: 1
  };
}

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}
function luminance(color: Rgb) {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}
function contrast(first: Rgb, second: Rgb) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function themeSurfaces(id: string) {
  const background = parseColor(themeToken(id, 'ik-bg'));
  const strong = composite(parseColor(themeToken(id, 'ik-surface-strong')), background);
  return { background, strong };
}

function assertReadable(id: string, label: string, color: Rgb) {
  const { background, strong } = themeSurfaces(id);
  assert.ok(contrast(color, background) >= 4.5, `${id} ${label} must be >= 4.5:1 against workspace background`);
  assert.ok(contrast(color, strong) >= 4.5, `${id} ${label} must be >= 4.5:1 against strong surface`);
}

test('v0.31.17 makes muted and faint text readable across every workspace theme', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.17'), `expected 0.31.17 or newer, got ${packageJson.version}`);
  assert.equal(appThemes.length, 10);

  for (const theme of appThemes) {
    assertReadable(theme.id, 'muted text', parseColor(themeToken(theme.id, 'ik-muted')));
    assertReadable(theme.id, 'faint text', parseColor(themeToken(theme.id, 'ik-faint')));
  }
});

test('semantic foreground aliases keep accent and status text theme-safe', () => {
  assert.match(themeCss, /--ik-accent-text:\s*color-mix\(in srgb, var\(--ik-accent\) 62%, var\(--ik-text\)\)/);
  assert.match(themeCss, /--ik-secondary-text:\s*color-mix\(in srgb, var\(--ik-secondary\) 62%, var\(--ik-text\)\)/);
  assert.match(themeCss, /--ik-danger-text:\s*color-mix\(in srgb, var\(--ik-danger\) 65%, var\(--ik-text\)\)/);
  assert.match(themeCss, /--ik-warning-text:\s*color-mix\(in srgb, #b06f1e 55%, var\(--ik-text\)\)/);
  assert.match(themeCss, /--ik-info-text:\s*color-mix\(in srgb, #5374aa 52%, var\(--ik-text\)\)/);
  assert.match(themeCss, /--ik-success-text:\s*color-mix\(in srgb, #3f7e58 52%, var\(--ik-text\)\)/);

  for (const theme of appThemes) {
    const text = parseColor(themeToken(theme.id, 'ik-text'));
    assertReadable(theme.id, 'accent text', mix(parseColor(themeToken(theme.id, 'ik-accent')), text, 0.62));
    assertReadable(theme.id, 'secondary text', mix(parseColor(themeToken(theme.id, 'ik-secondary')), text, 0.62));
    assertReadable(theme.id, 'danger text', mix(parseColor(themeToken(theme.id, 'ik-danger')), text, 0.65));
    assertReadable(theme.id, 'warning text', mix(parseColor('#b06f1e'), text, 0.55));
    assertReadable(theme.id, 'info text', mix(parseColor('#5374aa'), text, 0.52));
    assertReadable(theme.id, 'success text', mix(parseColor('#3f7e58'), text, 0.52));
  }
});

test('CSS foregrounds use readable semantic ink instead of decorative raw theme colors', () => {
  const rawAccentText = /(^|[;{])\s*color\s*:\s*var\(--ik-accent(?:,[^;]+)?\)/gm;
  const rawAccentMixText = /(^|[;{])\s*color\s*:\s*color-mix\([^;{}]*var\(--ik-accent\)[^;{}]*\)/gm;
  const rawDangerText = /(^|[;{])\s*color\s*:\s*var\(--ik-danger(?:,[^;]+)?\)/gm;
  const rawSecondaryText = /(^|[;{])\s*color\s*:\s*var\(--ik-secondary(?:,[^;]+)?\)/gm;
  const dilutedReadableText = /(^|[;{])\s*color\s*:\s*color-mix\([^;{}]*var\(--ik-(?:muted|faint)(?:,[^)]+)?\)[^;{}]*transparent[^;{}]*\)/gm;
  for (const file of readdirSync(new URL('../src/', import.meta.url)).filter(name => name.endsWith('.css'))) {
    const css = read(`src/${file}`);
    assert.doesNotMatch(css, rawAccentText, `${file} should use --ik-accent-text for foreground accent color`);
    assert.doesNotMatch(css, rawAccentMixText, `${file} should use --ik-accent-text instead of inventing a foreground accent mix`);
    assert.doesNotMatch(css, rawDangerText, `${file} should use --ik-danger-text for foreground danger color`);
    assert.doesNotMatch(css, rawSecondaryText, `${file} should use --ik-secondary-text for foreground secondary color`);
    assert.doesNotMatch(css, dilutedReadableText, `${file} should not dilute readable muted/faint foreground roles toward transparent`);
  }
  assert.match(uiAudit, /unsafe theme foreground/);
  assert.match(uiAudit, /use --ik-accent-text for foreground text\/icons/);
});

test('focus and semantic feedback states use the shared readable roles', () => {
  assert.match(themeCss, /--ik-focus-ring:\s*var\(--ik-accent-text\)/);
  assert.match(designCss, /focus-visible[\s\S]*outline:\s*2px solid var\(--ik-focus-ring/);
  assert.match(designCss, /product-diagnostic-row\.is-warn[\s\S]*var\(--ik-warning-text\)/);
  assert.match(designCss, /product-diagnostic-row\.is-fail[\s\S]*var\(--ik-danger-text\)/);

  const companion = read('src/companion-v120.css');
  const roadmap = read('src/roadmap-career-v090.css');
  const reflectionCareer = read('src/reflection-career-v028.css');
  assert.match(companion, /companion-request-error[\s\S]*var\(--ik-danger/);
  assert.match(companion, /companion-endpoint-trust\.is-warning[\s\S]*var\(--ik-warning-text/);
  assert.match(roadmap, /data-mode='recovery'[\s\S]*var\(--ik-info-text/);
  assert.match(roadmap, /roadmap-form-error[\s\S]*var\(--ik-danger-text/);
  assert.match(reflectionCareer, /career-github-error[\s\S]*var\(--ik-danger-text/);
});
