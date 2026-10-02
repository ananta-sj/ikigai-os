import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const career = read('src/pages/CareerPage.tsx');
const roadmap = read('src/pages/RoadmapPage.tsx');
const dialogCss = read('src/workspace-dialog-v032.css');

function modalSource(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.notEqual(from, -1, `missing ${start}`);
  assert.notEqual(to, -1, `missing ${end}`);
  return source.slice(from, to);
}

test('Patch 13 removes the obsolete Career editor stylesheet from the active render path', () => {
  assert.doesNotMatch(career, /import ['"]\.\.\/career-v03120\.css['"]/);
  assert.match(career, /import ['"]\.\.\/workspace-dialog-v032\.css['"]/);
  assert.ok(
    career.lastIndexOf("import '../workspace-dialog-v032.css';") > career.lastIndexOf("import '../reflection-career-v028.css';"),
    'isolated workspace dialog stylesheet should remain the last Career stylesheet import'
  );
});

test('Career and Roadmap editors stay exclusively on the isolated workspace-dialog namespace', () => {
  const careerModals = modalSource(career, 'function ProofModal', 'export function CareerPage');
  const roadmapModals = modalSource(roadmap, 'function PhaseModal', 'export function RoadmapPage');

  assert.match(careerModals, /ik-workspace-dialog--project/);
  assert.match(careerModals, /ik-workspace-dialog--proof/);
  assert.match(careerModals, /ik-workspace-dialog--opportunity/);
  assert.match(roadmapModals, /ik-workspace-dialog--roadmap-phase/);
  assert.match(roadmapModals, /ik-workspace-dialog--roadmap-checkpoint/);
  assert.doesNotMatch(careerModals, /career-modal|career-editor|career-form-grid/);
  assert.doesNotMatch(roadmapModals, /roadmap-modal|career-modal|ik-progressive-fields/);
});

test('Roadmap dialogs use the same quiet Lucide close control as Career', () => {
  assert.match(roadmap, /\bX\b[\s\S]*from 'lucide-react'/);
  const closeIcons = roadmap.match(/className="ik-workspace-dialog__close"[^>]*>[\s\S]*?<X size=\{17\} aria-hidden="true" \/><\/button>/g) ?? [];
  assert.equal(closeIcons.length, 2);
  assert.doesNotMatch(roadmap, /aria-label="Close">×<\/button>/);
});

test('workspace dialogs retain the compact capture-sheet acceptance contract', () => {
  assert.match(dialogCss, /\.ik-workspace-dialog--project\s*\{\s*--ik-workspace-dialog-width:\s*600px;/);
  assert.match(dialogCss, /\.ik-workspace-dialog--proof\s*\{\s*--ik-workspace-dialog-width:\s*570px;/);
  assert.match(dialogCss, /\.ik-workspace-dialog--roadmap-phase\s*\{\s*--ik-workspace-dialog-width:\s*600px;/);
  assert.match(dialogCss, /\.ik-workspace-dialog--roadmap-checkpoint\s*\{\s*--ik-workspace-dialog-width:\s*570px;/);
  assert.match(dialogCss, /border-radius:\s*18px !important;/);
  assert.match(dialogCss, /\.ik-workspace-dialog__close\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/);
  assert.match(dialogCss, /\.ik-workspace-dialog__field input,[\s\S]*?min-height:\s*42px;/);
  assert.match(dialogCss, /\.ik-workspace-dialog__details\s*\{[\s\S]*?border:\s*1px solid var\(--ik-border\);[\s\S]*?background:\s*var\(--ik-surface-soft\);/);
  assert.match(dialogCss, /\.ik-workspace-dialog__actions\s*\{[\s\S]*?border-top:\s*1px solid var\(--ik-border\);[\s\S]*?background:\s*transparent;/);
  assert.match(dialogCss, /@media \(max-width:\s*680px\)[\s\S]*?\.ik-workspace-dialog__grid--story\s*\{\s*grid-template-columns:\s*1fr;/);
});
