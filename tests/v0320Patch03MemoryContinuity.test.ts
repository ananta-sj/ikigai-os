import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function read(path: string) { return fs.readFileSync(path, 'utf8'); }

test('date continuity counts existing memories without creating another persistence path', () => {
  const continuity = read('src/lib/continuity.ts');
  assert.match(continuity, /memoryCount: number/);
  assert.match(continuity, /db\.memories\.where\('date'\)\.equals\(dateKey\)\.count\(\)/);
  assert.match(continuity, /reflectionStarted: reflectionHasWriting\(reflection\),\s*memoryCount/);
  assert.doesNotMatch(continuity, /db\.memories\.(put|add|bulkPut)\(/);
});

test('Journey opens Memory Vault at the exact selected date', () => {
  const journey = read('src/pages/CalendarPage.tsx');
  assert.match(journey, /to=\{`\/memories\?date=\$\{day\.date\}`\}/);
  assert.match(journey, /props\.continuity\.memoryCount/);
  assert.match(journey, /Nothing has been kept from this day yet\./);
});

test('Memory Vault accepts date context and carries it into capture', () => {
  const memories = read('src/pages/MemoriesPage.tsx');
  assert.match(memories, /const \[searchParams, setSearchParams\] = useSearchParams\(\)/);
  assert.match(memories, /const dateFilter = memoryDateParam\(searchParams\.get\('date'\)\)/);
  assert.match(memories, /if \(dateFilter && memory\.date !== dateFilter\) return false/);
  assert.match(memories, /defaultDate=\{dateFilter \?\? undefined\}/);
  assert.match(memories, /memory\?\.date \?\? defaultDate \?\? toDateKey\(\)/);
  assert.match(memories, /Nothing has been kept from this day yet\./);
  assert.match(memories, /const selected = filtered\.find\(memory => memory\.id === selectedId\)/);
  assert.match(memories, /const source = dateFilter \? memories\.filter\(memory => memory\.date === dateFilter\) : memories/);
});

test('a memory can reopen its day and week without projecting its text elsewhere', () => {
  const memories = read('src/pages/MemoriesPage.tsx');
  const familiar = read('src/lib/familiar.ts');
  const guides = read('src/data/pageGuides.ts');
  assert.match(memories, /to=\{`\/calendar\?date=\$\{memory\.date\}`\}/);
  assert.match(memories, /to=\{`\/reflection\?week=\$\{weekStartKey\(dateFromKey\(memory\.date\)\)\}`\}/);
  assert.match(familiar, /private memory text never enters ambient reactions/);
  assert.match(guides, /reopen the exact day or weekly Reflection without copying its private text elsewhere/);
  assert.doesNotMatch(familiar, /memory\.(body|title)/);
});

test('memory continuity stays visually quiet rather than becoming a dashboard card', () => {
  const css = read('src/memories-v080.css');
  assert.match(css, /\.memory032-date-scope/);
  assert.match(css, /border-bottom:1px dotted/);
  assert.match(css, /\.memory032-time-thread/);
  assert.doesNotMatch(css, /\.memory032-time-thread[^}]*box-shadow/);
});
