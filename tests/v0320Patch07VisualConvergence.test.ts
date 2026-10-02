import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Task capture joins the isolated capture-sheet system instead of the legacy modal cascade', () => {
  const task = read('src/components/AddTaskModal.tsx');

  assert.match(task, /createPortal\(dialog, document\.body\)/);
  assert.match(task, /ik-workspace-dialog--task/);
  assert.match(task, /className="ik-workspace-dialog__head"/);
  assert.match(task, /className="ik-workspace-dialog__details"/);
  assert.match(task, /className="ik-workspace-dialog__actions"/);
  assert.match(task, /aria-label="Close task editor"/);
  assert.doesNotMatch(task, /className="modal task-modal/);
  assert.doesNotMatch(task, /className="modal-backdrop"/);
});

test('Career, Roadmap and Task capture sheets deliberately converge on the accepted Memory visual language', () => {
  const css = read('src/workspace-dialog-v032.css');
  const memoryCss = read('src/memories-v080.css');

  assert.match(memoryCss, /\.memory-modal-backdrop[\s\S]*?background:color-mix\(in srgb,var\(--ik-bg\) 74%,transparent\);[\s\S]*?backdrop-filter:blur\(12px\)/);
  assert.match(css, /\.ik-workspace-dialog-backdrop\s*\{[\s\S]*?background:\s*color-mix\(in srgb, var\(--ik-bg\) 74%, transparent\);[\s\S]*?backdrop-filter:\s*blur\(12px\)/);
  assert.match(css, /--ik-workspace-paper:\s*color-mix\(in srgb, var\(--ik-surface-strong\) 88%, var\(--ik-bg\)\)/);
  assert.match(css, /border-radius:\s*18px !important/);
  assert.match(css, /\.ik-workspace-dialog__head[\s\S]*?box-shadow:\s*inset 0 -1px 0 var\(--ik-border\)/);
  assert.match(css, /\.ik-workspace-dialog__close\s*\{[\s\S]*?width:\s*32px;[\s\S]*?border-radius:\s*50%/);
  assert.match(css, /\.ik-workspace-dialog__field\s*\{[\s\S]*?font:\s*700 7px\/1 var\(--ik-mono\);[\s\S]*?text-transform:\s*uppercase/);
  assert.match(css, /\.ik-workspace-dialog__details\s*\{[\s\S]*?border:\s*1px solid var\(--ik-border\);[\s\S]*?background:\s*var\(--ik-surface-soft\)/);
  assert.match(css, /\.ik-workspace-dialog__actions\s*\{[\s\S]*?border-top:\s*1px solid var\(--ik-border\);[\s\S]*?background:\s*transparent/);
});

test('Today desk paper keeps a dedicated print composition while preserving the original Paper Lab layouts', () => {
  const rig = read('src/components/paper/PaperRig.tsx');
  const interactive = read('src/components/InteractiveDailyPaper.tsx');
  const deskCss = read('src/daily-desk-v026.css');

  assert.match(rig, /presentation\?: 'default' \| 'desk'/);
  assert.match(rig, /if \(presentation === 'desk'\)/);
  assert.match(rig, /if \(theme\.layout === 'himekuri'\)/);
  assert.match(interactive, /<PaperRig[\s\S]*?presentation=\{presentation\}/);
  assert.match(deskCss, /\.daily026-paper-object\s*\{[\s\S]*?position:\s*absolute;/);
});
