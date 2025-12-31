/**
 * Preference-Based Scheduling
 * Integrates employee preferences into the scheduling algorithm
 */

import type { EmployeePreferenceAnalysis } from '@/lib/instantdb';
import { getPreferenceScore, hasEnoughDataForAnalysis } from '@/lib/analytics/preferenceAnalysis';

export interface PreferenceSchedulingScore {
  baseScore: number;
  preferenceBonus: number;
  totalScore: number;
  details: string;
}

/**
 * Calculate preference-adjusted score for an employee assignment
 * Adds bonus points if employee prefers this shift type and day
 */
export function calculatePreferenceScore(
  baseScore: number,
  shiftType: 'morning' | 'mid' | 'night',
  dayOfWeek: string,
  analysis: EmployeePreferenceAnalysis | null
): PreferenceSchedulingScore {
  if (!analysis || !hasEnoughDataForAnalysis(analysis.totalShiftsAnalyzed)) {
    return {
      baseScore,
      preferenceBonus: 0,
      totalScore: baseScore,
      details: 'No preference data',
    };
  }

  // Get preference score (0-1)
  const prefScore = getPreferenceScore(analysis, shiftType, dayOfWeek);

  // Convert preference score to points (0-10 bonus)
  const preferenceBonus = prefScore * 10;

  return {
    baseScore,
    preferenceBonus,
    totalScore: baseScore + preferenceBonus,
    details: `Preference: ${(prefScore * 100).toFixed(0)}%`,
  };
}

/**
 * Apply preference scoring to employee availability
 * Returns weighted scores for each shift type
 */
export function getShiftTypeScores(
  analysis: EmployeePreferenceAnalysis
): { morning: number; mid: number; night: number } {
  if (!hasEnoughDataForAnalysis(analysis.totalShiftsAnalyzed)) {
    return { morning: 1, mid: 1, night: 1 };
  }

  const prefs = JSON.parse(analysis.preferredShiftTypes);

  return {
    morning: Math.max(0.5, prefs.morning || 0.33),
    mid: Math.max(0.5, prefs.mid || 0.33),
    night: Math.max(0.5, prefs.night || 0.33),
  };
}

/**
 * Get day scores for an employee
 */
export function getDayScores(
  analysis: EmployeePreferenceAnalysis
): Record<string, number> {
  if (!hasEnoughDataForAnalysis(analysis.totalShiftsAnalyzed)) {
    return {
      monday: 1,
      tuesday: 1,
      wednesday: 1,
      thursday: 1,
      friday: 1,
      saturday: 1,
      sunday: 1,
    };
  }

  const prefs = JSON.parse(analysis.preferredDays);

  return {
    monday: Math.max(0.5, prefs.monday || 0.14),
    tuesday: Math.max(0.5, prefs.tuesday || 0.14),
    wednesday: Math.max(0.5, prefs.wednesday || 0.14),
    thursday: Math.max(0.5, prefs.thursday || 0.14),
    friday: Math.max(0.5, prefs.friday || 0.14),
    saturday: Math.max(0.5, prefs.saturday || 0.14),
    sunday: Math.max(0.5, prefs.sunday || 0.14),
  };
}

/**
 * Check if scheduling violates strong preferences
 * Returns true if violating (employee strongly prefers something else)
 */
export function violatesStrongPreference(
  shiftType: 'morning' | 'mid' | 'night',
  analysis: EmployeePreferenceAnalysis
): boolean {
  if (!hasEnoughDataForAnalysis(analysis.totalShiftsAnalyzed)) {
    return false;
  }

  const prefs = JSON.parse(analysis.preferredShiftTypes);
  const selectedPref = prefs[shiftType] || 0.33;

  // If employee strongly prefers something else (>50%) and this shift is <20%
  const maxOther = Math.max(
    prefs.morning === shiftType ? 0 : prefs.morning,
    prefs.mid === shiftType ? 0 : prefs.mid,
    prefs.night === shiftType ? 0 : prefs.night
  );

  return maxOther > 0.5 && selectedPref < 0.2;
}

/**
 * Format preference score for display
 */
export function formatPreferenceScore(score: PreferenceSchedulingScore): string {
  if (score.preferenceBonus === 0) {
    return `${score.baseScore.toFixed(1)} (no preference data)`;
  }

  return `${score.totalScore.toFixed(1)} (base: ${score.baseScore.toFixed(1)} + pref: +${score.preferenceBonus.toFixed(1)})`;
}
