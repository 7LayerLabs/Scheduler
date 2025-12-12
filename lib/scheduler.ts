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
  PermanentRule,
  SCHEDULING_RULES,
} from './types';


// Parse time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check if employee has a date-based exclusion for the given date
function checkExclusions(
  employee: Employee,
  dateStr: string
): { allowed: boolean; reason?: string } {
  if (!employee.exclusions || employee.exclusions.length === 0) {
    return { allowed: true };
  }

  const checkDate = new Date(dateStr);

  for (const exclusion of employee.exclusions) {
    const startDate = new Date(exclusion.startDate);
    const endDate = new Date(exclusion.endDate);

    // Check if the date falls within the exclusion range
    if (checkDate >= startDate && checkDate <= endDate) {
      return {
        allowed: false,
        reason: `${employee.name} is excluded on ${dateStr}${exclusion.reason ? ` (${exclusion.reason})` : ''}`
      };
    }
  }

  return { allowed: true };
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

  console.log(`Checking restrictions for ${employee.name} on ${day}, shift ${shiftStartTime}-${shiftEndTime}`);
  console.log(`  Restrictions:`, employee.restrictions);

  for (const restriction of employee.restrictions) {
    // Check if restriction applies to this day
    // If days array is empty, it applies to all working days
    if (restriction.days.length > 0 && !restriction.days.includes(day)) {
      console.log(`  Restriction ${restriction.type} skipped - doesn't apply to ${day}, only to:`, restriction.days);
      continue;
    }

    console.log(`  Checking restriction: ${restriction.type}, time: ${restriction.time}`);

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
          console.log(`  no_after check: shiftEnd=${shiftEnd} (${shiftEndTime}), latestEnd=${latestEnd} (${restriction.time})`);
          if (shiftEnd > latestEnd) {
            console.log(`  BLOCKED: ${employee.name} cannot work after ${restriction.time}`);
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

// Check if employee has a permanent rule that affects scheduling for a day/time
function checkPermanentRules(
  employee: Employee,
  day: DayOfWeek,
  shiftStartTime: string,
  shiftEndTime: string
): { allowed: boolean; fixedShift?: { startTime: string; endTime: string }; reason?: string } {
  if (!employee.permanentRules || employee.permanentRules.length === 0) {
    return { allowed: true };
  }

  const shiftStart = timeToMinutes(shiftStartTime);
  const shiftEnd = timeToMinutes(shiftEndTime);

  // Get active rules for this day
  // For fixed_shift rules, check the days array; for others, check the single day field
  const dayRules = employee.permanentRules.filter(r => {
    if (!r.isActive) return false;
    if (r.type === 'fixed_shift') {
      // Check days array for fixed_shift (supports multiple days)
      const ruleDays = r.days && r.days.length > 0 ? r.days : [r.day];
      return ruleDays.includes(day);
    }
    // For other types, check single day
    return r.day === day;
  });

  for (const rule of dayRules) {
    switch (rule.type) {
      case 'never_schedule':
        // Employee should never be scheduled on this day
        return {
          allowed: false,
          reason: `${employee.name} has "never schedule" rule for ${day}${rule.reason ? ` (${rule.reason})` : ''}`
        };

      case 'only_available':
        // Employee can ONLY work during this specific window
        if (rule.startTime && rule.endTime) {
          const ruleStart = timeToMinutes(rule.startTime);
          const ruleEnd = timeToMinutes(rule.endTime);

          // Shift must be entirely within the only_available window
          if (shiftStart < ruleStart || shiftEnd > ruleEnd) {
            return {
              allowed: false,
              reason: `${employee.name} is only available ${rule.startTime}-${rule.endTime} on ${day}${rule.reason ? ` (${rule.reason})` : ''}`
            };
          }
        }
        break;

      case 'fixed_shift':
        // Return the fixed shift time - scheduler should use this instead
        if (rule.startTime && rule.endTime) {
          return {
            allowed: true,
            fixedShift: { startTime: rule.startTime, endTime: rule.endTime }
          };
        }
        break;
    }
  }

  return { allowed: true };
}

// Get all fixed_shift permanent rules for an employee
function getFixedShiftRules(employee: Employee): PermanentRule[] {
  if (!employee.permanentRules) return [];
  return employee.permanentRules.filter(r => r.isActive && r.type === 'fixed_shift');
}

// Check if shift duration meets minimum for servers (non-bartenders)
function checkMinimumShiftDuration(
  employee: Employee,
  shiftStartTime: string,
  shiftEndTime: string
): { allowed: boolean; reason?: string } {
  // Only apply to servers (bartendingScale < 3)
  if (employee.bartendingScale >= 3) {
    return { allowed: true };
  }

  const startMins = timeToMinutes(shiftStartTime);
  const endMins = timeToMinutes(shiftEndTime);
  const durationHours = (endMins - startMins) / 60;

  if (durationHours < SCHEDULING_RULES.SERVER_MIN_SHIFT_HOURS) {
    return {
      allowed: false,
      reason: `${employee.name} (server) shift is ${durationHours.toFixed(1)} hours - minimum is ${SCHEDULING_RULES.SERVER_MIN_SHIFT_HOURS} hours`
    };
  }

  return { allowed: true };
}

// Check if employee is preferred for opening shifts (returns priority score, not a block)
function getOpenerPriority(
  employee: Employee,
  day: DayOfWeek,
  isOpenerShift: boolean
): number {
  // Not an opener shift - no priority adjustment
  if (!isOpenerShift) {
    return 0;
  }

  // Employee has canOpen and this day is in their openDays
  if (employee.preferences?.canOpen) {
    if (employee.preferences.openDays && employee.preferences.openDays.length > 0) {
      if (employee.preferences.openDays.includes(day)) {
        return 10; // High priority - explicitly can open this day
      }
      return 2; // Has canOpen but not for this specific day
    }
    return 10; // Has canOpen with no day restrictions
  }

  // No canOpen preference - lower priority but still allowed
  // Higher-rated employees (bartending/alone scale) get slight preference
  const skillScore = (employee.bartendingScale + employee.aloneScale) / 10;
  return skillScore;
}

// Determine if a shift is an opener shift based on time and label
function isOpenerShift(shiftStartTime: string, shiftLabel?: string): boolean {
  // Check label first
  if (shiftLabel && shiftLabel.toLowerCase().includes('open')) {
    return true;
  }

  // Check time - shifts starting before 8:00 AM are opener shifts
  const startMins = timeToMinutes(shiftStartTime);
  const eightAM = 8 * 60; // 480 minutes

  return startMins < eightAM;
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

  // Filter out inactive employees - they should not be scheduled
  // Use this filtered list for all scheduling operations
  const schedulableEmployees = employees.filter(e => e.isActive !== false);

  console.log('=== GENERATE SCHEDULE ===');
  console.log('Week start:', weekStart.toISOString());
  console.log('Total employees:', employees.length, 'Active (schedulable):', schedulableEmployees.length);
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

  // 1. Process overrides and set schedules to create initial assignments
  const assignments: ScheduleAssignment[] = [];
  const conflicts: ScheduleConflict[] = [];
  const warnings: ScheduleWarning[] = [];
  const employeeShifts: Record<string, number> = {};
  const employeeHours: Record<string, number> = {};

  // Initialize counts for schedulable employees only
  schedulableEmployees.forEach(emp => {
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

      // Check date-based exclusions for locked employee
      const lockedEmp = schedulableEmployees.find(e => e.id === lock.employeeId);
      if (lockedEmp) {
        const lockExclusionCheck = checkExclusions(lockedEmp, lockDateStr);
        if (!lockExclusionCheck.allowed) {
          console.log(`[LOCKED SHIFT BLOCKED] ${lockExclusionCheck.reason}`);
          warnings.push({
            type: 'coverage_needed',
            employeeId: lock.employeeId,
            message: `Locked shift removed: ${lockedEmp.name} is excluded on ${lockDateStr}`
          });
          return;
        }
      }

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
  // BUT: Skip closed days, respect early close times, AND check exclude overrides
  schedulableEmployees.forEach(emp => {
    if (emp.setSchedule) {
      emp.setSchedule.forEach(setShift => {
        // SKIP if this day is closed
        if (isDayClosed(setShift.day)) {
          console.log(`Skipping set schedule for ${emp.name} on ${setShift.day} - day is CLOSED`);
          return;
        }

        // CHECK FOR EXCLUDE OVERRIDE - week notes/rules take priority over set schedules
        const dayOverridesForSetSchedule = overrides.filter(o => o.day === setShift.day);
        const isExcludedByOverride = dayOverridesForSetSchedule.some(o =>
          o.type === 'exclude' &&
          o.employeeId === emp.id &&
          (o.shiftType === 'any' || o.shiftType === setShift.shiftType)
        );
        if (isExcludedByOverride) {
          console.log(`[SET SCHEDULE BLOCKED] ${emp.name} set schedule on ${setShift.day} BLOCKED by exclude override`);
          return;
        }

        // CHECK AVAILABILITY - employee must be available on this day
        const dayKey = setShift.day as keyof typeof emp.availability;
        const dayAvail = emp.availability[dayKey];
        if (!dayAvail || !dayAvail.available) {
          console.log(`[SET SCHEDULE BLOCKED] ${emp.name} set schedule on ${setShift.day} BLOCKED - not available`);
          return;
        }

        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(setShift.day);
        if (dayIndex === -1) return;

        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().split('T')[0];

        // CHECK DATE-BASED EXCLUSIONS - employee may have vacation/unavailable dates
        const exclusionCheck = checkExclusions(emp, dateStr);
        if (!exclusionCheck.allowed) {
          console.log(`[SET SCHEDULE BLOCKED] ${exclusionCheck.reason}`);
          return;
        }

        // Find matching shift definition to get duration/id
        const dayStaffing = staffingNeeds ? staffingNeeds[setShift.day as keyof WeeklyStaffingNeeds] : undefined;
        const shiftId = `${setShift.day}-${setShift.shiftType}`;

        // Create a synthetic shift object for the assignment
        const shiftStartTime = setShift.startTime || (setShift.shiftType === 'morning' ? dayStaffing?.morningStart : dayStaffing?.nightStart) || '09:00';
        let shiftEndTime = setShift.endTime || (setShift.shiftType === 'morning' ? dayStaffing?.morningEnd : dayStaffing?.nightEnd) || '17:00';

        // CHECK TIME RESTRICTIONS - employee may have no_before, no_after, unavailable_range
        const restrictionCheck = checkRestrictions(emp, setShift.day, shiftStartTime, shiftEndTime);
        if (!restrictionCheck.allowed) {
          console.log(`[SET SCHEDULE BLOCKED] ${restrictionCheck.reason}`);
          return;
        }

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

  // 1aa. Process Permanent Rules - Fixed Shifts (High Priority)
  // These are recurring fixed schedules like "Employee A only works Saturday 9am-12pm"
  // Now supports multiple days per rule
  // BUT: Week-level exclude overrides take priority over permanent rules
  schedulableEmployees.forEach(emp => {
    const fixedRules = getFixedShiftRules(emp);
    for (const rule of fixedRules) {
      // Get all days for this rule (use days array if available, otherwise fall back to single day)
      const ruleDays = rule.days && rule.days.length > 0 ? rule.days : [rule.day];

      for (const ruleDay of ruleDays) {
        // SKIP if this day is closed
        if (isDayClosed(ruleDay)) {
          console.log(`Skipping fixed rule for ${emp.name} on ${ruleDay} - day is CLOSED`);
          continue;
        }

        // CHECK FOR EXCLUDE OVERRIDE - week notes/rules take priority over permanent fixed shifts
        const dayOverridesForFixedRule = overrides.filter(o => o.day === ruleDay);
        const ruleStartHour = rule.startTime ? parseInt(rule.startTime.split(':')[0]) : 9;
        const ruleShiftType = ruleStartHour < 16 ? 'morning' : 'night';
        const isExcludedByOverride = dayOverridesForFixedRule.some(o =>
          o.type === 'exclude' &&
          o.employeeId === emp.id &&
          (o.shiftType === 'any' || o.shiftType === ruleShiftType)
        );
        if (isExcludedByOverride) {
          console.log(`[FIXED RULE BLOCKED] ${emp.name} fixed rule on ${ruleDay} BLOCKED by exclude override`);
          continue;
        }

        // CHECK AVAILABILITY - employee must be available on this day for fixed_shift rules to apply
        const dayKeyForFixed = ruleDay as keyof typeof emp.availability;
        const dayAvailForFixed = emp.availability[dayKeyForFixed];
        if (!dayAvailForFixed || !dayAvailForFixed.available) {
          console.log(`[FIXED RULE BLOCKED] ${emp.name} fixed rule on ${ruleDay} BLOCKED - not available`);
          continue;
        }

        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(ruleDay);
        if (dayIndex === -1) continue;

        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        const dateStr = date.toISOString().split('T')[0];

        // CHECK DATE-BASED EXCLUSIONS - employee may have vacation/unavailable dates
        const fixedRuleExclusionCheck = checkExclusions(emp, dateStr);
        if (!fixedRuleExclusionCheck.allowed) {
          console.log(`[FIXED RULE BLOCKED] ${fixedRuleExclusionCheck.reason}`);
          continue;
        }

        // Check if already assigned for this day
        const alreadyAssigned = assignments.some(a => a.employeeId === emp.id && a.date === dateStr);
        if (alreadyAssigned) {
          console.log(`Skipping fixed rule for ${emp.name} on ${ruleDay} - already assigned`);
          continue;
        }

        let shiftStartTime = rule.startTime || '09:00';
        let shiftEndTime = rule.endTime || '17:00';

        // Check early close and adjust
        const earlyClose = getEarlyCloseTime(ruleDay);
        if (earlyClose) {
          const earlyCloseMins = timeToMinutes(earlyClose);
          const startMins = timeToMinutes(shiftStartTime);
          const endMins = timeToMinutes(shiftEndTime);

          // Skip if shift starts after early close
          if (startMins >= earlyCloseMins) {
            console.log(`Skipping fixed rule for ${emp.name} - starts after early close (${earlyClose})`);
            continue;
          }

          // Truncate if ends after early close
          if (endMins > earlyCloseMins) {
            shiftEndTime = earlyClose;
            console.log(`Truncating fixed rule for ${emp.name} to end at ${earlyClose}`);
          }
        }

        // Determine shift type based on start time
        const startHour = parseInt(shiftStartTime.split(':')[0]);
        const shiftType = startHour < 12 ? 'morning' : startHour < 16 ? 'mid' : 'night';

        const shiftId = `${ruleDay}-fixed-${emp.id}`;
        const shift = {
          id: shiftId,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          duration: getShiftDuration(shiftStartTime, shiftEndTime),
        };

        console.log(`Adding fixed shift for ${emp.name} on ${ruleDay}: ${shiftStartTime}-${shiftEndTime}`);

        addAssignment({
          shiftId: shift.id,
          employeeId: emp.id,
          date: dateStr,
          startTime: shift.startTime,
          endTime: shift.endTime
        }, shift);
      }
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

    // Log ALL exclude overrides for debugging
    const excludeOverrides = dayOverrides.filter(o => o.type === 'exclude');
    if (excludeOverrides.length > 0) {
      console.log(`[EXCLUDE DEBUG] ${day} has ${excludeOverrides.length} exclude overrides:`, excludeOverrides.map(o => {
        const emp = schedulableEmployees.find(e => e.id === o.employeeId);
        return { employeeName: emp?.name || o.employeeId, shiftType: o.shiftType };
      }));
    }

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
          const slotStartTime = slot.startTime;

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
      const emp = schedulableEmployees.find(e => e.id === customTime.employeeId);
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
          schedulableEmployees,
          assignments,
          employeeHours,
          employeeShifts,
          dayOverrides
        );
      }
    }

    for (const shift of shifts) {
      assignShift(
        shift,
        dateStr,
        schedulableEmployees,
        assignments,
        employeeHours,
        employeeShifts,
        dayOverrides
      );

      // Check if shift was filled - add warning if not
      const shiftAssignments = assignments.filter(a => a.shiftId === shift.id && a.date === dateStr);
      if (shiftAssignments.length < shift.requiredStaff) {
        const missing = shift.requiredStaff - shiftAssignments.length;
        const dayDisplay = day.charAt(0).toUpperCase() + day.slice(1);
        const timeDisplay = `${formatTime12(shift.startTime)} - ${formatTime12(shift.endTime)}`;

        // Create a conflict for unfilled shifts
        conflicts.push({
          type: 'no_coverage',
          shiftId: shift.id,
          date: dateStr,
          message: `${dayDisplay}: ${shift.name || shift.type} (${timeDisplay}) - Need ${missing} more staff`
        });
      }
    }

  }

  // Helper function for 12-hour time format
  function formatTime12(time: string): string {
    if (!time) return '--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Check for employees not getting enough shifts
  for (const emp of schedulableEmployees) {
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
      const emp = schedulableEmployees.find(e => e.id === a.employeeId);
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

    // For each employee who needs bartender coverage, find coverage gaps
    // This includes:
    // 1. Employees with bartendingScale < 3
    // 2. Employees with needsBartenderOnShift preference
    for (const working of workingEmployees) {
      if (!working.employee) continue;

      // Check if this employee needs bartender coverage
      const needsCoverageCheck = (
        working.employee.bartendingScale < 3 ||
        working.employee.preferences?.needsBartenderOnShift === true
      );

      if (!needsCoverageCheck) continue;

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
        const availableBartenders = schedulableEmployees.filter(emp => {
          if (emp.bartendingScale < 3) return false;
          // Check if already working that day (could extend their shift but for now find new coverage)
          if (dateAssignments.some(a => a.employeeId === emp.id)) return false;
          // Check date-based exclusions (vacations, unavailable dates)
          const gapExclusionCheck = checkExclusions(emp, date);
          if (!gapExclusionCheck.allowed) {
            console.log(`[GAP FILL BLOCKED] ${gapExclusionCheck.reason}`);
            return false;
          }
          // Check availability for this day
          const dayAvail = emp.availability[day] as DayAvailability | null;
          if (!dayAvail || !dayAvail.available) return false;
          // Check for exclude overrides - week notes/rules take priority
          const dayOverridesForGap = overrides.filter(o => o.day === day);
          const isExcludedByOverride = dayOverridesForGap.some(o =>
            o.type === 'exclude' &&
            o.employeeId === emp.id &&
            (o.shiftType === 'any' || o.shiftType === 'night') // Gap filling is typically for night coverage
          );
          if (isExcludedByOverride) {
            console.log(`[GAP FILL BLOCKED] ${emp.name} blocked from gap fill on ${day} by exclude override`);
            return false;
          }
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

          // Format day name for display
          const dayDisplay = day.charAt(0).toUpperCase() + day.slice(1);
          warnings.push({
            type: 'coverage_needed',
            employeeId: needsCoverage.id,
            message: `${dayDisplay} (${date}): ${needsCoverage.name} (rating ${needsCoverage.bartendingScale}) gap ${gapStartTime}-${gapEndTime} filled by ${bartender.name} (rating ${bartender.bartendingScale})`
          });
        } else {
          // No available bartender for this gap - add conflict
          const dayDisplay = day.charAt(0).toUpperCase() + day.slice(1);
          conflicts.push({
            type: 'no_bartender',
            shiftId: working.assignment.shiftId,
            date,
            message: `${dayDisplay} (${date}): ${needsCoverage.name} (rating ${needsCoverage.bartendingScale}) has no 3+ star coverage from ${gapStartTime} to ${gapEndTime}`
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

    const emp = schedulableEmployees.find(e => e.id === override.employeeId);
    if (!emp) continue; // Skip if employee not found or inactive

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
        // Check if shift type matches based on actual start time (before 4pm = morning/lunch, 4pm+ = dinner)
        const hasMatchingShift = empAssignments.some(a => {
          const startHour = a.startTime ? parseInt(a.startTime.split(':')[0]) : 12;
          const assignmentType = startHour < 16 ? 'morning' : 'night';
          return override.shiftType === assignmentType;
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

// Helper to check if an employee is already assigned during a shift's time
// Returns true if the employee already has an overlapping assignment
function employeeAlreadyAssignedDuringShift(
  employeeId: string,
  date: string,
  shiftStart: string,
  shiftEnd: string,
  assignments: ScheduleAssignment[]
): boolean {
  const shiftStartMins = timeToMinutes(shiftStart);
  const shiftEndMins = timeToMinutes(shiftEnd);

  return assignments.some(a => {
    if (a.employeeId !== employeeId || a.date !== date) return false;
    if (!a.startTime || !a.endTime) return false;

    const assignedStart = timeToMinutes(a.startTime);
    const assignedEnd = timeToMinutes(a.endTime);

    // Check for any overlap
    return shiftStartMins < assignedEnd && shiftEndMins > assignedStart;
  });
}

// Helper to assign employees to a shift
function assignShift(
  shift: Shift,
  date: string,
  employees: Employee[],
  assignments: ScheduleAssignment[],
  employeeHours: Record<string, number>,
  employeeShiftCounts: Record<string, number>,
  overrides: ScheduleOverride[]
) {
  // Check if shift is already filled by shift ID
  const currentAssignments = assignments.filter(a => a.shiftId === shift.id && a.date === date);
  
  if (currentAssignments.length >= shift.requiredStaff) {
    return;
  }

  // FIRST: Process explicit "assign" overrides - these MUST be respected
  // They bypass normal availability checks but must match the day
  const forcedAssignments = overrides.filter(o =>
    (o.type === 'assign' || o.type === 'custom_time') &&
    o.day === shift.day &&
    (o.shiftType === 'any' || o.shiftType === shift.type)
  );

  for (const forced of forcedAssignments) {
    const emp = employees.find(e => e.id === forced.employeeId);
    if (!emp) continue;

    // Skip if already assigned today
    if (assignments.some(a => a.employeeId === emp.id && a.date === date)) continue;

    // Skip if excluded (exclude takes priority over assign) - must match day
    const isExcluded = overrides.some(o =>
      o.type === 'exclude' &&
      o.employeeId === emp.id &&
      o.day === shift.day &&
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
    // Check if already assigned to an OVERLAPPING shift today
    // (same employee can work multiple non-overlapping shifts in a day)
    if (employeeAlreadyAssignedDuringShift(emp.id, date, shift.startTime, shift.endTime, assignments)) {
      return false;
    }

    // Check date-based exclusions (vacations, unavailable dates)
    const exclusionCheck = checkExclusions(emp, date);
    if (!exclusionCheck.allowed) {
      console.log(`[DATE EXCLUSION] ${exclusionCheck.reason}`);
      return false;
    }

    // Check if excluded - must match employee, day, AND shift type
    const matchingExclude = overrides.find(o =>
      o.type === 'exclude' &&
      o.employeeId === emp.id &&
      o.day === shift.day &&
      (o.shiftType === 'any' || o.shiftType === shift.type)
    );
    if (matchingExclude) {
      console.log(`[EXCLUDE APPLIED] ${emp.name} excluded on ${shift.day} (shift type: ${shift.type}) by override:`, matchingExclude);
      return false;
    }

    // Also log when checking exclusion but NOT finding a match (for debugging)
    const anyExcludeForEmp = overrides.filter(o => o.type === 'exclude' && o.employeeId === emp.id);
    if (anyExcludeForEmp.length > 0) {
      console.log(`[EXCLUDE CHECK] ${emp.name} has ${anyExcludeForEmp.length} exclude rules but none match ${shift.day}/${shift.type}:`, anyExcludeForEmp);
    }

    // Check restrictions (no_before, no_after, unavailable_range)
    const restrictionCheck = checkRestrictions(emp, shift.day, shift.startTime, shift.endTime);
    if (!restrictionCheck.allowed) {
      console.log(`Restriction blocked: ${restrictionCheck.reason}`);
      return false;
    }

    // Check permanent rules (never_schedule, only_available)
    const permanentRuleCheck = checkPermanentRules(emp, shift.day, shift.startTime, shift.endTime);
    if (!permanentRuleCheck.allowed) {
      console.log(`Permanent rule blocked: ${permanentRuleCheck.reason}`);
      return false;
    }

    // Check minimum shift duration for servers
    const minDurationCheck = checkMinimumShiftDuration(emp, shift.startTime, shift.endTime);
    if (!minDurationCheck.allowed) {
      console.log(`Min duration blocked: ${minDurationCheck.reason}`);
      return false;
    }

    // Note: canOpen is handled as a PRIORITY in sorting, not a hard block
    // This allows anyone to open if needed, but prefers those with canOpen

    // Check availability
    const dayKey = shift.day as keyof typeof emp.availability;
    const dayAvail = emp.availability[dayKey];

    // Debug logging for availability issues
    if (emp.name.toLowerCase() === 'heidi' || emp.name.toLowerCase() === 'ali') {
      console.log(`[DEBUG] ${emp.name} availability check for ${shift.day}:`, {
        dayAvail: JSON.stringify(dayAvail),
        available: dayAvail?.available,
        shifts: dayAvail?.shifts
      });
    }

    if (!dayAvail || !dayAvail.available) {
      if (emp.name.toLowerCase() === 'heidi' || emp.name.toLowerCase() === 'ali') {
        console.log(`[DEBUG] ${emp.name} BLOCKED on ${shift.day} - not available`);
      }
      return false;
    }

    // Check if shift fits within employee's availability time window
    const shiftStartMins = timeToMinutes(shift.startTime);
    const shiftEndMins = timeToMinutes(shift.endTime);

    const shiftMatch = dayAvail.shifts.some(s => {
      // Check shift type matches
      if (s.type !== 'any' && s.type !== shift.type) return false;

      // Check time constraints if specified
      if (s.startTime) {
        const availStartMins = timeToMinutes(s.startTime);
        if (shiftStartMins < availStartMins) return false;
      }
      if (s.endTime) {
        const availEndMins = timeToMinutes(s.endTime);
        if (shiftEndMins > availEndMins) return false;
      }

      return true;
    });

    return shiftMatch;
  });

  // Sort by priority:
  // 1. Explicit prioritize overrides
  // 2. Opener preference (canOpen) for opening shifts
  // 3. Employees who need minimum shifts but are under quota
  // 4. Shift type preferences (morning/night)
  // 5. Fewer hours worked (balance workload)
  const isOpener = isOpenerShift(shift.startTime, shift.name);

  availableEmployees.sort((a, b) => {
    // 1. Explicit prioritize overrides (highest priority)
    const aPrioritize = overrides.some(o => o.type === 'prioritize' && o.employeeId === a.id) ? 1 : 0;
    const bPrioritize = overrides.some(o => o.type === 'prioritize' && o.employeeId === b.id) ? 1 : 0;
    if (aPrioritize !== bPrioritize) return bPrioritize - aPrioritize;

    // 2. Opener preference - prefer employees with canOpen for opening shifts
    if (isOpener) {
      const aOpenerPriority = getOpenerPriority(a, shift.day, true);
      const bOpenerPriority = getOpenerPriority(b, shift.day, true);
      if (aOpenerPriority !== bOpenerPriority) return bOpenerPriority - aOpenerPriority;
    }

    // 3. Employees who need minimum shifts and are under their quota
    const aMinShifts = a.minShiftsPerWeek || 0;
    const bMinShifts = b.minShiftsPerWeek || 0;
    const aCurrentShifts = employeeShiftCounts[a.id] || 0;
    const bCurrentShifts = employeeShiftCounts[b.id] || 0;
    const aUnderQuota = aMinShifts > 0 && aCurrentShifts < aMinShifts;
    const bUnderQuota = bMinShifts > 0 && bCurrentShifts < bMinShifts;

    if (aUnderQuota !== bUnderQuota) {
      return aUnderQuota ? -1 : 1; // Prioritize those under quota
    }

    // If both are under quota, prioritize the one further from their minimum
    if (aUnderQuota && bUnderQuota) {
      const aDeficit = aMinShifts - aCurrentShifts;
      const bDeficit = bMinShifts - bCurrentShifts;
      if (aDeficit !== bDeficit) return bDeficit - aDeficit;
    }

    // 4. Shift type preferences
    const shiftType = shift.type;
    const aPrefers = (
      (shiftType === 'morning' && a.preferences?.prefersMorning) ||
      (shiftType === 'mid' && a.preferences?.prefersMid) ||
      (shiftType === 'night' && a.preferences?.prefersNight)
    ) ? 1 : 0;
    const bPrefers = (
      (shiftType === 'morning' && b.preferences?.prefersMorning) ||
      (shiftType === 'mid' && b.preferences?.prefersMid) ||
      (shiftType === 'night' && b.preferences?.prefersNight)
    ) ? 1 : 0;

    if (aPrefers !== bPrefers) return bPrefers - aPrefers;

    // 5. Fewer hours worked (balance workload)
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
