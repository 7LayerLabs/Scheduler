import type { ScheduleAssignment, WeeklySchedule } from '@/lib/types';

export type ScheduleAssignmentKey = {
  employeeId: string;
  date: string;   // YYYY-MM-DD
  shiftId: string;
};

function isValidTimeHHMM(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return false;
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

function findAssignmentIndex(assignments: ScheduleAssignment[], key: ScheduleAssignmentKey): number {
  return assignments.findIndex(a =>
    a.employeeId === key.employeeId &&
    a.date === key.date &&
    a.shiftId === key.shiftId
  );
}

export function updateScheduleAssignmentTime(params: {
  schedule: WeeklySchedule;
  key: ScheduleAssignmentKey;
  startTime: string;
  endTime: string;
}): WeeklySchedule {
  const { schedule, key, startTime, endTime } = params;

  if (!isValidTimeHHMM(startTime) || !isValidTimeHHMM(endTime)) {
    throw new Error('Time must be in 24 hour HH:MM format.');
  }

  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  if (endMins <= startMins) {
    throw new Error('End time must be after start time.');
  }

  const idx = findAssignmentIndex(schedule.assignments, key);
  if (idx === -1) {
    throw new Error('Shift not found.');
  }

  // Prevent overlap with any other assignment for this employee on this date.
  for (let i = 0; i < schedule.assignments.length; i++) {
    if (i === idx) continue;
    const other = schedule.assignments[i];
    if (other.employeeId !== key.employeeId) continue;
    if (other.date !== key.date) continue;
    if (!other.startTime || !other.endTime) continue;
    if (!isValidTimeHHMM(other.startTime) || !isValidTimeHHMM(other.endTime)) continue;

    if (rangesOverlap(startTime, endTime, other.startTime, other.endTime)) {
      throw new Error('This time range overlaps another shift for this employee on that day.');
    }
  }

  const nextAssignments = [...schedule.assignments];
  nextAssignments[idx] = { ...nextAssignments[idx], startTime, endTime };

  return { ...schedule, assignments: nextAssignments };
}


