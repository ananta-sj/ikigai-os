// Isolated Ikigai Space Pages launch/navigation regression, with synthetic data only.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.IKIGAI_PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.IKIGAI_AUDIT_URL || 'http://127.0.0.1:4184/ikigai-space/');
assert.ok(['127.0.0.1', 'localhost', 'ananta-sj.github.io'].includes(base.hostname));
assert.equal(base.pathname, '/ikigai-space/');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const errors = [], failures = [], outsideBase = [];
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin === base.origin && url.pathname.startsWith(base.pathname)) return route.continue();
  // Familiar discovers local model metadata on opening; never contact a real service.
  if (url.origin === 'http://localhost:11434' && url.pathname === '/api/tags') return route.fulfill({ json: { models: [] } });
  outsideBase.push(url.origin + url.pathname); return route.abort();
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push(response.status() + ' ' + response.url()); });
try {
  const response = await page.goto(base.href); assert.equal(response.status(), 200);
  await page.getByRole('button', { name: 'Skip tour', exact: true }).waitFor();
  assert.equal(await page.title(), 'Ikigai Space');
  console.log('PASS Pages demo loads First Light from its actual public base');
  await page.getByRole('button', { name: 'Skip tour', exact: true }).click(); await page.getByRole('main').waitFor();
  assert.equal(new URL(page.url()).pathname, base.pathname);
  console.log('PASS Skip tour opens Today within the renamed Pages path');
  for (const [name, suffix] of [['Journey','calendar'], ['Focus','focus'], ['Now Playing','now-playing'], ['Sanctuary','garden'], ['Roadmap','roadmap'], ['Reflection','reflection'], ['Memories','memories'], ['Career','career'], ['Companion','companion'], ['Settings','settings'], ['Today','']]) {
    await page.getByRole('link', { name, exact: true }).click();
    await page.waitForURL(base.href + suffix); await page.getByRole('main').waitFor(); await page.waitForTimeout(200);
  }
  console.log('PASS All eleven rooms navigate without leaving the Pages base');
  await page.reload(); await page.getByRole('main').waitFor();
  assert.equal(new URL(page.url()).pathname, base.pathname);
  console.log('PASS Existing synthetic onboarding completion survives hosted reload');
  const assets = await page.evaluate(async () => {
    const files = ['ikigai-mark.svg', 'icon-192.png', 'assets/sanctuary/guardian_tree.glb', 'assets/sanctuary/reflection_bench.glb', 'assets/sanctuary/quiet_pavilion.glb', 'assets/sanctuary/waystone_gate.glb'];
    return Promise.all(files.map(async file => {
      const response = await fetch('/ikigai-space/' + file); const bytes = new Uint8Array(await response.arrayBuffer());
      return { file, status: response.status, size: bytes.length, magic: String.fromCharCode(...bytes.slice(0,4)) };
    }));
  });
  for (const asset of assets) {
    assert.equal(asset.status, 200); assert.ok(asset.size > 100);
    if (asset.file.endsWith('.glb')) assert.equal(asset.magic, 'glTF');
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, []); assert.deepEqual(outsideBase, []);
  console.log('PASS Actual icon/model bytes load; no page errors, failing responses or requests outside the app base');
} finally { await context.close(); await browser.close(); }
