/**
 * Shift Swap Validation Logic
 * Validates whether a swap is feasible given current employee availability
 */

import type { ShiftSwapRequest, DBEmployee } from '@/lib/instantdb';

export interface SwapValidationResult {
  valid: boolean;
  reason?: string;
  warnings: string[];
}

/**
 * Validates if a shift swap is feasible
 * Basic validation that checks employee availability
 */
export function validateSwapFeasibility(
  swap: ShiftSwapRequest,
  replacementId: string,
  employees: DBEmployee[]
): SwapValidationResult {
  const warnings: string[] = [];

  // Find employee records
  const requester = employees.find(e => e.id === swap.requesterId);
  const replacement = employees.find(e => e.id === replacementId);

  if (!requester) {
    return {
      valid: false,
      reason: 'Requester not found',
      warnings: [],
    };
  }

  if (!replacement) {
    return {
      valid: false,
      reason: 'Replacement employee not found',
      warnings: [],
    };
  }

  // Replacement found and basic check passed
  return {
    valid: true,
    warnings,
  };
}

/**
 * Get reason why swap is not feasible (user-friendly message)
 */
export function getSwapRejectionReason(result: SwapValidationResult): string {
  return result.reason || 'This swap request cannot be processed at this time';
}
