import {
  Employee,
  Shift,
  WeeklySchedule,
  ScheduleAssignment,
  ScheduleConflict,
  ScheduleWarning,
  DayOfWeek,
  DayAvailability,
  ScheduleOverride,
  WeeklyStaffingNeeds
} from './types';
import { getShiftsForDay, staffingRequirements } from './shifts';

// Helper functions (moved from employees.ts to avoid circular dependency)
function isBartender(employee: Employee): boolean {
  return employee.bartendingScale >= 3;
}

function canWorkAlone(employee: Employee): boolean {
  return employee.aloneScale >= 3;
}

interface TimeSlot {
  day: DayOfWeek;
  date: string;
  startTime: string;
  endTime: string;
  type: 'morning' | 'mid' | 'night';
  minStaff: number;
  requiresBartender: boolean;
}

interface EmployeeHours {
  [employeeId: string]: number;
}

interface EmployeeShifts {
  [employeeId: string]: number;
}

// Parse time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Calculate shift duration in hours
function getShiftDuration(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return (end - start) / 60;
}

// Check if a time falls within a range
function isTimeInRange(time: string, start: string, end: string): boolean {
  const t = timeToMinutes(time);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return t >= s && t < e;
}

// Check if employee is available for a specific date and time
function isEmployeeAvailable(
  employee: Employee,
  day: DayOfWeek,
  date: string,
  shiftType: 'morning' | 'mid' | 'night',
  startTime: string
): boolean {
  // Check exclusions
  for (const exclusion of employee.exclusions) {
    if (date >= exclusion.startDate && date <= exclusion.endDate) {
      return false;
    }
  }

  // Get day availability
  const dayAvail = employee.availability[day] as DayAvailability | null;
  if (!dayAvail || !dayAvail.available) {
    return false;
  }

  // Check if any available shift matches
  for (const shift of dayAvail.shifts) {
    if (shift.type === 'any') {
      // Check start time constraint if specified
      if (shift.startTime && timeToMinutes(startTime) < timeToMinutes(shift.startTime)) {
        continue;
      }
      return true;
    }

    if (shift.type === shiftType) {
      // Check start time constraint if specified
      if (shift.startTime && timeToMinutes(startTime) < timeToMinutes(shift.startTime)) {
        continue;
      }
      return true;
    }

    if (shift.type === 'custom' && shift.startTime && shift.endTime) {
      if (isTimeInRange(startTime, shift.startTime, shift.endTime)) {
        return true;
      }
    }
  }

  return false;
}

// Score an employee for a shift (higher is better)
function scoreEmployee(
  employee: Employee,
  shiftType: 'morning' | 'mid' | 'night',
  currentHours: EmployeeHours,
  currentShifts: EmployeeShifts,
  needsBartender: boolean
): number {
  let score = 0;

  // Prefer employees who want more shifts
  const minShifts = employee.minShiftsPerWeek || 0;
  const currentShiftCount = currentShifts[employee.id] || 0;
  if (currentShiftCount < minShifts) {
    score += 30; // Strong preference for those who need shifts
  }

  // Match preferences
  if (shiftType === 'morning' && employee.preferences.prefersMorning) score += 10;
  if (shiftType === 'mid' && employee.preferences.prefersMid) score += 10;
  if (shiftType === 'night' && employee.preferences.prefersNight) score += 10;

  // Bartending ability
  if (needsBartender && isBartender(employee)) {
    score += 20;
  }

  // Balance hours across staff
  const hours = currentHours[employee.id] || 0;
  if (hours < 20) score += 10;
  if (hours < 10) score += 10;
  if (hours > 35) score -= 20;

  // Can work alone is valuable
  if (canWorkAlone(employee)) {
    score += 5;
  }

  return score;
}

// Get Monday of the week containing the given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get date for a specific day of the week
function getDateForDay(weekStart: Date, day: DayOfWeek): string {
  const dayOffsets: Record<DayOfWeek, number> = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayOffsets[day]);
  return formatDate(date);
}

