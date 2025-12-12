import test from 'node:test';
import assert from 'node:assert/strict';

import { generateSchedule } from '../lib/scheduler';
import { parseScheduleNotes } from '../lib/parseNotes';
import { getAllUniqueDefaultShiftTemplatesFromStaffingNeeds } from '../lib/manualShifts';
import type { Availability, DayAvailability, Employee, SchedulerOptions, WeeklyStaffingNeeds } from '../lib/types';

type AvailabilityUpdates = Partial<Omit<Availability, 'monday'>> & { monday?: null };

function makeAvailability(dayUpdates: AvailabilityUpdates = {}): Availability {
  const openDay: DayAvailability = { available: true, shifts: [{ type: 'any' }] };
  return {
    monday: null,
    tuesday: openDay,
    wednesday: openDay,
    thursday: openDay,
    friday: openDay,
    saturday: openDay,
    sunday: openDay,
    ...dayUpdates,
  };
}

function makeEmployee(partial: Partial<Employee> & Pick<Employee, 'id' | 'name'>): Employee {
  return {
    id: partial.id,
    name: partial.name,
    bartendingScale: partial.bartendingScale ?? 0,
    aloneScale: partial.aloneScale ?? 0,
    roleTags: partial.roleTags,
    availability: partial.availability ?? makeAvailability(),
    exclusions: partial.exclusions ?? [],
    preferences: partial.preferences ?? {},
    minShiftsPerWeek: partial.minShiftsPerWeek,
    restrictions: partial.restrictions,
    permanentRules: partial.permanentRules,
    setSchedule: partial.setSchedule,
    isActive: partial.isActive,
  };
}

function makeStaffingNeeds(overrides: Partial<WeeklyStaffingNeeds> = {}): WeeklyStaffingNeeds {
  const empty = { slots: [], notes: '' };
  return {
    tuesday: empty,
    wednesday: empty,
    thursday: empty,
    friday: empty,
    saturday: empty,
    sunday: empty,
    ...overrides,
  };
}

test('solo coverage: low solo rating is not assigned to a solo-time slot', () => {
  const employees: Employee[] = [
    makeEmployee({ id: 'low', name: 'Low Solo', aloneScale: 2 }),
    makeEmployee({ id: 'high', name: 'High Solo', aloneScale: 4 }),
  ];

  const staffingNeeds = makeStaffingNeeds({
    tuesday: {
      slots: [{ id: 'tue-1', startTime: '09:00', endTime: '17:00', label: 'Opener' }],
      notes: '',
    },
  });

  const options: SchedulerOptions = {
    aloneThreshold: 3,
    minRestBetweenShiftsHours: 0,
  };

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], employees, staffingNeeds, [], [], options);
  assert.equal(schedule.assignments.length, 1);
  assert.equal(schedule.assignments[0].employeeId, 'high');
});

test('min rest: employee is not scheduled with insufficient rest between days', () => {
  const empA = makeEmployee({ id: 'a', name: 'A', aloneScale: 5 });
  const empB = makeEmployee({ id: 'b', name: 'B', aloneScale: 5 });

  const staffingNeeds = makeStaffingNeeds({
    tuesday: {
      slots: [{ id: 'tue-late', startTime: '18:00', endTime: '23:30', label: 'Dinner' }],
      notes: '',
    },
    wednesday: {
      slots: [{ id: 'wed-early', startTime: '07:00', endTime: '14:00', label: 'Opener' }],
      notes: '',
    },
  });

  const options: SchedulerOptions = {
    minRestBetweenShiftsHours: 8,
    aloneThreshold: 1,
  };

  // Prefer A for Tuesday so we can validate rest logic for Wednesday
  const overrides = [
    { id: 'p-a', type: 'prioritize' as const, employeeId: 'a', day: 'tuesday' as const, shiftType: 'any' as const },
  ];

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), overrides, [empA, empB], staffingNeeds, [], [], options);

  const tue = schedule.assignments.find(a => a.shiftId === 'tue-late');
  const wed = schedule.assignments.find(a => a.shiftId === 'wed-early');
  assert.ok(tue, 'Expected Tuesday shift to be assigned');
  assert.ok(wed, 'Expected Wednesday shift to be assigned');
  assert.equal(tue.employeeId, 'a');
  assert.equal(wed.employeeId, 'b');
});

