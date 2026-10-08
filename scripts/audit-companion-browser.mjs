// Run against an isolated Vite dev server, never a personal browser profile.
// IKIGAI_PLAYWRIGHT_MODULE may point to an existing Playwright installation.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.IKIGAI_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.IKIGAI_AUDIT_URL || 'http://127.0.0.1:4179';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Audit server must be local.');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(base);
  const results = await page.evaluate(async () => {
    const { db } = await import('/src/db.ts');
    const ai = await import('/src/lib/companion.ts');
    const findings = [];
    const pending = (id, title) => ({ id, role: 'assistant', content: 'Synthetic proposal', createdAt: new Date().toISOString(), proposals: [{ id: id + '-p', kind: 'create-task', title, reason: 'Synthetic regression', status: 'pending', newTask: { title, category: 'Personal', difficulty: 'small' } }] });
    await db.companionMessages.put(pending('race', 'Synthetic once-only task'));
    const race = await Promise.all(Array.from({ length: 5 }, () => ai.applyCompanionProposal('race', 'race-p')));
    findings.push({ name: 'Concurrent proposal apply produces exactly one task', pass: race.filter(r => r.ok).length === 1 && (await db.tasks.filter(t => t.title === 'Synthetic once-only task').count()) === 1, details: race });
    await db.companionMessages.put(pending('rollback', 'Synthetic rolled-back task'));
    const put = db.syncQueue.put.bind(db.syncQueue); let failNext = true;
    db.syncQueue.put = (...args) => { if (failNext) { failNext = false; return Promise.reject(new Error('Synthetic sync write failure')); } return put(...args); };
    try {
      const result = await ai.applyCompanionProposal('rollback', 'rollback-p');
      findings.push({ name: 'Failed proposal write rolls back task and records failure', pass: !result.ok && (await db.tasks.filter(t => t.title === 'Synthetic rolled-back task').count()) === 0 && (await db.companionMessages.get('rollback')).proposals[0].status === 'failed' });
    } finally { db.syncQueue.put = put; }
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    await ai.configureRemoteApi({ endpoint, model: 'gemini-audit-test', apiKey: 'audit-dummy-key-not-a-real-secret' });
    const realFetch = window.fetch; let requests = 0;
    window.fetch = async (url, init) => {
      if (new URL(String(url)).origin !== 'https://generativelanguage.googleapis.com') return realFetch(url, init);
      requests++; await new Promise(resolve => setTimeout(resolve, 120));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'Synthetic successful reply', proposals: [] }) } }] }), { headers: { 'Content-Type': 'application/json' } });
    };
    try {
      const calls = await Promise.allSettled([ai.sendCompanionMessage('Synthetic first request'), ai.sendCompanionMessage('Synthetic duplicate request')]);
      findings.push({ name: 'Concurrent sends share one request lock', pass: calls.filter(r => r.status === 'fulfilled').length === 1 && requests === 1 });
      const count = await db.companionMessages.count();
      const bulkPut = db.syncQueue.bulkPut.bind(db.syncQueue);
      let failPair = true;
      db.syncQueue.bulkPut = (...args) => { if (failPair) { failPair = false; return Promise.reject(new Error('Synthetic pair write failure')); } return bulkPut(...args); };
      let rejected = false;
      try { await ai.sendCompanionMessage('Synthetic atomic pair failure'); } catch { rejected = true; } finally { db.syncQueue.bulkPut = bulkPut; }
      findings.push({ name: 'Failed conversation pair leaves no partial history', pass: rejected && await db.companionMessages.count() === count });
      const security = await import('/src/lib/security.ts');
      security.trustCompanionEndpoint('https://synthetic-provider.invalid/chat');
      let bound = false;
      try { await ai.configureRemoteApi({ endpoint: 'https://synthetic-provider.invalid/chat', model: 'synthetic', apiKey: '' }); } catch { bound = true; }
      findings.push({ name: 'Saved Gemini key cannot follow another provider origin', pass: bound });
      await ai.updateCompanionState({ provider: 'ollama', endpoint: 'http://localhost:11434', model: 'synthetic-local-model' });
      const localBefore = await db.companionMessages.count();
      let localMode = 'empty'; let localRequests = 0;
      window.fetch = async () => {
        localRequests++;
        if (localMode === 'empty') return new Response(JSON.stringify({ message: { content: '' } }));
        if (localMode === 'server') return new Response('JSON format server failure', { status: 500 });
        if (localRequests === 1) return new Response('Unsupported JSON format schema', { status: 400 });
        return new Response(JSON.stringify({ message: { content: JSON.stringify({ summary: 'Synthetic local reply', proposals: [] }) } }));
      };
      let emptyRejected = false;
      try { await ai.sendCompanionMessage('Synthetic empty local response'); } catch { emptyRejected = true; }
      findings.push({ name: 'Empty Ollama response is rejected without fabricated history', pass: emptyRejected && await db.companionMessages.count() === localBefore });
      localMode = 'server'; localRequests = 0;
      try { await ai.sendCompanionMessage('Synthetic local server failure'); } catch { /* expected */ }
      findings.push({ name: 'Ollama server error mentioning JSON does not trigger generation retry', pass: localRequests === 1 && await db.companionMessages.count() === localBefore });
      localMode = 'schema'; localRequests = 0;
      await ai.sendCompanionMessage('Synthetic local schema fallback');
      findings.push({ name: 'Explicit Ollama schema rejection allows one bounded fallback', pass: localRequests === 2 && await db.companionMessages.count() === localBefore + 2 });
    } finally { window.fetch = realFetch; }
    const documents = await import('/src/lib/companionDocuments.ts');
    documents.clearCompanionDocuments();
    const uploads = await Promise.allSettled(Array.from({ length: 4 }, (_, index) => documents.addCompanionDocument(new File(['Synthetic concurrent document ' + index], `synthetic-${index}.txt`, { type: 'text/plain' }))));
    findings.push({ name: 'Concurrent upload surfaces cannot exceed three document slots', pass: uploads.filter(r => r.status === 'fulfilled').length === 3 && documents.listCompanionDocuments().length === 3, details: { completed: uploads.filter(r => r.status === 'fulfilled').length, attached: documents.listCompanionDocuments().length } });
    documents.clearCompanionDocuments();
    const slowFile = new File(['Synthetic slow document'], 'slow.txt', { type: 'text/plain' });
    const readBuffer = slowFile.arrayBuffer.bind(slowFile);
    slowFile.arrayBuffer = async () => { await new Promise(resolve => setTimeout(resolve, 150)); return readBuffer(); };
    const reading = documents.addCompanionDocument(slowFile);
    let readBlockedSend = false;
    try { await ai.sendCompanionMessage('Synthetic send while reading'); } catch (error) { readBlockedSend = /finish reading/.test(error.message); }
    await reading;
    findings.push({ name: 'Send cannot omit an attachment that is still being read', pass: readBlockedSend && !documents.companionDocumentsBusy() });
    documents.clearCompanionDocuments();
    const stale = documents.addCompanionDocument(slowFile);
    documents.clearCompanionDocuments();
    let staleRejected = false;
    try { await stale; } catch { staleRejected = true; }
    findings.push({ name: 'Cleared attachments cannot reappear after a late parse', pass: staleRejected && documents.listCompanionDocuments().length === 0 });
    await db.companionMessages.put(pending('dismiss-race', 'Synthetic consistent approval'));
    await Promise.all([ai.applyCompanionProposal('dismiss-race', 'dismiss-race-p'), ai.dismissCompanionProposal('dismiss-race', 'dismiss-race-p')]);
    const applied = await db.companionMessages.get('dismiss-race');
    findings.push({ name: 'Concurrent dismissal cannot overwrite an applied proposal', pass: applied.proposals[0].status === 'applied' && await db.tasks.filter(t => t.title === 'Synthetic consistent approval').count() === 1 });
    await db.companionMessages.put(pending('typed-atomic', 'Synthetic typed approval rollback'));
    const approvalCount = await db.companionMessages.count();
    const messagePut = db.companionMessages.put.bind(db.companionMessages);
    let historyWrites = 0;
    db.companionMessages.put = (...args) => {
      historyWrites++;
      return historyWrites === 2 ? Promise.reject(new Error('Synthetic approval history failure')) : messagePut(...args);
    };
    let approvalFailed = false;
    try { await ai.sendCompanionMessage('yes'); } catch { approvalFailed = true; } finally { db.companionMessages.put = messagePut; }
    findings.push({ name: 'Typed approval history failure rolls back approved task and both messages', pass: approvalFailed && await db.companionMessages.count() === approvalCount && await db.tasks.filter(t => t.title === 'Synthetic typed approval rollback').count() === 0 && (await db.companionMessages.get('typed-atomic')).proposals[0].status === 'pending' });
    const approved = await ai.sendCompanionMessage('yes');
    findings.push({ name: 'Typed approval can retry safely after a rolled-back local write', pass: approved.localOnly && await db.tasks.filter(t => t.title === 'Synthetic typed approval rollback').count() === 1 && await db.companionMessages.count() === approvalCount + 2 });
    return findings;
  });
  for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.name}${result.pass ? '' : ' ' + JSON.stringify(result.details ?? '')}`);
  assert.ok(results.every(result => result.pass), 'All Companion browser regressions must pass.');
} finally { await browser.close(); }
