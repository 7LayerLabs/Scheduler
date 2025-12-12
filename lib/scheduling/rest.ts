import { ScheduleAssignment } from '../types';

function timeToMinutes(time: string): number {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  return hours * 60 + minutes;
}

function parseLocalMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function getAbsoluteMinutes(weekStart: Date, dateStr: string, time: string): number {
  const weekStartMidnight = new Date(weekStart);
  weekStartMidnight.setHours(0, 0, 0, 0);

  const dateMidnight = parseLocalMidnight(dateStr);
  const dayOffset = Math.round((dateMidnight.getTime() - weekStartMidnight.getTime()) / 86400000);
  return dayOffset * 1440 + timeToMinutes(time);
}

function getEndAbsoluteMinutes(weekStart: Date, dateStr: string, startTime: string, endTime: string): number {
  const startAbs = getAbsoluteMinutes(weekStart, dateStr, startTime);
  let endAbs = getAbsoluteMinutes(weekStart, dateStr, endTime);

  // Handle overnight (rare, but safe)
  if (endAbs <= startAbs) {
    endAbs += 1440;
  }
  return endAbs;
}

export interface MinRestParams {
  weekStart: Date;
  employeeId: string;
  candidateDate: string; // YYYY-MM-DD
  candidateStartTime: string; // HH:MM
  candidateEndTime: string; // HH:MM
  minRestHours: number;
  existingAssignments: ScheduleAssignment[];
}

/**
 * Returns true if the candidate shift does not overlap and respects minimum rest
 * against any already-assigned shifts for the same employee.
 */
export function isMinRestSatisfiedForCandidate(params: MinRestParams): boolean {
  const minRestMinutes = Math.max(0, params.minRestHours) * 60;
  if (minRestMinutes === 0) return true;

  const candStartAbs = getAbsoluteMinutes(params.weekStart, params.candidateDate, params.candidateStartTime);
  const candEndAbs = getEndAbsoluteMinutes(
    params.weekStart,
    params.candidateDate,
    params.candidateStartTime,
    params.candidateEndTime
  );

  for (const a of params.existingAssignments) {
    if (a.employeeId !== params.employeeId) continue;
    if (!a.startTime || !a.endTime) continue;

    const aStartAbs = getAbsoluteMinutes(params.weekStart, a.date, a.startTime);
    const aEndAbs = getEndAbsoluteMinutes(params.weekStart, a.date, a.startTime, a.endTime);

    // No overlaps allowed
    const overlaps = candStartAbs < aEndAbs && candEndAbs > aStartAbs;
    if (overlaps) return false;

    // Check rest before or after
    if (candStartAbs >= aEndAbs) {
      if (candStartAbs - aEndAbs < minRestMinutes) return false;
    }

    if (aStartAbs >= candEndAbs) {
      if (aStartAbs - candEndAbs < minRestMinutes) return false;
    }
  }

  return true;
}


