'use client';

import { WeeklySchedule, Employee, DayOfWeek } from '@/lib/types';

interface Props {
  schedule: WeeklySchedule;
  weekStart: Date;
  employees: Employee[];
}

export default function ScheduleGrid({ schedule, weekStart, employees }: Props) {
  const days: { key: DayOfWeek; label: string; short: string }[] = [
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
  ];

  const getDateForDay = (dayIndex: number): string => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex + 1); // +1 because Tuesday is day 1
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  const getEmployeeName = (id: string): string => {
    const emp = employees.find(e => e.id === id);
    return emp?.name || id;
  };

  const getEmployeeInfo = (id: string): Employee | undefined => {
    return employees.find(e => e.id === id);
  };

  // Group assignments by day and shift type
  const getAssignmentsForDayAndType = (day: DayOfWeek, type: 'morning' | 'night') => {
    const dayPrefix = day.slice(0, 3);
    return schedule.assignments
      .filter(a => {
        const matchesDay = a.shiftId.startsWith(dayPrefix) || a.shiftId.includes(`-${dayPrefix}-`);
        const matchesType = a.shiftId.includes(type) ||
          (type === 'morning' && !a.shiftId.includes('night') && !a.shiftId.includes('mid'));
        return matchesDay && matchesType;
      })
      .map(a => a.employeeId)
      .filter((id, index, arr) => arr.indexOf(id) === index); // unique
  };

  const getBartendingBadge = (scale: number) => {
    if (scale >= 5) return <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">Bar 5</span>;
    if (scale >= 4) return <span className="text-xs bg-purple-50 text-purple-600 px-1 rounded">Bar {scale}</span>;
    if (scale >= 3) return <span className="text-xs bg-yellow-50 text-yellow-700 px-1 rounded">Bar {scale}</span>;
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="font-semibold text-gray-800">
          Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <p className="text-sm text-gray-500">Monday is closed</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left font-semibold text-gray-700 w-24">Shift</th>
              {days.map((day, i) => (
                <th key={day.key} className="p-3 text-center font-semibold text-gray-700 min-w-[120px]">
                  <div>{day.short}</div>
                  <div className="text-xs font-normal text-gray-500">{getDateForDay(i)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Morning Row */}
            <tr className="border-t">
              <td className="p-3 bg-amber-50 font-medium text-amber-800">
                <div>Morning</div>
                <div className="text-xs font-normal">7:15am - 3pm</div>
              </td>
              {days.map(day => {
                const assigned = getAssignmentsForDayAndType(day.key, 'morning');
                return (
                  <td key={`${day.key}-morning`} className="p-3 border-l align-top">
                    <div className="space-y-1">
                      {assigned.length > 0 ? (
                        assigned.map(empId => {
                          const emp = getEmployeeInfo(empId);
                          return (
                            <div
                              key={empId}
                              className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-sm"
                            >
                              <span className="font-medium">{getEmployeeName(empId)}</span>
                              {emp && <div className="flex gap-1 mt-0.5">{getBartendingBadge(emp.bartendingScale)}</div>}
                            </div>
                          );
                        })
                      ) : (
                        day.key !== 'monday' && (
                          <div className="text-gray-400 text-sm italic">—</div>
                        )
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Night Row */}
            <tr className="border-t">
              <td className="p-3 bg-indigo-50 font-medium text-indigo-800">
                <div>Night</div>
                <div className="text-xs font-normal">4pm - 9pm</div>
              </td>
              {days.map(day => {
                // Sunday has no night shift
                if (day.key === 'sunday') {
                  return (
                    <td key={`${day.key}-night`} className="p-3 border-l bg-gray-50 text-center">
                      <span className="text-gray-400 text-sm">Closed 2:30pm</span>
                    </td>
                  );
                }

                const assigned = getAssignmentsForDayAndType(day.key, 'night');
                return (
                  <td key={`${day.key}-night`} className="p-3 border-l align-top">
                    <div className="space-y-1">
                      {assigned.length > 0 ? (
                        assigned.map(empId => {
                          const emp = getEmployeeInfo(empId);
                          return (
                            <div
                              key={empId}
                              className="bg-green-50 border border-green-200 rounded px-2 py-1 text-sm"
                            >
                              <span className="font-medium">{getEmployeeName(empId)}</span>
                              {emp && <div className="flex gap-1 mt-0.5">{getBartendingBadge(emp.bartendingScale)}</div>}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-gray-400 text-sm italic">—</div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></span>
          <span>Bar 4-5: Full bartender</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-yellow-50 border border-yellow-300 rounded"></span>
          <span>Bar 3: Learning bartender</span>
        </div>
      </div>
    </div>
  );
}
