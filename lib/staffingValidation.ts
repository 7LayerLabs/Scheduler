import type { DayOfWeek, WeeklyStaffingNeeds } from './types';
import { labelImpliesBartender, normalizeStaffingSlotLabel } from './scheduling/labels';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export type StaffingValidationIssueType =
  | 'multiple_openers_at_open'
  | 'bar_starts_too_early'
  | 'opener_ends_too_late';

export interface StaffingValidationIssue {
  day: DayOfWeek;
  type: StaffingValidationIssueType;
  message: string;
}

export function validateStaffingNeeds(params: {
  staffingNeeds: WeeklyStaffingNeeds;
  businessOpenTimeByDay?: Partial<Record<DayOfWeek, string>>;
}): StaffingValidationIssue[] {
  const { staffingNeeds, businessOpenTimeByDay } = params;
  const issues: StaffingValidationIssue[] = [];

  const days: DayOfWeek[] = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of days) {
    const openTime = businessOpenTimeByDay?.[day] || '07:15';
    const openMins = timeToMinutes(openTime);
    const daySlots = staffingNeeds[day]?.slots || [];

    // 1) Multiple openers at opening time
    const openerCandidates = daySlots.filter(s => {
      const label = normalizeStaffingSlotLabel({ label: s.label, day, startTime: s.startTime, endTime: s.endTime });
      return label.toLowerCase().includes('opener') && timeToMinutes(s.startTime) === openMins;
    });
    if (openerCandidates.length > 1) {
      issues.push({
        day,
        type: 'multiple_openers_at_open',
        message: `More than one opener starts at ${openTime} on ${day}. This usually causes two openers to be scheduled.`,
      });
    }

    // 2) Bar starts too early (heuristic: before noon)
    const barTooEarly = daySlots.find(s => {
      const label = normalizeStaffingSlotLabel({ label: s.label, day, startTime: s.startTime, endTime: s.endTime });
      return labelImpliesBartender(label) && timeToMinutes(s.startTime) < 12 * 60;
    });
    if (barTooEarly) {
      issues.push({
        day,
        type: 'bar_starts_too_early',
        message: `Bar starts before noon on ${day}. If you do not need bar coverage in the morning, rename or move this slot.`,
      });
    }

    // 3) Weekday opener ends too late (heuristic based on your requirement: by 12:00)
    if (day === 'tuesday' || day === 'wednesday' || day === 'thursday' || day === 'friday') {
      const opener = daySlots
        .map(s => ({ slot: s, label: normalizeStaffingSlotLabel({ label: s.label, day, startTime: s.startTime, endTime: s.endTime }) }))
        .find(x => x.label === 'Opener' && timeToMinutes(x.slot.startTime) === openMins);

      if (opener && timeToMinutes(opener.slot.endTime) > 12 * 60) {
        issues.push({
          day,
          type: 'opener_ends_too_late',
          message: `Opener on ${day} ends at ${opener.slot.endTime}. If the opener should be done by 12:00, shorten this slot.`,
        });
      }
    }
  }

  return issues;
}


