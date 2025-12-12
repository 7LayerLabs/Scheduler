import type { DayOfWeek } from '../types';

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isWeekend(day: DayOfWeek): boolean {
  return day === 'saturday' || day === 'sunday';
}

export type NormalizedRoleLabel =
  | 'Opener'
  | 'Weekend Opener'
  | '2nd Server'
  | '3rd Server'
  | 'Mid Shift'
  | 'Bar'
  | 'Closer'
  | `Dinner ${number}`
  | 'Dinner'
  | 'Shift';

export function normalizeStaffingSlotLabel(params: {
  label?: string | null;
  day: DayOfWeek;
  startTime?: string;
  endTime?: string;
}): string {
  const raw = normalizeWhitespace(String(params.label || ''));
  if (!raw) return 'Shift';

  const lower = raw.toLowerCase();

  // Preserve explicit "Dinner N" numbering, even if spelled inconsistently (diner/dinner).
  const dinnerNumberMatch = lower.match(/\b(dinn?er)\s*(\d+)\b/);
  if (dinnerNumberMatch) {
    const n = Number(dinnerNumberMatch[2]);
    if (Number.isFinite(n) && n > 0) return `Dinner ${n}`;
  }

  // Weekend opener
  if (/\bweekend\b/.test(lower) && /\bopen(er|ing)?\b/.test(lower)) {
    return 'Weekend Opener';
  }

  // Opener (auto-upgrade to Weekend Opener if weekend and runs late)
  if (/\bopen(er|ing)?\b/.test(lower)) {
    if (params.endTime && isWeekend(params.day)) {
      const endMins = timeToMinutes(params.endTime);
      // If opener goes past 3pm on weekends, call it a weekend opener for clarity.
      if (endMins >= 15 * 60) return 'Weekend Opener';
    }
    return 'Opener';
  }

  // Bar
  if (/\bbar\b/.test(lower) || /\bbartend(er|ing)?\b/.test(lower)) {
    return 'Bar';
  }

  // Mid
  if (/\bmid\b/.test(lower) || /\bmid\s*shift\b/.test(lower) || /\blunch\b/.test(lower)) {
    return 'Mid Shift';
  }

  // 2nd and 3rd server synonyms
  if (/\b(2nd|second)\b/.test(lower)) return '2nd Server';
  if (/\b(3rd|third)\b/.test(lower)) return '3rd Server';

  // Closer and dinner
  if (/\bclos(e|er|ing)\b/.test(lower) || /\bclose(r|)\b/.test(lower)) return 'Closer';
  if (/\b(dinn?er)\b/.test(lower)) return 'Dinner';

  return raw;
}

export function labelImpliesBartender(label: string): boolean {
  const lower = label.toLowerCase();
  return lower === 'bar' || /\bbar\b/.test(lower) || /\bbartend(er|ing)?\b/.test(lower);
}


