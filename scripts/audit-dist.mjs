import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.txt', '.svg']);
const RETIRED_SURFACE_PATTERNS = [
  { pattern: /NerdsPage/i, label: 'retired NerdsPage bundle marker' },
  { pattern: /\/nerds(?:\b|[/?#])/i, label: 'retired /nerds route marker' },
  { pattern: /For Nerds/i, label: 'retired For Nerds copy' },
  { pattern: /featureManifest/i, label: 'retired featureManifest marker' },
  { pattern: /Workshop Ledger/i, label: 'retired Workshop Ledger copy' }
];

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const found = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.isFile()) found.push(absolute);
    }
  }
  return found.sort();
}

function localTarget(distDir, rawRef) {
  const clean = rawRef.split('#', 1)[0].split('?', 1)[0];
  if (!clean || clean.startsWith('#') || /^(?:data:|blob:|https?:|mailto:|tel:)/i.test(clean)) return null;
  const relative = clean.startsWith('/') ? clean.slice(1) : clean;
  const normalized = path.normalize(relative);
  if (!normalized || normalized === '.' || normalized.startsWith(`..${path.sep}`) || path.isAbsolute(normalized)) return null;
  return path.join(distDir, normalized);
}

function requireFile(failures, distDir, relativePath, message = `${relativePath} is missing from the production artifact.`) {
  const absolute = path.join(distDir, relativePath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) failures.push(message);
  return absolute;
}

export function inspectProductionDist(distDir = path.join(process.cwd(), 'dist')) {
  const failures = [];
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
    return ['dist/ is missing. Run npm run build before npm run audit:dist.'];
  }

  const indexPath = requireFile(failures, distDir, 'index.html');
  const manifestPath = requireFile(failures, distDir, 'manifest.webmanifest');
  const registerPath = requireFile(failures, distDir, 'registerSW.js');
  const serviceWorkerPath = requireFile(failures, distDir, 'sw.js');
  requireFile(failures, distDir, 'icon-192.png');
  requireFile(failures, distDir, 'icon-512.png');
  requireFile(failures, distDir, 'ikigai-mark.svg');

  const files = walkFiles(distDir);
  for (const absolute of files) {
    const relative = path.relative(distDir, absolute).split(path.sep).join('/');
    if (relative.endsWith('.map')) failures.push(`Source map must not ship in production: ${relative}`);
    if (/\.(?:ts|tsx)$/i.test(relative)) failures.push(`TypeScript source must not ship in dist/: ${relative}`);

    for (const { pattern, label } of RETIRED_SURFACE_PATTERNS) {
      if (pattern.test(relative)) failures.push(`${label} remains in production filename: ${relative}`);
    }

    if (!TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase())) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    for (const { pattern, label } of RETIRED_SURFACE_PATTERNS) {
      if (pattern.test(text)) failures.push(`${label} remains in production content: ${relative}`);
    }
  }

  if (fs.existsSync(indexPath)) {
    const index = fs.readFileSync(indexPath, 'utf8');
    if (/\/src\/|src\/main\.tsx/i.test(index)) failures.push('dist/index.html still points at development source instead of built assets.');
    if (!/<link[^>]+rel=["']manifest["'][^>]+manifest\.webmanifest/i.test(index)) failures.push('dist/index.html is missing the production web manifest link.');
    if (!/<script[^>]+type=["']module["'][^>]+src=["'][^"']*\/assets\//i.test(index)) failures.push('dist/index.html is missing the hashed production module entry.');

    const refs = Array.from(index.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi), match => match[1]);
    for (const ref of refs) {
      const target = localTarget(distDir, ref);
      if (target && !fs.existsSync(target)) failures.push(`dist/index.html references a missing local artifact: ${ref}`);
    }
  }

  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name !== 'Ikigai') failures.push('Production manifest name is not Ikigai.');
      if (manifest.start_url !== '/') failures.push('Production manifest start_url must remain /.');
      if (manifest.display !== 'standalone') failures.push('Production manifest display must remain standalone.');
      const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
      for (const required of ['/icon-192.png', '/icon-512.png']) {
        if (!icons.some(icon => icon?.src === required)) failures.push(`Production manifest is missing ${required}.`);
      }
    } catch {
      failures.push('manifest.webmanifest is not valid JSON.');
    }
  }

  if (fs.existsSync(registerPath)) {
    const register = fs.readFileSync(registerPath, 'utf8');
    if (!/serviceWorker\.register\(["']\/sw\.js["']/.test(register)) failures.push('registerSW.js does not register /sw.js.');
  }

  if (fs.existsSync(serviceWorkerPath)) {
    const sw = fs.readFileSync(serviceWorkerPath, 'utf8');
    if (!/precacheAndRoute/.test(sw)) failures.push('sw.js does not contain the production precache route.');
    if (!/cleanupOutdatedCaches/.test(sw)) failures.push('sw.js does not clean outdated caches.');

    for (const match of sw.matchAll(/\burl\s*:\s*["']([^"']+)["']/g)) {
      const ref = match[1];
      const target = localTarget(distDir, ref);
      if (target && !fs.existsSync(target)) failures.push(`sw.js precaches a missing artifact: ${ref}`);
    }

    for (const match of sw.matchAll(/["']\.\/(workbox-[^"']+\.js)["']/g)) {
      if (!fs.existsSync(path.join(distDir, match[1]))) failures.push(`sw.js references a missing Workbox runtime: ${match[1]}`);
    }
  }

  return Array.from(new Set(failures));
}

function runCli() {
  const failures = inspectProductionDist();
  if (failures.length) {
    console.error(`Production artifact audit failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
    for (const item of failures) console.error(`  FAIL  ${item}`);
    process.exitCode = 1;
    return;
  }
  console.log('Production artifact audit passed · fresh dist/PWA output has no retired surface or broken local references.');
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
