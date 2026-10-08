// Production web rebranding checks. Only generated data in new temporary profiles.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.IKIGAI_PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.IKIGAI_AUDIT_URL || 'http://127.0.0.1:4182').origin;
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Audit server must be local.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const routes = ['/', '/calendar', '/focus', '/now-playing', '/garden', '/roadmap', '/reflection', '/memories', '/career', '/companion', '/settings'];
const oldBrand = /\bikigai(?:\s+os)?\b(?!\s+space|\s+seed)/i;
async function data(page, action, value) {
  return page.evaluate(({ action, value }) => new Promise((resolve, reject) => {
    const opening = indexedDB.open('ikigai-os');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      const tx = db.transaction(['settings', 'memories'], action === 'seed' ? 'readwrite' : 'readonly');
      let settings, memory;
      const get = tx.objectStore('settings').get('main');
      get.onsuccess = () => {
        settings = get.result;
        if (action === 'seed') {
          settings = { ...settings, profileName: 'Synthetic existing profile', appTheme: 'washi-sanctuary' };
          tx.objectStore('settings').put(settings);
          tx.objectStore('memories').put(value);
        }
      };
      const lookup = tx.objectStore('memories').get('synthetic-before-space'); lookup.onsuccess = () => { memory = lookup.result; };
      tx.oncomplete = () => { db.close(); resolve({ settings, memory }); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), { action, value });
}
async function checkBrand(page) {
  assert.equal(await page.title(), 'Ikigai Space');
  const visible = await page.locator('body').innerText();
  assert.equal(oldBrand.test(visible), false, 'Old product name in rendered copy');
  const labels = await page.locator('[aria-label], [title], [placeholder]').evaluateAll(nodes => nodes.flatMap(node => ['aria-label', 'title', 'placeholder'].map(key => node.getAttribute(key) || '')).join('\n'));
  assert.equal(oldBrand.test(labels), false, 'Old product name in accessible copy');
  const layout = await page.evaluate(() => {
    const visibleBrands = [...document.querySelectorAll('.floating-brand, .onboarding-brand, .workspace-theme-demo-brand')].filter(node => node.getClientRects().length);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: visibleBrands.some(node => { const rect = node.getBoundingClientRect(); return rect.x < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 1; })
    };
  });
  assert.equal(layout.overflow, false, 'Page overflows horizontally'); assert.equal(layout.clipped, false, 'Longer brand is clipped');
}
try {
  for (const width of [1440, 800, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.getByRole('button', { name: 'Skip tour', exact: true }).waitFor();
    await checkBrand(page);
    await page.getByRole('button', { name: 'Skip tour', exact: true }).click(); await page.getByRole('main').waitFor();
    for (const route of routes) {
      await page.goto(base + route); await page.locator('.floating-brand').waitFor();
      await page.waitForTimeout(350); await checkBrand(page);
    }
    await page.goto(base + '/settings'); await page.getByRole('tab', { name: /Appearance/ }).click();
    await page.locator('.workspace-theme-demo-brand').waitFor(); await checkBrand(page);
    assert.deepEqual(errors, []);
    console.log('PASS Brand, accessible labels, all eleven routes and layout at ' + width + 'px');
    await context.close();
  }
  const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: true });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base); await page.getByRole('button', { name: 'Skip tour', exact: true }).click(); await page.getByRole('main').waitFor();
  const stamp = '2026-10-07T12:00:00.000Z';
  const existing = { id: 'synthetic-before-space', date: '2026-10-07', title: 'Synthetic record from existing database', body: 'NON-SENSITIVE-LEGACY-REBRAND', kind: 'note', tags: [], createdAt: stamp, updatedAt: stamp };
  const seeded = await data(page, 'seed', existing);
  await page.reload(); await page.getByRole('main').waitFor();
  const after = await data(page, 'read'); assert.deepEqual(after.memory, existing);
  assert.equal(after.settings.profileName, seeded.settings.profileName); assert.equal(after.settings.appTheme, seeded.settings.appTheme);
  console.log('PASS Existing ikigai-os database records and preferences remain accessible after reload');
  await page.goto(base + '/memories'); await page.getByRole('heading', { name: existing.title, exact: true }).first().waitFor();
  await page.goto(base + '/settings'); await page.getByRole('tab', { name: /Data/ }).click();
  const waiting = page.waitForEvent('download'); await page.getByRole('button', { name: 'Create backup', exact: true }).click(); const download = await waiting;
  assert.match(download.suggestedFilename(), /^ikigai-space-backup_/);
  const stream = await download.createReadStream(); let text = ''; for await (const chunk of stream) text += chunk.toString(); const bundle = JSON.parse(text);
  assert.equal(bundle.format, 'ikigai-os-backup'); assert.ok(bundle.tables.memories.some(row => row.id === existing.id));
  console.log('PASS Renamed export filename preserves the original portable format and existing synthetic record');
  await page.getByRole('button', { name: 'Restore from backup', exact: true }).click({ trial: true });
  await page.locator('input[type=file]').setInputFiles({ name: 'ikigai-backup_legacy-test.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByText('Backup verified. Choose how to restore it.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Replace local data', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Replace local data', exact: true }).click();
  await page.getByText(/Restore complete/).waitFor(); await page.waitForTimeout(1100); await page.getByRole('main').waitFor();
  assert.deepEqual((await data(page, 'read')).memory, { ...existing, linkUrl: undefined });
  console.log('PASS Legacy-named backup restores through actual UI without losing synthetic data');
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  assert.equal(manifest.name, 'Ikigai Space'); assert.equal(manifest.short_name, 'Ikigai Space');
  assert.equal(manifest.id, '/'); assert.equal(manifest.scope, '/'); assert.equal(manifest.start_url, '/');
  for (const icon of manifest.icons) assert.equal(await page.evaluate(async path => (await fetch(path)).ok, icon.src), true);
  assert.equal(await page.locator('meta[name=description]').getAttribute('content'), 'Ikigai Space is a local-first personal workspace for planning, focus, reflection, and memory.');
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="apple-mobile-web-app-title"]']) assert.equal(await page.locator(selector).getAttribute('content'), 'Ikigai Space');
  assert.deepEqual(errors, []);
  console.log('PASS PWA identity/icons, browser/mobile title and social metadata');
  await context.close();
} finally { await browser.close(); }
