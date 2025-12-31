/**
 * Apply Shift Swap to Schedule
 * Updates the schedule when a swap is approved
 */

import type { ShiftSwapRequest } from '@/lib/instantdb';

export interface SwapApplicationResult {
  success: boolean;
  updatedSchedule?: any;
  error?: string;
}

/**
 * Apply an approved shift swap to the schedule
 * Replaces the original employee with the replacement employee for that shift
 */
export function applySwapToSchedule(
  schedule: any,
  swap: ShiftSwapRequest,
  replacementId: string
): SwapApplicationResult {
  try {
    if (!schedule || !schedule.assignments) {
      return {
        success: false,
        error: 'Invalid schedule format',
      };
    }

    // Find the shift in the schedule
    const shiftIndex = schedule.assignments.findIndex((a: any) =>
      a.employeeId === swap.requesterId
        && a.date === swap.shiftDate
        && a.type === swap.shiftType
    );

    if (shiftIndex === -1) {
      return {
        success: false,
        error: `Shift not found for ${swap.requesterName} on ${swap.shiftDate}`,
      };
    }

    // Create updated schedule
    const updatedSchedule = {
      ...schedule,
      assignments: [
        ...schedule.assignments.slice(0, shiftIndex),
        {
          ...schedule.assignments[shiftIndex],
          employeeId: replacementId,
          wasSwapped: true,
          swapRequestId: swap.id,
          swappedFromEmployeeId: swap.requesterId,
        },
        ...schedule.assignments.slice(shiftIndex + 1),
      ],
    };

    return {
      success: true,
      updatedSchedule,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to apply swap to schedule',
    };
  }
}

/**
 * Check if a shift has been swapped
 */
export function isShiftSwapped(assignment: any): boolean {
  return assignment?.wasSwapped === true && assignment?.swapRequestId !== undefined;
}

/**
 * Get the original employee for a swapped shift
 */
export function getOriginalEmployee(assignment: any): string | null {
  return assignment?.swappedFromEmployeeId || null;
}