test('week notes override: forced assign can schedule even if employee is unavailable', () => {
  const unavailableFriday = makeAvailability({
    friday: { available: false, shifts: [] },
  });

  const employees: Employee[] = [
    makeEmployee({ id: 'x', name: 'X', availability: unavailableFriday }),
  ];

  const staffingNeeds = makeStaffingNeeds({
    friday: {
      slots: [{ id: 'fri-1', startTime: '09:00', endTime: '17:00', label: 'Opener' }],
      notes: '',
    },
  });

  const overrides = [
    { id: 'assign-x', type: 'assign' as const, employeeId: 'x', day: 'friday' as const, shiftType: 'any' as const },
  ];

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), overrides, employees, staffingNeeds);
  assert.equal(schedule.assignments.length, 1);
  assert.equal(schedule.assignments[0].employeeId, 'x');
});

test('week notes business rule: "Closed Thursday" creates a closure override without needing a date', () => {
  const overrides = parseScheduleNotes('Closed Thursday', [
    makeEmployee({ id: 'e1', name: 'Kim' }),
  ]);

  assert.ok(overrides.some(o => o.employeeId === '__ALL__' && o.type === 'exclude' && o.day === 'thursday'));
});

test('fixed shift should remove matching staffing slot (prevents dropping night slot)', () => {
  const fixedEmp: Employee = makeEmployee({
    id: 'fixed',
    name: 'Fixed Opener',
    permanentRules: [
      {
        id: 'r1',
        type: 'fixed_shift',
        day: 'saturday',
        days: ['saturday'],
        startTime: '07:15',
        endTime: '14:00',
        isActive: true,
      },
    ],
  });

  const nightEmp: Employee = makeEmployee({ id: 'night', name: 'Night Only' });

  const staffingNeeds = makeStaffingNeeds({
    saturday: {
      slots: [
        { id: 'sat-open', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'sat-night', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
      ],
      notes: '',
    },
  });

  const options: SchedulerOptions = {
    minRestBetweenShiftsHours: 0,
    aloneThreshold: 1,
  };

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [fixedEmp, nightEmp], staffingNeeds, [], [], options);

  assert.ok(
    schedule.assignments.some(a => a.employeeId === 'fixed' && a.shiftId.includes('-fixed-')),
    'Expected fixed shift assignment to exist'
  );
  assert.ok(
    !schedule.assignments.some(a => a.shiftId === 'sat-open'),
    'Expected opener slot to be removed because it is covered by a fixed shift'
  );
  assert.ok(schedule.assignments.some(a => a.shiftId === 'sat-night'), 'Expected night slot to still be created and assigned');
});

