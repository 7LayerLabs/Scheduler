import assert from 'node:assert/strict';
import { pickShiftIdForManualAssignment } from './lib/manualShifts';
import type { DayOfWeek, ScheduleAssignment, WeeklyStaffingNeeds } from './lib/types';

function run() {
  const staffingNeeds: WeeklyStaffingNeeds = {
    tuesday: { slots: [{ id: 'tue-1', startTime: '07:15', endTime: '14:00', label: 'Opener' }], notes: '' },
    wednesday: { slots: [{ id: 'wed-1', startTime: '07:15', endTime: '14:00', label: 'Opener' }], notes: '' },
    thursday: { slots: [{ id: 'thu-1', startTime: '07:15', endTime: '14:00', label: 'Opener' }], notes: '' },
    friday: { slots: [{ id: 'fri-1', startTime: '07:15', endTime: '14:00', label: 'Opener' }], notes: '' },
    saturday: { slots: [{ id: 'sat-1', startTime: '07:15', endTime: '15:00', label: 'Opener' }], notes: '' },
    sunday: { slots: [{ id: 'sun-1', startTime: '07:15', endTime: '14:30', label: 'Opener' }], notes: '' },
  };

  const day: DayOfWeek = 'tuesday';
  const date = '2025-12-16';
  const assignments: ScheduleAssignment[] = [];

  const template = { id: 't-opener', label: 'Opener', startTime: '07:15', endTime: '14:00' };
  const { shiftId, usedTemplateSlot } = pickShiftIdForManualAssignment({
    staffingNeeds,
    assignments,
    date,
    day,
    template,
    nonce: 'test',
  });

  assert.equal(shiftId, 'tue-1');
  assert.equal(usedTemplateSlot, true);

  // If the slot is already filled, we should fall back to a manual id.
  const filled: ScheduleAssignment[] = [{ shiftId: 'tue-1', employeeId: 'e1', date, startTime: '07:15', endTime: '14:00' }];
  const fallback = pickShiftIdForManualAssignment({
    staffingNeeds,
    assignments: filled,
    date,
    day,
    template,
    nonce: 'test',
  });
  assert.equal(fallback.usedTemplateSlot, false);
  assert.ok(fallback.shiftId.startsWith('manual-tuesday-'));

  console.log('Manual shift mapping tests passed.');
}

run();

/**
 * Run this test locally with:
 * `npx tsx test_manual_shifts.ts`
 */


