import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Today paper camera fits the complete physical sheet instead of cropping the date', () => {
  const interactive = read('src/components/InteractiveDailyPaper.tsx');
  const rig = read('src/components/paper/PaperRig.tsx');

  assert.match(interactive, /zoom:\s*presentation === 'desk' \? 52 : 112/);
  assert.match(rig, /function PaperCameraFit/);
  assert.match(rig, /const fitWidth = WIDTH \+ 0\.48/);
  assert.match(rig, /const fitHeight = HEIGHT \+ 0\.\d+/);
  assert.match(rig, /camera\.zoom = Math\.max\(1, Math\.min\(size\.width \/ fitWidth, size\.height \/ fitHeight\) \* 0\.96\)/);
  assert.match(rig, /<PaperCameraFit enabled=\{desk\} \/>/);
});

test('Today desk face follows a Japanese tear-off hierarchy with a legible memo field', () => {
  const print = read('src/lib/dailyCalendarPrint.ts');

  assert.match(print, /日めくり/);
  assert.match(print, /const japaneseWeekday = \['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'\]/);
  assert.match(print, /function drawTraditionalHimekuri/);
  assert.match(print, /profile\.numeral/);
  assert.match(print, /label: profile\.size === 'compact' \? '今日 \/ TODAY' : '今日 \/ MEMO'/);
  assert.match(print, /const tasksVisible = taskLines\.slice\(0, profile\.tasks\)/);
  assert.match(print, /Date\.UTC\(year, date\.getMonth\(\), day\)/);
});

test('Today gives the physical calendar a deliberate desk presence without turning it into the main page', () => {
  const css = read('src/daily-desk-v026.css');

  assert.match(css, /--daily-paper-width:\s*216px/);
  assert.match(css, /--daily-paper-reserve:\s*284px/);
  assert.match(css, /\.daily026-paper-object\s*\{[\s\S]*?width:\s*var\(--daily-paper-width\)/);
  assert.match(css, /drop-shadow\(0 20px 24px rgba\(0,0,0,\.25\)\)/);
});

test('Paper Lab theme layouts remain separate from the Today-only presentation', () => {
  const rig = read('src/components/paper/PaperRig.tsx');

  for (const layout of ['himekuri', 'editorial', 'winter', 'festive', 'sakura', 'minimal']) {
    assert.ok(rig.includes(`if (theme.layout === '${layout}')`));
  }
});
