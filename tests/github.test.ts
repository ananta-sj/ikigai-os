import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicActivityDays, normalizeGitHubUsername } from '../src/lib/github.ts';

test('normalizes safe GitHub usernames and rejects unsafe input', () => {
  assert.equal(normalizeGitHubUsername('@ananta-sj'), 'ananta-sj');
  assert.equal(normalizeGitHubUsername('octocat'), 'octocat');
  assert.equal(normalizeGitHubUsername('bad/user'), '');
  assert.equal(normalizeGitHubUsername('-leading'), '');
  assert.equal(normalizeGitHubUsername('trailing-'), '');
});

test('builds a bounded 91-day public activity series', () => {
  const now = new Date('2026-09-26T12:00:00Z');
  const days = buildPublicActivityDays([
    '2026-09-26T01:00:00Z',
    '2026-09-26T03:00:00Z',
    '2026-09-25T03:00:00Z',
    '2020-01-01T00:00:00Z'
  ], now);
  assert.equal(days.length, 91);
  assert.equal(days.at(-1)?.date, '2026-09-26');
  assert.equal(days.at(-1)?.count, 2);
  assert.equal(days.at(-2)?.count, 1);
  assert.equal(days.reduce((sum, day) => sum + day.count, 0), 3);
});
