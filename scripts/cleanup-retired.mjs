import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');

const retired = [
  ['src/pages/NerdsPage.tsx', 'aff6e513fd39402eac279d58394329a94e0aefb7b75f344481a7708f7bd7938a', 'retired Nerd page stub'],
  ['src/nerds-v0311.css', '26fda73f8b14a71dd2272ae1fec141f3ea71e2b298359cdd8ff78a334c03b8ea', 'retired Nerd stylesheet'],
  ['src/pages/PaperLabPage.tsx', '9130ad252df1002337521acf92cd4cc61468f946a7259d062537b8846d6e5236', 'retired Paper Lab page'],
  ['src/data/featureManifest.ts', 'aff6e513fd39402eac279d58394329a94e0aefb7b75f344481a7708f7bd7938a', 'retired feature manifest tombstone'],
  ['src/garden-v2.css', '2af69088ebcbc0804f7a9156c2c72702933007145338d3898263da2ba09752d6', 'retired Garden v2 stylesheet'],
  ['src/home-v033.css', 'e25263e941d880db5b6e9aafc0ba3821304f70063223f16d722468245905cfe1', 'retired Home v0.33 stylesheet'],
  ['src/journey-room-v0262.css', '62d288bd3182b1435dace04bc529e1e3b2ee4510f1ae4f6421b585ae9547e50b', 'retired Journey room v0.26.2 stylesheet'],
  ['src/journey-room-v0263.css', '349917ffa0c1d0bcd2e8912321ef3fe0c67ecf60ec5f85a6399d51fd507682d2', 'retired Journey room v0.26.3 stylesheet'],
  ['src/journey-v070.css', 'c0f4185b153a5559787e883c94cbac2f6deeb40700c9e40cd9836d847df38f10', 'retired Journey v0.70 stylesheet'],
  ['src/journey-v071.css', '551da716259c572411c4238789624c88d6a34067351e2fccf09ed6f4cc420d55', 'retired Journey v0.71 stylesheet'],
  ['src/sanctuary-v021.css', 'd481049f13591ab34b03036954ce1ec1a6fe01dec1b8ebed30e5c7fecf29e38b', 'retired Sanctuary v0.21 stylesheet'],
  ['src/components/DailyPage.tsx', ['c2edf8bdf17917591db357c80966ef2528dc3d926bb26e1703720703c001580b', '94e89c32b2c42e70e05e3f475fec2ce3fcaf32d9450641f6bc515472c4e5f954'], 'retired pre-physics daily page'],
  ['src/components/LogProgressModal.tsx', 'aa497ee5829253b2a0c106a320c01ca714a26e4eed930122a0a042528b549754', 'retired XP progress modal'],
  ['src/components/garden/GardenWorld.tsx', '71f95181602704f0be549d32b7dba409bded00db5bed1aa514991dd3db5f40cf', 'retired prototype Garden world'],
  ['src/components/journey/JourneyRoom3D.tsx', '552d74b3207f73ad19fd7ea3ce2fbcc46b2e708e05f866b56fda206ee7f8d944', 'retired Journey 3D prototype'],
  ['src/components/journey/JourneyStudyScene.tsx', '17e7021a6ec4fbd706724d329e35175772eda76b7d6a7f9be80383ad57a039d7', 'retired Journey study prototype'],
  ['src/pages/PlaceholderPage.tsx', 'b4920b4109aa56b202c11a9a4b9c93284534ffc37c690a9f12e70c0643ea8b1b', 'retired placeholder room'],
  ['src/lib/garden.ts', '3dcfbad113fefc2c88fef4aa149cf38f85f48cd60f988fa9a91b2a05eae0886f', 'retired manual Garden care path'],
  ['src/lib/growth.ts', '454515ac0b33378c7f6b175ed543d501aef6afd1170190e595bdccc43704533c', 'retired XP growth helper'],
  ['src/data/roadmap.ts', '5c6a5f87120df7c033ce21c3c0301d6367ae7ef30061a44f3629cfffcbecb86a', 'retired placeholder roadmap copy']
];

let removed = 0;
let refused = 0;

for (const [relativePath, expected, label] of retired) {
  const absolutePath = path.join(root, ...relativePath.split('/'));
  if (!existsSync(absolutePath)) continue;

  const actualHash = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
  const expectedHashes = Array.isArray(expected) ? expected : [expected];
  if (!expectedHashes.includes(actualHash)) {
    console.warn(`[cleanup:retired] Keeping locally modified ${relativePath}`);
    console.warn(`  expected ${expectedHashes.join(' or ')}`);
    console.warn(`  actual   ${actualHash}`);
    refused += 1;
    continue;
  }

  rmSync(absolutePath, { force: true });
  removed += 1;
  console.log(`[cleanup:retired] Removed ${label}: ${relativePath}`);
}

if (refused > 0) {
  console.error(`[cleanup:retired] Refused to delete ${refused} locally modified retired file(s).`);
  process.exitCode = 2;
} else if (removed > 0) {
  console.log(`[cleanup:retired] Removed ${removed} known retired file(s).`);
} else {
  console.log('[cleanup:retired] Release tree is already clean.');
}