// Main scheduling algorithm
export function generateSchedule(
  weekStartDate: Date,
  overrides: ScheduleOverride[] = [],
  employees: Employee[] = [],
  staffingNeeds?: WeeklyStaffingNeeds
): WeeklySchedule {
  const weekStart = getWeekStart(weekStartDate);
  const assignments: ScheduleAssignment[] = [];
  const conflicts: ScheduleConflict[] = [];
  const warnings: ScheduleWarning[] = [];
  const employeeHours: EmployeeHours = {};
  const employeeShifts: EmployeeShifts = {};

  // Initialize hours tracking
  for (const emp of employees) {
    employeeHours[emp.id] = 0;
    employeeShifts[emp.id] = 0;
  }

  // Process each day
  const days: DayOfWeek[] = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of days) {
    const date = getDateForDay(weekStart, day);
    const dayShifts = getShiftsForDay(day);

    // Get overrides for this day
    const dayOverrides = overrides.filter(o => o.day === day);
    const assignOverrides = dayOverrides.filter(o => o.type === 'assign');
    const excludeOverrides = dayOverrides.filter(o => o.type === 'exclude');
    const prioritizeOverrides = dayOverrides.filter(o => o.type === 'prioritize');
    const customTimeOverrides = dayOverrides.filter(o => o.type === 'custom_time');

    // Handle custom time assignments first - these create special individual shifts
    for (const customTime of customTimeOverrides) {
      const emp = employees.find(e => e.id === customTime.employeeId);
      if (!emp) continue;

      // Determine which shift this falls into based on times
      const defaultMorningEnd = staffingNeeds ? staffingNeeds[day as keyof WeeklyStaffingNeeds]?.morningEnd || '14:00' : '14:00';
      const startTime = customTime.customStartTime || '07:15';
      const endTime = customTime.customEndTime || '21:00';

      // Decide if this is a morning or night shift based on times
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);
      const morningEndHour = parseInt(defaultMorningEnd.split(':')[0]);

      let shiftType: 'morning' | 'night' = 'morning';
      if (startHour >= 14 || (startHour >= 12 && endHour >= 17)) {
        shiftType = 'night';
      }

      // Create the custom shift ID
      const customShiftId = `${day.slice(0, 3)}-custom-${emp.id}-${shiftType}`;

      // Check if already assigned today
      const alreadyAssignedToday = assignments.some(a => a.date === date && a.employeeId === emp.id);
      if (alreadyAssignedToday) continue;

      // Add the assignment
      assignments.push({
        shiftId: customShiftId,
        employeeId: emp.id,
        date,
      });

      // Track hours
      const duration = getShiftDuration(startTime, endTime);
      employeeHours[emp.id] = (employeeHours[emp.id] || 0) + duration;
      employeeShifts[emp.id] = (employeeShifts[emp.id] || 0) + 1;
    }

    // Group shifts by type to avoid double-scheduling
    const morningShifts = dayShifts.filter(s => s.type === 'morning');
    const midShifts = dayShifts.filter(s => s.type === 'mid');
    const nightShifts = dayShifts.filter(s => s.type === 'night');

    // Get staffing config for this day
    const dayStaffing = staffingNeeds ? staffingNeeds[day as keyof WeeklyStaffingNeeds] : null;

    // Assign morning slots
    if (morningShifts.length > 0) {
      const mainMorning = morningShifts[0];

      // Use staffingNeeds if provided, otherwise fall back to shift default
      const morningStaffNeeded = dayStaffing
        ? dayStaffing.morning
        : mainMorning.staffNeeded;

      // Use custom times from staffingNeeds if available
      const morningStartTime = dayStaffing?.morningStart || mainMorning.startTime;
      const morningEndTime = dayStaffing?.morningEnd || mainMorning.endTime;

      // Create a shift with custom times
      const customMorningShift = {
        ...mainMorning,
        staffNeeded: morningStaffNeeded,
        startTime: morningStartTime,
        endTime: morningEndTime,
      };

      // Get forced assignments for morning
      const morningAssigns = assignOverrides.filter(o => o.shiftType === 'morning' || o.shiftType === 'any');
      const morningExcludes = excludeOverrides.map(o => o.employeeId);
      const morningPrioritize = prioritizeOverrides.filter(o => o.shiftType === 'morning' || o.shiftType === 'any').map(o => o.employeeId);

      const assigned = assignShift(
        customMorningShift,
        date,
        day,
        employees,
        employeeHours,
        employeeShifts,
        assignments,
        morningAssigns.map(o => o.employeeId),
        morningExcludes,
        morningPrioritize
      );

      if (assigned.length < morningStaffNeeded) {
        conflicts.push({
          type: 'no_coverage',
          shiftId: mainMorning.id,
          date,
          message: `Need ${morningStaffNeeded} staff for ${mainMorning.name} on ${day}, only found ${assigned.length}`,
        });
      }

      // Check bartender requirement
      const hasBartender = assigned.some(id => {
        const emp = employees.find(e => e.id === id);
        return emp && isBartender(emp);
      });
      if (!hasBartender && mainMorning.requiresBartender) {
        conflicts.push({
          type: 'no_bartender',
          shiftId: mainMorning.id,
          date,
          message: `No bartender assigned to ${mainMorning.name} on ${day}`,
        });
      }
    }

    // Assign night slots
    if (nightShifts.length > 0) {
      const mainNight = nightShifts[0];

      // Use staffingNeeds if provided, otherwise fall back to shift default
      // Skip night shift if staffingNeeds says 0 (e.g., Sunday night when closed)
      const nightStaffNeeded = dayStaffing
        ? dayStaffing.night
        : mainNight.staffNeeded;

      // Use custom times from staffingNeeds if available
      const nightStartTime = dayStaffing?.nightStart || mainNight.startTime;
      const nightEndTime = dayStaffing?.nightEnd || mainNight.endTime;

      // Create a shift with custom times
      const customNightShift = {
        ...mainNight,
        staffNeeded: nightStaffNeeded,
        startTime: nightStartTime,
        endTime: nightEndTime,
      };

      // Skip if no night staff needed (e.g., closed)
      if (nightStaffNeeded === 0) {
        // Don't assign anyone, no conflict
      } else {
        // Get forced assignments for night
        const nightAssigns = assignOverrides.filter(o => o.shiftType === 'night' || o.shiftType === 'any');
        const nightExcludes = excludeOverrides.map(o => o.employeeId);
        const nightPrioritize = prioritizeOverrides.filter(o => o.shiftType === 'night' || o.shiftType === 'any').map(o => o.employeeId);

        const assigned = assignShift(
          customNightShift,
          date,
          day,
          employees,
          employeeHours,
          employeeShifts,
          assignments,
          nightAssigns.map(o => o.employeeId),
          nightExcludes,
          nightPrioritize
        );

        if (assigned.length < nightStaffNeeded) {
          conflicts.push({
            type: 'no_coverage',
            shiftId: mainNight.id,
            date,
            message: `Need ${nightStaffNeeded} staff for ${mainNight.name} on ${day}, only found ${assigned.length}`,
          });
        }

        // Check bartender requirement
        const hasBartender = assigned.some(id => {
          const emp = employees.find(e => e.id === id);
          return emp && isBartender(emp);
        });
        if (!hasBartender && mainNight.requiresBartender) {
          conflicts.push({
            type: 'no_bartender',
            shiftId: mainNight.id,
            date,
            message: `No bartender assigned to ${mainNight.name} on ${day}`,
          });
        }
      }
    }
  }

  // Check for employees not getting enough shifts
  for (const emp of employees) {
    const minShifts = emp.minShiftsPerWeek || 0;
    if (minShifts > 0 && employeeShifts[emp.id] < minShifts) {
      warnings.push({
        type: 'under_hours',
        employeeId: emp.id,
        message: `${emp.name} wants ${minShifts} shifts but only scheduled for ${employeeShifts[emp.id]}`,
      });
    }

    // Check for overtime
    if (employeeHours[emp.id] > 38) {
      warnings.push({
        type: 'overtime',
        employeeId: emp.id,
        message: `${emp.name} is at ${employeeHours[emp.id].toFixed(1)} hours (approaching overtime)`,
      });
    }
  }

  return {
    weekStartDate: formatDate(weekStart),
    assignments,
    conflicts,
    warnings,
  };
}

