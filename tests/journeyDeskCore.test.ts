import assert from 'node:assert/strict';
import test from 'node:test';
import { canPlanJourneyDay, journeyDayStateLabel, monthFlipIntent } from '../src/lib/journeyDeskCore.ts';

test('month page pull only flips after a deliberate threshold', () => {
  assert.equal(monthFlipIntent(30, 0), 0);
  assert.equal(monthFlipIntent(90, 0), -1);
  assert.equal(monthFlipIntent(-90, 0), 1);
  assert.equal(monthFlipIntent(10, 700), -1);
  assert.equal(monthFlipIntent(-10, -700), 1);
});

test('Journey planning remains writable only for today/future non-archived days', () => {
  assert.equal(canPlanJourneyDay('2026-09-26', '2026-09-26', 'today'), true);
  assert.equal(canPlanJourneyDay('2026-09-27', '2026-09-26', 'future'), true);
  assert.equal(canPlanJourneyDay('2026-09-25', '2026-09-26', 'open-past'), false);
  assert.equal(canPlanJourneyDay('2026-09-27', '2026-09-26', 'closed'), false);
});

test('Journey state labels are human-facing rather than internal codes', () => {
  assert.equal(journeyDayStateLabel('closed'), 'Archived day');
  assert.equal(journeyDayStateLabel('open-past'), 'Needs handoff');
});
