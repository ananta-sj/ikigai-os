import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptUrl = new URL('../scripts/audit-lucide.mjs', import.meta.url);
const scriptText = readFileSync(scriptUrl, 'utf8');

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ikigai-lucide-audit-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'node_modules', 'lucide-react'), { recursive: true });

  cpSync(scriptUrl, join(root, 'scripts', 'audit-lucide.mjs'));
  writeFileSync(join(root, 'node_modules', 'lucide-react', 'package.json'), JSON.stringify({
    name: 'lucide-react',
    type: 'module',
    exports: './index.js'
  }));
  writeFileSync(join(root, 'node_modules', 'lucide-react', 'index.js'), [
    'export const CalendarDays = {};',
    'export const Sparkles = {};',
    'export const ArrowUpRight = {};'
  ].join('\n'));

  return root;
}

test('Patch 18 lucide audit cannot swallow earlier React or animation imports', () => {
  const root = makeFixture();
  try {
    writeFileSync(join(root, 'src', 'Example.tsx'), `
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import {
  CalendarDays,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export function Example() { return null; }
`);

    const result = spawnSync(process.execPath, ['scripts/audit-lucide.mjs'], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Lucide export audit passed · 3 named icon imports verified\./);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /useEffect|useMemo|useState|FormEvent|motion|AnimatePresence|Canvas/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Patch 18 lucide import matcher is bounded to a single import declaration', () => {
  assert.match(scriptText, /const importPattern = .*\(\[\^\}\]\*\)/);
  assert.doesNotMatch(scriptText, /const importPattern = .*\[\\s\\S\]\*\?/);
});