function assignShift(
  shift: Shift,
  date: string,
  day: DayOfWeek,
  allEmployees: Employee[],
  hours: EmployeeHours,
  shifts: EmployeeShifts,
  assignments: ScheduleAssignment[],
  forceAssign: string[] = [],
  forceExclude: string[] = [],
  prioritize: string[] = []
): string[] {
  const assigned: string[] = [];
  const shiftDuration = getShiftDuration(shift.startTime, shift.endTime);

  // Already assigned to ANY shift on this day (prevent same person morning AND night)
  const alreadyAssignedToday = assignments
    .filter(a => a.date === date)
    .map(a => a.employeeId);

  // Already assigned to this day/shift type specifically
  const alreadyAssigned = assignments
    .filter(a => a.date === date && a.shiftId.includes(shift.type))
    .map(a => a.employeeId);

  // STEP 0: Handle forced assignments first
  for (const empId of forceAssign) {
    if (alreadyAssigned.includes(empId)) continue;
    if (alreadyAssignedToday.includes(empId)) continue; // Don't double-book even for forced
    const emp = allEmployees.find(e => e.id === empId);
    if (!emp) continue;

    assigned.push(emp.id);
    hours[emp.id] += shiftDuration;
    shifts[emp.id]++;
    assignments.push({
      shiftId: shift.id,
      employeeId: emp.id,
      date,
    });
  }

  // Get available employees (excluding forced exclusions)
  const available = allEmployees.filter(emp => {
    if (alreadyAssigned.includes(emp.id)) return false;
    if (alreadyAssignedToday.includes(emp.id)) return false; // Already working another shift today
    if (assigned.includes(emp.id)) return false; // Already force-assigned
    if (forceExclude.includes(emp.id)) return false; // Force excluded
    return isEmployeeAvailable(emp, day, date, shift.type, shift.startTime);
  });

  // Separate bartenders and non-bartenders who need bartender coverage
  const bartenders = available.filter(emp => isBartender(emp));
  const needsBartenderSupport = available.filter(emp => emp.preferences.needsBartenderOnShift);

  // Score all available employees (boost prioritized ones)
  const scored = available.map(emp => ({
    employee: emp,
    score: scoreEmployee(emp, shift.type, hours, shifts, shift.requiresBartender) +
           (prioritize.includes(emp.id) ? 50 : 0), // Big boost for prioritized
  })).sort((a, b) => b.score - a.score);

  // Check if we already have a bartender from forced assignments
  let hasBartender = assigned.some(id => {
    const emp = allEmployees.find(e => e.id === id);
    return emp && isBartender(emp);
  });

  // STEP 1: Assign a bartender if shift requires one and we don't have one
  if (shift.requiresBartender && !hasBartender && bartenders.length > 0) {
    // Prefer prioritized bartenders
    const prioritizedBartenders = bartenders.filter(emp => prioritize.includes(emp.id));
    const bartenderPool = prioritizedBartenders.length > 0 ? prioritizedBartenders : bartenders;

    const scoredBartenders = bartenderPool.map(emp => ({
      employee: emp,
      score: scoreEmployee(emp, shift.type, hours, shifts, true),
    })).sort((a, b) => b.score - a.score);

    const bestBartender = scoredBartenders[0].employee;
    assigned.push(bestBartender.id);
    hasBartender = true;
    hours[bestBartender.id] += shiftDuration;
    shifts[bestBartender.id]++;
    assignments.push({
      shiftId: shift.id,
      employeeId: bestBartender.id,
      date,
    });
  }

  // STEP 2: Now that we have a bartender, prioritize employees who NEED bartender support
  // (like Christian) if they want more shifts
  if (hasBartender) {
    const eligibleNeedSupport = needsBartenderSupport.filter(emp =>
      !assigned.includes(emp.id)
    );

    const scoredNeedSupport = eligibleNeedSupport.map(emp => ({
      employee: emp,
      score: scoreEmployee(emp, shift.type, hours, shifts, false),
    })).sort((a, b) => b.score - a.score);

    for (const { employee } of scoredNeedSupport) {
      if (assigned.length >= shift.staffNeeded) break;

      assigned.push(employee.id);
      hours[employee.id] += shiftDuration;
      shifts[employee.id]++;
      assignments.push({
        shiftId: shift.id,
        employeeId: employee.id,
        date,
      });
    }
  }

  // STEP 3: Fill remaining slots with other available employees
  for (const { employee } of scored) {
    if (assigned.length >= shift.staffNeeded) break;
    if (assigned.includes(employee.id)) continue;

    // Skip employees who need bartender support if we don't have one
    if (employee.preferences.needsBartenderOnShift && !hasBartender) {
      continue;
    }

    assigned.push(employee.id);
    if (isBartender(employee)) hasBartender = true;
    hours[employee.id] += shiftDuration;
    shifts[employee.id]++;
    assignments.push({
      shiftId: shift.id,
      employeeId: employee.id,
      date,
    });
  }

  return assigned;
}

