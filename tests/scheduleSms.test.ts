import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePhoneNumberToE164 } from '../lib/sms/phone';
import { buildScheduleSmsMessages } from '../lib/sms/scheduleSms';
import type { Availability, DayAvailability, Employee, WeeklySchedule, WeeklyStaffingNeeds } from '../lib/types';

function makeAvailability(dayUpdates: Partial<Omit<Availability, 'monday'>> = {}): Availability {
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
    phoneNumber: partial.phoneNumber,
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

test('normalizePhoneNumberToE164: formats common US inputs', () => {
  assert.equal(normalizePhoneNumberToE164('5551234567', 'US'), '+15551234567');
  assert.equal(normalizePhoneNumberToE164('(555) 123-4567', 'US'), '+15551234567');
  assert.equal(normalizePhoneNumberToE164('1 (555) 123-4567', 'US'), '+15551234567');
  assert.equal(normalizePhoneNumberToE164('+1 555 123 4567', 'US'), '+15551234567');
  assert.equal(normalizePhoneNumberToE164('not a phone', 'US'), null);
});

test('buildScheduleSmsMessages: builds one message per scheduled employee and skips missing phones', () => {
  const employees: Employee[] = [
    makeEmployee({ id: 'kim', name: 'Kim', phoneNumber: '555-111-2222' }),
    makeEmployee({ id: 'no', name: 'No Phone' }),
  ];

  const schedule: WeeklySchedule = {
    weekStart: new Date('2025-12-08T00:00:00'),
    assignments: [
      { employeeId: 'kim', date: '2025-12-09', shiftId: 'tue-1', startTime: '07:15', endTime: '14:00' },
      { employeeId: 'no', date: '2025-12-10', shiftId: 'wed-1', startTime: '16:00', endTime: '21:00' },
    ],
    conflicts: [],
    warnings: [],
  };

  const staffingNeeds: WeeklyStaffingNeeds = {
    tuesday: { slots: [{ id: 'tue-1', startTime: '07:15', endTime: '14:00', label: 'Opener' }], notes: '' },
    wednesday: { slots: [{ id: 'wed-1', startTime: '16:00', endTime: '21:00', label: 'Dinner' }], notes: '' },
    thursday: { slots: [], notes: '' },
    friday: { slots: [], notes: '' },
    saturday: { slots: [], notes: '' },
    sunday: { slots: [], notes: '' },
  };

  const result = buildScheduleSmsMessages({
    weekStart: new Date('2025-12-08T00:00:00'),
    schedule,
    employees,
    staffingNeeds,
    note: 'If you need a swap, request it in the app.',
    brandName: "Bobola's",
  });

  assert.equal(result.totalScheduledEmployees, 2);
  assert.equal(result.recipients.length, 1);
  assert.equal(result.missingPhoneEmployees.length, 1);
  assert.equal(result.missingPhoneEmployees[0].employeeId, 'no');

  const msg = result.recipients[0].message;
  assert.ok(msg.includes('Hi Kim.'), 'Expected greeting');
  assert.ok(msg.includes("Bobola's schedule for"), 'Expected header');
  assert.ok(msg.includes('Tue'), 'Expected shift day');
  assert.ok(msg.includes('7:15a-2p') || msg.includes('7:15a-2:00p'), 'Expected time range in compact format');
  assert.ok(msg.includes('Opener'), 'Expected slot label');
  assert.ok(msg.includes('If you need a swap'), 'Expected appended note');
});


