import test from 'node:test';
import assert from 'node:assert/strict';

import { updateScheduleAssignmentTime } from '../lib/scheduleEdits';
import type { WeeklySchedule } from '../lib/types';

test('updateScheduleAssignmentTime: can change end time for an existing shift', () => {
  const schedule: WeeklySchedule = {
    weekStart: new Date('2025-12-08T00:00:00'),
    assignments: [
      { employeeId: 'e1', date: '2025-12-09', shiftId: 'tue-1', startTime: '07:15', endTime: '14:00' },
    ],
    conflicts: [],
    warnings: [],
  };

  const updated = updateScheduleAssignmentTime({
    schedule,
    key: { employeeId: 'e1', date: '2025-12-09', shiftId: 'tue-1' },
    startTime: '07:15',
    endTime: '13:00',
  });

  assert.equal(updated.assignments.length, 1);
  assert.equal(updated.assignments[0].startTime, '07:15');
  assert.equal(updated.assignments[0].endTime, '13:00');
});

test('updateScheduleAssignmentTime: rejects overlap with another shift for same employee on same day', () => {
  const schedule: WeeklySchedule = {
    weekStart: new Date('2025-12-08T00:00:00'),
    assignments: [
      { employeeId: 'e1', date: '2025-12-09', shiftId: 'tue-1', startTime: '07:15', endTime: '14:00' },
      { employeeId: 'e1', date: '2025-12-09', shiftId: 'tue-2', startTime: '15:00', endTime: '21:00' },
    ],
    conflicts: [],
    warnings: [],
  };

  assert.throws(() => {
    updateScheduleAssignmentTime({
      schedule,
      key: { employeeId: 'e1', date: '2025-12-09', shiftId: 'tue-1' },
      startTime: '07:15',
      endTime: '16:00',
    });
  }, /overlaps another shift/i);
});


