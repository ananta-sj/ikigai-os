import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the primary product routes remain registered', () => {
  const app = read('src/App.tsx');
  for (const route of ['/', '/calendar', '/focus', '/now-playing', '/garden', '/roadmap', '/reflection', '/memories', '/career', '/companion', '/settings']) {
    assert.match(app, new RegExp(`path:\\s*['\"]${route.replace('/', '\\/')}['\"]`));
  }
});

test('the document carries baseline browser hardening metadata', () => {
  const html = read('index.html');
  assert.match(html, /Content-Security-Policy/i);
  assert.match(html, /object-src 'none'/i);
  assert.match(html, /frame-src 'none'/i);
  assert.match(html, /base-uri 'self'/i);
  assert.match(html, /name="referrer" content="no-referrer"/i);
});

test('production dependency specs are exact rather than floating', () => {
  const pkg = JSON.parse(read('package.json')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  for (const section of [pkg.dependencies ?? {}, pkg.devDependencies ?? {}]) {
    for (const [name, spec] of Object.entries(section)) {
      assert.match(spec, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `${name} should be pinned exactly, got ${spec}`);
    }
  }
});
