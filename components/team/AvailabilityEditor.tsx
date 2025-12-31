'use client';

import { Availability, DayAvailability } from '@/lib/types';

type DayKey = 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type ShiftType = 'morning' | 'mid' | 'night' | 'bar' | 'any' | 'none';

interface Props {
  availability: Availability | null;
  onUpdateAvailability: (availability: Availability) => void;
}

const dayLabels: { key: DayKey; label: string }[] = [
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

export default function AvailabilityEditor({ availability, onUpdateAvailability }: Props) {
  if (!availability) return null;

  const getShiftTypesForDay = (day: DayKey): ShiftType[] => {
    const dayAvail = availability[day] as DayAvailability | null;
    if (!dayAvail || !dayAvail.available) return [];
    return dayAvail.shifts.map(s => s.type as ShiftType);
  };

  const hasShiftType = (day: DayKey, shiftType: ShiftType): boolean => {
    const types = getShiftTypesForDay(day);
    return types.includes(shiftType);
  };

  const toggleShiftTypeForDay = (day: DayKey, shiftType: ShiftType) => {
    const newAvail = { ...availability };
    const currentDayAvail = availability[day] as DayAvailability | null;
    const currentShifts = currentDayAvail?.shifts || [];

    const hasShift = currentShifts.some(s => s.type === shiftType);

    let newShifts;
    if (hasShift) {
      newShifts = currentShifts.filter(s => s.type !== shiftType);
    } else {
      if (shiftType === 'any') {
        newShifts = [{ type: 'any' as const }];
      } else {
        const withoutAny = currentShifts.filter(s => s.type !== 'any');
        if (shiftType === 'bar') {
          newShifts = [...withoutAny, { type: 'bar' as const }];
        } else {
          newShifts = [...withoutAny, { type: shiftType as const }];
        }
      }
    }

    newAvail[day] = { ...currentDayAvail, available: newShifts.length > 0, shifts: newShifts };
    onUpdateAvailability(newAvail);
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-white mb-3">Weekly Availability</h4>
      <div className="space-y-2">
        {dayLabels.map(({ key, label }) => {
          const isSunday = key === 'sunday';

          const shiftOptions: { label: string; type: 'any' | 'morning' | 'mid' | 'night' | 'bar' }[] = [
            { label: 'Open', type: 'any' },
            { label: 'Morning', type: 'morning' },
            { label: 'Mid', type: 'mid' },
            ...(isSunday ? [] : [
              { label: 'Dinner', type: 'night' as const },
              { label: 'Bar Shift', type: 'bar' as const },
            ])
          ];

          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-10 text-xs font-medium text-[#6b6b75]">{label}</span>
              <div className="flex gap-1">
                {shiftOptions.map(({ label: shiftLabel, type }) => {
                  const isSelected = hasShiftType(key, type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleShiftTypeForDay(key, type)}
                      className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${isSelected
                          ? 'bg-[#e5a825] text-[#0d0d0f]'
                          : 'bg-[#2a2a32] text-[#6b6b75] hover:bg-[#3a3a45]'
                        }`}
                    >
                      {shiftLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
