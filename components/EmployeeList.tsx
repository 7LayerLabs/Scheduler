'use client';

import {
  UserCircleIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Employee, Availability, DayAvailability, AvailableShift, DayOfWeek } from '@/lib/types';

interface Props {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateEmployee: (employee: Employee) => void;
}

export default function EmployeeList({ employees, onAddEmployee, onRemoveEmployee, onUpdateEmployee }: Props) {
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
                  {/* Set Schedule */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-slate-400" />
                      Set Schedule
                    </h4>
                    <div className="space-y-3">
                      {emp.setSchedule?.map((schedule, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="text-sm font-medium text-slate-700 capitalize w-24">{schedule.day}</span>
                          <span className={`text-xs px-2 py-1 rounded-md font-medium ${schedule.shiftType === 'morning' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                            {schedule.shiftType}
                          </span>
                          {schedule.startTime && schedule.endTime && (
                            <span className="text-xs text-slate-500">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const newSetSchedule = emp.setSchedule?.filter((_, i) => i !== idx);
                              onUpdateEmployee({ ...emp, setSchedule: newSetSchedule });
                            }}
                            className="ml-auto text-slate-400 hover:text-red-500"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2">
                        <select
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          id={`add-day-${emp.id}`}
                        >
                          <option value="monday">Mon</option>
                          <option value="tuesday">Tue</option>
                          <option value="wednesday">Wed</option>
                          <option value="thursday">Thu</option>
                          <option value="friday">Fri</option>
                          <option value="saturday">Sat</option>
                          <option value="sunday">Sun</option>
                        </select>
                        <select
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          id={`add-shift-${emp.id}`}
                        >
                          <option value="morning">Morning</option>
                          <option value="night">Night</option>
                        </select>
                        <input
                          type="time"
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white w-24"
                          placeholder="Start"
                          id={`add-start-${emp.id}`}
                        />
                        <input
                          type="time"
                          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white w-24"
                          placeholder="End"
                          id={`add-end-${emp.id}`}
                        />
                        <button
                          onClick={() => {
                            const daySelect = document.getElementById(`add-day-${emp.id}`) as HTMLSelectElement;
                            const shiftSelect = document.getElementById(`add-shift-${emp.id}`) as HTMLSelectElement;
                            const startInput = document.getElementById(`add-start-${emp.id}`) as HTMLInputElement;
                            const endInput = document.getElementById(`add-end-${emp.id}`) as HTMLInputElement;

                            if (daySelect && shiftSelect) {
                              const newSchedule = {
                                day: daySelect.value as any,
                                shiftType: shiftSelect.value as any,
                                startTime: startInput.value || undefined,
                                endTime: endInput.value || undefined,
                              };
                              onUpdateEmployee({
                                ...emp,
                                setSchedule: [...(emp.setSchedule || []), newSchedule]
                              });
                              // Clear inputs
                              startInput.value = '';
                              endInput.value = '';
                            }
                          }}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <span className="font-medium text-gray-600 block mb-2">Availability:</span>
                    <div className="space-y-2">
                      {(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => {
                        const avail = emp.availability[day] as DayAvailability | null;
                        const currentShifts = avail?.shifts?.map(s => s.type) || [];
                        const isSunday = day === 'sunday';

                        // Shift options: Open (any), Morning, Mid, Dinner (night) - exclude Dinner on Sunday
                        const shiftOptions: { label: string; type: AvailableShift['type'] }[] = [
                          { label: 'Open', type: 'any' },
                          { label: 'Morning', type: 'morning' },
                          { label: 'Mid', type: 'mid' },
                          ...(isSunday ? [] : [{ label: 'Dinner', type: 'night' as const }])
                        ];

                        const toggleShift = (shiftType: AvailableShift['type']) => {
                          const hasShift = currentShifts.includes(shiftType);
                          let newShifts: AvailableShift[];

                          if (hasShift) {
                            // Remove the shift
                            newShifts = (avail?.shifts || []).filter(s => s.type !== shiftType);
                          } else {
                            // Add the shift
                            newShifts = [...(avail?.shifts || []), { type: shiftType }];
                          }

                          const newAvailability: Availability = {
                            ...emp.availability,
                            [day]: {
                              available: newShifts.length > 0,
                              shifts: newShifts,
                              notes: avail?.notes
                            }
                          };

                          onUpdateEmployee({ ...emp, availability: newAvailability });
                        };

                        return (
                          <div key={day} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600 w-12 capitalize">
                              {day.slice(0, 3)}
                            </span>
                            <div className="flex gap-1">
                              {shiftOptions.map(({ label, type }) => {
                                const isSelected = currentShifts.includes(type);
                                return (
                                  <button
                                    key={type}
                                    onClick={() => toggleShift(type)}
                                    className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                      }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
