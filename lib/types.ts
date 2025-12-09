// Core types for Bobola's Scheduler

export interface Employee {
  id: string;
  name: string;
  bartendingScale: number; // 0-5
  aloneScale: number; // 0-5
  availability: Availability;
  exclusions: Exclusion[];
  preferences: Preferences;
  minShiftsPerWeek?: number;
}

export interface Availability {
  // Each day has available time slots
  monday: null; // Closed
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface DayAvailability {
  available: boolean;
  shifts: AvailableShift[];
  notes?: string;
}

export interface AvailableShift {
  type: 'morning' | 'mid' | 'night' | 'any' | 'custom';
  startTime?: string; // HH:MM format
  endTime?: string;
  flexible?: boolean; // Can give up this shift if needed
}

export interface Exclusion {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason?: string;
}

export interface Preferences {
  prefersMorning?: boolean;
  prefersMid?: boolean;
  prefersNight?: boolean;
  needsBartenderOnShift?: boolean; // Can't work alone without bartender
  canWorkAloneExtended?: boolean;
  maxAloneMinutes?: number; // How long they can be alone
  canOpen?: boolean;
  openDays?: string[]; // Which days they can open
}

export interface Shift {
  id: string;
  day: DayOfWeek;
  name: string;
  startTime: string;
  endTime: string;
  type: 'morning' | 'mid' | 'night';
  staffNeeded: number;
  requiresBartender: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleAssignment {
  shiftId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
}

export interface WeeklySchedule {
  weekStartDate: string; // YYYY-MM-DD (Monday)
  assignments: ScheduleAssignment[];
  conflicts: ScheduleConflict[];
  warnings: ScheduleWarning[];
}

export interface ScheduleConflict {
  type: 'no_coverage' | 'no_bartender' | 'employee_unavailable' | 'alone_constraint';
  shiftId: string;
  date: string;
  message: string;
}

export interface ScheduleWarning {
  type: 'overtime' | 'under_hours' | 'preference_violated' | 'approaching_limit';
  employeeId?: string;
  message: string;
}

export interface StaffingRequirement {
  day: DayOfWeek;
  timeBlock: string;
  minStaff: number;
  requiresBartender: boolean;
}

// Override types for manual schedule adjustments
export interface ScheduleOverride {
  id: string;
  type: 'assign' | 'exclude' | 'prioritize' | 'custom_time';
  employeeId: string;
  day: DayOfWeek;
  shiftType: 'morning' | 'night' | 'any';
  note?: string;
  // Custom time fields for specific shift times
  customStartTime?: string; // e.g., "10:00"
  customEndTime?: string;   // e.g., "13:00"
}

// Employee-level time constraints (stored in availability)
export interface TimeConstraint {
  type: 'earliest_start' | 'latest_end' | 'custom_range';
  time?: string;          // For earliest_start or latest_end
  startTime?: string;     // For custom_range
  endTime?: string;       // For custom_range
  days?: DayOfWeek[];     // Which days this applies to (empty = all days)
}

export interface ScheduleNotes {
  weekStartDate: string;
  freeformNotes: string;
  overrides: ScheduleOverride[];
}

// Locked shifts - these persist across regenerations
export interface LockedShift {
  employeeId: string;
  day: DayOfWeek;
  shiftType: 'morning' | 'night';
}

// Weekly staffing needs - how many staff needed per day/shift
export interface WeeklyStaffingNeeds {
  tuesday: DayStaffing;
  wednesday: DayStaffing;
  thursday: DayStaffing;
  friday: DayStaffing;
  saturday: DayStaffing;
  sunday: DayStaffing;
}

export interface DayStaffing {
  morning: number; // breakfast/lunch staff count
  night: number;   // dinner staff count
  morningStart?: string; // e.g., "07:15"
  morningEnd?: string;   // e.g., "15:00"
  nightStart?: string;   // e.g., "15:00"
  nightEnd?: string;     // e.g., "21:00"
}
