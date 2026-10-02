import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) { failures.push(message); }
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }
function exists(relativePath) { return fs.existsSync(path.join(root, relativePath)); }
function requireText(text, pattern, message) { if (!pattern.test(text)) fail(message); }

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const version = packageJson.version;
const lockRoot = packageLock.packages?.[''];

if (!/^0\.\d+\.\d+$/.test(version)) fail(`package.json has an unexpected version format (${version}).`);
if (packageLock.version !== version) fail(`package-lock top-level version ${packageLock.version} does not match package.json ${version}.`);
if (!lockRoot) fail('package-lock.json is missing root package metadata.');
else if (lockRoot.version !== version) fail(`package-lock root version ${lockRoot.version} does not match package.json ${version}.`);

const readme = read('Readme.md');
if (!readme.includes(`**Current version:** \`v${version}`)) fail(`Readme.md does not advertise v${version} as the current version.`);

const migrationPath = `MIGRATION_V${version}.md`;
if (!exists(migrationPath)) fail(`${migrationPath} is missing for the current package version.`);

const scripts = packageJson.scripts ?? {};
if (scripts['audit:release'] !== 'node scripts/audit-release.mjs') fail('package.json audit:release script is missing or unexpected.');
if (scripts['audit:dist'] !== 'node scripts/audit-dist.mjs') fail('package.json audit:dist script is missing or unexpected.');
for (const required of ['audit:release', 'audit:static', 'audit:ui', 'audit:icons', 'test', 'build', 'audit:dist']) {
  if (!String(scripts.verify ?? '').includes(required)) fail(`package.json verify script does not include ${required}.`);
}
const verifyScript = String(scripts.verify ?? '');
if (verifyScript.indexOf('npm run build') > verifyScript.indexOf('npm run audit:dist')) fail('verify must build before audit:dist so the artifact audit inspects fresh output.');

const workflowPath = '.github/workflows/release-gate.yml';
if (!exists(workflowPath)) fail(`${workflowPath} is missing.`);
else {
  const workflow = read(workflowPath);
  requireText(workflow, /permissions:\s*\n\s*contents:\s*read/, 'Release workflow must use read-only repository contents permissions.');
  requireText(workflow, /['"]20\.19\.0['"]/, 'Release workflow must verify the minimum Node 20 engine boundary.');
  requireText(workflow, /['"]22\.12\.0['"]/, 'Release workflow must verify the minimum Node 22+ engine boundary.');
  requireText(workflow, /run:\s*npm ci\b/, 'Release workflow must install from the lockfile with npm ci.');
  requireText(workflow, /run:\s*npm run verify\b/, 'Release workflow must run npm run verify.');
  requireText(workflow, /run:\s*npm run audit:deps\b/, 'Release workflow must run the live dependency vulnerability audit.');
  requireText(workflow, /actions\/upload-artifact@v4/, 'Release workflow must retain the production build as an artifact.');
  requireText(workflow, /path:\s*dist\b/, 'Release workflow must upload the dist production build.');
}

const vite = read('vite.config.ts');
for (const [pattern, message] of [
  [/registerType:\s*['"]autoUpdate['"]/, 'Vite PWA must keep the auto-update registration strategy.'],
  [/cleanupOutdatedCaches:\s*true/, 'Vite PWA must clean outdated caches.'],
  [/clientsClaim:\s*true/, 'Vite PWA must claim clients after activation.'],
  [/skipWaiting:\s*true/, 'Vite PWA must skip waiting for the update strategy.'],
  [/navigateFallback:\s*['"]index\.html['"]/, 'Vite PWA must keep an offline SPA navigation fallback.'],
  [/globPatterns:\s*\[[^\]]*glb[^\]]*\]/, 'Vite PWA must precache the local Sanctuary GLB assets for offline use.'],
  [/shortcuts:\s*\[/, 'PWA manifest must expose useful installed-app shortcuts.'],
  [/display:\s*['"]standalone['"]/, 'PWA manifest must remain standalone.'],
  [/src:\s*['"]\/icon-192\.png['"][\s\S]*sizes:\s*['"]192x192['"]/, 'PWA manifest must include the 192px install icon.'],
  [/src:\s*['"]\/icon-512\.png['"][\s\S]*sizes:\s*['"]512x512['"]/, 'PWA manifest must include the 512px install icon.'],
  [/build:\s*\{[^}]*sourcemap:\s*false[^}]*\}/, 'Production sourcemaps must remain disabled.'],
  [/build:\s*\{[^}]*emptyOutDir:\s*true[^}]*\}/, 'Production builds must explicitly empty dist before emitting fresh assets.']
]) requireText(vite, pattern, message);

const indexHtml = read('index.html');
requireText(indexHtml, /<link\s+rel=['"]icon['"]\s+href=['"]\/ikigai-mark\.svg['"]/i, 'index.html must use the canonical Ikigai mark favicon.');

function pngDimensions(relativePath) {
  const file = fs.readFileSync(path.join(root, relativePath));
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (file.length < 24 || !file.subarray(0, 8).equals(signature)) return null;
  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

for (const [file, expected] of [['public/icon-192.png', 192], ['public/icon-512.png', 512]]) {
  if (!exists(file)) { fail(`${file} is missing.`); continue; }
  const dimensions = pngDimensions(file);
  if (!dimensions || dimensions.width !== expected || dimensions.height !== expected) {
    fail(`${file} must be a ${expected}x${expected} PNG.`);
  }
}
if (!exists('public/ikigai-mark.svg')) fail('public/ikigai-mark.svg is missing.');

const checklist = read('UI_SMOKE_CHECKLIST_V0.31.md');
for (const heading of ['## Desktop composition', '## Mobile / touch', '## Screen reader', '## Sanctuary device / GPU matrix', '## Release evidence']) {
  if (!checklist.includes(heading)) fail(`UI_SMOKE_CHECKLIST_V0.31.md is missing ${heading}.`);
}
if (!/Journey month animation still has no ghost sheet \/ giant blank board regression/.test(checklist)) {
  fail('Manual release gate lost the Journey ghost-sheet regression check.');
}

const evidencePath = 'RELEASE_EVIDENCE_V0.32.md';
if (!exists(evidencePath)) fail(`${evidencePath} is missing.`);
else {
  const evidence = read(evidencePath);
  for (const heading of ['## Automated gate', '## Browser matrix', '## Assistive technology', '## Touch / mobile', '## PWA / offline / update', '## Hostile-data browser checks', '## Sanctuary performance', '## Release decision']) {
    if (!evidence.includes(heading)) fail(`${evidencePath} is missing ${heading}.`);
  }
}

if (failures.length) {
  console.error(`Release audit failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  for (const item of failures) console.error(`  FAIL  ${item}`);
  process.exit(1);
}

console.log(`Release audit passed · v${version} version/docs/PWA/CI contracts aligned.`);
