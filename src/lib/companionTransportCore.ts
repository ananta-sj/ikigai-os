/** Transport policy is injectable so failure behavior can be tested without credentials. */
export class TransportFailure extends Error {
  constructor(public kind: 'cancelled' | 'timeout' | 'network' | 'response', message: string) { super(message); }
}

export async function boundedRequest<T>(input: {
  request: (signal: AbortSignal) => Promise<Response>;
  consume: (response: Response, signal: AbortSignal) => Promise<T>;
  signal?: AbortSignal;
  timeoutMs: number;
}): Promise<T> {
  const controller = new AbortController();
  let expired = false;
  const cancel = () => controller.abort();
  input.signal?.addEventListener('abort', cancel, { once: true });
  if (input.signal?.aborted) cancel();
  const timer = setTimeout(() => { expired = true; controller.abort(); }, input.timeoutMs);
  let rejectAbort: (reason: unknown) => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(new TransportFailure(expired ? 'timeout' : 'cancelled', expired ? 'The request deadline expired.' : 'Request cancelled.'));
  controller.signal.addEventListener('abort', onAbort, { once: true });
  if (controller.signal.aborted) onAbort();
  try {
    return await Promise.race([
      (async () => {
        if (controller.signal.aborted) throw new TransportFailure('cancelled', 'Request cancelled.');
        const response = await input.request(controller.signal);
        if (controller.signal.aborted) { void response.body?.cancel(); throw new TransportFailure('cancelled', 'Request cancelled.'); }
        return input.consume(response, controller.signal);
      })(),
      aborted
    ]);
  } catch (error) {
    if (error instanceof TransportFailure) throw error;
    if (controller.signal.aborted) throw new TransportFailure(expired ? 'timeout' : 'cancelled', expired ? 'The request deadline expired.' : 'Request cancelled.');
    if (error instanceof TypeError) throw new TransportFailure('network', 'Could not contact the configured provider.');
    throw error;
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
  }
}

export function abortableDelay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new TransportFailure('cancelled', 'Request cancelled.')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export function retryDelay(input: { status: number; header: string | null; body: string; attempt: number; remainingMs: number; now?: number }): number | null {
  if (input.attempt >= 2 || ![429, 502, 503, 504].includes(input.status)) return null;
  // Exhausted daily/billing/zero quota needs user action, not repeated generation.
  if (input.status === 429 && /daily|per.day|billing|insufficient.quota|limit\s*:\s*0|quota.*exhausted/i.test(input.body)) return null;
  const now = input.now ?? Date.now();
  const delays: number[] = [];
  if (input.header) {
    const seconds = Number(input.header);
    const value = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(input.header) - now;
    if (Number.isFinite(value)) delays.push(Math.max(0, value));
  }
  try {
    const payload = JSON.parse(input.body);
    for (const detail of payload.error?.details ?? []) {
      const match = String(detail.retryDelay ?? '').match(/^(\d+(?:\.\d+)?)(ms|s)$/);
      if (match) delays.push(Number(match[1]) * (match[2] === 's' ? 1000 : 1));
    }
  } catch { /* An HTTP error can have a non-JSON body. */ }
  const match = input.body.match(/retry\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*(ms|s|seconds?)\b/i);
  if (match) delays.push(Number(match[1]) * (match[2].toLowerCase() === 'ms' ? 1 : 1000));
  // A rate limit with no reset hint may represent a permanent quota denial.
  if (input.status === 429 && !delays.length) return null;
  const delay = delays.length ? Math.max(...delays) : 700 * (2 ** input.attempt);
  return delay <= 15000 && delay + 1000 < input.remainingMs ? delay : null;
}

export function redactProviderSecrets(input: string, secret = '') {
  let text = secret ? input.split(secret).join('[redacted]') : input;
  text = text.replace(/\bAIza[\w-]+/g, '[redacted]').replace(/\bsk-[\w-]{12,}/g, '[redacted]');
  return text.replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [redacted]');
}

export function sanitizeProviderText(input: string, secret = '') {
  return redactProviderSecrets(input, secret).slice(0, 260);
}

export async function readBoundedResponseText(response: Response, signal: AbortSignal) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', abort, { once: true });
  let bytes = 0;
  let output = '';
  try {
    while (true) {
      if (signal.aborted) throw new TransportFailure('cancelled', 'Request cancelled.');
      const part = await reader.read();
      if (signal.aborted) throw new TransportFailure('cancelled', 'Request cancelled.');
      if (part.done) return output + decoder.decode();
      bytes += part.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw new TransportFailure('response', 'The provider response exceeds Ikigai Space’s safe response limit.');
      output += decoder.decode(part.value, { stream: true });
    }
  } finally { signal.removeEventListener('abort', abort); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

export async function readChatStream(response: Response, signal: AbortSignal, progress: (characters: number) => void): Promise<string> {
  if (!response.body) throw new TransportFailure('response', 'The provider returned no response body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';
  let bytes = 0;
  let complete = false;
  const abort = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener('abort', abort, { once: true });
  function event(raw: string) {
    const data = raw.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return;
    if (data.trim() === '[DONE]') { complete = true; return; }
    let payload;
    try { payload = JSON.parse(data); } catch { throw new TransportFailure('response', 'The provider sent malformed stream data.'); }
    if (payload.error) throw new TransportFailure('response', 'The provider interrupted its reply. Try again or test the connection.');
    const choice = payload.choices?.[0];
    if (choice?.finish_reason === 'length') throw new TransportFailure('response', 'The reply exceeded the model output limit. Ask for a shorter reply.');
    if (choice?.finish_reason === 'content_filter') throw new TransportFailure('response', 'The provider blocked this reply. Rephrase the request.');
    if (choice?.finish_reason === 'stop') complete = true;
    const delta = choice?.delta?.content;
    if (typeof delta === 'string') { output += delta; progress(output.length); }
  }
  try {
    while (!complete) {
      if (signal.aborted) throw new TransportFailure('cancelled', 'Request cancelled.');
      const chunk = await reader.read();
      if (signal.aborted) throw new TransportFailure('cancelled', 'Request cancelled.');
      if (chunk.done) { buffer += decoder.decode(); break; }
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw new TransportFailure('response', 'The reply exceeds Ikigai Space’s safe response limit.');
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n');
      // Normalize after joining too: CRLF can straddle network chunks.
      buffer = buffer.replace(/\r\n/g, '\n');
      let end;
      while ((end = buffer.indexOf('\n\n')) >= 0) { const raw = buffer.slice(0, end); buffer = buffer.slice(end + 2); event(raw); }
    }
    if (buffer.trim()) event(buffer);
    if (!complete || !output.trim()) throw new TransportFailure('response', 'The provider ended before a complete, usable reply arrived.');
    return output.trim();
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
