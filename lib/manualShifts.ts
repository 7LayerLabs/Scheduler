import type { DayOfWeek, ScheduleAssignment, StaffingSlot, WeeklyStaffingNeeds } from '@/lib/types';
import { getShiftBucketFromStartTime } from '@/lib/shiftBuckets';
import { normalizeStaffingSlotLabel } from '@/lib/scheduling/labels';

export const SHIFT_TEMPLATE_MIME_TYPE = 'application/x-bobolas-shift-template';

export type DefaultShiftTemplate = {
  id: string;
  label: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
};

export type ShiftTemplateDragPayload = {
  template: DefaultShiftTemplate;
};

function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

export function employeeHasOverlappingAssignment(
  assignments: ScheduleAssignment[],
  employeeId: string,
  date: string,
  startTime: string,
  endTime: string
): boolean {
  return assignments.some(a => {
    if (a.employeeId !== employeeId || a.date !== date) return false;
    if (!a.startTime || !a.endTime) return false;
    return rangesOverlap(a.startTime, a.endTime, startTime, endTime);
  });
}

export function serializeShiftTemplateDragPayload(payload: ShiftTemplateDragPayload): string {
  return JSON.stringify(payload);
}

export function parseShiftTemplateDragPayload(raw: string): ShiftTemplateDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as ShiftTemplateDragPayload;
    if (!parsed || typeof parsed !== 'object') return null;
    const template = (parsed as any).template as DefaultShiftTemplate | undefined;
    if (!template || typeof template !== 'object') return null;
    if (typeof template.id !== 'string') return null;
    if (typeof template.label !== 'string') return null;
    if (!isValidTimeString(template.startTime)) return null;
    if (!isValidTimeString(template.endTime)) return null;
    return { template };
  } catch {
    return null;
  }
}

export function getAllUniqueDefaultShiftTemplatesFromStaffingNeeds(
  staffingNeeds: WeeklyStaffingNeeds
): DefaultShiftTemplate[] {
  const seen = new Map<string, DefaultShiftTemplate>();
  const days: (keyof WeeklyStaffingNeeds)[] = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of days) {
    const slots = staffingNeeds[day]?.slots || [];
    for (const slot of slots) {
      const normalizedLabel = normalizeStaffingSlotLabel({
        label: slot.label,
        day: day as DayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      const key = `${normalizedLabel.toLowerCase()}|${slot.startTime}|${slot.endTime}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: `template-${normalizedLabel.toLowerCase().replace(/\s+/g, '-')}-${slot.startTime}-${slot.endTime}`,
          label: normalizedLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    const aBucket = getShiftBucketFromStartTime(a.startTime);
    const bBucket = getShiftBucketFromStartTime(b.startTime);
    if (aBucket !== bBucket) return aBucket.localeCompare(bBucket);
    return a.startTime.localeCompare(b.startTime);
  });
}

function getSlotsForDay(staffingNeeds: WeeklyStaffingNeeds | undefined, day: DayOfWeek): StaffingSlot[] {
  if (!staffingNeeds) return [];
  if (day === 'monday') return [];
  const dayKey = day as keyof WeeklyStaffingNeeds;
  return staffingNeeds[dayKey]?.slots || [];
}

function isSlotFilled(assignments: ScheduleAssignment[], date: string, slotId: string): boolean {
  return assignments.some(a => a.date === date && a.shiftId === slotId);
}

export function createManualShiftId(
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  nonce: string
): string {
  const compactStart = startTime.replace(':', '');
  const compactEnd = endTime.replace(':', '');
  return `manual-${day}-${compactStart}-${compactEnd}-${nonce}`;
}

export function pickShiftIdForManualAssignment(params: {
  staffingNeeds?: WeeklyStaffingNeeds;
  assignments: ScheduleAssignment[];
  date: string;
  day: DayOfWeek;
  template: DefaultShiftTemplate;
  nonce: string;
}): { shiftId: string; usedTemplateSlot: boolean } {
  const { staffingNeeds, assignments, date, day, template, nonce } = params;
  const daySlots = getSlotsForDay(staffingNeeds, day);

  // 1) Best match: exact time match to an unfilled slot
  for (const slot of daySlots) {
    if (slot.startTime === template.startTime && slot.endTime === template.endTime) {
      if (!isSlotFilled(assignments, date, slot.id)) {
        return { shiftId: slot.id, usedTemplateSlot: true };
      }
    }
  }

  // 2) Next: same bucket match to an unfilled slot (earliest first)
  const templateBucket = getShiftBucketFromStartTime(template.startTime);
  const bucketCandidates = [...daySlots]
    .filter(s => getShiftBucketFromStartTime(s.startTime) === templateBucket)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  for (const slot of bucketCandidates) {
    if (!isSlotFilled(assignments, date, slot.id)) {
      return { shiftId: slot.id, usedTemplateSlot: true };
    }
  }

  // 3) Fallback: create a custom shift id (does not count toward template slots)
  return { shiftId: createManualShiftId(day, template.startTime, template.endTime, nonce), usedTemplateSlot: false };
}

function replaceLeadingDayToken(shiftId: string, targetDay: DayOfWeek): string {
  const original = (shiftId || '').toLowerCase();
  const tokens = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  ];

  for (const token of tokens) {
    if (original.startsWith(`${token}-`)) {
      return `${targetDay}-${shiftId.slice(token.length + 1)}`;
    }
  }

  // If the id does not begin with a recognizable token, keep it stable but prefix the day.
  return `${targetDay}-${shiftId}`;
}

export function mapShiftIdForDayMove(params: {
  staffingNeeds?: WeeklyStaffingNeeds;
  assignments: ScheduleAssignment[];
  targetDay: DayOfWeek;
  targetDate: string;
  startTime?: string;
  endTime?: string;
  currentShiftId: string;
  nonce: string;
}): string {
  const { staffingNeeds, assignments, targetDay, targetDate, startTime, endTime, currentShiftId, nonce } = params;

  // If we have times, attempt to map to a matching unfilled slot on the target day.
  if (startTime && endTime) {
    const daySlots = getSlotsForDay(staffingNeeds, targetDay);

    for (const slot of daySlots) {
      if (slot.startTime === startTime && slot.endTime === endTime) {
        if (!isSlotFilled(assignments, targetDate, slot.id)) return slot.id;
      }
    }

    const bucket = getShiftBucketFromStartTime(startTime);
    const bucketCandidates = [...daySlots]
      .filter(s => getShiftBucketFromStartTime(s.startTime) === bucket)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    for (const slot of bucketCandidates) {
      if (!isSlotFilled(assignments, targetDate, slot.id)) return slot.id;
    }

    return createManualShiftId(targetDay, startTime, endTime, nonce);
  }

  // Without times, best-effort: rewrite day token to keep printing and grouping sane.
  return replaceLeadingDayToken(currentShiftId, targetDay);
}


