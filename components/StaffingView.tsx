'use client';

import { WeeklyStaffingNeeds, DayStaffing } from '@/lib/types';

interface Props {
  staffingNeeds: WeeklyStaffingNeeds;
  setStaffingNeeds: (needs: WeeklyStaffingNeeds) => void;
}

export default function StaffingView({ staffingNeeds, setStaffingNeeds }: Props) {
  const days: { key: keyof WeeklyStaffingNeeds; label: string; fullLabel: string }[] = [
    { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
    { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
    { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
    { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
    { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
    { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
  ];

  const updateStaffing = (day: keyof WeeklyStaffingNeeds, field: keyof DayStaffing, value: number | string) => {
    const newNeeds = { ...staffingNeeds };
    if (typeof value === 'number') {
      newNeeds[day] = { ...newNeeds[day], [field]: Math.max(0, Math.min(10, value)) };
    } else {
      newNeeds[day] = { ...newNeeds[day], [field]: value };
    }
    setStaffingNeeds(newNeeds);
  };

  const formatTimeDisplay = (time?: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Staffing Needs</h1>
        <p className="text-sm text-gray-500 mt-1">Set staff counts and shift times for each day</p>
      </div>

      {/* Day Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map(({ key, fullLabel }) => {
          const dayData = staffingNeeds[key];
          const isSundayNight = key === 'sunday';

          return (
            <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{fullLabel}</h3>

              {/* Morning Shift */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-sm font-medium text-gray-700">Breakfast/Lunch</span>
                </div>

                <div className="space-y-2 pl-5">
                  {/* Staff Count */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-14">Staff:</span>
                    <div className="flex items-center gap-1 bg-amber-50 rounded-lg p-1">
                      <button
                        onClick={() => updateStaffing(key, 'morning', dayData.morning - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-semibold text-amber-800 text-sm">
                        {dayData.morning}
                      </span>
                      <button
                        onClick={() => updateStaffing(key, 'morning', dayData.morning + 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-14">Time:</span>
                    <input
                      type="time"
                      value={dayData.morningStart || '07:15'}
                      onChange={(e) => updateStaffing(key, 'morningStart', e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                    <span className="text-gray-400 text-xs">to</span>
                    <input
                      type="time"
                      value={dayData.morningEnd || '14:00'}
                      onChange={(e) => updateStaffing(key, 'morningEnd', e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  {/* Display Time in 12-hour */}
                  <div className="text-xs text-amber-600">
                    {formatTimeDisplay(dayData.morningStart || '07:15')} - {formatTimeDisplay(dayData.morningEnd || '14:00')}
                  </div>
                </div>
              </div>

              {/* Night Shift */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-400" />
                  <span className="text-sm font-medium text-gray-700">Dinner</span>
                </div>

                {isSundayNight ? (
                  <div className="pl-5 text-sm text-gray-400 italic">Closed Sunday nights</div>
                ) : (
                  <div className="space-y-2 pl-5">
                    {/* Staff Count */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14">Staff:</span>
                      <div className="flex items-center gap-1 bg-indigo-50 rounded-lg p-1">
                        <button
                          onClick={() => updateStaffing(key, 'night', dayData.night - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center font-bold text-sm"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-semibold text-indigo-800 text-sm">
                          {dayData.night}
                        </span>
                        <button
                          onClick={() => updateStaffing(key, 'night', dayData.night + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center font-bold text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Time Range */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-14">Time:</span>
                      <input
                        type="time"
                        value={dayData.nightStart || '16:00'}
                        onChange={(e) => updateStaffing(key, 'nightStart', e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="time"
                        value={dayData.nightEnd || '21:00'}
                        onChange={(e) => updateStaffing(key, 'nightEnd', e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                      />
                    </div>

                    {/* Display Time in 12-hour */}
                    <div className="text-xs text-indigo-600">
                      {formatTimeDisplay(dayData.nightStart || '16:00')} - {formatTimeDisplay(dayData.nightEnd || '21:00')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Weekly Total</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-amber-700">
              <span className="font-semibold">
                {Object.values(staffingNeeds).reduce((sum, day) => sum + day.morning, 0)}
              </span> morning shifts
            </span>
            <span className="text-sm text-indigo-700">
              <span className="font-semibold">
                {Object.values(staffingNeeds).reduce((sum, day) => sum + day.night, 0)}
              </span> evening shifts
            </span>
            <span className="text-sm text-gray-900 font-semibold">
              {Object.values(staffingNeeds).reduce((sum, day) => sum + day.morning + day.night, 0)} total
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Changes take effect when you regenerate the schedule.
      </p>
    </div>
  );
}
