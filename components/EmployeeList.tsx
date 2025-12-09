'use client';

import { useState } from 'react';
import { Employee } from '@/lib/types';

interface Props {
  employees: Employee[];
}

export default function EmployeeList({ employees }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sortedEmployees = [...employees].sort((a, b) => {
    // Sort by bartending scale descending
    return b.bartendingScale - a.bartendingScale;
  });

  const getScaleStars = (scale: number, max: number = 5) => {
    return '★'.repeat(scale) + '☆'.repeat(max - scale);
  };

  const getScaleColor = (scale: number) => {
    if (scale >= 5) return 'text-green-600';
    if (scale >= 4) return 'text-blue-600';
    if (scale >= 3) return 'text-yellow-600';
    if (scale >= 1) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-800">Team ({employees.length})</h2>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {sortedEmployees.map(emp => (
          <div
            key={emp.id}
            className="border-b last:border-0"
          >
            <button
              onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}
              className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <span className="font-medium">{emp.name}</span>
                <div className="flex gap-3 text-xs mt-1">
                  <span className={getScaleColor(emp.bartendingScale)}>
                    Bar: {getScaleStars(emp.bartendingScale)}
                  </span>
                  <span className={getScaleColor(emp.aloneScale)}>
                    Solo: {getScaleStars(emp.aloneScale)}
                  </span>
                </div>
              </div>
              <span className="text-gray-400">
                {expanded === emp.id ? '▼' : '▶'}
              </span>
            </button>

            {expanded === emp.id && (
              <div className="px-3 pb-3 text-sm bg-gray-50">
                <div className="space-y-2">
                  {/* Availability */}
                  <div>
                    <span className="font-medium text-gray-600">Availability:</span>
                    <ul className="mt-1 space-y-0.5 text-gray-600">
                      {Object.entries(emp.availability).map(([day, avail]) => {
                        if (day === 'monday' || !avail) return null;
                        if (!avail.available) {
                          return (
                            <li key={day} className="text-red-500">
                              ✗ {day.charAt(0).toUpperCase() + day.slice(1)}
                              {avail.notes && ` - ${avail.notes}`}
                            </li>
                          );
                        }
                        const shiftTypes = avail.shifts.map(s => s.type).join(', ');
                        return (
                          <li key={day} className="text-green-600">
                            ✓ {day.charAt(0).toUpperCase() + day.slice(1)}: {shiftTypes}
                            {avail.notes && ` (${avail.notes})`}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Exclusions */}
                  {emp.exclusions.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-600">Exclusions:</span>
                      <ul className="mt-1 space-y-0.5">
                        {emp.exclusions.map((ex, i) => (
                          <li key={i} className="text-red-600">
                            ⛔ {ex.startDate} to {ex.endDate}
                            {ex.reason && ` - ${ex.reason}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preferences */}
                  {emp.minShiftsPerWeek && (
                    <div className="text-blue-600">
                      📌 Wants at least {emp.minShiftsPerWeek} shifts/week
                    </div>
                  )}
                  {emp.preferences.needsBartenderOnShift && (
                    <div className="text-orange-600">
                      ⚠️ Needs bartender on shift
                    </div>
                  )}
                  {emp.preferences.canWorkAloneExtended && (
                    <div className="text-green-600">
                      ✓ Can work alone extended
                    </div>
                  )}
                  {emp.preferences.canOpen && (
                    <div className="text-blue-600">
                      🔑 Can open: {emp.preferences.openDays?.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
