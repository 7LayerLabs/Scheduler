import { Shift } from '../types';

function timeToMinutes(time: string): number {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  return hours * 60 + minutes;
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

type ShiftWithBounds = Shift & { _startMins: number; _endMins: number };

/**
 * Marks `shift.requiresSolo = true` if the shift contains any time segment where it is the
 * only active staffing slot for that day.
 *
 * This is derived purely from overlap of shifts, so it works with any staffing template.
 */
export function markShiftsThatHaveSoloTime(shifts: Shift[]): void {
  const bounded: ShiftWithBounds[] = shifts
    .filter(s => Boolean(s.startTime) && Boolean(s.endTime))
    .map(s => ({
      ...s,
      _startMins: timeToMinutes(s.startTime),
      _endMins: timeToMinutes(s.endTime),
    }))
    .filter(s => Number.isFinite(s._startMins) && Number.isFinite(s._endMins) && s._startMins < s._endMins);

  for (const s of shifts) {
    s.requiresSolo = false;
  }

  if (bounded.length === 0) return;

  const boundaries = uniqueSorted(
    bounded.flatMap(s => [s._startMins, s._endMins])
  );

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    if (segEnd <= segStart) continue;

    const mid = Math.floor((segStart + segEnd) / 2);
    const active = bounded.filter(s => s._startMins <= mid && s._endMins > mid);
    if (active.length === 1) {
      active[0].requiresSolo = true;
    }
  }
}


