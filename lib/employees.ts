import { Employee } from './types';

// Bobola's Employee Data
export const employees: Employee[] = [
  {
    id: 'kim',
    name: 'Kim',
    bartendingScale: 5,
    aloneScale: 5,
    availability: {
      monday: null,
      tuesday: { available: false, shifts: [] },
      wednesday: {
        available: true,
        shifts: [{ type: 'night', startTime: '16:00' }],
        notes: 'After 4pm only'
      },
      thursday: { available: false, shifts: [] },
      friday: {
        available: true,
        shifts: [{ type: 'night', startTime: '16:00' }],
        notes: 'After 4pm only'
      },
      saturday: {
        available: true,
        shifts: [{ type: 'morning', startTime: '07:15', endTime: '15:00' }],
        notes: 'Open to 3pm only'
      },
      sunday: {
        available: true,
        shifts: [{ type: 'any' }],
        notes: 'Open to Close'
      },
    },
    exclusions: [],
    preferences: {
      canWorkAloneExtended: true,
    },
  },
  {
    id: 'krisann',
    name: 'Kris Ann',
    bartendingScale: 4,
    aloneScale: 4,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [{ type: 'morning', endTime: '15:00', flexible: true }],
        notes: 'Prefers Tuesday off - needs 1 weekday off'
      },
      wednesday: {
        available: true,
        shifts: [{ type: 'morning', endTime: '15:00' }]
      },
      thursday: {
        available: true,
        shifts: [{ type: 'morning', endTime: '15:00' }]
      },
      friday: {
        available: true,
        shifts: [{ type: 'morning', endTime: '15:00' }]
      },
      saturday: {
        available: true,
        shifts: [{ type: 'morning', endTime: '15:00' }]
      },
      sunday: {
        available: true,
        shifts: [{ type: 'morning', endTime: '15:00' }]
      },
    },
    exclusions: [],
    preferences: {
      prefersMorning: true,
      canWorkAloneExtended: true,
      canOpen: true,
      openDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
  },
  {
    id: 'ali',
    name: 'Ali',
    bartendingScale: 5,
    aloneScale: 5,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [{ type: 'morning', startTime: '09:00', endTime: '14:00' }]
      },
      wednesday: {
        available: true,
        shifts: [{ type: 'morning', startTime: '09:00', endTime: '14:00' }]
      },
      thursday: {
        available: true,
        shifts: [{ type: 'morning', startTime: '09:00', endTime: '14:00' }]
      },
      friday: {
        available: true,
        shifts: [
          { type: 'morning', startTime: '09:00', endTime: '14:00' },
          { type: 'night', flexible: true } // Can do nights if no other coverage
        ]
      },
      saturday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30', flexible: true }],
        notes: 'Rotating Saturday night'
      },
      sunday: {
        available: true,
        shifts: [{ type: 'any', startTime: '08:00' }],
        notes: '8am to Close'
      },
    },
    exclusions: [],
    preferences: {
      canWorkAloneExtended: true,
    },
  },
  {
    id: 'heidi',
    name: 'Heidi',
    bartendingScale: 3,
    aloneScale: 5,
    availability: {
      monday: null,
      tuesday: { available: false, shifts: [] },
      wednesday: { available: false, shifts: [] },
      thursday: { available: false, shifts: [] },
      friday: {
        available: true,
        shifts: [{ type: 'night', startTime: '16:30', flexible: true }],
        notes: 'Can give up Friday if needed'
      },
      saturday: { available: false, shifts: [] },
      sunday: { available: false, shifts: [] },
    },
    exclusions: [],
    preferences: {
      canWorkAloneExtended: true,
    },
  },
  {
    id: 'haley',
    name: 'Haley',
    bartendingScale: 5,
    aloneScale: 5,
    availability: {
      monday: null,
      tuesday: { available: false, shifts: [] },
      wednesday: { available: false, shifts: [] },
      thursday: { available: false, shifts: [] },
      friday: {
        available: true,
        shifts: [{ type: 'night', flexible: true }],
        notes: 'Only if needed'
      },
      saturday: { available: false, shifts: [] },
      sunday: { available: false, shifts: [] },
    },
    exclusions: [],
    preferences: {
      canWorkAloneExtended: true,
    },
  },
  {
    id: 'eva',
    name: 'Eva',
    bartendingScale: 2,
    aloneScale: 2,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' }
        ],
        notes: 'Can open on Tuesday'
      },
      wednesday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' }
        ],
        notes: 'Can open on Wednesday'
      },
      thursday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' }
        ]
      },
      friday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' }
        ]
      },
      saturday: {
        available: true,
        shifts: [{ type: 'night' }],
        notes: 'Can do Saturday nights'
      },
      sunday: { available: false, shifts: [] },
    },
    exclusions: [
      { startDate: '2026-01-19', endDate: '2026-12-31', reason: 'Unavailable after 1/19/2026' }
    ],
    preferences: {
      prefersMorning: true,
      prefersMid: true,
      needsBartenderOnShift: true,
      maxAloneMinutes: 60,
      canOpen: true,
      openDays: ['tuesday', 'wednesday'],
    },
  },
  {
    id: 'christian',
    name: 'Christian',
    bartendingScale: 0,
    aloneScale: 0,
    minShiftsPerWeek: 2,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30' }]
      },
      wednesday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30' }]
      },
      thursday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30' }]
      },
      friday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30' }]
      },
      saturday: {
        available: true,
        shifts: [
          { type: 'mid' },
          { type: 'night' }
        ]
      },
      sunday: { available: false, shifts: [], notes: 'No Sundays' },
    },
    exclusions: [
      { startDate: '2024-12-20', endDate: '2024-12-20', reason: 'Unavailable' }
    ],
    preferences: {
      prefersMid: true,
      prefersNight: true,
      needsBartenderOnShift: true,
    },
  },
  {
    id: 'lisa',
    name: 'Lisa',
    bartendingScale: 4,
    aloneScale: 4,
    availability: {
      monday: null,
      tuesday: { available: false, shifts: [] },
      wednesday: { available: false, shifts: [] },
      thursday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30' }]
      },
      friday: { available: false, shifts: [] },
      saturday: {
        available: true,
        shifts: [{ type: 'night', startTime: '15:30' }]
      },
      sunday: { available: false, shifts: [] },
    },
    exclusions: [],
    preferences: {
      canWorkAloneExtended: true,
    },
  },
  {
    id: 'kendall',
    name: 'Kendall',
    bartendingScale: 3,
    aloneScale: 3,
    minShiftsPerWeek: 3,
    availability: {
      monday: null,
      tuesday: { available: false, shifts: [], notes: 'No Tuesdays' },
      wednesday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' },
          { type: 'night' }
        ]
      },
      thursday: {
        available: true,
        shifts: [
          { type: 'morning', startTime: '11:00' },
          { type: 'mid' },
          { type: 'night' }
        ],
        notes: 'Only after 11am'
      },
      friday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' },
          { type: 'night' }
        ]
      },
      saturday: {
        available: true,
        shifts: [{ type: 'night', startTime: '14:00' }],
        notes: 'After 2pm only'
      },
      sunday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' }
        ]
      },
    },
    exclusions: [
      { startDate: '2024-12-16', endDate: '2024-12-16', reason: 'Unavailable' },
      { startDate: '2024-12-20', endDate: '2024-12-20', reason: 'Unavailable' },
      { startDate: '2024-12-26', endDate: '2024-12-26', reason: 'Unavailable' }
    ],
    preferences: {
      needsBartenderOnShift: true,
      maxAloneMinutes: 60,
    },
  },
  {
    id: 'kathy',
    name: 'Kathy',
    bartendingScale: 1,
    aloneScale: 1,
    minShiftsPerWeek: 3,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      wednesday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      thursday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      friday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      saturday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      sunday: { available: false, shifts: [], notes: 'No Sundays' },
    },
    exclusions: [
      { startDate: '2024-12-11', endDate: '2024-12-11', reason: 'Cannot work after 5pm' },
      { startDate: '2025-01-14', endDate: '2025-01-17', reason: 'Unavailable' }
    ],
    preferences: {
      needsBartenderOnShift: true,
    },
  },
  {
    id: 'bellas',
    name: 'Bella S',
    bartendingScale: 4,
    aloneScale: 4,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      wednesday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      thursday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      friday: {
        available: true,
        shifts: [
          { type: 'morning' },
          { type: 'mid' }
        ],
        notes: 'Morning or mid only on Friday'
      },
      saturday: { available: false, shifts: [], notes: 'No weekends' },
      sunday: { available: false, shifts: [], notes: 'No weekends' },
    },
    exclusions: [],
    preferences: {
      maxAloneMinutes: 60,
    },
  },
  {
    id: 'bellaq',
    name: 'Bella Q',
    bartendingScale: 4,
    aloneScale: 4,
    availability: {
      monday: null,
      tuesday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      wednesday: {
        available: false,
        shifts: [],
        notes: 'Only Tuesdays on weekdays after mid-January'
      },
      thursday: {
        available: false,
        shifts: [],
        notes: 'Only Tuesdays on weekdays after mid-January'
      },
      friday: {
        available: false,
        shifts: [],
        notes: 'Only Tuesdays on weekdays after mid-January'
      },
      saturday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
      sunday: {
        available: true,
        shifts: [{ type: 'any' }]
      },
    },
    exclusions: [
      { startDate: '2024-12-01', endDate: '2024-12-22', reason: 'Cannot work until after 12/23' },
      { startDate: '2024-12-13', endDate: '2024-12-22', reason: 'Vacation' }
    ],
    preferences: {
      canWorkAloneExtended: true,
    },
  },
];

export function getEmployeeById(id: string): Employee | undefined {
  return employees.find(e => e.id === id);
}

export function getEmployeesByMinBartending(minScale: number): Employee[] {
  return employees.filter(e => e.bartendingScale >= minScale);
}

export function getEmployeesByMinAlone(minScale: number): Employee[] {
  return employees.filter(e => e.aloneScale >= minScale);
}

export function canWorkAlone(employee: Employee): boolean {
  return employee.aloneScale >= 3;
}

export function isBartender(employee: Employee): boolean {
  return employee.bartendingScale >= 3;
}
