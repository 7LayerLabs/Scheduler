import type { DayOfWeek } from './types';

/**
 * Classifies a shift into a time-of-day bucket based on its start time.
 * This is used throughout the app to avoid relying on shiftId string patterns.
 */
export type ShiftBucket = 'morning' | 'mid' | 'night';

// Buckets are aligned to how staff typically talk about shifts in this app:
// - morning: openers and early staff
// - mid: lunch and mid-shifts
// - night: dinner and closing staff
//
// IMPORTANT: These thresholds must stay consistent with availability choices in Team and the schedule grid colors.
const MID_START_HOUR = 10;
const NIGHT_START_HOUR = 15; // 3pm and later is treated as "night" for scheduling buckets

function safeParseHour(startTime?: string): number | null {
  if (!startTime) return null;
  const [hours] = startTime.split(':');
  const hour = Number.parseInt(hours ?? '', 10);
  return Number.isFinite(hour) ? hour : null;
}

export function getShiftBucketFromStartTime(startTime?: string): ShiftBucket {
  const hour = safeParseHour(startTime);
  if (hour === null) return 'morning';
  if (hour < MID_START_HOUR) return 'morning';
  if (hour < NIGHT_START_HOUR) return 'mid';
  return 'night';
}

export function getMorningOrNightFromStartTime(startTime?: string): 'morning' | 'night' {
  return getShiftBucketFromStartTime(startTime) === 'night' ? 'night' : 'morning';
}

/**
 * Attempts to infer the day-of-week from a shift id.
 * Examples:
 * - "sat-3" -> "saturday"
 * - "saturday-night" -> "saturday"
 */
export function getDayOfWeekFromShiftId(shiftId: string): DayOfWeek | null {
  const token = (shiftId || '').toLowerCase().split('-')[0] || '';
  const map: Record<string, DayOfWeek> = {
    mon: 'monday',
    monday: 'monday',
    tue: 'tuesday',
    tuesday: 'tuesday',
    wed: 'wednesday',
    wednesday: 'wednesday',
    thu: 'thursday',
    thursday: 'thursday',
    fri: 'friday',
    friday: 'friday',
    sat: 'saturday',
    saturday: 'saturday',
    sun: 'sunday',
    sunday: 'sunday',
  };
  return map[token] ?? null;
}


