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
  staffingNeeds?: WeeklyStaffingNeeds,
  lockedShifts?: { employeeId: string; day: DayOfWeek; shiftType: 'morning' | 'night' }[],
  existingAssignments?: ScheduleAssignment[]
): WeeklySchedule {
  const weekStart = getWeekStart(weekStartDate);
  // 1. Process overrides and set schedules to create initial assignments
  const assignments: ScheduleAssignment[] = [];
  const conflicts: ScheduleConflict[] = [];
  const warnings: ScheduleWarning[] = [];
  const employeeShifts: Record<string, number> = {};
  const employeeHours: Record<string, number> = {};

  // Initialize counts
  employees.forEach(emp => {
    employeeShifts[emp.id] = 0;
    employeeHours[emp.id] = 0;
  });

  // Helper to determine shift type from start time
  const determineShiftType = (time: string): 'morning' | 'night' => {
    const hour = parseInt(time.split(':')[0]);
    return hour < 16 ? 'morning' : 'night';
  };

  // Helper to calculate duration from time strings (HH:MM)
  const getShiftDuration = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let duration = (endH + endM / 60) - (startH + startM / 60);
    if (duration < 0) duration += 24;
    return duration;
  };

  // Helper to add assignment and update counts
  const addAssignment = (assignment: ScheduleAssignment, shift: { id: string; startTime: string; endTime: string; duration: number; }) => {
    // Check if assignment already exists
    const exists = assignments.some(a =>
      a.employeeId === assignment.employeeId &&
      a.date === assignment.date &&
      a.shiftId === assignment.shiftId
    );

    if (!exists) {
      assignments.push(assignment);
      employeeShifts[assignment.employeeId] = (employeeShifts[assignment.employeeId] || 0) + 1;
      employeeHours[assignment.employeeId] = (employeeHours[assignment.employeeId] || 0) + shift.duration;
    }
  };

  // 0. Pre-populate locked shifts from existing assignments (HIGHEST PRIORITY)
  // These are shifts that the user has manually locked and should NOT be changed during regeneration
  if (lockedShifts && existingAssignments) {
    const dayOffsets: Record<DayOfWeek, number> = {
      monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6
    };

    lockedShifts.forEach(lock => {
      // Find the existing assignment that matches this lock
      const lockDate = new Date(weekStart);
      lockDate.setDate(lockDate.getDate() + dayOffsets[lock.day]);
      const lockDateStr = lockDate.toISOString().split('T')[0];

      const existingAssignment = existingAssignments.find(a =>
        a.employeeId === lock.employeeId &&
        a.date === lockDateStr &&
        (lock.shiftType === 'night' ? a.shiftId.includes('night') : !a.shiftId.includes('night'))
      );

      if (existingAssignment) {
        // Add the locked assignment directly
        assignments.push({ ...existingAssignment });

        // Estimate duration from the assignment if available, otherwise use defaults
        const duration = existingAssignment.startTime && existingAssignment.endTime
          ? getShiftDuration(existingAssignment.startTime, existingAssignment.endTime)
          : (lock.shiftType === 'morning' ? 6 : 5);

        employeeShifts[existingAssignment.employeeId] = (employeeShifts[existingAssignment.employeeId] || 0) + 1;
        employeeHours[existingAssignment.employeeId] = (employeeHours[existingAssignment.employeeId] || 0) + duration;
      }
    });
  }

  // 1a. Process Set Schedules (Highest Priority)
  employees.forEach(emp => {
    if (emp.setSchedule) {
      emp.setSchedule.forEach(setShift => {
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(setShift.day);
        if (dayIndex === -1) return;

        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().split('T')[0];

        // Find matching shift definition to get duration/id
        const dayStaffing = staffingNeeds ? staffingNeeds[setShift.day as keyof WeeklyStaffingNeeds] : undefined;
        const shiftId = `${setShift.day}-${setShift.shiftType}`;

        // Create a synthetic shift object for the assignment
        const shift: { id: string; startTime: string; endTime: string; duration: number; } = {
          id: shiftId,
          startTime: setShift.startTime || (setShift.shiftType === 'morning' ? dayStaffing?.morningStart : dayStaffing?.nightStart) || '09:00',
          endTime: setShift.endTime || (setShift.shiftType === 'morning' ? dayStaffing?.morningEnd : dayStaffing?.nightEnd) || '17:00',
          duration: 8, // Approximate, will be calculated from times if needed
        };

        // Calculate duration if times are present
        if (shift.startTime && shift.endTime) {
          shift.duration = getShiftDuration(shift.startTime, shift.endTime);
        }

        addAssignment({
          shiftId: shift.id,
          employeeId: emp.id,
          date: dateStr,
          startTime: shift.startTime, // Pass specific times if set
          endTime: shift.endTime
        }, shift);
      });
    }
  });

  // 1b. Process Overrides (High Priority)
  // The original override processing was per day. We need to adapt it to the new structure.
  // Custom time overrides are processed first as they create specific shifts.
  // Assign and exclude overrides will be used later in the assignShift function.

  // Process each day
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']; // Include Monday for set schedules

  for (const day of days) {
    const dateStr = getDateForDay(weekStart, day);
    const dayOverrides = overrides.filter(o => o.day === day);

    // Get shifts for this day based on staffing needs (new slots format)
    const shifts: Shift[] = [];
    if (staffingNeeds) {
      const needs = staffingNeeds[day as keyof WeeklyStaffingNeeds];
      if (needs && needs.slots && needs.slots.length > 0) {
        // Use the new slots array
        for (const slot of needs.slots) {
          const startHour = parseInt(slot.startTime.split(':')[0]);
          let shiftType: 'morning' | 'mid' | 'night' = 'mid';
          if (startHour < 12) shiftType = 'morning';
          else if (startHour >= 15) shiftType = 'night';

          shifts.push({
            id: slot.id || `${day}-${slot.startTime}`,
            day,
            type: shiftType,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: getShiftDuration(slot.startTime, slot.endTime),
            requiredStaff: 1, // Each slot is one person
            name: slot.label || 'Shift',
            requiresBartender: shiftType === 'night',
          });
        }
      } else if (needs && (needs.morning || needs.night)) {
        // Fallback to legacy format for backward compatibility
        if (needs.morning && needs.morning > 0) {
          shifts.push({
            id: `${day}-morning`,
            day,
            type: 'morning',
            startTime: needs.morningStart || '07:15',
            endTime: needs.morningEnd || '14:00',
            duration: getShiftDuration(needs.morningStart || '07:15', needs.morningEnd || '14:00'),
            requiredStaff: needs.morning,
            name: 'Morning Shift',
            requiresBartender: false,
          });
        }
        if (needs.night && needs.night > 0) {
          shifts.push({
            id: `${day}-night`,
            day,
            type: 'night',
            startTime: needs.nightStart || '16:00',
            endTime: needs.nightEnd || '21:00',
            duration: getShiftDuration(needs.nightStart || '16:00', needs.nightEnd || '21:00'),
            requiredStaff: needs.night,
            name: 'Night Shift',
            requiresBartender: true,
          });
        }
      }
    } else {
      // Fallback to default shifts if no staffing needs provided
      if (day !== 'sunday') { // Sunday night closed
        shifts.push({ id: `${day}-morning`, day, type: 'morning', startTime: '09:00', endTime: '17:00', duration: 8, requiredStaff: 2, name: 'Morning Shift', requiresBartender: false });
        shifts.push({ id: `${day}-night`, day, type: 'night', startTime: '17:00', endTime: '23:00', duration: 6, requiredStaff: 2, name: 'Night Shift', requiresBartender: true });
      } else {
        shifts.push({ id: `${day}-morning`, day, type: 'morning', startTime: '09:00', endTime: '17:00', duration: 8, requiredStaff: 2, name: 'Morning Shift', requiresBartender: false });
      }
    }

    // Handle custom time assignments first - these create special individual shifts
    const customTimeOverrides = dayOverrides.filter(o => o.type === 'custom_time');
    for (const customTime of customTimeOverrides) {
      const emp = employees.find(e => e.id === customTime.employeeId);
      if (!emp) continue;

      // Create a synthetic shift for this custom time
      const shiftId = `custom-${customTime.id}`;
      const startTime = customTime.customStartTime || '09:00';
      const endTime = customTime.customEndTime || '17:00';

      const shift: Shift = {
        id: shiftId,
        day,
        type: determineShiftType(startTime),
        startTime,
        endTime,
        duration: getShiftDuration(startTime, endTime),
        requiredStaff: 1,
        name: 'Custom Shift',
        requiresBartender: false
      };

      assignShift(
        shift,
        dateStr,
        employees,
        assignments,
        employeeHours,
        employeeShifts,
        dayOverrides,
        conflicts,
        warnings
      );
    }

    for (const shift of shifts) {
      assignShift(
        shift,
        dateStr,
        employees,
        assignments,
        employeeHours,
        employeeShifts,
        dayOverrides,
        conflicts,
        warnings
      );
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

  // Verify that all overrides were respected
  for (const override of overrides) {
    const emp = employees.find(e => e.id === override.employeeId);
    if (!emp) continue;

    const dayDate = getDateForDay(weekStart, override.day);
    const empAssignments = assignments.filter(a => a.employeeId === emp.id && a.date === dayDate);

    if (override.type === 'exclude') {
      if (empAssignments.length > 0) {
        conflicts.push({
          type: 'rule_violation',
          shiftId: 'override-check',
          date: dayDate,
          message: `Rule violation: ${emp.name} was scheduled on ${override.day} despite "off" rule`,
        });
      }
    } else if (override.type === 'assign' || override.type === 'custom_time') {
      if (empAssignments.length === 0) {
        conflicts.push({
          type: 'rule_violation',
          shiftId: 'override-check',
          date: dayDate,
          message: `Rule violation: ${emp.name} was NOT scheduled on ${override.day} despite assignment rule`,
        });
      } else if (override.shiftType !== 'any' && override.type === 'assign') {
        // Check if shift type matches
        const hasMatchingShift = empAssignments.some(a => {
          if (override.shiftType === 'morning') return a.shiftId.includes('morning') || a.shiftId.includes('early');
          if (override.shiftType === 'night') return a.shiftId.includes('night');
          return false;
        });

        if (!hasMatchingShift) {
          conflicts.push({
            type: 'rule_violation',
            shiftId: 'override-check',
            date: dayDate,
            message: `Rule violation: ${emp.name} assigned to wrong shift type on ${override.day}`,
          });
        }
      }
    }
  }
  return {
    weekStart,
    assignments,
    conflicts,
    warnings,
  };
}

// Helper to assign employees to a shift
function assignShift(
  shift: Shift,
  date: string,
  employees: Employee[],
  assignments: ScheduleAssignment[],
  employeeHours: Record<string, number>,
  employeeShiftCounts: Record<string, number>,
  overrides: ScheduleOverride[],
  conflicts: ScheduleConflict[],
  warnings: ScheduleWarning[]
) {
  // Check if shift is already filled
  const currentAssignments = assignments.filter(a => a.shiftId === shift.id && a.date === date);
  if (currentAssignments.length >= shift.requiredStaff) return;

  // Get available employees
  const availableEmployees = employees.filter(emp => {
    // Check if already assigned today
    if (assignments.some(a => a.employeeId === emp.id && a.date === date)) return false;

    // Check if excluded
    const isExcluded = overrides.some(o =>
      o.type === 'exclude' &&
      o.employeeId === emp.id &&
      (o.shiftType === 'any' || o.shiftType === shift.type)
    );
    if (isExcluded) return false;

    // Check availability
    const dayKey = shift.day as keyof typeof emp.availability;
    const dayAvail = emp.availability[dayKey];
    if (!dayAvail || !dayAvail.available) return false;

    // Check if shift type matches availability
    const shiftMatch = dayAvail.shifts.some(s =>
      s.type === 'any' || s.type === shift.type
    );

    return shiftMatch;
  });

  // Sort by priority (overrides first, then fewer hours/shifts)
  availableEmployees.sort((a, b) => {
    const aPriority = overrides.some(o => o.type === 'prioritize' && o.employeeId === a.id) ? 1 : 0;
    const bPriority = overrides.some(o => o.type === 'prioritize' && o.employeeId === b.id) ? 1 : 0;

    if (aPriority !== bPriority) return bPriority - aPriority;

    // Then by hours
    return (employeeHours[a.id] || 0) - (employeeHours[b.id] || 0);
  });

  // Assign needed staff
  const needed = shift.requiredStaff - currentAssignments.length;
  for (let i = 0; i < needed && i < availableEmployees.length; i++) {
    const emp = availableEmployees[i];

    // Check if forced assignment exists for someone else
    const forcedAssignments = overrides.filter(o =>
      o.type === 'assign' &&
      (o.shiftType === 'any' || o.shiftType === shift.type)
    );

    // If there are forced assignments, only pick those employees
    if (forcedAssignments.length > 0) {
      const isForced = forcedAssignments.some(o => o.employeeId === emp.id);
      if (!isForced && currentAssignments.length + i < forcedAssignments.length) continue;
    }

    assignments.push({
      shiftId: shift.id,
      employeeId: emp.id,
      date,
      startTime: shift.startTime,
      endTime: shift.endTime
    });

    employeeHours[emp.id] = (employeeHours[emp.id] || 0) + shift.duration;
    employeeShiftCounts[emp.id] = (employeeShiftCounts[emp.id] || 0) + 1;
  }
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
