// Only use a local Ikigai Space source server and isolated synthetic-data profiles.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.IKIGAI_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.IKIGAI_AUDIT_URL || 'http://127.0.0.1:4180';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Audit server must be local.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
async function fresh(viewport = { width: 800, height: 600 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('button', { name: 'Skip tour', exact: true }).waitFor();
  return { context, page, errors };
}
async function settings(page) { return page.evaluate(async () => { const { db } = await import('/src/db.ts'); return db.settings.get('main'); }); }
function preferences(value) { const { onboardingComplete, onboardingCompletedAt, updatedAt, ...rest } = value; return rest; }
async function assertSkipped(page, before) {
  await page.waitForURL(base + '/'); await page.getByRole('main').waitFor();
  const after = await settings(page);
  assert.equal(after.onboardingComplete, true); assert.ok(after.onboardingCompletedAt);
  assert.deepEqual(preferences(after), preferences(before));
  await page.reload(); await page.getByRole('main').waitFor(); assert.equal(new URL(page.url()).pathname, '/');
}
try {
  for (const viewport of [{ width: 800, height: 600 }, { width: 390, height: 844 }]) {
    const { context, page, errors } = await fresh(viewport); const before = await settings(page);
    const skip = page.getByRole('button', { name: 'Skip tour', exact: true });
    const box = await skip.boundingBox(); assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width);
    await skip.click(); await assertSkipped(page, before); assert.deepEqual(errors, []);
    console.log('PASS Skip entire First Light at ' + viewport.width + 'px; defaults preserved and reload opens Today'); await context.close();
  }
  for (let step = 1; step <= 8; step++) {
    const { context, page, errors } = await fresh();
    await page.evaluate(async () => { const { updateSettings } = await import('/src/lib/settings.ts'); await updateSettings({ profileName: 'Synthetic saved name' }); });
    await page.reload(); await page.getByRole('button', { name: 'Begin', exact: true }).waitFor(); const before = await settings(page);
    await page.getByRole('button', { name: 'Begin', exact: true }).click();
    await page.getByPlaceholder('What should Ikigai Space call you?').fill('Synthetic unsaved tour draft');
    for (let current = 1; current < step; current++) { await page.getByRole('button', { name: 'Keep & continue' }).click(); await page.waitForTimeout(100); }
    await page.getByRole('button', { name: 'Skip tour', exact: true }).click(); await assertSkipped(page, before);
    assert.deepEqual(errors, []); console.log('PASS Skip at tour step ' + step + ' discards drafts and preserves saved preferences'); await context.close();
  }
  {
    const { context, page, errors } = await fresh(); const before = await settings(page);
    await page.evaluate(async () => {
      const { db } = await import('/src/db.ts'); window.auditQueuePut = db.syncQueue.put.bind(db.syncQueue);
      db.syncQueue.put = async () => { throw new Error('Synthetic storage failure'); };
    });
    await page.getByRole('button', { name: 'Skip tour', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'could not save your choice to skip' }).waitFor();
    assert.deepEqual(await settings(page), before);
    assert.ok(await page.getByRole('button', { name: 'Skip tour', exact: true }).isEnabled());
    await page.evaluate(async () => { const { db } = await import('/src/db.ts'); db.syncQueue.put = window.auditQueuePut; delete window.auditQueuePut; });
    await page.getByRole('button', { name: 'Skip tour', exact: true }).click(); await assertSkipped(page, before);
    assert.deepEqual(errors, []); console.log('PASS Failed skip rolls back completion and can retry without losing preferences'); await context.close();
  }
  {
    const { context, page, errors } = await fresh(); await page.getByRole('button', { name: 'Skip tour', exact: true }).click();
    await page.waitForURL(base + '/'); await page.goto(base + '/settings');
    await page.getByRole('tab', { name: /Experience/ }).click(); const before = await settings(page);
    await page.getByRole('link', { name: 'Preview welcome tour', exact: true }).click();
    await page.getByRole('button', { name: 'Exit preview', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Skip tour', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Exit preview', exact: true }).click(); await page.waitForURL(base + '/settings');
    assert.deepEqual(await settings(page), before); assert.deepEqual(errors, []);
    console.log('PASS Welcome preview exits without changing completion or saved preferences'); await context.close();
  }
} finally { await browser.close(); }
