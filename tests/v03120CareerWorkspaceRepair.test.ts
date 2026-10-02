import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { versionAtLeast } from './versionGate.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json')) as { version: string };
const career = read('src/pages/CareerPage.tsx');
const careerCss = read('src/career-v03120.css');
const workspaceDialogCss = read('src/workspace-dialog-v032.css');
const roadmap = read('src/pages/RoadmapPage.tsx');
const reimagineCss = read('src/reimagine.css');
const migration = read('MIGRATION_V0.31.20.md');

test('v0.31.20 records the Career workspace repair', () => {
  assert.ok(versionAtLeast(packageJson.version, '0.31.20'), `expected 0.31.20 or newer, got ${packageJson.version}`);
  assert.match(migration, /Career/i);
  assert.match(migration, /workspace|editor|modal/i);
});

test('Career editors use the new workspace-dialog namespace instead of legacy shared modal rules', () => {
  assert.match(career, /ik-workspace-dialog--project/);
  assert.match(career, /ik-workspace-dialog--proof/);
  assert.match(career, /ik-workspace-dialog--opportunity/);
  assert.match(career, /ik-workspace-dialog__body/);
  assert.match(career, /ik-workspace-dialog__grid ik-workspace-dialog__grid--story/);
  assert.doesNotMatch(career.slice(career.indexOf('function ProofModal'), career.indexOf('export function CareerPage')), /career-modal-project|career-modal-proof|career-modal-opportunity|career-form-grid/);
});

test('Career and Roadmap modal layout is isolated from the historical modal cascade and portaled to body', () => {
  assert.doesNotMatch(reimagineCss, /\.roadmap-modal,\.career-modal\s*\{\s*width:min\(/);
  assert.doesNotMatch(reimagineCss, /\.roadmap-form-grid,\.career-form-grid,\.memory-form-grid/);
  assert.match(career, /createPortal\(/);
  assert.match(career, /document\.body/);
  assert.match(roadmap, /createPortal\(/);
  assert.match(roadmap, /document\.body/);
  assert.match(workspaceDialogCss, /\.ik-workspace-dialog-backdrop\s*\{[\s\S]*?position:\s*fixed;/);
  assert.match(workspaceDialogCss, /display:\s*flex;[\s\S]*?flex-direction:\s*column;/);
  assert.match(workspaceDialogCss, /height:\s*auto !important;/);
  assert.doesNotMatch(workspaceDialogCss, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/);
  assert.match(workspaceDialogCss, /\.ik-workspace-dialog__body\s*\{[\s\S]*?overflow-y:\s*auto;/);
  assert.match(careerCss, /Career Workspace Repair/);
});

test('Project story remains a real single-line field', () => {
  assert.match(career, /career-project-story-input" type="text"/);
  assert.match(workspaceDialogCss, /\.ik-workspace-dialog__field input,[\s\S]*?min-height:\s*42px;/);
});

test('GitHub activity has a dedicated identity object and centered immersive stage', () => {
  assert.doesNotMatch(career, /\bGithub\b/);
  assert.match(career, /career-github-monogram\">GH/);
  assert.match(career, /career-github-stage/);
  assert.match(career, /career-github-emblem/);
  assert.match(career, /career-github-legend/);
  assert.match(careerCss, /\.career-github-stage\s*\{[\s\S]*?width:\s*min\(100%, 980px\)/);
  assert.match(careerCss, /grid-template-columns:\s*92px minmax\(0, 1fr\)/);
  assert.match(careerCss, /\.career-github-emblem\s*\{[\s\S]*?width:\s*84px/);
});
