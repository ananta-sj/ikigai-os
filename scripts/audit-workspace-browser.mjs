// Uses only synthetic data in a new temporary context against the local Vite source server.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.IKIGAI_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.IKIGAI_AUDIT_URL || 'http://127.0.0.1:4179';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Audit server must be local.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.evaluate(async () => {
    const { updateSettings } = await import('/src/lib/settings.ts');
    await updateSettings({ onboardingComplete: true });
    const { createRoadmapPhase } = await import('/src/lib/career.ts');
    await createRoadmapPhase({ title: 'Synthetic failure test phase', startDate: '2026-10-01', endDate: '2026-10-31' });
  });
  for (const scenario of [
    { route: '/career', open: 'Add proof', save: 'Keep proof', table: 'proofItems', fill: { 'Evidence title': 'Synthetic proof recovery' } },
    { route: '/career', open: 'Opportunity', save: 'Add opportunity', table: 'careerApplications', fill: { Organization: 'Synthetic organization', Role: 'Synthetic role' } },
    { route: '/career', open: 'Add project', save: 'Add project', table: 'careerProjects', fill: { 'Project name': 'Synthetic project recovery' } },
    { route: '/roadmap', open: 'Add checkpoint', save: 'Add checkpoint', table: 'roadmapItems', fill: { Checkpoint: 'Synthetic checkpoint recovery' } }
  ]) {
    await page.goto(base + scenario.route);
    await page.getByRole('button', { name: scenario.open, exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    for (const [name, value] of Object.entries(scenario.fill)) await dialog.getByLabel(name, { exact: true }).fill(value);
    await page.evaluate(async table => {
      const { db } = await import('/src/db.ts');
      window.auditOriginalAdd = db[table].add.bind(db[table]);
      db[table].add = async () => { throw new Error('Synthetic IndexedDB quota failure'); };
    }, scenario.table);
    await dialog.getByRole('button', { name: scenario.save, exact: true }).click();
    await dialog.getByRole('alert').waitFor();
    assert.ok((await dialog.getByRole('alert').innerText()).includes('Your draft is preserved'));
    assert.ok(await dialog.getByRole('button', { name: scenario.save, exact: true }).isEnabled());
    for (const [name, value] of Object.entries(scenario.fill)) assert.equal(await dialog.getByLabel(name, { exact: true }).inputValue(), value);
    await page.evaluate(async table => { const { db } = await import('/src/db.ts'); db[table].add = window.auditOriginalAdd; delete window.auditOriginalAdd; }, scenario.table);
    await page.evaluate(async () => {
      const { db } = await import('/src/db.ts');
      window.auditOriginalQueuePut = db.syncQueue.put.bind(db.syncQueue);
      db.syncQueue.put = async () => { throw new Error('Synthetic queue failure after record write'); };
    });
    await dialog.getByRole('button', { name: scenario.save, exact: true }).click();
    await page.waitForTimeout(200);
    assert.ok(await dialog.getByRole('button', { name: scenario.save, exact: true }).isEnabled());
    assert.equal(await page.evaluate(async table => { const { db } = await import('/src/db.ts'); return db[table].count(); }, scenario.table), 0);
    await page.evaluate(async () => { const { db } = await import('/src/db.ts'); db.syncQueue.put = window.auditOriginalQueuePut; delete window.auditOriginalQueuePut; });
    console.log('PASS ' + scenario.table + ': queue failure rolls back the preceding record write');
    await dialog.getByRole('button', { name: scenario.save, exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const rows = await page.evaluate(async table => { const { db } = await import('/src/db.ts'); return db[table].toArray(); }, scenario.table);
    assert.equal(rows.length, 1);
    console.log('PASS ' + scenario.table + ': storage failure preserves draft and retry creates exactly one record');
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
