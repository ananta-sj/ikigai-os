import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareOnboardingMilestones } from '../src/lib/onboardingCore.ts';

const createdAt = '2026-09-25T12:00:00.000Z';

function ids(...values: string[]) {
  let index = 0;
  return () => values[index++] ?? `generated-${index}`;
}

test('onboarding dates only become milestones when title and date are valid', () => {
  const result = prepareOnboardingMilestones([
    { title: 'Launch', date: '2026-10-08', kind: 'release', category: 'Projects' },
    { title: '', date: '2026-10-09', kind: 'event', category: 'Personal' },
    { title: 'Impossible', date: '2026-02-30', kind: 'deadline', category: 'Study' },
    { title: 'No date', date: '', kind: 'other', category: 'Personal' }
  ], createdAt, ids('milestone-1'));

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'milestone-1');
  assert.equal(result[0].title, 'Launch');
  assert.equal(result[0].date, '2026-10-08');
});

test('onboarding milestone titles are trimmed without changing authored meaning', () => {
  const result = prepareOnboardingMilestones([
    { title: '  Submit portfolio  ', date: '2026-11-01', kind: 'deadline', category: 'Career' }
  ], createdAt, ids('milestone-2'));

  assert.equal(result[0].title, 'Submit portfolio');
  assert.equal(result[0].category, 'Career');
  assert.equal(result[0].kind, 'deadline');
});

test('onboarding keeps multiple valid dates instead of silently deduplicating them', () => {
  const result = prepareOnboardingMilestones([
    { title: 'Morning event', date: '2026-12-02', kind: 'event', category: 'Personal' },
    { title: 'Evening deadline', date: '2026-12-02', kind: 'deadline', category: 'Projects' }
  ], createdAt, ids('milestone-3', 'milestone-4'));

  assert.deepEqual(result.map(item => item.id), ['milestone-3', 'milestone-4']);
  assert.equal(result.length, 2);
});