test('fixed shift attaches to Bar slot id when times match and employee is tagged bar', () => {
  const fixedBarEmp: Employee = makeEmployee({
    id: 'kim',
    name: 'Kim',
    bartendingScale: 5,
    roleTags: ['bar'],
    permanentRules: [
      {
        id: 'r1',
        type: 'fixed_shift',
        day: 'friday',
        days: ['friday'],
        startTime: '16:00',
        endTime: '21:00',
        isActive: true,
      },
    ],
  });

  const other: Employee = makeEmployee({ id: 'other', name: 'Other', bartendingScale: 5 });

  const staffingNeeds = makeStaffingNeeds({
    friday: {
      slots: [
        { id: 'fri-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
        { id: 'fri-dinner', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
      ],
      notes: '',
    },
  });

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [fixedBarEmp, other], staffingNeeds);

  const fixedAssignment = schedule.assignments.find(a => a.employeeId === 'kim' && a.date === '2025-12-12');
  assert.ok(fixedAssignment, 'Expected a fixed assignment for Kim on Friday');
  assert.ok((fixedAssignment.shiftId || '').startsWith('fri-bar'), 'Expected fixed shift id to attach to the Bar slot');
  assert.ok((fixedAssignment.shiftId || '').includes('-fixed-'), 'Expected fixed shift id to keep the fixed marker');
});

test('fixed shift attaches to Bar slot id when it overlaps and employee has Bar Shift availability', () => {
  const fixedBarEmp: Employee = makeEmployee({
    id: 'lisa',
    name: 'Lisa',
    availability: makeAvailability({
      thursday: { available: true, shifts: [{ type: 'bar', startTime: '16:00' }] },
    }),
    permanentRules: [
      {
        id: 'r1',
        type: 'fixed_shift',
        day: 'thursday',
        days: ['thursday'],
        startTime: '15:30',
        endTime: '21:00',
        isActive: true,
      },
    ],
    bartendingScale: 5,
  });

  const other: Employee = makeEmployee({ id: 'other', name: 'Other', bartendingScale: 5 });

  const staffingNeeds = makeStaffingNeeds({
    thursday: {
      slots: [
        { id: 'thu-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
        { id: 'thu-dinner', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
      ],
      notes: '',
    },
  });

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [fixedBarEmp, other], staffingNeeds);

  const fixedAssignment = schedule.assignments.find(a => a.employeeId === 'lisa' && a.date === '2025-12-11');
  assert.ok(fixedAssignment, 'Expected a fixed assignment for Lisa on Thursday');
  assert.ok((fixedAssignment.shiftId || '').startsWith('thu-bar'), 'Expected overlapping fixed shift id to attach to the Bar slot');
});

test('bar role tag is prioritized for Bar-labeled slot and counts as bartender qualified', () => {
  const barTagged: Employee = makeEmployee({
    id: 'kim',
    name: 'Kim',
    bartendingScale: 0, // Intentionally low, bar tag should still qualify
    roleTags: ['bar'],
  });

  const other: Employee = makeEmployee({
    id: 'lisa',
    name: 'Lisa',
    bartendingScale: 5,
  });

  const staffingNeeds = makeStaffingNeeds({
    friday: {
      slots: [
        { id: 'fri-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
        { id: 'fri-dinner', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
      ],
      notes: '',
    },
  });

  const options: SchedulerOptions = {
    bartendingThreshold: 3,
    minRestBetweenShiftsHours: 0,
    aloneThreshold: 1,
  };

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [barTagged, other], staffingNeeds, [], [], options);

  const barAssignment = schedule.assignments.find(a => a.shiftId === 'fri-bar');
  assert.ok(barAssignment, 'Expected Bar slot to be assigned');
  assert.equal(barAssignment.employeeId, 'kim', 'Expected bar-tagged employee to be assigned to Bar slot');
});

test('availability: Bar Shift only matches Bar-labeled 4pm slots, not Dinner slots', () => {
  const barOnly: Employee = makeEmployee({
    id: 'baronly',
    name: 'Bar Only',
    availability: makeAvailability({
      friday: { available: true, shifts: [{ type: 'bar', startTime: '16:00' }] },
    }),
    bartendingScale: 5,
  });

  const dinnerOnly: Employee = makeEmployee({
    id: 'dinner',
    name: 'Dinner Only',
    availability: makeAvailability({
      friday: { available: true, shifts: [{ type: 'night' }] },
    }),
    bartendingScale: 5,
  });

  const staffingNeeds = makeStaffingNeeds({
    friday: {
      slots: [
        { id: 'fri-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
        { id: 'fri-dinner', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
      ],
      notes: '',
    },
  });

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [barOnly, dinnerOnly], staffingNeeds);

  const barAssignment = schedule.assignments.find(a => a.shiftId === 'fri-bar');
  const dinnerAssignment = schedule.assignments.find(a => a.shiftId === 'fri-dinner');

  assert.ok(barAssignment, 'Expected Bar slot to be assigned');
  assert.ok(dinnerAssignment, 'Expected Dinner slot to be assigned');
  assert.equal(barAssignment.employeeId, 'baronly');
  assert.equal(dinnerAssignment.employeeId, 'dinner');
});

test('bar slot is assigned before dinner when template lists Dinner first (prevents bar person being consumed by dinner)', () => {
  const kim: Employee = makeEmployee({
    id: 'kim',
    name: 'Kim',
    roleTags: ['bar'],
    bartendingScale: 5,
    availability: makeAvailability({
      friday: { available: true, shifts: [{ type: 'night' }] },
    }),
  });

  const other: Employee = makeEmployee({
    id: 'other',
    name: 'Other',
    bartendingScale: 5,
    availability: makeAvailability({
      friday: { available: true, shifts: [{ type: 'night' }] },
    }),
  });

  const staffingNeeds = makeStaffingNeeds({
    friday: {
      // Dinner intentionally listed before Bar
      slots: [
        { id: 'fri-dinner', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
        { id: 'fri-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
      ],
      notes: '',
    },
  });

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [kim, other], staffingNeeds);
  const barAssignment = schedule.assignments.find(a => a.shiftId === 'fri-bar');
  assert.ok(barAssignment, 'Expected Bar slot to be assigned');
  assert.equal(barAssignment.employeeId, 'kim', 'Expected bar-tagged employee to land on Bar slot even when Dinner is listed first');
});

test('availability: Bar Shift does not treat Dinner as Bar just because slot id contains "bar"', () => {
  const barOnly: Employee = makeEmployee({
    id: 'baronly',
    name: 'Bar Only',
    availability: makeAvailability({
      friday: { available: true, shifts: [{ type: 'bar', startTime: '16:00' }] },
    }),
    bartendingScale: 5,
  });

  const dinnerOnly: Employee = makeEmployee({
    id: 'dinner',
    name: 'Dinner Only',
    availability: makeAvailability({
      friday: { available: true, shifts: [{ type: 'night' }] },
    }),
    bartendingScale: 5,
  });

  const staffingNeeds = makeStaffingNeeds({
    friday: {
      slots: [
        // Dinner slot id contains "bar" but label is Dinner
        { id: 'fri-bar', startTime: '16:00', endTime: '21:00', label: 'Dinner' },
        { id: 'fri-realbar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
      ],
      notes: '',
    },
  });

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [barOnly, dinnerOnly], staffingNeeds);

  const dinnerAssignment = schedule.assignments.find(a => a.shiftId === 'fri-bar');
  const barAssignment = schedule.assignments.find(a => a.shiftId === 'fri-realbar');

  assert.ok(dinnerAssignment, 'Expected Dinner slot to be assigned');
  assert.ok(barAssignment, 'Expected Bar slot to be assigned');
  assert.equal(dinnerAssignment.employeeId, 'dinner');
  assert.equal(barAssignment.employeeId, 'baronly');
});

test('label normalization dedupes default shift templates (case and synonyms)', () => {
  const overrides: Partial<WeeklyStaffingNeeds> = {
    tuesday: {
      slots: [
        { id: 'tue-1', startTime: '07:15', endTime: '14:00', label: 'opener' },
        { id: 'tue-2', startTime: '07:15', endTime: '14:00', label: 'Opener' },
      ],
      notes: '',
    },
  };

  const needs = makeStaffingNeeds(overrides);
  const templates = getAllUniqueDefaultShiftTemplatesFromStaffingNeeds(needs);
  assert.equal(templates.length, 1);
  assert.equal(templates[0].label, 'Opener');
});

test('bartender gap is not created during morning when Bar slot is only at night', () => {
  const low = makeEmployee({
    id: 'low',
    name: 'Low',
    bartendingScale: 1,
    aloneScale: 5,
  });

  const highNightOnly: Employee = makeEmployee({
    id: 'high',
    name: 'High',
    bartendingScale: 5,
    aloneScale: 5,
    availability: makeAvailability({
      tuesday: { available: true, shifts: [{ type: 'night' }] },
    }),
  });

  const staffingNeeds = makeStaffingNeeds({
    tuesday: {
      slots: [
        { id: 'tue-open', startTime: '07:15', endTime: '12:00', label: 'Opener' },
        { id: 'tue-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
      ],
      notes: '',
    },
  });

  const options: SchedulerOptions = {
    bartendingThreshold: 3,
    aloneThreshold: 1,
    minRestBetweenShiftsHours: 0,
  };

  const schedule = generateSchedule(new Date('2025-12-08T00:00:00'), [], [low, highNightOnly], staffingNeeds, [], [], options);
  assert.ok(schedule.assignments.some(a => a.shiftId === 'tue-open'));
  assert.ok(schedule.assignments.some(a => a.shiftId === 'tue-bar'));
  assert.equal(schedule.assignments.filter(a => a.shiftId.includes('bartender-gap')).length, 0);
});


