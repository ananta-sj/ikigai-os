import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectProductionDist } from '../scripts/audit-dist.mjs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const releaseAudit = read('scripts/audit-release.mjs');
const vite = read('vite.config.ts');

function makeValidFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ikigai-dist-audit-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), `<!doctype html><html><head>
    <link rel="icon" href="/ikigai-mark.svg" type="image/svg+xml" />
    <script type="module" src="/assets/index-good.js"></script>
    <link rel="stylesheet" href="/assets/index-good.css" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <script src="/registerSW.js"></script>
  </head><body><div id="root"></div></body></html>`);
  writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify({
    name: 'Ikigai', start_url: '/', display: 'standalone',
    icons: [{ src: '/icon-192.png' }, { src: '/icon-512.png' }]
  }));
  writeFileSync(join(dist, 'registerSW.js'), `navigator.serviceWorker.register('/sw.js', { scope: '/' });`);
  writeFileSync(join(dist, 'sw.js'), `define(["./workbox-good.js"],function(w){w.precacheAndRoute([{url:"index.html"},{url:"assets/index-good.js"},{url:"assets/index-good.css"}]);w.cleanupOutdatedCaches();});`);
  writeFileSync(join(dist, 'workbox-good.js'), '/* workbox fixture */');
  writeFileSync(join(dist, 'assets/index-good.js'), 'console.log("Ikigai production fixture");');
  writeFileSync(join(dist, 'assets/index-good.css'), 'body{margin:0}');
  cpSync(new URL('../public/icon-192.png', import.meta.url), join(dist, 'icon-192.png'));
  cpSync(new URL('../public/icon-512.png', import.meta.url), join(dist, 'icon-512.png'));
  cpSync(new URL('../public/ikigai-mark.svg', import.meta.url), join(dist, 'ikigai-mark.svg'));
  return { root, dist };
}

test('Patch 14 makes fresh production artifact auditing part of verify after build', () => {
  assert.equal(pkg.scripts['audit:dist'], 'node scripts/audit-dist.mjs');
  assert.match(pkg.scripts.verify, /npm run build && npm run audit:dist/);
  assert.match(releaseAudit, /audit:dist/);
  assert.match(releaseAudit, /build before audit:dist/);
  assert.match(vite, /build:\s*\{\s*sourcemap:\s*false,\s*emptyOutDir:\s*true\s*\}/);
});

test('production artifact audit accepts a coherent built PWA fixture', () => {
  const { root, dist } = makeValidFixture();
  try {
    assert.deepEqual(inspectProductionDist(dist), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('production artifact audit blocks retired inventory chunks and broken local references', () => {
  const { root, dist } = makeValidFixture();
  try {
    writeFileSync(join(dist, 'assets/NerdsPage-stale.js'), 'const route="/nerds";');
    writeFileSync(join(dist, 'index.html'), readFileSync(join(dist, 'index.html'), 'utf8').replace('</head>', '<script type="module" src="/assets/missing.js"></script></head>'));
    const failures = inspectProductionDist(dist).join('\n');
    assert.match(failures, /retired NerdsPage bundle marker/);
    assert.match(failures, /retired \/nerds route marker/);
    assert.match(failures, /missing local artifact: \/assets\/missing\.js/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('production artifact audit rejects source maps and development source entrypoints', () => {
  const { root, dist } = makeValidFixture();
  try {
    writeFileSync(join(dist, 'assets/index-good.js.map'), '{}');
    writeFileSync(join(dist, 'index.html'), '<!doctype html><script type="module" src="/src/main.tsx"></script>');
    const failures = inspectProductionDist(dist).join('\n');
    assert.match(failures, /Source map must not ship/);
    assert.match(failures, /development source/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