// Export schedule to printable format
export function scheduleToGrid(schedule: WeeklySchedule, employees: Employee[]): Record<string, Record<string, string[]>> {
  const grid: Record<string, Record<string, string[]>> = {
    tuesday: { morning: [], mid: [], night: [] },
    wednesday: { morning: [], mid: [], night: [] },
    thursday: { morning: [], mid: [], night: [] },
    friday: { morning: [], mid: [], night: [] },
    saturday: { morning: [], night: [] },
    sunday: { morning: [] },
  };

  for (const assignment of schedule.assignments) {
    const emp = employees.find(e => e.id === assignment.employeeId);
    if (!emp) continue;

    const day = assignment.shiftId.split('-')[0];
    let type = 'morning';
    if (assignment.shiftId.includes('night')) type = 'night';
    else if (assignment.shiftId.includes('mid')) type = 'mid';

    const dayMap: Record<string, string> = {
      tue: 'tuesday',
      wed: 'wednesday',
      thu: 'thursday',
      fri: 'friday',
      sat: 'saturday',
      sun: 'sunday',
    };

    const dayKey = dayMap[day] || day;
    if (grid[dayKey] && grid[dayKey][type]) {
      if (!grid[dayKey][type].includes(emp.name)) {
        grid[dayKey][type].push(emp.name);
      }
    }
  }

  return grid;
}
