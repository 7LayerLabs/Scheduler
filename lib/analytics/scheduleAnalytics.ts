/**
 * Schedule Analytics Calculator
 * Calculates metrics from published schedules
 */

import type { WeeklyAnalytics } from '@/lib/instantdb';

export interface ScheduleMetrics {
  totalShifts: number;
  totalHours: number;
  employeeUtilization: Record<string, number>;
  shiftTypeDistribution: { morning: number; mid: number; night: number };
  bartenderCoverageRate: number;
  coverageGaps: string[];
  averageShiftDuration: number;
  employeeCount: number;
  shiftsPerEmployee: number;
}

/**
 * Calculate analytics from schedule assignments
 */
export function calculateScheduleAnalytics(
  assignments: any[],
  weekKey: string,
  employees: any[] = []
): Partial<WeeklyAnalytics> {
  const metrics = calculateMetrics(assignments);

  return {
    weekKey,
    totalShifts: metrics.totalShifts,
    totalHours: metrics.totalHours,
    employeeUtilization: JSON.stringify(metrics.employeeUtilization),
    shiftTypeDistribution: JSON.stringify(metrics.shiftTypeDistribution),
    bartenderCoverageRate: metrics.bartenderCoverageRate,
    coverageGaps: JSON.stringify(metrics.coverageGaps),
  };
}

/**
 * Calculate detailed metrics from assignments
 */
export function calculateMetrics(assignments: any[]): ScheduleMetrics {
  const employeeUtilization: Record<string, number> = {};
  const shiftTypeDistribution = { morning: 0, mid: 0, night: 0 };
  const coverageGaps: string[] = [];

  let totalShifts = 0;
  let totalHours = 0;
  let bartenderShifts = 0;
  let bartenderCoveredShifts = 0;

  // Process each assignment
  for (const assignment of assignments) {
    totalShifts++;

    // Calculate duration
    const duration = calculateDuration(assignment.startTime, assignment.endTime);
    totalHours += duration;

    // Track employee utilization
    if (!employeeUtilization[assignment.employeeId]) {
      employeeUtilization[assignment.employeeId] = 0;
    }
    employeeUtilization[assignment.employeeId] += duration;

    // Count shift types
    const shiftType = assignment.type as 'morning' | 'mid' | 'night';
    shiftTypeDistribution[shiftType]++;

    // Track bartender coverage (night shifts)
    if (shiftType === 'night') {
      bartenderShifts++;
      // Assume bartender role is indicated by specific tag (simplified)
      if (assignment.employeeRole === 'bartender' || assignment.bartender) {
        bartenderCoveredShifts++;
      }
    }
  }

  const employeeCount = Object.keys(employeeUtilization).length;
  const shiftsPerEmployee = totalShifts / Math.max(1, employeeCount);
  const averageShiftDuration = totalShifts > 0 ? totalHours / totalShifts : 0;
  const bartenderCoverageRate =
    bartenderShifts > 0 ? bartenderCoveredShifts / bartenderShifts : 0;

  return {
    totalShifts,
    totalHours,
    employeeUtilization,
    shiftTypeDistribution,
    bartenderCoverageRate,
    coverageGaps,
    averageShiftDuration,
    employeeCount,
    shiftsPerEmployee,
  };
}

/**
 * Calculate shift duration in hours
 */
function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let start = startHour + startMin / 60;
  let end = endHour + endMin / 60;

  // Handle overnight shifts
  if (end < start) {
    end += 24;
  }

  return end - start;
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: ScheduleMetrics): {
  totalShifts: string;
  totalHours: string;
  avgShiftDuration: string;
  shiftsPerEmployee: string;
  bartenderCoverage: string;
} {
  return {
    totalShifts: metrics.totalShifts.toString(),
    totalHours: metrics.totalHours.toFixed(1),
    avgShiftDuration: metrics.averageShiftDuration.toFixed(1),
    shiftsPerEmployee: metrics.shiftsPerEmployee.toFixed(1),
    bartenderCoverage: `${(metrics.bartenderCoverageRate * 100).toFixed(0)}%`,
  };
}

/**
 * Compare analytics across periods
 */
export function compareAnalytics(
  current: WeeklyAnalytics,
  previous: WeeklyAnalytics
): {
  shiftChange: number;
  hourChange: number;
  coverageChange: number;
} {
  return {
    shiftChange: current.totalShifts - previous.totalShifts,
    hourChange: current.totalHours - previous.totalHours,
    coverageChange:
      (current.bartenderCoverageRate - previous.bartenderCoverageRate) * 100,
  };
}

/**
 * Get top employees by hours
 */
export function getTopEmployees(
  analytics: WeeklyAnalytics,
  limit: number = 5
): Array<{ employeeId: string; hours: number }> {
  const utilization = JSON.parse(analytics.employeeUtilization);
  return Object.entries(utilization)
    .map(([empId, hours]: [string, any]) => ({
      employeeId: empId,
      hours: hours as number,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
}
