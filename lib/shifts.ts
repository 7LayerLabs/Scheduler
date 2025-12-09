import { Shift, StaffingRequirement, DayOfWeek } from './types';

// Bobola's Shift Definitions
export const shifts: Shift[] = [
  // Tuesday - Thursday Shifts
  {
    id: 'tue-thu-early',
    day: 'tuesday',
    name: 'Early Open',
    startTime: '07:15',
    endTime: '12:00',
    type: 'morning',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'tue-thu-morning',
    day: 'tuesday',
    name: 'Full Morning',
    startTime: '07:15',
    endTime: '14:00',
    type: 'morning',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'tue-thu-mid',
    day: 'tuesday',
    name: 'Mid Shift',
    startTime: '10:00',
    endTime: '16:00',
    type: 'mid',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'tue-thu-lunch-mid',
    day: 'tuesday',
    name: 'Lunch Mid',
    startTime: '12:00',
    endTime: '16:00',
    type: 'mid',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'tue-thu-early-night',
    day: 'tuesday',
    name: 'Early Night',
    startTime: '15:00',
    endTime: '21:00',
    type: 'night',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'tue-thu-night',
    day: 'tuesday',
    name: 'Night',
    startTime: '16:00',
    endTime: '21:00',
    type: 'night',
    staffNeeded: 2,
    requiresBartender: true,
  },
  // Friday Shifts (busier dinner)
  {
    id: 'fri-early',
    day: 'friday',
    name: 'Early Open',
    startTime: '07:15',
    endTime: '12:00',
    type: 'morning',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'fri-morning',
    day: 'friday',
    name: 'Full Morning',
    startTime: '07:15',
    endTime: '14:00',
    type: 'morning',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'fri-mid',
    day: 'friday',
    name: 'Mid Shift',
    startTime: '10:00',
    endTime: '16:00',
    type: 'mid',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'fri-early-night',
    day: 'friday',
    name: 'Early Night',
    startTime: '15:00',
    endTime: '21:00',
    type: 'night',
    staffNeeded: 3, // Friday needs 3
    requiresBartender: true,
  },
  {
    id: 'fri-night',
    day: 'friday',
    name: 'Night',
    startTime: '16:00',
    endTime: '21:00',
    type: 'night',
    staffNeeded: 3, // Friday needs 3
    requiresBartender: true,
  },
  // Saturday Shifts
  {
    id: 'sat-early',
    day: 'saturday',
    name: 'Early Open',
    startTime: '07:15',
    endTime: '15:00',
    type: 'morning',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'sat-morning',
    day: 'saturday',
    name: 'Morning',
    startTime: '08:30',
    endTime: '15:00',
    type: 'morning',
    staffNeeded: 2,
    requiresBartender: true,
  },
  {
    id: 'sat-night',
    day: 'saturday',
    name: 'Night',
    startTime: '15:00',
    endTime: '21:00',
    type: 'night',
    staffNeeded: 3,
    requiresBartender: true,
  },
  // Sunday Shifts
  {
    id: 'sun-early',
    day: 'sunday',
    name: 'Early Open',
    startTime: '07:15',
    endTime: '14:30',
    type: 'morning',
    staffNeeded: 3,
    requiresBartender: true,
  },
  {
    id: 'sun-morning',
    day: 'sunday',
    name: 'Morning',
    startTime: '08:00',
    endTime: '14:30',
    type: 'morning',
    staffNeeded: 3,
    requiresBartender: true,
  },
  {
    id: 'sun-mid',
    day: 'sunday',
    name: 'Mid Morning',
    startTime: '08:30',
    endTime: '14:30',
    type: 'morning',
    staffNeeded: 3,
    requiresBartender: true,
  },
];

// Create shifts for all weekdays (Wed, Thu have same structure as Tue)
export function getShiftsForDay(day: DayOfWeek): Shift[] {
  if (day === 'monday') return [];

  if (day === 'wednesday' || day === 'thursday') {
    // Use Tuesday structure but with correct day
    return shifts
      .filter(s => s.day === 'tuesday')
      .map(s => ({
        ...s,
        id: s.id.replace('tue-thu', day.slice(0, 3)),
        day: day,
      }));
  }

  return shifts.filter(s => s.day === day);
}

// Staffing requirements by time block
export const staffingRequirements: StaffingRequirement[] = [
  // Tuesday - Thursday
  { day: 'tuesday', timeBlock: '07:15-12:00', minStaff: 2, requiresBartender: true },
  { day: 'tuesday', timeBlock: '11:00-14:00', minStaff: 2, requiresBartender: true },
  { day: 'tuesday', timeBlock: '16:00-21:00', minStaff: 2, requiresBartender: true },
  { day: 'wednesday', timeBlock: '07:15-12:00', minStaff: 2, requiresBartender: true },
  { day: 'wednesday', timeBlock: '11:00-14:00', minStaff: 2, requiresBartender: true },
  { day: 'wednesday', timeBlock: '16:00-21:00', minStaff: 2, requiresBartender: true },
  { day: 'thursday', timeBlock: '07:15-12:00', minStaff: 2, requiresBartender: true },
  { day: 'thursday', timeBlock: '11:00-14:00', minStaff: 2, requiresBartender: true },
  { day: 'thursday', timeBlock: '16:00-21:00', minStaff: 2, requiresBartender: true },
  // Friday
  { day: 'friday', timeBlock: '07:15-12:00', minStaff: 2, requiresBartender: true },
  { day: 'friday', timeBlock: '11:00-14:00', minStaff: 2, requiresBartender: true },
  { day: 'friday', timeBlock: '16:00-21:00', minStaff: 3, requiresBartender: true },
  // Saturday
  { day: 'saturday', timeBlock: '07:15-15:00', minStaff: 2, requiresBartender: true },
  { day: 'saturday', timeBlock: '15:00-21:00', minStaff: 3, requiresBartender: true },
  // Sunday
  { day: 'sunday', timeBlock: '07:15-14:30', minStaff: 3, requiresBartender: true },
];

export function getStaffingForDay(day: DayOfWeek): StaffingRequirement[] {
  return staffingRequirements.filter(r => r.day === day);
}
