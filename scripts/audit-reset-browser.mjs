// Tests only the isolated local production preview with generated data.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.IKIGAI_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.IKIGAI_AUDIT_URL || 'http://127.0.0.1:4178';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Audit server must be local.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (let iteration = 1; iteration <= 3; iteration++) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push({ name: error.name, message: error.message }));
    await page.goto(base);
    await page.getByRole('button', { name: 'Begin', exact: true }).click();
    for (let step = 0; step < 7; step++) { await page.getByRole('button', { name: 'Keep & continue' }).click(); await page.waitForTimeout(90); }
    await page.getByRole('button', { name: 'Enter Ikigai Space' }).click();
    await page.getByLabel('Quick task').fill('Synthetic reset task'); await page.getByLabel('Quick task').press('Enter');
    await page.locator('.familiar-nook').waitFor();
    await page.evaluate(() => localStorage.setItem('ikigai-companion-api-key-remembered', 'audit-dummy-key-not-a-real-secret'));
    await page.goto(base + '/settings');
    await page.getByRole('tab', { name: /Data & safety/ }).click();
    await page.getByRole('button', { name: 'Reset all Ikigai Space', exact: true }).click();
    const dialog = page.getByRole('dialog'); await dialog.locator('input').fill('RESET IKIGAI SPACE');
    await dialog.getByRole('button', { name: 'Reset all Ikigai Space data', exact: true }).click();
    await page.getByRole('button', { name: 'Begin', exact: true }).waitFor();
    await page.waitForTimeout(300);
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => localStorage.getItem('ikigai-companion-api-key-remembered')), null);
    const tasks = await page.evaluate(() => new Promise((resolve, reject) => { const opening = indexedDB.open('ikigai-os'); opening.onerror = () => reject(opening.error); opening.onsuccess = () => { const db = opening.result; const request = db.transaction('tasks').objectStore('tasks').count(); request.onsuccess = () => { db.close(); resolve(request.result); }; request.onerror = () => reject(request.error); }; }));
    assert.equal(tasks, 0);
    console.log('PASS Full reset iteration ' + iteration + ': clears synthetic data/key, returns to First Light, no page errors');
    await context.close();
  }
} finally { await browser.close(); }
