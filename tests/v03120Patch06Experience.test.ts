import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const dialogCss = read('src/workspace-dialog-v032.css');
const types = read('src/types.ts');
const settings = read('src/lib/settings.ts');
const familiar = read('src/components/CompanionPet.tsx');
const familiarCss = read('src/companion-pet.css');
const companion = read('src/pages/CompanionPage.tsx');
const garden = read('src/pages/GardenPage.tsx');
const world = read('src/components/sanctuary/SanctuaryWorld.tsx');
const sanctuaryData = read('src/data/sanctuary.ts');
const sanctuaryCss = read('src/sanctuary-v023.css');

test('patch 06 compacts the shared Career/Roadmap dialog instead of creating a detached footer band', () => {
  assert.match(dialogCss, /\.ik-surface\.ik-workspace-dialog\s*\{[\s\S]*?display:\s*flex;[\s\S]*?height:\s*auto !important;/);
  assert.match(dialogCss, /\.ik-workspace-dialog__actions\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.doesNotMatch(dialogCss, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto;/);
});

test('Familiar can be disabled, freely placed and reset without losing its editor', () => {
  assert.match(types, /familiarEnabled:\s*boolean/);
  assert.match(types, /familiarPosition:\s*FamiliarPosition \| null/);
  assert.match(settings, /familiarEnabled:\s*true/);
  assert.match(settings, /familiarPosition:\s*null/);
  assert.match(familiar, /settings\?\.familiarEnabled === false/);
  assert.match(familiar, /handleDragStart/);
  assert.match(familiar, /handleDragMove/);
  assert.match(familiar, /updateSettings\(\{ familiarPosition: drag\.latest, familiarSide: drag\.latest\.x < \.5 \? 'left' : 'right' \}\)/);
  assert.match(companion, /Show Familiar across Ikigai/);
  assert.match(companion, /Free placement/);
  assert.match(companion, /familiarPosition: null/);
});

test('Familiar surface choices are opaque and include five materially distinct treatments', () => {
  assert.match(types, /'moss' \| 'terracotta'/);
  for (const label of ['Ceramic', 'Terracotta', 'Moss', 'Moonstone', 'Ink clay']) assert.match(companion, new RegExp(label));
  assert.match(familiarCss, /familiar-avatar-tail,[\s\S]*?opacity:\s*1;/);
  assert.match(familiarCss, /theme-dream[\s\S]*?backdrop-filter:\s*none;/);
  assert.match(familiarCss, /theme-terracotta[\s\S]*?#c98262/);
  assert.match(familiarCss, /theme-moss[\s\S]*?#60785a/);
});

test('Sanctuary now explains itself and offers a non-productive stillness mode', () => {
  assert.match(types, /sanctuaryIntroSeen:\s*boolean/);
  assert.match(settings, /sanctuaryIntroSeen:\s*false/);
  assert.match(garden, /Walk with me/);
  assert.match(garden, /Let me explore/);
  assert.match(garden, />Sit<|<span>Sit<\/span>/);
  assert.match(garden, /STILLNESS/);
  assert.match(garden, /Take the guided walk/);
  assert.match(sanctuaryData, /sanctuaryStillViews/);
  for (const id of ['pond-edge', 'pavilion-veranda', 'mountain-view', 'guardian-grove']) assert.match(sanctuaryData, new RegExp(id));
  assert.match(sanctuaryCss, /sanctuary-arrival/);
  assert.match(sanctuaryCss, /sanctuary-stillness-hud/);
});

test('Sanctuary world composition gains an original distant mountain, pond bridge and quiet street while respecting Familiar visibility', () => {
  assert.match(world, /function DistantMountainLandscape/);
  assert.match(world, /function PondBridge/);
  assert.match(world, /function QuietStreet/);
  assert.match(world, /Fuji-inspired silhouette: an original low-poly landmark/);
  assert.match(world, /familiarEnabled \? <SanctuaryFamiliar/);
  assert.match(world, /interactionMode === 'explore'/);
  assert.match(world, /requestedCamera/);
});
