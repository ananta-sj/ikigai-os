import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultCarryIds, handoffSummary, shouldAutoOpenMorningHandoff } from '../src/lib/dailyHandoffCore.ts';
import type { Task } from '../src/types.ts';

const task = (id: string, completed = false): Task => ({
  id,
  title: id,
  category: 'Projects',
  difficulty: 'normal',
  createdAt: '2026-09-25T08:00:00.000Z',
  updatedAt: '2026-09-25T08:00:00.000Z',
  dueDate: '2026-09-25',
  completedAt: completed ? '2026-09-25T10:00:00.000Z' : undefined
});

test('morning handoff opens only for an older open day and only once per current day', () => {
  assert.equal(shouldAutoOpenMorningHandoff({ activeDate: '2026-09-25', today: '2026-09-26', status: 'open', enabled: true, lastSeenDay: null }), true);
  assert.equal(shouldAutoOpenMorningHandoff({ activeDate: '2026-09-25', today: '2026-09-26', status: 'open', enabled: true, lastSeenDay: '2026-09-26' }), false);
  assert.equal(shouldAutoOpenMorningHandoff({ activeDate: '2026-09-26', today: '2026-09-26', status: 'open', enabled: true, lastSeenDay: null }), false);
  assert.equal(shouldAutoOpenMorningHandoff({ activeDate: '2026-09-25', today: '2026-09-26', status: 'closed', enabled: true, lastSeenDay: null }), false);
});

test('handoff defaults to carrying only unfinished tasks', () => {
  const tasks = [task('open-a'), task('done-b', true), task('open-c')];
  assert.deepEqual(defaultCarryIds(tasks), ['open-a', 'open-c']);
  assert.deepEqual(handoffSummary(tasks), { completed: 1, unfinished: 2, total: 3 });
});
