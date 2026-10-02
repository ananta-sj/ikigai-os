import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];
const warnings = [];
const stats = { tsx: 0, css: 0, important: 0, fixed: 0, sticky: 0, vh100: 0, confirms: 0, autoFocus: 0, rawAccentText: 0, unsafeThemeText: 0 };

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}
function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function lineOf(text, index) { return text.slice(0, index).split('\n').length; }
function warn(file, text, index, message) { warnings.push(`${rel(file)}:${lineOf(text, index)} ${message}`); }
function fail(file, text, index, message) { failures.push(`${rel(file)}:${lineOf(text, index)} ${message}`); }

for (const file of walk(srcRoot)) {
  const name = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.tsx')) {
    stats.tsx += 1;

    for (const match of text.matchAll(/<img\b[^>]*>/gms)) {
      if (!/\balt\s*=/.test(match[0])) fail(file, text, match.index ?? 0, '<img> is missing alt text.');
    }
    for (const match of text.matchAll(/\btabIndex\s*=\s*\{?\s*([1-9]\d*)/g)) {
      fail(file, text, match.index ?? 0, `positive tabIndex=${match[1]} creates a custom focus order.`);
    }
    for (const match of text.matchAll(/\bautoFocus\b/g)) {
      stats.autoFocus += 1;
      fail(file, text, match.index ?? 0, 'autoFocus is disallowed after the v0.31 modal-focus pass; focus the dialog container and let the user choose a field.');
    }
    for (const match of text.matchAll(/window\.confirm\s*\(/g)) {
      stats.confirms += 1;
      fail(file, text, match.index ?? 0, 'native confirm is disallowed after v0.31; use the accessible in-app confirmation dialog.');
    }
    for (const match of text.matchAll(/<(div|span|li)\b[^>]*\bonClick\s*=\{[^>]*>/gms)) {
      const tag = match[0];
      if (!/\brole\s*=/.test(tag) && !/\btabIndex\s*=/.test(tag)) {
        fail(file, text, match.index ?? 0, `clickable <${match[1]}> needs keyboard semantics (role/tabIndex or a native interactive element).`);
      }
    }
  }

  if (file.endsWith('.css')) {
    stats.css += 1;
    const important = [...text.matchAll(/!important\b/g)];
    const fixed = [...text.matchAll(/position\s*:\s*fixed\b/g)];
    const sticky = [...text.matchAll(/position\s*:\s*sticky\b/g)];
    const vh100 = [...text.matchAll(/\b100vh\b/g)];
    const rawAccentText = [...text.matchAll(/(^|[;{])\s*color\s*:\s*var\(--ik-accent(?:,[^;]+)?\)/gm)];
    const rawAccentMixText = [...text.matchAll(/(^|[;{])\s*color\s*:\s*color-mix\([^;{}]*var\(--ik-accent\)[^;{}]*\)/gm)];
    const rawDangerText = [...text.matchAll(/(^|[;{])\s*color\s*:\s*var\(--ik-danger(?:,[^;]+)?\)/gm)];
    const rawSecondaryText = [...text.matchAll(/(^|[;{])\s*color\s*:\s*var\(--ik-secondary(?:,[^;]+)?\)/gm)];
    const dilutedReadableText = [...text.matchAll(/(^|[;{])\s*color\s*:\s*color-mix\([^;{}]*var\(--ik-(?:muted|faint)(?:,[^)]+)?\)[^;{}]*transparent[^;{}]*\)/gm)];
    stats.important += important.length;
    stats.fixed += fixed.length;
    stats.sticky += sticky.length;
    stats.vh100 += vh100.length;
    stats.rawAccentText += rawAccentText.length;
    stats.unsafeThemeText += rawAccentText.length + rawAccentMixText.length + rawDangerText.length + rawSecondaryText.length + dilutedReadableText.length;
    for (const match of vh100) fail(file, text, match.index ?? 0, '100vh is disallowed after the v0.31 responsive pass; use dynamic/small viewport units where appropriate.');
    for (const match of rawAccentText) fail(file, text, match.index ?? 0, 'Raw --ik-accent is decorative and may be low-contrast in some themes; use --ik-accent-text for foreground text/icons.');
    for (const match of rawAccentMixText) fail(file, text, match.index ?? 0, 'Do not invent foreground mixes from decorative --ik-accent; use --ik-accent-text so the contrast contract stays centralized.');
    for (const match of rawDangerText) fail(file, text, match.index ?? 0, 'Raw --ik-danger may be decorative/low-contrast as text; use --ik-danger-text for foreground feedback.');
    for (const match of rawSecondaryText) fail(file, text, match.index ?? 0, 'Raw --ik-secondary may be decorative/low-contrast as text; use --ik-secondary-text for foreground labels/icons.');
    for (const match of dilutedReadableText) fail(file, text, match.index ?? 0, 'Do not dilute readable --ik-muted/--ik-faint foreground roles toward transparent; use the semantic text role directly.');
  }
}

console.log(`UI source audit · ${stats.tsx} TSX files · ${stats.css} CSS files`);
console.log(`Cascade/runtime debt · !important ${stats.important} · fixed ${stats.fixed} · sticky ${stats.sticky} · 100vh ${stats.vh100}`);
console.log(`Interaction review flags · autoFocus ${stats.autoFocus} · native confirm ${stats.confirms} · unsafe theme foreground ${stats.unsafeThemeText}`);

if (warnings.length) {
  console.log(`\nReview warnings (${warnings.length}):`);
  for (const message of warnings.slice(0, 80)) console.log(`  WARN  ${message}`);
  if (warnings.length > 80) console.log(`  … ${warnings.length - 80} additional warnings omitted from console output.`);
}
if (failures.length) {
  console.error(`\nUI source audit failed with ${failures.length} definite issue${failures.length === 1 ? '' : 's'}:`);
  for (const message of failures) console.error(`  FAIL  ${message}`);
  process.exit(1);
}
console.log('\nUI source audit passed its hard checks. Warnings remain audit debt, not runtime proof.');
