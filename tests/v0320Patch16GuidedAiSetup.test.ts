import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('src/pages/CompanionPage.tsx', 'utf8');
const css = fs.readFileSync('src/companion-v120.css', 'utf8');

test('Gemini remote setup uses a managed endpoint and provider-discovered model dropdown', () => {
  assert.match(page, /await discoverGeminiModels\(\)/);
  assert.doesNotMatch(page, /gemini-3\.8-flash|gemini-3\.5-flash/);
  assert.match(page, /<select value=\{geminiModelPreset\}/);
  assert.match(page, /Enter a model ID or load available models…/);
  assert.match(page, /Endpoint managed automatically/);
});

test('custom OpenAI-compatible setup still exposes explicit endpoint and model fields behind a custom choice', () => {
  assert.match(page, /type RemotePreset = 'gemini' \| 'custom'/);
  assert.match(page, /<strong>Custom endpoint<\/strong><small>Any trusted OpenAI-compatible chat endpoint<\/small>/);
  assert.match(page, /placeholder="https:\/\/provider\.example\/v1\/chat\/completions"/);
  assert.match(page, /placeholder="Provider model ID"/);
  assert.match(page, /trustCompanionEndpoint\(endpointDraft\)/);
});

test('Gemini selects a model returned by the provider instead of claiming an unverified default is valid', () => {
  assert.match(page, /setEndpointDraft\(GEMINI_CHAT_ENDPOINT\)/);
  assert.match(page, /model: available\[0\]/);
  assert.match(page, /available\.includes\(modelDraft\)/);
  assert.match(page, /load available models and validate a real reply/);
});

test('guided provider helper has dedicated restrained styling', () => {
  assert.match(css, /\.companion-managed-endpoint \{/);
  assert.match(css, /grid-template-columns: 24px minmax\(0, 1fr\)/);
  assert.match(css, /\.companion-field-subtle/);
});
