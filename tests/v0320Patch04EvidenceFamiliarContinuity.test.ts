import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { workspaceIdParam } from '../src/lib/workspaceContinuityCore.ts';

function read(path: string) { return fs.readFileSync(path, 'utf8'); }

test('workspace deep-link ids stay bounded and local', () => {
  assert.equal(workspaceIdParam('abc-123'), 'abc-123');
  assert.equal(workspaceIdParam('phase:alpha_2.0'), 'phase:alpha_2.0');
  assert.equal(workspaceIdParam('  proof-1  '), 'proof-1');
  assert.equal(workspaceIdParam('../roadmap'), null);
  assert.equal(workspaceIdParam('https://example.com'), null);
  assert.equal(workspaceIdParam('a'.repeat(161)), null);
});

test('Roadmap and Career share one evidence trail instead of duplicating proof storage', () => {
  const roadmap = read('src/pages/RoadmapPage.tsx');
  const career = read('src/pages/CareerPage.tsx');

  assert.match(roadmap, /const requestedCheckpointId = workspaceIdParam\(searchParams\.get\('checkpoint'\)\)/);
  assert.match(roadmap, /to=\{`\/career\?proof=\$\{encodeURIComponent\(item\.id\)\}`\}/);
  assert.match(roadmap, /addProof=1&checkpoint=\$\{encodeURIComponent\(selectedItem\.id\)\}/);
  assert.match(roadmap, /const selectedItem = phaseItems\.find\(item => item\.id === selectedItemId\)/);
  assert.match(career, /initialRoadmapItemId=\{requestedCheckpointId && roadmap\.some\(item => item\.id === requestedCheckpointId\) \? requestedCheckpointId : undefined\}/);
  assert.match(career, /to=\{`\/roadmap\?checkpoint=\$\{encodeURIComponent\(checkpoint\.id\)\}`\}/);
  assert.match(career, /to=\{`\/calendar\?date=\$\{item\.date\}`\}/);
  assert.doesNotMatch(roadmap, /createProofItem\(/);
});

test('Career waits for real local records before applying proof prefill ids', () => {
  const career = read('src/pages/CareerPage.tsx');
  assert.match(career, /const \[workspaceLoaded, setWorkspaceLoaded\] = useState\(false\)/);
  assert.match(career, /setWorkspaceLoaded\(true\)/);
  assert.match(career, /if \(!requestedAddProof \|\| !workspaceLoaded\) return/);
  assert.match(career, /projects\.some\(item => item\.id === requestedProjectId\)/);
  assert.match(career, /roadmap\.some\(item => item\.id === requestedCheckpointId\)/);
});

test('Familiar room awareness reads bounded state and never projects private text', () => {
  const room = read('src/lib/workspaceContinuity.ts');
  const familiar = read('src/components/CompanionPet.tsx');

  assert.match(room, /db\.proofItems\.where\('roadmapItemId'\)\.equals\(checkpointId\)\.count\(\)/);
  assert.match(room, /db\.memories\.where\('date'\)\.equals\(date\)\.count\(\)/);
  assert.match(room, /reflectionHasWriting\(reflection\)/);
  assert.doesNotMatch(room, /memory\.(title|body)/);
  assert.doesNotMatch(room, /reflection\.(title|wins|friction|nextFocus|note)/);
  assert.doesNotMatch(room, /proof\.(title|note|url)/);
  assert.match(familiar, /loadFamiliarRoomSignal\(location\.pathname, location\.search\)/);
  assert.match(familiar, /const requestId = \+\+roomSignalRequest\.current;\s*setRoomSignal\(null\)/);
  assert.match(familiar, /\.catch\(\(\) => \{ if \(requestId === roomSignalRequest\.current\) setRoomSignal\(null\); \}\)/);
});

test('Familiar posture follows the room while Reduced Motion still wins', () => {
  const familiar = read('src/components/CompanionPet.tsx');
  assert.match(familiar, /if \(reduced \|\| activity === 'still'\) \{\s*setAmbientPose\('rest'\)/);
  assert.match(familiar, /\['\/reflection', '\/memories'\]\.includes\(location\.pathname\)/);
  assert.match(familiar, /const planningRoom = \['\/calendar', '\/roadmap', '\/career'\]\.includes\(location\.pathname\)/);
  assert.match(familiar, /planningRoom[\s\S]*?\{ pose: 'curious', weight: [45], hold: \d+ \}/);
  assert.match(familiar, /planningRoom[\s\S]*?\{ pose: 'awake', weight: [56], hold: \d+ \}/);
  assert.match(familiar, /familiar032-room-signal/);
});

test('evidence and room-state continuity stay visually quiet', () => {
  const workspaceCss = read('src/roadmap-career-v090.css');
  const familiarCss = read('src/companion-pet.css');
  assert.match(workspaceCss, /\.career032-proof-thread/);
  assert.match(workspaceCss, /border-bottom: 1px dotted/);
  assert.match(workspaceCss, /\.roadmap032-evidence-thread/);
  assert.doesNotMatch(workspaceCss, /\.roadmap032-evidence-thread[^}]*box-shadow/);
  assert.match(familiarCss, /\.familiar032-room-signal/);
  assert.match(familiarCss, /border-top: 1px solid var\(--ik-border\)/);
});
