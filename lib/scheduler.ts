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
  WeeklyStaffingNeeds,
  EmployeeRestriction
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

// Check if employee restrictions allow working a shift
function checkRestrictions(
  employee: Employee,
  day: DayOfWeek,
  shiftStartTime: string,
  shiftEndTime: string
): { allowed: boolean; reason?: string } {
  if (!employee.restrictions || employee.restrictions.length === 0) {
    return { allowed: true };
  }

  const shiftStart = timeToMinutes(shiftStartTime);
  const shiftEnd = timeToMinutes(shiftEndTime);

  for (const restriction of employee.restrictions) {
    // Check if restriction applies to this day
    // If days array is empty, it applies to all working days
    if (restriction.days.length > 0 && !restriction.days.includes(day)) {
      continue;
    }

    switch (restriction.type) {
      case 'no_before':
        // Employee cannot start work before this time
        if (restriction.time) {
          const earliestStart = timeToMinutes(restriction.time);
          if (shiftStart < earliestStart) {
            return {
              allowed: false,
              reason: `${employee.name} cannot work before ${restriction.time}${restriction.reason ? ` (${restriction.reason})` : ''}`
            };
          }
        }
        break;

      case 'no_after':
        // Employee must finish work by this time
        if (restriction.time) {
          const latestEnd = timeToMinutes(restriction.time);
          if (shiftEnd > latestEnd) {
            return {
              allowed: false,
              reason: `${employee.name} cannot work after ${restriction.time}${restriction.reason ? ` (${restriction.reason})` : ''}`
            };
          }
        }
        break;

      case 'unavailable_range':
        // Employee is unavailable during this time range
        if (restriction.startTime && restriction.endTime) {
          const unavailStart = timeToMinutes(restriction.startTime);
          const unavailEnd = timeToMinutes(restriction.endTime);
          // Check if shift overlaps with unavailable range
          if (shiftStart < unavailEnd && shiftEnd > unavailStart) {
            return {
              allowed: false,
              reason: `${employee.name} is unavailable ${restriction.startTime}-${restriction.endTime}${restriction.reason ? ` (${restriction.reason})` : ''}`
            };
          }
        }
        break;
    }
  }

  return { allowed: true };
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

  console.log('=== GENERATE SCHEDULE ===');
  console.log('Week start:', weekStart.toISOString());
  console.log('Total overrides received:', overrides.length);
  console.log('Override details:', overrides.map(o => ({
    employeeId: o.employeeId,
    day: o.day,
    type: o.type,
    customEndTime: o.customEndTime
  })));

  // PRE-COMPUTE: Identify closed days and early close times FIRST
  // This needs to happen before ANY shift creation
  const closedDays: Set<DayOfWeek> = new Set();
  const earlyCloseTimes: Map<DayOfWeek, string> = new Map();

  for (const override of overrides) {
    if (override.employeeId === '__ALL__' && override.type === 'exclude') {
      closedDays.add(override.day);
      console.log(`Day ${override.day} marked as CLOSED`);
    }
    if (override.employeeId === '__CLOSE_EARLY__' && override.customEndTime) {
      earlyCloseTimes.set(override.day, override.customEndTime);
      console.log(`Day ${override.day} early close at ${override.customEndTime}`);
    }
  }

  // Helper to check if a day is closed
  const isDayClosed = (day: DayOfWeek): boolean => closedDays.has(day);

  // Helper to get early close time for a day (returns null if no early close)
  const getEarlyCloseTime = (day: DayOfWeek): string | null => earlyCloseTimes.get(day) || null;

  // Helper to get day from date string
  const getDayFromDate = (dateStr: string): DayOfWeek => {
    const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
    const dayIndex = date.getDay();
    const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  };

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
  // BUT: Skip if the day is closed!
  if (lockedShifts && existingAssignments) {
    const dayOffsets: Record<DayOfWeek, number> = {
      monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6
    };

    lockedShifts.forEach(lock => {
      // SKIP if this day is closed
      if (isDayClosed(lock.day)) {
        console.log(`Skipping locked shift for ${lock.day} - day is CLOSED`);
        return;
      }

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
        // Check early close - skip shifts that start after early close
        const earlyClose = getEarlyCloseTime(lock.day);
        if (earlyClose && existingAssignment.startTime) {
          if (timeToMinutes(existingAssignment.startTime) >= timeToMinutes(earlyClose)) {
            console.log(`Skipping locked shift - starts after early close (${earlyClose})`);
            return;
          }
        }

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
  // BUT: Skip closed days and respect early close times
  employees.forEach(emp => {
    if (emp.setSchedule) {
      emp.setSchedule.forEach(setShift => {
        // SKIP if this day is closed
        if (isDayClosed(setShift.day)) {
          console.log(`Skipping set schedule for ${emp.name} on ${setShift.day} - day is CLOSED`);
          return;
        }

        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(setShift.day);
        if (dayIndex === -1) return;

        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().split('T')[0];

        // Find matching shift definition to get duration/id
        const dayStaffing = staffingNeeds ? staffingNeeds[setShift.day as keyof WeeklyStaffingNeeds] : undefined;
        const shiftId = `${setShift.day}-${setShift.shiftType}`;

        // Create a synthetic shift object for the assignment
        let shiftStartTime = setShift.startTime || (setShift.shiftType === 'morning' ? dayStaffing?.morningStart : dayStaffing?.nightStart) || '09:00';
        let shiftEndTime = setShift.endTime || (setShift.shiftType === 'morning' ? dayStaffing?.morningEnd : dayStaffing?.nightEnd) || '17:00';

        // Check early close and adjust
        const earlyClose = getEarlyCloseTime(setShift.day);
        if (earlyClose) {
          const earlyCloseMins = timeToMinutes(earlyClose);
          const startMins = timeToMinutes(shiftStartTime);
          const endMins = timeToMinutes(shiftEndTime);

          // Skip shifts that start after early close
          if (startMins >= earlyCloseMins) {
            console.log(`Skipping set schedule for ${emp.name} - starts after early close (${earlyClose})`);
            return;
          }

          // Truncate shifts that end after early close
          if (endMins > earlyCloseMins) {
            shiftEndTime = earlyClose;
            console.log(`Truncating set schedule for ${emp.name} to end at ${earlyClose}`);
          }
        }

        const shift: { id: string; startTime: string; endTime: string; duration: number; } = {
          id: shiftId,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          duration: 8,
        };

        // Calculate duration if times are present
        if (shift.startTime && shift.endTime) {
          shift.duration = getShiftDuration(shift.startTime, shift.endTime);
        }

        addAssignment({
          shiftId: shift.id,
          employeeId: emp.id,
          date: dateStr,
          startTime: shift.startTime,
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

    console.log(`Processing ${day} (${dateStr}):`, {
      totalOverrides: overrides.length,
      dayOverrides: dayOverrides.length,
      dayOverrideDetails: dayOverrides
    });

    // Check for business-wide rules first
    const isClosed = dayOverrides.some(o => o.employeeId === '__ALL__' && o.type === 'exclude');
    console.log(`${day} isClosed:`, isClosed);
    if (isClosed) {
      // Skip this day entirely - business is closed
      warnings.push({
        type: 'coverage_needed',
        message: `${day.charAt(0).toUpperCase() + day.slice(1)} - CLOSED`
      });
      continue;
    }

    // Check for early close
    const earlyClose = dayOverrides.find(o => o.employeeId === '__CLOSE_EARLY__');
    const earlyCloseTime = earlyClose?.customEndTime;
    console.log(`${day} earlyClose:`, earlyCloseTime);

    // Get shifts for this day based on staffing needs (new slots format)
    const shifts: Shift[] = [];
    if (staffingNeeds) {
      const needs = staffingNeeds[day as keyof WeeklyStaffingNeeds];
      if (needs && needs.slots && needs.slots.length > 0) {
        // Use the new slots array
        for (const slot of needs.slots) {
          let slotEndTime = slot.endTime;
          let slotStartTime = slot.startTime;

          // Apply early close time if set
          if (earlyCloseTime) {
            const earlyCloseMins = timeToMinutes(earlyCloseTime);
            const slotStartMins = timeToMinutes(slot.startTime);
            const slotEndMins = timeToMinutes(slot.endTime);

            // Skip shifts that start after early close
            if (slotStartMins >= earlyCloseMins) {
              continue;
            }

            // Truncate shifts that end after early close
            if (slotEndMins > earlyCloseMins) {
              slotEndTime = earlyCloseTime;
            }
          }

          const startHour = parseInt(slotStartTime.split(':')[0]);
          let shiftType: 'morning' | 'mid' | 'night' = 'mid';
          if (startHour < 12) shiftType = 'morning';
          else if (startHour >= 15) shiftType = 'night';

          shifts.push({
            id: slot.id || `${day}-${slotStartTime}`,
            day,
            type: shiftType,
            startTime: slotStartTime,
            endTime: slotEndTime,
            duration: getShiftDuration(slotStartTime, slotEndTime),
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

    // Handle custom time assignments - these modify existing shifts or create coverage
    const customTimeOverrides = dayOverrides.filter(o => o.type === 'custom_time');
    for (const customTime of customTimeOverrides) {
      const emp = employees.find(e => e.id === customTime.employeeId);
      if (!emp) continue;

      // Find the shift slot this employee would normally fill
      // If they're leaving early, we need to create coverage for the remaining time
      const hasEarlyEnd = customTime.customEndTime && !customTime.customStartTime;
      const hasLateStart = customTime.customStartTime && !customTime.customEndTime;

      if (hasEarlyEnd) {
        // Employee leaves early - find the matching shift and create coverage
        const matchingShift = shifts.find(s => {
          const shiftStart = timeToMinutes(s.startTime);
          const earlyEnd = timeToMinutes(customTime.customEndTime!);
          // This shift starts before the employee leaves
          return shiftStart < earlyEnd;
        });

        if (matchingShift) {
          // Assign employee to partial shift (start to their early leave time)
          const partialShiftId = `${matchingShift.id}-partial-${emp.id}`;
          const partialAssignment: ScheduleAssignment = {
            shiftId: partialShiftId,
            employeeId: emp.id,
            date: dateStr,
            startTime: matchingShift.startTime,
            endTime: customTime.customEndTime!
          };

          // Check if not already assigned
          const alreadyAssigned = assignments.some(a =>
            a.employeeId === emp.id && a.date === dateStr
          );

          if (!alreadyAssigned) {
            assignments.push(partialAssignment);
            const partialDuration = getShiftDuration(matchingShift.startTime, customTime.customEndTime!);
            employeeHours[emp.id] = (employeeHours[emp.id] || 0) + partialDuration;
            employeeShifts[emp.id] = (employeeShifts[emp.id] || 0) + 1;

            // Create a coverage shift for the remaining time
            const coverageShiftId = `${matchingShift.id}-coverage-${customTime.id}`;
            const coverageShift: Shift = {
              id: coverageShiftId,
              day,
              type: matchingShift.type,
              startTime: customTime.customEndTime!,
              endTime: matchingShift.endTime,
              duration: getShiftDuration(customTime.customEndTime!, matchingShift.endTime),
              requiredStaff: 1,
              name: `Coverage (${emp.name} leaves at ${customTime.customEndTime})`,
              requiresBartender: matchingShift.requiresBartender
            };

            // Add coverage shift to be filled
            shifts.push(coverageShift);

            // Add a warning about the coverage need
            warnings.push({
              type: 'coverage_needed',
              employeeId: emp.id,
              message: `${emp.name} leaves at ${customTime.customEndTime} on ${day} - coverage shift created`
            });
          }
        }
      } else if (hasLateStart) {
        // Employee starts late - find the matching shift and create coverage
        const matchingShift = shifts.find(s => {
          const shiftEnd = timeToMinutes(s.endTime);
          const lateStart = timeToMinutes(customTime.customStartTime!);
          // This shift ends after the employee starts
          return shiftEnd > lateStart;
        });

        if (matchingShift) {
          // Create coverage for the early part of the shift
          const coverageShiftId = `${matchingShift.id}-early-coverage-${customTime.id}`;
          const coverageShift: Shift = {
            id: coverageShiftId,
            day,
            type: matchingShift.type,
            startTime: matchingShift.startTime,
            endTime: customTime.customStartTime!,
            duration: getShiftDuration(matchingShift.startTime, customTime.customStartTime!),
            requiredStaff: 1,
            name: `Coverage (before ${emp.name} at ${customTime.customStartTime})`,
            requiresBartender: matchingShift.requiresBartender
          };

          // Add coverage shift to be filled first
          shifts.unshift(coverageShift);

          // Assign employee to their late-start shift
          const partialShiftId = `${matchingShift.id}-partial-${emp.id}`;
          const partialAssignment: ScheduleAssignment = {
            shiftId: partialShiftId,
            employeeId: emp.id,
            date: dateStr,
            startTime: customTime.customStartTime!,
            endTime: matchingShift.endTime
          };

          const alreadyAssigned = assignments.some(a =>
            a.employeeId === emp.id && a.date === dateStr
          );

          if (!alreadyAssigned) {
            assignments.push(partialAssignment);
            const partialDuration = getShiftDuration(customTime.customStartTime!, matchingShift.endTime);
            employeeHours[emp.id] = (employeeHours[emp.id] || 0) + partialDuration;
            employeeShifts[emp.id] = (employeeShifts[emp.id] || 0) + 1;

            warnings.push({
              type: 'coverage_needed',
              employeeId: emp.id,
              message: `${emp.name} starts at ${customTime.customStartTime} on ${day} - coverage shift created`
            });
          }
        }
      } else {
        // Full custom time range - create a standalone custom shift
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

  // BARTENDING CONSTRAINT: Employees with bartendingScale < 3 need FULL coverage by someone with bartendingScale >= 3
  // This detects partial gaps and auto-fills them with available bartenders

  // Helper to convert minutes back to time string (12-hour format)
  const minutesToTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // Group assignments by date to check for overlapping shifts
  const assignmentsByDate: Record<string, ScheduleAssignment[]> = {};
  for (const assignment of assignments) {
    if (!assignmentsByDate[assignment.date]) {
      assignmentsByDate[assignment.date] = [];
    }
    assignmentsByDate[assignment.date].push(assignment);
  }

  // Check each date for bartending constraints
  for (const date of Object.keys(assignmentsByDate)) {
    const dateAssignments = assignmentsByDate[date];
    const day = dateAssignments[0]?.shiftId.split('-')[0] as DayOfWeek || 'tuesday';

    // Find all employees working this day with their time ranges
    const workingEmployees = dateAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return {
        assignment: a,
        employee: emp,
        startMinutes: a.startTime ? timeToMinutes(a.startTime) : 0,
        endMinutes: a.endTime ? timeToMinutes(a.endTime) : 1440
      };
    }).filter(w => w.employee);

    // Get all 3+ star bartenders working this day
    const bartendersWorking = workingEmployees.filter(w =>
      w.employee && w.employee.bartendingScale >= 3
    );

    // For each low-rated employee (bartendingScale < 3), find coverage gaps
    for (const working of workingEmployees) {
      if (!working.employee || working.employee.bartendingScale >= 3) continue;

      const needsCoverage = working.employee;
      const shiftStart = working.startMinutes;
      const shiftEnd = working.endMinutes;

      // Build a list of covered time ranges from 3+ star bartenders
      const coveredRanges: { start: number; end: number }[] = [];
      for (const bartender of bartendersWorking) {
        // Check overlap with this employee's shift
        const overlapStart = Math.max(shiftStart, bartender.startMinutes);
        const overlapEnd = Math.min(shiftEnd, bartender.endMinutes);
        if (overlapStart < overlapEnd) {
          coveredRanges.push({ start: overlapStart, end: overlapEnd });
        }
      }

      // Merge overlapping covered ranges
      coveredRanges.sort((a, b) => a.start - b.start);
      const mergedCovered: { start: number; end: number }[] = [];
      for (const range of coveredRanges) {
        if (mergedCovered.length === 0 || mergedCovered[mergedCovered.length - 1].end < range.start) {
          mergedCovered.push({ ...range });
        } else {
          mergedCovered[mergedCovered.length - 1].end = Math.max(mergedCovered[mergedCovered.length - 1].end, range.end);
        }
      }

      // Find gaps in coverage
      const gaps: { start: number; end: number }[] = [];
      let currentPos = shiftStart;
      for (const covered of mergedCovered) {
        if (covered.start > currentPos) {
          gaps.push({ start: currentPos, end: covered.start });
        }
        currentPos = Math.max(currentPos, covered.end);
      }
      if (currentPos < shiftEnd) {
        gaps.push({ start: currentPos, end: shiftEnd });
      }

      // For each gap, try to find an available bartender to fill it
      for (const gap of gaps) {
        const gapStartTime = minutesToTime(gap.start);
        const gapEndTime = minutesToTime(gap.end);
        const gapDuration = (gap.end - gap.start) / 60;

        // Find available bartenders (3+ rating) who aren't already scheduled that day
        const availableBartenders = employees.filter(emp => {
          if (emp.bartendingScale < 3) return false;
          // Check if already working that day (could extend their shift but for now find new coverage)
          if (dateAssignments.some(a => a.employeeId === emp.id)) return false;
          // Check availability for this day
          const dayAvail = emp.availability[day] as DayAvailability | null;
          if (!dayAvail || !dayAvail.available) return false;
          return true;
        });

        if (availableBartenders.length > 0) {
          // Add the first available bartender to cover the gap
          const bartender = availableBartenders[0];
          const coverageAssignment: ScheduleAssignment = {
            shiftId: `${day}-bartender-gap-${needsCoverage.id}-${gap.start}`,
            employeeId: bartender.id,
            date,
            startTime: gapStartTime,
            endTime: gapEndTime
          };

          assignments.push(coverageAssignment);
          // Also add to dateAssignments so we don't double-assign this bartender for multiple gaps
          dateAssignments.push(coverageAssignment);

          // Update hours tracking
          employeeHours[bartender.id] = (employeeHours[bartender.id] || 0) + gapDuration;
          employeeShifts[bartender.id] = (employeeShifts[bartender.id] || 0) + 1;

          warnings.push({
            type: 'coverage_needed',
            employeeId: needsCoverage.id,
            message: `${needsCoverage.name} (rating ${needsCoverage.bartendingScale}) gap ${gapStartTime}-${gapEndTime} filled by ${bartender.name} (rating ${bartender.bartendingScale})`
          });
        } else {
          // No available bartender for this gap - add conflict
          conflicts.push({
            type: 'no_bartender',
            shiftId: working.assignment.shiftId,
            date,
            message: `${needsCoverage.name} (rating ${needsCoverage.bartendingScale}) has no 3+ star coverage from ${gapStartTime} to ${gapEndTime}`
          });
        }
      }
    }
  }

  // FINAL SAFETY NET: Filter out any assignments on closed days and truncate early close
  // This catches anything that might have slipped through from other code paths
  const dayOffsets: Record<DayOfWeek, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6
  };

  // Build a map of date string to day of week
  const dateToDayMap: Map<string, DayOfWeek> = new Map();
  for (const [day, offset] of Object.entries(dayOffsets)) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    dateToDayMap.set(d.toISOString().split('T')[0], day as DayOfWeek);
  }

  // Filter assignments - remove closed days, truncate early close
  const filteredAssignments: ScheduleAssignment[] = [];
  for (const assignment of assignments) {
    const day = dateToDayMap.get(assignment.date);
    if (!day) {
      filteredAssignments.push(assignment);
      continue;
    }

    // Remove assignments on closed days
    if (closedDays.has(day)) {
      console.log(`FILTERED OUT: Assignment on ${day} (${assignment.date}) - day is CLOSED`);
      continue;
    }

    // Truncate assignments that extend past early close
    const earlyClose = earlyCloseTimes.get(day);
    if (earlyClose && assignment.startTime && assignment.endTime) {
      const earlyCloseMins = timeToMinutes(earlyClose);
      const startMins = timeToMinutes(assignment.startTime);
      const endMins = timeToMinutes(assignment.endTime);

      // Skip shifts that start after early close
      if (startMins >= earlyCloseMins) {
        console.log(`FILTERED OUT: Assignment starting at ${assignment.startTime} on ${day} - after early close (${earlyClose})`);
        continue;
      }

      // Truncate shifts that end after early close
      if (endMins > earlyCloseMins) {
        console.log(`TRUNCATING: Assignment on ${day} from ${assignment.endTime} to ${earlyClose}`);
        assignment.endTime = earlyClose;
      }
    }

    filteredAssignments.push(assignment);
  }

  // Add warnings for closed days
  for (const day of closedDays) {
    warnings.push({
      type: 'coverage_needed',
      message: `${day.charAt(0).toUpperCase() + day.slice(1)} - CLOSED`
    });
  }

  // Add warnings for early close days
  for (const [day, closeTime] of earlyCloseTimes) {
    const closeTime12h = (() => {
      const [h, m] = closeTime.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return m === 0 ? `${h12} ${ampm}` : `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    })();
    warnings.push({
      type: 'coverage_needed',
      message: `${day.charAt(0).toUpperCase() + day.slice(1)} - Early close at ${closeTime12h}`
    });
  }

  console.log(`Final assignments: ${filteredAssignments.length} (filtered from ${assignments.length})`);

  // Verify that all overrides were respected (skip business-wide rules)
  for (const override of overrides) {
    // Skip business-wide rules
    if (override.employeeId === '__ALL__' || override.employeeId === '__CLOSE_EARLY__') continue;

    const emp = employees.find(e => e.id === override.employeeId);
    if (!emp) continue;

    const dayDate = getDateForDay(weekStart, override.day);
    const empAssignments = filteredAssignments.filter(a => a.employeeId === emp.id && a.date === dayDate);

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
      // Don't flag as violation if the day is closed
      if (closedDays.has(override.day)) continue;

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
    assignments: filteredAssignments,
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

  // FIRST: Process explicit "assign" overrides - these MUST be respected
  // They bypass normal availability checks
  const forcedAssignments = overrides.filter(o =>
    (o.type === 'assign' || o.type === 'custom_time') &&
    (o.shiftType === 'any' || o.shiftType === shift.type)
  );

  for (const forced of forcedAssignments) {
    const emp = employees.find(e => e.id === forced.employeeId);
    if (!emp) continue;

    // Skip if already assigned today
    if (assignments.some(a => a.employeeId === emp.id && a.date === date)) continue;

    // Skip if excluded (exclude takes priority over assign)
    const isExcluded = overrides.some(o =>
      o.type === 'exclude' &&
      o.employeeId === emp.id &&
      (o.shiftType === 'any' || o.shiftType === shift.type)
    );
    if (isExcluded) continue;

    // Check if this shift is already at capacity
    const currentCount = assignments.filter(a => a.shiftId === shift.id && a.date === date).length;
    if (currentCount >= shift.requiredStaff) break;

    // FORCE the assignment - bypass availability check
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

  // Check again if shift is now filled after forced assignments
  const updatedAssignments = assignments.filter(a => a.shiftId === shift.id && a.date === date);
  if (updatedAssignments.length >= shift.requiredStaff) return;

  // Get available employees for remaining slots (normal availability check)
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

    // Check restrictions (no_before, no_after, unavailable_range)
    const restrictionCheck = checkRestrictions(emp, shift.day, shift.startTime, shift.endTime);
    if (!restrictionCheck.allowed) {
      console.log(`Restriction blocked: ${restrictionCheck.reason}`);
      return false;
    }

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

  // Assign remaining needed staff from available employees
  // (Forced assignments were already processed above)
  const stillNeeded = shift.requiredStaff - updatedAssignments.length;
  for (let i = 0; i < stillNeeded && i < availableEmployees.length; i++) {
    const emp = availableEmployees[i];

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
