import assert from 'node:assert/strict';
import test from 'node:test';
import { abortableDelay, boundedRequest, readBoundedResponseText, readChatStream, redactProviderSecrets, retryDelay, sanitizeProviderText, TransportFailure } from '../src/lib/companionTransportCore';
import { beginCompanionOperation, cancelCompanionOperation, companionOperationActive, finishCompanionOperation, getCompanionRuntime } from '../src/lib/companionRuntime';

const encoder = new TextEncoder();
test('credential redaction preserves long successful replies', () => {
  const input = JSON.stringify({ summary: 'A'.repeat(4000) + ' audit-dummy-secret', proposals: [] });
  const result = JSON.parse(redactProviderSecrets(input, 'audit-dummy-secret'));
  assert.equal(result.summary, 'A'.repeat(4000) + ' [redacted]');
});
function streamed(parts: string[]) {
  return new Response(new ReadableStream({ start(controller) { for (const part of parts) controller.enqueue(encoder.encode(part)); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
const event = (content: string, reason: string | null = null) => `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: reason }] })}\n\n`;

test('deadline remains active when headers arrive but response body stalls', async () => {
  const response = new Response(new ReadableStream({ start() {} }));
  await assert.rejects(boundedRequest({ request: async () => response, consume: readBoundedResponseText, timeoutMs: 20 }), (e: unknown) => e instanceof TransportFailure && e.kind === 'timeout');
});
test('deadline also bounds an unresponsive network implementation', async () => {
  await assert.rejects(boundedRequest({ request: () => new Promise(() => {}), consume: readBoundedResponseText, timeoutMs: 20 }), (e: unknown) => e instanceof TransportFailure && e.kind === 'timeout');
});
test('user cancellation differs from timeout and aborts response consumption', async () => {
  const controller = new AbortController();
  const operation = boundedRequest({ request: async () => new Response(new ReadableStream({ start() {} })), consume: readBoundedResponseText, timeoutMs: 500, signal: controller.signal });
  controller.abort();
  await assert.rejects(operation, (e: unknown) => e instanceof TransportFailure && e.kind === 'cancelled');
});
test('already cancelled request does not touch the network', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(boundedRequest({ request: async () => { calls++; return new Response('bad'); }, consume: readBoundedResponseText, timeoutMs: 50, signal: controller.signal }));
  assert.equal(calls, 0);
});
test('ordinary successful body is preserved', async () => {
  const result = await boundedRequest({ request: async () => new Response('OK'), consume: readBoundedResponseText, timeoutMs: 100 });
  assert.equal(result, 'OK');
});
test('retry backoff is cancellable immediately', async () => {
  const controller = new AbortController(); const waiting = abortableDelay(10000, controller.signal); controller.abort();
  await assert.rejects(waiting, (e: unknown) => e instanceof TransportFailure && e.kind === 'cancelled');
});
test('auth, invalid payload, missing model, network uncertainty and timeouts are never automatically retried', () => {
  for (const status of [0, 400, 401, 403, 404, 408, 422, 500]) assert.equal(retryDelay({ status, header:null, body:'', attempt:0, remainingMs:60000 }),null);
});
test('busy retries use bounded backoff with at most three total attempts', () => {
  assert.equal(retryDelay({status:503,header:null,body:'',attempt:0,remainingMs:60000}),700);
  assert.equal(retryDelay({status:503,header:null,body:'',attempt:1,remainingMs:60000}),1400);
  assert.equal(retryDelay({status:503,header:null,body:'',attempt:2,remainingMs:60000}),null);
});
test('quota exhaustion and long provider cooldowns return control without hammering Gemini', () => {
  for(const body of ['daily limit','quota limit: 0','billing unavailable','insufficient_quota']) assert.equal(retryDelay({status:429,header:'1',body,attempt:0,remainingMs:60000}),null);
  assert.equal(retryDelay({status:429,header:'60',body:'',attempt:0,remainingMs:60000}),null);
  assert.equal(retryDelay({status:429,header:null,body:'',attempt:0,remainingMs:60000}),null);
});
test('Retry-After and Google RetryInfo are respected using the larger delay', () => {
  assert.equal(retryDelay({status:429,header:'1',body:JSON.stringify({error:{details:[{retryDelay:'3s'}]}}),attempt:0,remainingMs:10000}),3000);
  assert.equal(retryDelay({status:503,header:'8',body:'',attempt:0,remainingMs:5000}),null);
});
test('stream parser handles split SSE JSON, unicode and CRLF', async () => {
  const raw=(event('Hi 🌱')+event(' there','stop')+'data: [DONE]\n\n').replaceAll('\n','\r\n');
  const encoded = encoder.encode(raw);
  const response = new Response(new ReadableStream({ start(controller) { for (const byte of encoded) controller.enqueue(new Uint8Array([byte])); controller.close(); } }));
  const sizes:number[]=[];
  assert.equal(await readChatStream(response,new AbortController().signal,n=>sizes.push(n)),'Hi 🌱 there');
  assert.equal(sizes.at(-1),'Hi 🌱 there'.length);
});
test('truncated or malformed streams are rejected before history can be saved', async () => {
  for(const parts of [[event('partial')],['data: broken\n\n'],[event('too long','length')],['data: {"error":{"message":"SECRET"}}\n\n']]) await assert.rejects(readChatStream(streamed(parts),new AbortController().signal,()=>{}),TransportFailure);
});
test('response size limit prevents unbounded reply allocation', async () => {
  await assert.rejects(readBoundedResponseText(new Response('a'.repeat(2*1024*1024+1)),new AbortController().signal),TransportFailure);
});
test('secret echo and authorization text are redacted before reaching UI or failure storage', () => {
  const fake='audit-placeholder-key';
  const result=sanitizeProviderText(`bad ${fake} Authorization Bearer audit-secret-value`,fake);
  assert.ok(!result.includes(fake)); assert.ok(!result.includes('audit-secret-value'));
});
test('request lock covers both full chat and Familiar, and cancellation releases cleanly', () => {
  const first=beginCompanionOperation('Gemini','test-model','sending');
  assert.equal(companionOperationActive(),true);
  assert.throws(()=>beginCompanionOperation('Gemini','test-model','sending'));
  cancelCompanionOperation(); assert.equal(first.signal.aborted,true);
  finishCompanionOperation(first,'cancelled'); assert.equal(companionOperationActive(),false);
  const second=beginCompanionOperation('Ollama','test-model','connecting');
  finishCompanionOperation(first,'failed'); assert.equal(companionOperationActive(),true);
  finishCompanionOperation(second,'connected'); assert.equal(getCompanionRuntime().phase,'connected');
});
