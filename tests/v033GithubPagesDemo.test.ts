import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const app = read('src/App.tsx');
const demoConfig = read('vite.demo.config.ts');
const workflow = read('.github/workflows/release-gate.yml');

test('GitHub Pages demo uses the repository base without changing production routing', () => {
  assert.match(app, /basename:\s*import\.meta\.env\.BASE_URL/);
  assert.match(demoConfig, /base:\s*['"]\/ikigai-space\/['"]/);
  assert.doesNotMatch(demoConfig, /VitePWA/);
});

test('live demo deploys only after the release matrix passes on main', () => {
  assert.match(workflow, /deploy-demo:/);
  assert.match(workflow, /needs:\s*verify/);
  assert.match(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /node-version:\s*'22\.12\.0'/);
  assert.match(workflow, /npx vite build --config vite\.demo\.config\.ts/);
});

test('GitHub Pages deployment keeps deep links usable and uses official Pages actions', () => {
  assert.match(workflow, /cp dist\/index\.html dist\/404\.html/);
  assert.match(workflow, /node scripts\/audit-demo-dist\.mjs/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
});
