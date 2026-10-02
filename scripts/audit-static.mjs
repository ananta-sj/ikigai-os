import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];
const warnings = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function rel(file) { return path.relative(root, file).replaceAll('\\', '/'); }
function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const lockRoot = packageLock.packages?.[''];
if (!lockRoot) fail('package-lock.json is missing its root package metadata.');
else {
  if (lockRoot.version !== packageJson.version) fail(`package-lock root version ${lockRoot.version} does not match package.json ${packageJson.version}.`);
  for (const section of ['dependencies', 'devDependencies']) {
    const left = JSON.stringify(packageJson[section] ?? {});
    const right = JSON.stringify(lockRoot[section] ?? {});
    if (left !== right) fail(`package-lock root ${section} does not match package.json.`);
  }
}
for (const section of ['dependencies', 'devDependencies']) {
  for (const [name, spec] of Object.entries(packageJson[section] ?? {})) {
    if (spec === 'latest' || /^[~^*]/.test(spec) || /\bx\b/i.test(spec)) {
      fail(`${section}.${name} is not pinned exactly (${spec}).`);
    }
  }
}
if (!packageJson.engines?.node) fail('package.json must declare a supported Node engine.');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!/Content-Security-Policy/i.test(indexHtml)) fail('index.html is missing a Content Security Policy.');
for (const directive of ["object-src 'none'", "frame-src 'none'", "base-uri 'self'"]) {
  if (!indexHtml.includes(directive)) fail(`index.html CSP is missing ${directive}.`);
}
if (!/name=["']referrer["'][^>]*no-referrer/i.test(indexHtml)) fail('index.html is missing the no-referrer policy.');

const sourceFiles = walk(srcRoot).filter(file => /\.(?:ts|tsx|js|jsx)$/.test(file));
const storageAllowlist = new Set(['src/lib/companion.ts', 'src/lib/companionUi.ts', 'src/lib/security.ts', 'src/lib/nowPlaying.ts']);
const fetchAllowlist = new Set(['src/lib/companion.ts', 'src/lib/paperAudio.ts', 'src/lib/github.ts', 'src/lib/nowPlaying.ts']);
const dangerousPatterns = [
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
  ['innerHTML assignment', /\.innerHTML\s*=/],
  ['outerHTML assignment', /\.outerHTML\s*=/],
  ['document.write', /document\.write\s*\(/],
  ['eval', /\beval\s*\(/],
  ['new Function', /new\s+Function\s*\(/]
];
const secretPatterns = [
  ['OpenAI-style API key', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{24,}/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}/]
];

for (const file of sourceFiles) {
  const name = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, regex] of dangerousPatterns) if (regex.test(text)) fail(`${name} contains ${label}.`);
  for (const [label, regex] of secretPatterns) if (regex.test(text)) fail(`${name} appears to contain a literal ${label}.`);

  if (/\b(?:localStorage|sessionStorage)\b/.test(text) && !storageAllowlist.has(name)) {
    fail(`${name} accesses browser key/value storage outside the approved storage boundary.`);
  }
  if (/\bfetch\s*\(/.test(text) && !fetchAllowlist.has(name)) {
    fail(`${name} performs a direct fetch outside the approved network boundary.`);
  }

  const blankLinks = text.match(/<a\b[^>]*target=["']_blank["'][^>]*>/gms) ?? [];
  for (const tag of blankLinks) {
    if (!/rel=["'][^"']*noopener[^"']*["']/i.test(tag)) fail(`${name} has target="_blank" without rel="noopener".`);
  }

  const userUrlAnchors = text.match(/<a\b[^>]*href=\{[^}]*\b(?:url|Url|URL|link|Link)[^}]*\}[^>]*>/gms) ?? [];
  for (const tag of userUrlAnchors) {
    if (!tag.includes('SafeExternalLink')) fail(`${name} renders a dynamic URL through a raw <a> element.`);
  }

  const buttons = text.match(/<button\b[^>]*>/gms) ?? [];
  for (const tag of buttons) {
    if (!/\btype=/.test(tag)) fail(`${name} contains a <button> without an explicit type.`);
  }

  if (/console\.log\s*\(/.test(text)) warn(`${name} contains console.log.`);
}

if (warnings.length) {
  console.log('Static audit warnings:');
  for (const item of warnings) console.log(`  WARN  ${item}`);
}

if (failures.length) {
  console.error(`Static audit failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  for (const item of failures) console.error(`  FAIL  ${item}`);
  process.exit(1);
}

console.log(`Static audit passed · ${sourceFiles.length} source modules checked.`);
