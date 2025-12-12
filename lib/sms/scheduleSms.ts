import type { Employee, ScheduleAssignment, WeeklySchedule, WeeklyStaffingNeeds, DayOfWeek } from '@/lib/types';
import { normalizeStaffingSlotLabel } from '@/lib/scheduling/labels';
import { normalizePhoneNumberToE164 } from '@/lib/sms/phone';

export interface ScheduleSmsRecipient {
  employeeId: string;
  employeeName: string;
  phoneNumberE164: string;
  message: string;
}

export interface BuildScheduleSmsResult {
  recipients: ScheduleSmsRecipient[];
  missingPhoneEmployees: { employeeId: string; employeeName: string }[];
  totalScheduledEmployees: number;
}

function formatCompactTime(time24: string): string {
  const trimmed = (time24 || '').trim();
  if (!trimmed.includes(':')) return trimmed;

  const [hStr, mStr] = trimmed.split(':');
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return trimmed;

  const period = hours >= 12 ? 'p' : 'a';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  if (minutes === 0) return `${hour12}${period}`;
  return `${hour12}:${String(minutes).padStart(2, '0')}${period}`;
}

function safeDateFromISODate(dateStr: string): Date {
  // Use noon to avoid local timezone shifts.
  return new Date(`${dateStr}T12:00:00`);
}

function formatShortDay(dateStr: string): string {
  return safeDateFromISODate(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatMonthDay(dateStr: string): string {
  return safeDateFromISODate(dateStr).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function getDayOfWeekFromDate(dateStr: string): DayOfWeek | null {
  const weekday = safeDateFromISODate(dateStr).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const allowed: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return allowed.includes(weekday as DayOfWeek) ? (weekday as DayOfWeek) : null;
}

function getLabelForAssignment(
  assignment: ScheduleAssignment,
  staffingNeeds?: WeeklyStaffingNeeds
): string | null {
  if (!staffingNeeds) return null;
  const day = getDayOfWeekFromDate(assignment.date);
  if (!day || day === 'monday') return null;

  const daySlots = staffingNeeds[day]?.slots || [];
  const exact = daySlots.find(s => s.id === assignment.shiftId);
  const prefix = exact || daySlots.find(s => assignment.shiftId.startsWith(s.id));
  if (!prefix) return null;

  return normalizeStaffingSlotLabel({
    label: prefix.label,
    day,
    startTime: prefix.startTime || assignment.startTime,
    endTime: prefix.endTime || assignment.endTime,
  });
}

function formatShiftLine(assignment: ScheduleAssignment, staffingNeeds?: WeeklyStaffingNeeds): string {
  const day = formatShortDay(assignment.date);
  const md = formatMonthDay(assignment.date);

  const start = assignment.startTime ? formatCompactTime(assignment.startTime) : 'TBD';
  const end = assignment.endTime ? formatCompactTime(assignment.endTime) : '';
  const timePart = end ? `${start}-${end}` : start;

  const label = getLabelForAssignment(assignment, staffingNeeds);
  return label ? `${day} ${md} ${timePart} (${label})` : `${day} ${md} ${timePart}`;
}

function formatWeekRangeShort(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startText = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endText = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startText} to ${endText}`;
}

export function buildScheduleSmsMessages(args: {
  weekStart: Date;
  schedule: WeeklySchedule;
  employees: Employee[];
  staffingNeeds?: WeeklyStaffingNeeds;
  note?: string;
  brandName?: string;
  defaultCountry?: 'US' | 'CA';
}): BuildScheduleSmsResult {
  const brandName = args.brandName || "Bobola's";
  const defaultCountry = args.defaultCountry || 'US';
  const note = (args.note || '').trim();

  const employeeById = new Map(args.employees.map(e => [e.id, e]));
  const scheduledIds = Array.from(new Set(args.schedule.assignments.map(a => a.employeeId)));

  const recipients: ScheduleSmsRecipient[] = [];
  const missingPhoneEmployees: { employeeId: string; employeeName: string }[] = [];

  for (const employeeId of scheduledIds) {
    const emp = employeeById.get(employeeId);
    if (!emp) continue;

    const phoneE164 = emp.phoneNumber ? normalizePhoneNumberToE164(emp.phoneNumber, defaultCountry) : null;
    if (!phoneE164) {
      missingPhoneEmployees.push({ employeeId: emp.id, employeeName: emp.name });
      continue;
    }

    const shifts = args.schedule.assignments
      .filter(a => a.employeeId === employeeId)
      .slice()
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });

    const lines: string[] = [];
    lines.push(`Hi ${emp.name}.`);
    lines.push(`${brandName} schedule for ${formatWeekRangeShort(args.weekStart)}:`);
    for (const shift of shifts) {
      lines.push(formatShiftLine(shift, args.staffingNeeds));
    }
    if (note) {
      lines.push('');
      lines.push(note);
    }

    recipients.push({
      employeeId: emp.id,
      employeeName: emp.name,
      phoneNumberE164: phoneE164,
      message: lines.join('\n').trim(),
    });
  }

  return {
    recipients,
    missingPhoneEmployees,
    totalScheduledEmployees: scheduledIds.length,
  };
}


