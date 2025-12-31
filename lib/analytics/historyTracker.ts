/**
 * Shift History Tracker
 * Records published schedules as employee shift history
 * Called when manager publishes a schedule
 */

import { createShiftHistory, type EmployeeShiftHistory } from '@/lib/instantdb';

export interface ScheduleAssignment {
  employeeId: string;
  employeeName: string;
  date: string;
  type: 'morning' | 'mid' | 'night';
  startTime: string;
  endTime: string;
  wasSwapped?: boolean;
  swapRequestId?: string;
}

/**
 * Track published schedule assignments as shift history
 * Called when manager publishes a schedule for a week
 */
export async function trackShiftHistory(
  assignments: ScheduleAssignment[],
  weekKey: string
): Promise<void> {
  for (const assignment of assignments) {
    const shiftDate = assignment.date;
    const dayOfWeek = getDayOfWeek(shiftDate);
    const durationHours = calculateDuration(assignment.startTime, assignment.endTime);

    await createShiftHistory({
      employeeId: assignment.employeeId,
      employeeName: assignment.employeeName,
      weekKey,
      shiftDate,
      shiftType: assignment.type,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      durationHours,
      dayOfWeek: dayOfWeek as any,
      wasSwapped: assignment.wasSwapped || false,
    });
  }
}

/**
 * Get day of week from date string (YYYY-MM-DD)
 */
function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Calculate shift duration in hours
 */
function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let start = startHour + startMin / 60;
  let end = endHour + endMin / 60;

  // Handle overnight shifts (end time before start time)
  if (end < start) {
    end += 24;
  }

  return end - start;
}

/**
 * Get week key from date (YYYY-Www format)
 */
export function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const onejan = new Date(year, 0, 1);
  const millisecsInDay = 86400000;
  const weekNum = Math.ceil((date.getTime() - onejan.getTime() + onejan.getDay() * millisecsInDay) / (7 * millisecsInDay));
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Extract week key from assignments date
 */
export function getWeekKeyFromAssignment(dateString: string): string {
  return getWeekKey(new Date(dateString));
}
