import test from 'node:test';
import assert from 'node:assert/strict';
import {
  companionEndpointTrustInfo,
  isLoopbackHost,
  normalizeExternalHttpUrl,
  safeFilename
} from '../src/lib/security.ts';

test('external URL sanitizer allows only normal http and https links without embedded credentials', () => {
  assert.equal(normalizeExternalHttpUrl('https://example.com/a?q=1'), 'https://example.com/a?q=1');
  assert.equal(normalizeExternalHttpUrl('javascript:alert(1)'), undefined);
  assert.equal(normalizeExternalHttpUrl('data:text/html,hello'), undefined);
  assert.equal(normalizeExternalHttpUrl('https://user:pass@example.com/private'), undefined);
});

test('filename sanitizer removes path traversal and control characters', () => {
  assert.equal(safeFilename('../../secret\u0000.txt'), '-..-secret.txt');
  assert.equal(safeFilename(''), 'file');
  assert.equal(safeFilename('folder\\photo.png'), 'folder-photo.png');
});

test('companion endpoint policy trusts the Gemini preset but requires trust for arbitrary hosts', () => {
  const gemini = companionEndpointTrustInfo('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(gemini.valid, true);
  assert.equal(gemini.known, true);
  assert.equal(gemini.trusted, true);

  const custom = companionEndpointTrustInfo('https://models.example.com/v1/chat/completions');
  assert.equal(custom.valid, true);
  assert.equal(custom.known, false);
  assert.equal(custom.trusted, false);
  assert.equal(custom.requiresTrust, true);
});

test('companion endpoint policy rejects unsafe schemes, embedded credentials, and key-like query parameters', () => {
  assert.equal(companionEndpointTrustInfo('http://models.example.com/v1').valid, false);
  assert.equal(companionEndpointTrustInfo('https://user:pass@models.example.com/v1').valid, false);
  assert.equal(companionEndpointTrustInfo('https://models.example.com/v1?api_key=secret').valid, false);
  assert.equal(companionEndpointTrustInfo('https://models.example.com/v1?apiKey=secret').valid, false);
  assert.equal(companionEndpointTrustInfo('http://localhost:11434').valid, true);
  assert.equal(isLoopbackHost('::1'), true);
});
