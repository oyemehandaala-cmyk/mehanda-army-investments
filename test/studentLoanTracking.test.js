import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACKING_STAGES,
  computeStageDetails,
  formatStageDateTime,
  formatFullDateTime,
} from '../src/lib/studentLoanTrackingHelper.js';

test('1. tracking progress bar defines exact 4 required stages', () => {
  assert.equal(TRACKING_STAGES.length, 4);
  assert.equal(TRACKING_STAGES[0].label, 'Enquiry Submitted');
  assert.equal(TRACKING_STAGES[1].label, 'Initial Verification');
  assert.equal(TRACKING_STAGES[2].label, 'Under Review');
  assert.equal(TRACKING_STAGES[3].label, 'Review Completed');
});

test('2. initial "Submitted" enquiry highlights Initial Verification as current stage with completed submission', () => {
  const application = {
    trackingId: 'MAI-2026-000001',
    status: 'Submitted',
    submittedAt: '2026-11-10T10:00:00.000Z',
    statusHistory: [],
  };

  const { activeIndex, stages, currentStatus } = computeStageDetails(application);

  assert.equal(currentStatus, 'Submitted');
  assert.equal(activeIndex, 1); // Stage 1 is current
  assert.equal(stages[0].state, 'completed');
  assert.equal(stages[0].date, '2026-11-10T10:00:00.000Z');
  assert.equal(stages[1].state, 'current');
  assert.equal(stages[2].state, 'future');
  assert.equal(stages[3].state, 'future');
});

test('3. "Under Review" status moves progress to Stage 3 with previous stages completed', () => {
  const application = {
    trackingId: 'MAI-2026-000002',
    status: 'Under Review',
    submittedAt: '2026-11-09T08:30:00.000Z',
    updatedAt: '2026-11-10T11:15:00.000Z',
    statusHistory: [
      { status: 'Verification Pending', createdAt: '2026-11-09T14:00:00.000Z' },
      { status: 'Under Review', createdAt: '2026-11-10T11:15:00.000Z' },
    ],
  };

  const { activeIndex, stages, currentStatus } = computeStageDetails(application);

  assert.equal(currentStatus, 'Under Review');
  assert.equal(activeIndex, 2); // Stage 2 is current
  assert.equal(stages[0].state, 'completed');
  assert.equal(stages[1].state, 'completed');
  assert.equal(stages[2].state, 'current');
  assert.equal(stages[3].state, 'future');
  assert.equal(stages[1].date, '2026-11-09T14:00:00.000Z');
  assert.equal(stages[2].date, '2026-11-10T11:15:00.000Z');
});

test('4. "Completed" / "Enquiry Completed" marks all 4 stages completed with timestamps', () => {
  const application = {
    trackingId: 'MAI-2026-000003',
    status: 'Review Completed',
    submittedAt: '2026-11-08T09:00:00.000Z',
    updatedAt: '2026-11-10T16:00:00.000Z',
    statusHistory: [
      { status: 'Verification Pending', createdAt: '2026-11-08T12:00:00.000Z' },
      { status: 'Under Review', createdAt: '2026-11-09T10:00:00.000Z' },
      { status: 'Review Completed', createdAt: '2026-11-10T16:00:00.000Z' },
    ],
  };

  const { activeIndex, stages } = computeStageDetails(application);

  assert.equal(activeIndex, 3);
  assert.ok(stages.every((s) => s.state === 'completed'));
  assert.equal(stages[3].label, 'Review Completed');
  assert.notEqual(stages[3].label, 'Loan Approved');
  assert.notEqual(stages[3].label, 'Loan Disbursed');
});

test('5. date and time formatters handle valid and invalid values safely', () => {
  const formatted = formatStageDateTime('2026-11-10T14:30:00.000Z');
  assert.ok(formatted.includes('Nov'));
  assert.equal(formatStageDateTime(null), '');
  assert.equal(formatStageDateTime('invalid-date'), '');

  const fullFormatted = formatFullDateTime('2026-11-10T14:30:00.000Z');
  assert.ok(fullFormatted.includes('Nov'));
  assert.equal(formatFullDateTime(null), 'Not available');
});
