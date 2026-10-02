import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };
const careerCss = read('src/reflection-career-v028.css');
const workspaceCss = read('src/roadmap-career-v090.css');
const reimagineCss = read('src/reimagine.css');
const career = read('src/pages/CareerPage.tsx');
const migration = read('MIGRATION_V0.31.19.md');

test('v0.31.19 records the browser-driven layout corrective', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.19'), `expected 0.31.19 or newer, got ${packageJson.version}`);
  assert.match(migration, /cascade/i);
  assert.match(migration, /Career/i);
});

test('GitHub activity is centered within its available canvas', () => {
  assert.match(careerCss, /\.career-github-activity\s*\{[\s\S]*?justify-items:\s*center/);
  assert.match(careerCss, /\.career-github-grid\s*\{[\s\S]*?justify-self:\s*center;[\s\S]*?margin-inline:\s*auto/);
});

test('Roadmap and Career dialogs own their widths instead of fighting a global 760px override', () => {
  assert.match(reimagineCss, /width:min\(var\(--ik-editor-width, 760px\),calc\(100vw - 32px\)\)/);
  assert.match(workspaceCss, /\.roadmap-modal-phase\s*\{\s*--ik-editor-width:\s*780px/);
  assert.match(workspaceCss, /\.career-modal-project\s*\{\s*--ik-editor-width:\s*820px/);
  assert.match(workspaceCss, /\.career-modal-proof\s*\{\s*--ik-editor-width:\s*740px/);
  assert.match(workspaceCss, /\.career-modal-opportunity\s*\{\s*--ik-editor-width:\s*760px/);
});

test('Project story is semantically one-line and visually compact even if an old route chunk lingers', () => {
  assert.match(career, /career-project-story">One-line story<input className="career-project-story-input" type="text"/);
  assert.match(workspaceCss, /\.career-modal-project \.career-project-story input,[\s\S]*?\.career-modal-project \.career-project-story textarea[\s\S]*?height:\s*46px/);
  assert.match(workspaceCss, /resize:\s*none/);
});
