import type { WeeklyStaffingNeeds } from './types';

/**
 * Recommended baseline template based on your described weekday flow:
 * - Tue/Wed/Thu: one opener at 07:15, ends at 12:00, then a noon shift, then Bar for dinner
 * - Fri: opener 07:15-12:00, add a 10:00 shift, add a noon shift, then Bar and dinner coverage
 *
 * You can apply this from Settings to quickly fix common template mistakes.
 */
export const RECOMMENDED_WEEKLY_STAFFING_NEEDS: WeeklyStaffingNeeds = {
  tuesday: {
    slots: [
      { id: 'tue-open', startTime: '07:15', endTime: '12:00', label: 'Opener' },
      { id: 'tue-noon', startTime: '12:00', endTime: '16:00', label: 'Mid Shift' },
      { id: 'tue-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
    ],
    notes: '',
  },
  wednesday: {
    slots: [
      { id: 'wed-open', startTime: '07:15', endTime: '12:00', label: 'Opener' },
      { id: 'wed-noon', startTime: '12:00', endTime: '16:00', label: 'Mid Shift' },
      { id: 'wed-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
    ],
    notes: '',
  },
  thursday: {
    slots: [
      { id: 'thu-open', startTime: '07:15', endTime: '12:00', label: 'Opener' },
      { id: 'thu-noon', startTime: '12:00', endTime: '16:00', label: 'Mid Shift' },
      { id: 'thu-bar', startTime: '16:00', endTime: '21:00', label: 'Bar' },
    ],
    notes: '',
  },
  friday: {
    slots: [
      { id: 'fri-open', startTime: '07:15', endTime: '12:00', label: 'Opener' },
      { id: 'fri-10am', startTime: '10:00', endTime: '14:00', label: '2nd Server' },
      { id: 'fri-noon', startTime: '12:00', endTime: '16:00', label: 'Mid Shift' },
      { id: 'fri-bar', startTime: '15:00', endTime: '21:00', label: 'Bar' },
      { id: 'fri-dinner2', startTime: '17:00', endTime: '21:00', label: 'Dinner 2' },
    ],
    notes: '',
  },
  saturday: {
    slots: [
      { id: 'sat-open', startTime: '07:15', endTime: '15:00', label: 'Weekend Opener' },
      { id: 'sat-10am', startTime: '10:00', endTime: '15:00', label: '2nd Server' },
      { id: 'sat-bar', startTime: '15:00', endTime: '21:00', label: 'Bar' },
      { id: 'sat-dinner2', startTime: '16:00', endTime: '21:00', label: 'Dinner 2' },
      { id: 'sat-dinner3', startTime: '17:00', endTime: '21:00', label: 'Dinner 3' },
    ],
    notes: '',
  },
  sunday: {
    slots: [
      { id: 'sun-open', startTime: '07:15', endTime: '14:30', label: 'Weekend Opener' },
      { id: 'sun-2', startTime: '08:00', endTime: '14:30', label: '2nd Server' },
      { id: 'sun-3', startTime: '09:00', endTime: '14:30', label: '3rd Server' },
    ],
    notes: '',
  },
};

export function cloneWeeklyStaffingNeedsWithFreshIds(needs: WeeklyStaffingNeeds): WeeklyStaffingNeeds {
  const stamp = Date.now();
  const cloneDay = (dayKey: keyof WeeklyStaffingNeeds) => {
    const day = needs[dayKey];
    return {
      ...day,
      slots: (day.slots || []).map((s, idx) => ({
        ...s,
        id: `${dayKey}-${stamp}-${idx}`,
      })),
    };
  };

  return {
    tuesday: cloneDay('tuesday'),
    wednesday: cloneDay('wednesday'),
    thursday: cloneDay('thursday'),
    friday: cloneDay('friday'),
    saturday: cloneDay('saturday'),
    sunday: cloneDay('sunday'),
  };
}


