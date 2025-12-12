// Core types for Bobola's Scheduler

export interface Employee {
  id: string;
  name: string;
  // Optional contact number for SMS notifications.
  // Recommended format: E.164 (example: +15551234567)
  phoneNumber?: string;
  bartendingScale: number; // 0-5
  aloneScale: number; // 0-5
  // Optional role tags that can influence assignment priorities.
  // Example: ["bar"] will prioritize the employee for Bar-labeled slots and count them as bartender coverage.
  roleTags?: string[];
  availability: Availability;
  setSchedule?: {
    day: DayOfWeek;
    shiftType: 'morning' | 'night';
    startTime?: string;
    endTime?: string;
  }[];
  exclusions: Exclusion[];
  preferences: Preferences;
  minShiftsPerWeek?: number;
  restrictions?: EmployeeRestriction[]; // Time-based restrictions
  permanentRules?: PermanentRule[];      // Recurring fixed schedules (e.g., "only works Sat 9am-12pm")
  isActive?: boolean; // Default true, false = excluded from all scheduling
}

// Employee-specific scheduling restrictions
export interface EmployeeRestriction {
  id: string;
  type: 'no_before' | 'no_after' | 'unavailable_range';
  time?: string;           // For no_before: earliest they can start, no_after: latest they can work until
  startTime?: string;      // For unavailable_range
  endTime?: string;        // For unavailable_range
  days: DayOfWeek[];       // Which days this applies to (empty = all working days)
  reason?: string;         // e.g., "School pickup", "Second job"
}

// Permanent scheduling rules - recurring fixed shifts or constraints
export interface PermanentRule {
  id: string;
  type: 'fixed_shift' | 'only_available' | 'never_schedule';
  day: DayOfWeek;          // Single day (used for only_available, never_schedule)
  days?: DayOfWeek[];      // Multiple days (used for fixed_shift - select multiple days)
  startTime?: string;      // HH:MM format - required for fixed_shift and only_available
  endTime?: string;        // HH:MM format - required for fixed_shift and only_available
  reason?: string;         // e.g., "Second job", "School schedule", "Church"
  isActive: boolean;       // Can be toggled on/off without deleting
}

// Global scheduling constants
export const SCHEDULING_RULES = {
  SERVER_MIN_SHIFT_HOURS: 3,  // Servers MUST work minimum 3 hour shifts
} as const;

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
  // "bar" is a special availability bucket used to represent a Bar-labeled night shift starting at 4:00pm.
  // The scheduler treats this as night availability, but only for Bar-labeled slots.
  type: 'morning' | 'mid' | 'night' | 'bar' | 'any' | 'custom';
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
  type: 'morning' | 'night' | 'mid' | 'custom';
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // Hours
  requiredStaff: number;
  name?: string;
  requiresBartender?: boolean;
  // True if this shift contains any time segment where staffing template has only 1 person on the floor.
  // Used to ensure low solo-skill employees are not scheduled for solo coverage.
  requiresSolo?: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleAssignment {
  shiftId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // Specific start time for this assignment
  endTime?: string;   // Specific end time for this assignment
}

export interface WeeklySchedule {
  weekStart: Date;
  assignments: ScheduleAssignment[];
  conflicts: ScheduleConflict[];
  warnings: ScheduleWarning[];
}

export interface ScheduleConflict {
  type: 'no_coverage' | 'no_bartender' | 'employee_unavailable' | 'alone_constraint' | 'rule_violation';
  shiftId: string;
  date: string;
  message: string;
}

export interface ScheduleWarning {
  type: 'overtime' | 'under_hours' | 'preference_violated' | 'approaching_limit' | 'coverage_needed';
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

export interface BusinessHours {
  open: string;   // "07:15"
  close: string;  // "21:00"
  closed: boolean;
}

export type BusinessHoursByDay = Record<DayOfWeek, BusinessHours>;

export interface SchedulerOptions {
  // Optional business hours used to clamp staffing slots and auto-close days
  businessHours?: BusinessHoursByDay;

  // Thresholds and rules (defaults match Settings defaults if not supplied)
  overtimeThresholdHours?: number;
  minRestBetweenShiftsHours?: number;
  bartendingThreshold?: number;
  aloneThreshold?: number;
  minShiftHours?: number;
}

export interface StaffingSlot {
  id: string;
  startTime: string;  // "07:15"
  endTime: string;    // "14:00"
  label?: string;     // "Opener", "2nd Server", etc.
}

export interface DayStaffing {
  // New flexible system
  slots: StaffingSlot[];  // Variable # of time slots
  notes?: string;         // Free-form notes for scheduler

  // Legacy fields for backward compatibility (deprecated)
  morning?: number;
  night?: number;
  morningStart?: string;
  morningEnd?: string;
  nightStart?: string;
  nightEnd?: string;
}
