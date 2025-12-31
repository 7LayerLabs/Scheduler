
import { parseScheduleNotes } from './lib/parseNotes';
import { Employee, DayOfWeek } from './lib/types';

const mockDayAvailability = { available: true, shifts: [] };
const mockAvailability = {
    monday: mockDayAvailability,
    tuesday: mockDayAvailability,
    wednesday: mockDayAvailability,
    thursday: mockDayAvailability,
    friday: mockDayAvailability,
    saturday: mockDayAvailability,
    sunday: mockDayAvailability
};

const employees: any[] = [
    { id: '1', name: 'Krisann', bartendingScale: 5, aloneScale: 5, availability: mockAvailability, exclusions: [], preferences: { wanted: [], unwanted: [] }, minShiftsPerWeek: 0, isActive: true },
    { id: '2', name: 'Kendall', bartendingScale: 5, aloneScale: 5, availability: mockAvailability, exclusions: [], preferences: { wanted: [], unwanted: [] }, minShiftsPerWeek: 0, isActive: true },
];

const notes = `
Krisann opens Wed-Thur-Friday.
Kendall can't open.
`;

const overrides = parseScheduleNotes(notes, employees as Employee[]);
console.log(JSON.stringify(overrides, null, 2));
