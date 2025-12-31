/**
 * Employee Preference Analysis
 * Analyzes shift history to determine employee preferences
 * Learns which shifts employees prefer based on historical patterns
 */

import type { EmployeeShiftHistory, EmployeePreferenceAnalysis } from '@/lib/instantdb';

export interface ShiftTypeDistribution {
  morning: number;
  mid: number;
  night: number;
}

export interface DayDistribution {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

/**
 * Analyze shift history for an employee
 * Returns preference distribution and confidence score
 */
export function analyzeEmployeePreferences(
  shiftHistory: EmployeeShiftHistory[]
): Partial<EmployeePreferenceAnalysis> {
  if (shiftHistory.length === 0) {
    return {
      totalShiftsAnalyzed: 0,
      preferredShiftTypes: JSON.stringify({ morning: 0, mid: 0, night: 0 }),
      preferredDays: JSON.stringify({
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0,
      }),
      avgShiftDuration: 0,
      avgHoursPerWeek: 0,
      swapRequestRate: 0,
      confidenceScore: 0,
      lastUpdated: Date.now(),
    };
  }

  // Calculate shift type distribution
  const shiftTypeCount: ShiftTypeDistribution = {
    morning: 0,
    mid: 0,
    night: 0,
  };

  // Calculate day distribution
  const dayCount: DayDistribution = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
  };

  let totalDuration = 0;
  let swappedCount = 0;

  // Count shifts by type and day
  for (const shift of shiftHistory) {
    shiftTypeCount[shift.shiftType]++;
    dayCount[shift.dayOfWeek]++;
    totalDuration += shift.durationHours;
    if (shift.wasSwapped) swappedCount++;
  }

  const totalShifts = shiftHistory.length;

  // Convert counts to preferences (normalized 0-1)
  const preferredShiftTypes: ShiftTypeDistribution = {
    morning: shiftTypeCount.morning / totalShifts,
    mid: shiftTypeCount.mid / totalShifts,
    night: shiftTypeCount.night / totalShifts,
  };

  const preferredDays: DayDistribution = {
    monday: dayCount.monday / totalShifts,
    tuesday: dayCount.tuesday / totalShifts,
    wednesday: dayCount.wednesday / totalShifts,
    thursday: dayCount.thursday / totalShifts,
    friday: dayCount.friday / totalShifts,
    saturday: dayCount.saturday / totalShifts,
    sunday: dayCount.sunday / totalShifts,
  };

  // Calculate averages
  const avgShiftDuration = totalDuration / totalShifts;
  const avgHoursPerWeek = avgShiftDuration * (totalShifts / getWeeksFromHistory(shiftHistory));
  const swapRequestRate = swappedCount / totalShifts;

  // Calculate confidence score (0-1)
  // Higher with more shifts analyzed (min 8 shifts for medium confidence)
  // Max confidence at 20+ shifts
  const confidenceScore = Math.min(1, Math.max(0, (totalShifts - 4) / 16));

  return {
    totalShiftsAnalyzed: totalShifts,
    preferredShiftTypes: JSON.stringify(preferredShiftTypes),
    preferredDays: JSON.stringify(preferredDays),
    avgShiftDuration,
    avgHoursPerWeek,
    swapRequestRate,
    confidenceScore,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate number of weeks from shift history
 */
function getWeeksFromHistory(history: EmployeeShiftHistory[]): number {
  if (history.length === 0) return 1;

  const weeks = new Set(history.map(h => h.weekKey));
  return Math.max(1, weeks.size);
}

/**
 * Get preference scoring multiplier for a shift
 * Returns 0-1 score indicating how likely employee prefers this shift
 */
export function getPreferenceScore(
  analysis: EmployeePreferenceAnalysis | null,
  shiftType: 'morning' | 'mid' | 'night',
  dayOfWeek: string
): number {
  if (!analysis || analysis.confidenceScore < 0.3) {
    return 0.5; // Default neutral score if low confidence
  }

  const shiftPrefs = JSON.parse(analysis.preferredShiftTypes) as ShiftTypeDistribution;
  const dayPrefs = JSON.parse(analysis.preferredDays) as DayDistribution;

  // Combine shift type and day preferences
  const shiftScore = shiftPrefs[shiftType as keyof ShiftTypeDistribution] || 0.33;
  const dayScore = (dayPrefs[dayOfWeek as keyof DayDistribution] || 0.14);

  // Weight: 60% shift type, 40% day
  return (shiftScore * 0.6) + (dayScore * 0.4);
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidenceScore: number): 'Low' | 'Medium' | 'High' {
  if (confidenceScore < 0.4) return 'Low';
  if (confidenceScore < 0.7) return 'Medium';
  return 'High';
}

/**
 * Format preference display string
 */
export function formatPreferences(analysis: EmployeePreferenceAnalysis): string {
  const shiftPrefs = JSON.parse(analysis.preferredShiftTypes) as ShiftTypeDistribution;

  // Find preferred shift type (highest percentage)
  const prefs = [
    { type: 'Morning', pct: Math.round(shiftPrefs.morning * 100) },
    { type: 'Mid', pct: Math.round(shiftPrefs.mid * 100) },
    { type: 'Night', pct: Math.round(shiftPrefs.night * 100) },
  ].sort((a, b) => b.pct - a.pct);

  return `${prefs[0].type} (${prefs[0].pct}%)`;
}

/**
 * Check if employee has analyzable preference data
 */
export function hasEnoughDataForAnalysis(totalShifts: number): boolean {
  return totalShifts >= 8; // Need at least 8 shifts for analysis
}
