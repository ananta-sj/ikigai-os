import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { extractCompanionDocument } from '../src/lib/companionDocumentCore';
test('ordinary compressed text PDF with ASCII85 and Flate filters extracts grounding facts', async () => {
  const bytes = new Uint8Array(fs.readFileSync('tests/fixtures/companion-compressed.pdf'));
  const result = await extractCompanionDocument(bytes, 'audit.pdf', 'application/pdf');
  assert.match(result.text, /MARIGOLD-742/);
  assert.match(result.text, /37 paper tokens/);
  assert.match(result.text, /2030-05-17/);
});
