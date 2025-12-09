'use client';

import { useState, useEffect } from 'react';
import { Employee, WeeklySchedule, LockedShift, DayOfWeek, ScheduleOverride, WeeklyStaffingNeeds } from '@/lib/types';

// Store custom times from overrides for display
interface CustomTimeMap {
  [key: string]: { start: string; end: string }; // key = `${employeeId}-${day}`
}
import { parseScheduleNotes, formatParsedOverrides } from '@/lib/parseNotes';

interface Props {
  weekStart: Date;
  changeWeek: (delta: number) => void;
  formatWeekRange: (start: Date) => string;
  schedule: WeeklySchedule | null;
  setSchedule: (schedule: WeeklySchedule | null) => void;
  handleGenerate: () => void;
  isGenerating: boolean;
  employees: Employee[];
  stats: {
    totalShifts: number;
    staffScheduled: number;
    conflicts: number;
    coverage: number;
  };
  lockedShifts: LockedShift[];
  setLockedShifts: (shifts: LockedShift[]) => void;
  notes: string;
  setNotes: (notes: string) => void;
  overrides: ScheduleOverride[];
  setOverrides: (overrides: ScheduleOverride[]) => void;
  staffingNeeds: WeeklyStaffingNeeds;
}

export default function ScheduleView({
  weekStart,
  changeWeek,
  formatWeekRange,
  schedule,
  setSchedule,
  handleGenerate,
  isGenerating,
  employees,
  stats,
  lockedShifts,
  setLockedShifts,
  notes,
  setNotes,
  setOverrides,
  staffingNeeds,
}: Props) {
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);

  // Parse notes as user types
  useEffect(() => {
    if (notes.trim()) {
      const parsed = parseScheduleNotes(notes, employees);
      const formatted = formatParsedOverrides(parsed, employees);
      setParsedPreview(formatted);
      setOverrides(parsed);
    } else {
      setParsedPreview([]);
      setOverrides([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, employees]); // Don't include setOverrides to prevent infinite loop

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent">Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your weekly staff schedule</p>
        </div>
        <div className="flex items-center gap-3">
          {schedule && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear the entire schedule?')) {
                  setSchedule(null);
                  setLockedShifts([]);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300 hover:shadow-md hover:shadow-red-100"
            >
              <TrashIcon className="w-4 h-4" />
              Clear Schedule
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                {schedule ? 'Regenerate' : 'Generate Schedule'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Shifts"
          value={stats.totalShifts}
          icon={<CalendarIcon className="w-5 h-5" />}
          trend={schedule ? '+12% from last week' : undefined}
          color="blue"
        />
        <StatCard
          label="Staff Scheduled"
          value={stats.staffScheduled}
          icon={<UsersIcon className="w-5 h-5" />}
          trend={schedule ? `of ${employees.length} employees` : undefined}
          color="green"
        />
        <StatCard
          label="Coverage"
          value={schedule ? `${stats.coverage}%` : '—'}
          icon={<CheckIcon className="w-5 h-5" />}
          trend={stats.conflicts > 0 ? `${stats.conflicts} gaps` : schedule ? 'Full coverage' : undefined}
          color={stats.conflicts > 0 ? 'red' : 'emerald'}
        />
        <StatCard
          label="Week"
          value={formatWeekRange(weekStart).split(',')[0]}
          icon={<ClockIcon className="w-5 h-5" />}
          color="purple"
          weekNav={{ onPrev: () => changeWeek(-1), onNext: () => changeWeek(1) }}
        />
      </div>

      {/* Week Notes - Quick input for this week's scheduling instructions */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Week Notes <span className="text-slate-400 font-normal">({formatWeekRange(weekStart).split(',')[0]})</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Kim opens Saturday, Kris Ann off Tuesday, Ali works Friday night..."
              className="w-full h-16 p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 focus:bg-white resize-none transition-all duration-200 placeholder:text-slate-400"
            />
          </div>
          {parsedPreview.length > 0 && (
            <div className="flex-shrink-0 pt-7">
              <div className="flex flex-wrap gap-1.5">
                {parsedPreview.map((text, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm ${
                      text.startsWith('✓')
                        ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
                        : text.startsWith('✗')
                        ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200'
                        : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
        {/* Schedule Content */}
        <div className="p-6">
          {schedule ? (
              <ScheduleGrid
                schedule={schedule}
                weekStart={weekStart}
                lockedShifts={lockedShifts}
                employees={employees}
                staffingNeeds={staffingNeeds}
                overrides={parseScheduleNotes(notes, employees)}
                onToggleLock={(employeeId, day, shiftType) => {
                  const exists = lockedShifts.find(
                    l => l.employeeId === employeeId && l.day === day && l.shiftType === shiftType
                  );
                  if (exists) {
                    setLockedShifts(lockedShifts.filter(
                      l => !(l.employeeId === employeeId && l.day === day && l.shiftType === shiftType)
                    ));
                  } else {
                    setLockedShifts([...lockedShifts, { employeeId, day, shiftType }]);
                  }
                }}
                onSwapAssignments={(sourceEmpId, sourceDay, sourceShift, targetEmpId, targetDay, targetShift) => {
                  // True swap: exchange the two employees between their slots
                  const dayPrefixes: Record<string, string> = {
                    tuesday: 'tue', wednesday: 'wed', thursday: 'thu',
                    friday: 'fri', saturday: 'sat', sunday: 'sun'
                  };
                  const sourcePrefix = dayPrefixes[sourceDay];
                  const targetPrefix = dayPrefixes[targetDay];

                  const matchesSlot = (shiftId: string, prefix: string, shiftType: string) => {
                    const id = shiftId.toLowerCase();
                    const matchesDay = id.includes(prefix + '-') || id.startsWith(prefix);
                    let matchesShift = false;
                    if (shiftType === 'morning') {
                      matchesShift = (id.includes('early') || id.includes('morning')) && !id.includes('night');
                    } else if (shiftType === 'night') {
                      matchesShift = id.includes('night');
                    } else {
                      matchesShift = id.includes(shiftType);
                    }
                    return matchesDay && matchesShift;
                  };

                  // Find the source assignment (the one being dragged)
                  const sourceAssignmentIndex = schedule.assignments.findIndex(a =>
                    a.employeeId === sourceEmpId && matchesSlot(a.shiftId, sourcePrefix, sourceShift)
                  );

                  // Find the target assignment (the one being dropped on)
                  const targetAssignmentIndex = schedule.assignments.findIndex(a =>
                    a.employeeId === targetEmpId && matchesSlot(a.shiftId, targetPrefix, targetShift)
                  );

                  if (sourceAssignmentIndex === -1 || targetAssignmentIndex === -1) return;

                  // Create new assignments array with swapped employees
                  const newAssignments = [...schedule.assignments];

                  // Swap the shiftIds between the two assignments (keep employees, swap their slots)
                  const sourceShiftId = newAssignments[sourceAssignmentIndex].shiftId;
                  const sourceDate = newAssignments[sourceAssignmentIndex].date;
                  const targetShiftId = newAssignments[targetAssignmentIndex].shiftId;
                  const targetDate = newAssignments[targetAssignmentIndex].date;

                  // Source employee gets target's shift
                  newAssignments[sourceAssignmentIndex] = {
                    ...newAssignments[sourceAssignmentIndex],
                    shiftId: targetShiftId,
                    date: targetDate
                  };

                  // Target employee gets source's shift
                  newAssignments[targetAssignmentIndex] = {
                    ...newAssignments[targetAssignmentIndex],
                    shiftId: sourceShiftId,
                    date: sourceDate
                  };

                  setSchedule({
                    ...schedule,
                    assignments: newAssignments
                  });
                }}
              />
          ) : (
            <EmptyState onGenerate={handleGenerate} />
          )}
        </div>
      </div>

      {/* Conflicts & Warnings */}
      {schedule && (schedule.conflicts.length > 0 || schedule.warnings.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Issues & Warnings</h3>
          <div className="space-y-3">
            {schedule.conflicts.map((conflict, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertIcon className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Coverage Gap</p>
                  <p className="text-sm text-red-600">{conflict.message}</p>
                </div>
              </div>
            ))}
            {schedule.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <WarningIcon className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {warning.type === 'overtime' ? 'Overtime Alert' : 'Scheduling Note'}
                  </p>
                  <p className="text-sm text-amber-600">{warning.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  trend,
  color,
  weekNav,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
  weekNav?: { onPrev: () => void; onNext: () => void };
}) {
  const colorClasses: Record<string, { bg: string; icon: string; shadow: string }> = {
    blue: { bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', icon: 'text-white', shadow: 'shadow-blue-500/30' },
    green: { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', icon: 'text-white', shadow: 'shadow-emerald-500/30' },
    emerald: { bg: 'bg-gradient-to-br from-emerald-500 to-green-600', icon: 'text-white', shadow: 'shadow-emerald-500/30' },
    red: { bg: 'bg-gradient-to-br from-red-500 to-rose-600', icon: 'text-white', shadow: 'shadow-red-500/30' },
    purple: { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', icon: 'text-white', shadow: 'shadow-violet-500/30' },
  };

  const colorStyle = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorStyle.bg} shadow-lg ${colorStyle.shadow} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {trend && <p className="text-xs text-slate-500 mt-1">{trend}</p>}
        </div>
        {weekNav && (
          <div className="flex gap-1">
            <button
              onClick={weekNav.onPrev}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronLeftIcon className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={weekNav.onNext}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronRightIcon className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format time (24h to 12h)
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'p' : 'a';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  if (minutes === 0) {
    return `${hour12}${period}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Get employee's actual shift times based on their availability
function getEmployeeShiftTimes(
  employee: Employee,
  day: string,
  shiftType: 'morning' | 'night'
): { start: string; end: string } {
  const dayMap: Record<string, string> = {
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
    Sat: 'saturday',
    Sun: 'sunday',
  };

  const dayKey = dayMap[day] as keyof typeof employee.availability;
  const dayAvail = employee.availability[dayKey];

  // Default shift times
  const defaults: Record<string, Record<string, { start: string; end: string }>> = {
    Tue: { morning: { start: '7:15', end: '2' }, night: { start: '4', end: '9' } },
    Wed: { morning: { start: '7:15', end: '2' }, night: { start: '4', end: '9' } },
    Thu: { morning: { start: '7:15', end: '2' }, night: { start: '4', end: '9' } },
    Fri: { morning: { start: '7:15', end: '2' }, night: { start: '4', end: '9' } },
    Sat: { morning: { start: '7:15', end: '3' }, night: { start: '3', end: '9' } },
    Sun: { morning: { start: '7:15', end: '2:30' }, night: { start: '', end: '' } },
  };

  let start = defaults[day]?.[shiftType]?.start || '';
  let end = defaults[day]?.[shiftType]?.end || '';

  if (dayAvail && 'available' in dayAvail && dayAvail.available) {
    // Find matching shift in their availability
    for (const shift of dayAvail.shifts) {
      const matchesMorning = shiftType === 'morning' && (shift.type === 'morning' || shift.type === 'any');
      const matchesNight = shiftType === 'night' && (shift.type === 'night' || shift.type === 'any');

      if (matchesMorning || matchesNight) {
        if (shift.startTime) {
          start = formatTime(shift.startTime);
        }
        if (shift.endTime) {
          end = formatTime(shift.endTime);
        }
        break;
      }
    }
  }

  return { start, end };
}

// Schedule Grid Component
function ScheduleGrid({
  schedule,
  weekStart,
  lockedShifts,
  onToggleLock,
  employees,
  staffingNeeds,
  overrides,
  onSwapAssignments,
}: {
  schedule: WeeklySchedule;
  weekStart: Date;
  lockedShifts: LockedShift[];
  onToggleLock: (employeeId: string, day: DayOfWeek, shiftType: 'morning' | 'night') => void;
  employees: Employee[];
  staffingNeeds: WeeklyStaffingNeeds;
  overrides: ScheduleOverride[];
  onSwapAssignments: (
    sourceEmpId: string, sourceDay: DayOfWeek, sourceShift: 'morning' | 'night',
    targetEmpId: string, targetDay: DayOfWeek, targetShift: 'morning' | 'night'
  ) => void;
}) {
  // Build a map of custom times from overrides
  const customTimes: CustomTimeMap = {};
  for (const override of overrides) {
    if (override.type === 'custom_time' && (override.customStartTime || override.customEndTime)) {
      const key = `${override.employeeId}-${override.day}`;
      customTimes[key] = {
        start: override.customStartTime || '',
        end: override.customEndTime || '',
      };
    }
  }
  const [draggedItem, setDraggedItem] = useState<{
    employeeId: string;
    day: DayOfWeek;
    shiftType: 'morning' | 'night';
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    employeeId: string;
    day: DayOfWeek;
    shiftType: 'morning' | 'night';
  } | null>(null);

  const days = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const shifts = ['morning', 'night'] as const;

  const dayToFull: Record<string, DayOfWeek> = {
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
    Sat: 'saturday',
    Sun: 'sunday',
  };

  const isLocked = (employeeId: string, day: string, shiftType: 'morning' | 'night') => {
    return lockedShifts.some(
      l => l.employeeId === employeeId && l.day === dayToFull[day] && l.shiftType === shiftType
    );
  };

  const getDateForDay = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex + 1);
    return date.getDate();
  };

  const getAssignmentsForSlot = (day: string, shiftType: string) => {
    const dayMap: Record<string, string[]> = {
      Tue: ['tue'],
      Wed: ['wed'],
      Thu: ['thu'],
      Fri: ['fri'],
      Sat: ['sat'],
      Sun: ['sun'],
    };

    return schedule.assignments.filter((a) => {
      const dayPrefixes = dayMap[day];
      const shiftId = a.shiftId.toLowerCase();

      const isCorrectDay = dayPrefixes.some(prefix => {
        if (shiftId.startsWith(prefix + '-')) return true;
        if ((day === 'Wed' || day === 'Thu') && shiftId.startsWith('tue-thu')) {
          return false;
        }
        return shiftId.includes(prefix);
      });

      // Check shift type - be careful with 'early-night' which contains 'early'
      let isCorrectShift = false;
      if (shiftType === 'morning') {
        // Morning matches: 'early', 'morning' - but NOT if it also contains 'night'
        const isMorningShift = (shiftId.includes('early') || shiftId.includes('morning')) && !shiftId.includes('night');
        isCorrectShift = isMorningShift;
      } else if (shiftType === 'night') {
        // Night matches: 'night', 'early-night'
        isCorrectShift = shiftId.includes('night');
      } else {
        isCorrectShift = shiftId.includes(shiftType);
      }

      return isCorrectDay && isCorrectShift;
    });
  };

  return (
    <div className="overflow-x-auto">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-3 mb-4">
        <div className="col-span-1"></div>
        {days.map((day, idx) => (
          <div key={day} className="text-center">
            <div className="text-xs font-medium text-gray-500 uppercase">{day}</div>
            <div className="text-xl font-semibold text-gray-900">{getDateForDay(idx)}</div>
          </div>
        ))}
      </div>

      {/* Shifts */}
      {shifts.map((shift) => {
        // Get time range from first day's staffing needs as representative
        const firstDayNeeds = staffingNeeds.tuesday;
        let timeRange = '';
        if (shift === 'morning') {
          const start = firstDayNeeds.morningStart || '07:15';
          const end = firstDayNeeds.morningEnd || '14:00';
          timeRange = `${formatTime(start)} - ${formatTime(end)}`;
        } else {
          const start = firstDayNeeds.nightStart || '16:00';
          const end = firstDayNeeds.nightEnd || '21:00';
          timeRange = `${formatTime(start)} - ${formatTime(end)}`;
        }

        return (
        <div key={shift} className="mb-6">
          {/* Shift Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${shift === 'morning' ? 'bg-amber-400' : 'bg-indigo-400'}`} />
            <span className="text-sm font-medium text-gray-700 capitalize">{shift}</span>
            <span className="text-xs text-gray-400">
              {timeRange}
            </span>
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-3">
            <div className="col-span-1"></div>
            {days.map((day) => {
              const assignments = getAssignmentsForSlot(day, shift);
              const isSundayNight = day === 'Sun' && shift === 'night';

              if (isSundayNight) {
                return (
                  <div key={day} className="min-h-[80px] bg-gray-50 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-400">Closed</span>
                  </div>
                );
              }

              return (
                <div
                  key={day}
                  className={`min-h-[80px] rounded-lg p-2 ${
                    assignments.length === 0
                      ? 'bg-red-50 border-2 border-dashed border-red-200'
                      : 'bg-gray-50'
                  }`}
                >
                  {assignments.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-xs text-red-400 font-medium">Open</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {assignments.map((a) => {
                        const emp = employees.find((e) => e.id === a.employeeId);
                        if (!emp) return null;

                        const isBartender = emp.bartendingScale >= 4;

                        // Check for custom time override first
                        const customTimeKey = `${emp.id}-${dayToFull[day]}`;
                        const customTime = customTimes[customTimeKey];
                        let timeStr = '';
                        if (customTime) {
                          const startStr = customTime.start ? formatTime(customTime.start) : '';
                          const endStr = customTime.end ? formatTime(customTime.end) : '';
                          timeStr = `${startStr}-${endStr}`;
                        } else {
                          const times = getEmployeeShiftTimes(emp, day, shift);
                          timeStr = times.start && times.end ? `${times.start}-${times.end}` : '';
                        }
                        const locked = isLocked(emp.id, day, shift);

                        const isDragging = draggedItem?.employeeId === emp.id &&
                          draggedItem?.day === dayToFull[day] &&
                          draggedItem?.shiftType === shift;
                        const isDropTarget = dropTarget?.employeeId === emp.id &&
                          dropTarget?.day === dayToFull[day] &&
                          dropTarget?.shiftType === shift;

                        return (
                          <div
                            key={a.employeeId}
                            draggable={!locked}
                            onDragStart={(e) => {
                              if (locked) {
                                e.preventDefault();
                                return;
                              }
                              setDraggedItem({
                                employeeId: emp.id,
                                day: dayToFull[day],
                                shiftType: shift
                              });
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedItem(null);
                              setDropTarget(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedItem && (
                                draggedItem.employeeId !== emp.id ||
                                draggedItem.day !== dayToFull[day] ||
                                draggedItem.shiftType !== shift
                              )) {
                                setDropTarget({
                                  employeeId: emp.id,
                                  day: dayToFull[day],
                                  shiftType: shift
                                });
                              }
                            }}
                            onDragLeave={() => {
                              setDropTarget(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedItem && !locked) {
                                onSwapAssignments(
                                  draggedItem.employeeId,
                                  draggedItem.day,
                                  draggedItem.shiftType,
                                  emp.id,
                                  dayToFull[day],
                                  shift
                                );
                              }
                              setDraggedItem(null);
                              setDropTarget(null);
                            }}
                            className={`rounded-md px-2 py-1.5 relative group cursor-grab active:cursor-grabbing transition-all ${
                              isDragging
                                ? 'opacity-50 scale-95'
                                : isDropTarget
                                ? 'ring-2 ring-blue-400 ring-offset-1 scale-105'
                                : ''
                            } ${
                              locked
                                ? 'bg-amber-50 border-l-2 border-amber-500 ring-1 ring-amber-300 cursor-not-allowed'
                                : isBartender
                                ? 'bg-blue-100 border-l-2 border-blue-500 hover:shadow-md'
                                : 'bg-white border-l-2 border-gray-300 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                {!locked && (
                                  <GripIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                                <span className={`text-xs font-medium ${
                                  locked ? 'text-amber-800' : isBartender ? 'text-blue-800' : 'text-gray-800'
                                }`}>
                                  {emp.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isBartender && (
                                  <span className="text-[10px] bg-blue-500 text-white px-1 rounded">Bar</span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLock(emp.id, dayToFull[day], shift);
                                  }}
                                  className={`p-0.5 rounded transition-all ${
                                    locked
                                      ? 'text-amber-600 hover:text-amber-700'
                                      : 'text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100'
                                  }`}
                                  title={locked ? 'Unlock shift' : 'Lock shift'}
                                >
                                  {locked ? (
                                    <LockClosedIcon className="w-3 h-3" />
                                  ) : (
                                    <LockOpenIcon className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {timeStr && (
                              <div className="text-[10px] text-gray-500 mt-0.5">{timeStr}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

// Empty State Component
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-200/50">
        <CalendarIcon className="w-10 h-10 text-amber-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">No schedule generated</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
        Generate a schedule to automatically assign staff based on their availability and preferences.
      </p>
      <button
        onClick={onGenerate}
        className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02]"
      >
        <SparklesIcon className="w-4 h-4" />
        Generate Schedule
      </button>
    </div>
  );
}

// Notes Panel Component
function NotesPanel({
  notes,
  setNotes,
  parsedPreview,
}: {
  notes: string;
  setNotes: (notes: string) => void;
  parsedPreview: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Scheduling Instructions
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type natural language instructions...

Examples:
• Kim opens Saturday
• Kris Ann off Tuesday
• Ali works Friday night
• Heidi Wed thru Fri morning"
          className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          Keywords: &quot;opens&quot;, &quot;off&quot;, &quot;night&quot;, &quot;morning&quot;, &quot;prefers&quot;, &quot;closing&quot;, &quot;works&quot; • Nicknames work too (Chris = Kris Ann, Hales = Haley, etc.)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parsed Rules {parsedPreview.length > 0 && `(${parsedPreview.length})`}
        </label>
        <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto">
          {parsedPreview.length > 0 ? (
            <div className="space-y-2">
              {parsedPreview.map((text, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    text.startsWith('✓')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : text.startsWith('✗')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {text}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Rules will appear here as you type
            </div>
          )}
        </div>
        {parsedPreview.length > 0 && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <CheckIcon className="w-3 h-3" />
            Click &quot;Regenerate&quot; to apply these rules
          </p>
        )}
      </div>
    </div>
  );
}

// Staffing Needs Editor Component
function StaffingNeedsEditor({
  staffingNeeds,
  setStaffingNeeds,
}: {
  staffingNeeds: WeeklyStaffingNeeds;
  setStaffingNeeds: (needs: WeeklyStaffingNeeds) => void;
}) {
  const days: { key: keyof WeeklyStaffingNeeds; label: string; fullLabel: string }[] = [
    { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
    { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
    { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
    { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
    { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
    { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
  ];

  const updateStaffing = (day: keyof WeeklyStaffingNeeds, shift: 'morning' | 'night', value: number) => {
    const newNeeds = { ...staffingNeeds };
    newNeeds[day] = { ...newNeeds[day], [shift]: Math.max(0, Math.min(10, value)) };
    setStaffingNeeds(newNeeds);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Weekly Staffing Needs</h3>
        <p className="text-sm text-gray-500 mb-4">
          Set how many staff you need for each shift this week. The scheduler will try to fill these positions.
        </p>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 gap-4">
        <div className="col-span-1"></div>
        {days.map(({ label, fullLabel }) => (
          <div key={label} className="text-center">
            <span className="text-sm font-medium text-gray-700">{fullLabel}</span>
          </div>
        ))}
      </div>

      {/* Morning/Breakfast/Lunch Row */}
      <div className="grid grid-cols-7 gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-sm font-medium text-gray-700">Breakfast/Lunch</span>
        </div>
        {days.map(({ key, label }) => (
          <div key={`morning-${label}`} className="flex justify-center">
            <div className="flex items-center gap-1 bg-amber-50 rounded-lg p-1">
              <button
                onClick={() => updateStaffing(key, 'morning', staffingNeeds[key].morning - 1)}
                className="w-8 h-8 rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center font-bold"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold text-amber-800">
                {staffingNeeds[key].morning}
              </span>
              <button
                onClick={() => updateStaffing(key, 'morning', staffingNeeds[key].morning + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Night/Dinner Row */}
      <div className="grid grid-cols-7 gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-400" />
          <span className="text-sm font-medium text-gray-700">Dinner</span>
        </div>
        {days.map(({ key, label }) => {
          const isSundayNight = key === 'sunday';
          return (
            <div key={`night-${label}`} className="flex justify-center">
              {isSundayNight ? (
                <div className="text-xs text-gray-400 italic">Closed</div>
              ) : (
                <div className="flex items-center gap-1 bg-indigo-50 rounded-lg p-1">
                  <button
                    onClick={() => updateStaffing(key, 'night', staffingNeeds[key].night - 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center font-bold"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-indigo-800">
                    {staffingNeeds[key].night}
                  </span>
                  <button
                    onClick={() => updateStaffing(key, 'night', staffingNeeds[key].night + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
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

// Icon Components
function LoadingSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function LockClosedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function LockOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
