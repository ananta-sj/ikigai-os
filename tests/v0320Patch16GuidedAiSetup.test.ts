import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('src/pages/CompanionPage.tsx', 'utf8');
const css = fs.readFileSync('src/companion-v120.css', 'utf8');

test('Gemini remote setup uses a managed endpoint and curated current model dropdown', () => {
  assert.match(page, /const GEMINI_DEFAULT_MODEL = 'gemini-3\.8-flash'/);
  for (const model of ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']) assert.match(page, new RegExp(model.replaceAll('.', '\\.')));
  assert.match(page, /<select value=\{geminiModelPreset\}/);
  assert.match(page, /Custom Gemini model ID…/);
  assert.match(page, /Endpoint managed automatically/);
});

test('custom OpenAI-compatible setup still exposes explicit endpoint and model fields behind a custom choice', () => {
  assert.match(page, /type RemotePreset = 'gemini' \| 'custom'/);
  assert.match(page, /<strong>Custom endpoint<\/strong><small>Any trusted OpenAI-compatible chat endpoint<\/small>/);
  assert.match(page, /placeholder="https:\/\/provider\.example\/v1\/chat\/completions"/);
  assert.match(page, /placeholder="Provider model ID"/);
  assert.match(page, /trustCompanionEndpoint\(endpointDraft\)/);
});

test('choosing Gemini supplies a valid default model instead of asking users to invent an id', () => {
  assert.match(page, /setEndpointDraft\(GEMINI_CHAT_ENDPOINT\)/);
  assert.match(page, /setModelDraft\(GEMINI_DEFAULT_MODEL\)/);
  assert.match(page, /Choose a provider and model, add your key, then save/);
});

test('guided provider helper has dedicated restrained styling', () => {
  assert.match(css, /\.companion-managed-endpoint \{/);
  assert.match(css, /grid-template-columns: 24px minmax\(0, 1fr\)/);
  assert.match(css, /\.companion-field-subtle/);
});
