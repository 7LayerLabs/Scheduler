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
    if (scale >= 5) return <span className="text-xs bg-[#a855f7]/20 text-[#a855f7] px-1 rounded border border-[#a855f7]/30">Bar 5</span>;
    if (scale >= 4) return <span className="text-xs bg-[#a855f7]/10 text-[#a855f7] px-1 rounded border border-[#a855f7]/20">Bar {scale}</span>;
    if (scale >= 3) return <span className="text-xs bg-[#e5a825]/10 text-[#e5a825] px-1 rounded border border-[#e5a825]/20">Bar {scale}</span>;
    return null;
  };

  return (
    <div className="bg-[#1a1a1f] rounded-lg border border-[#2a2a32] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a32] bg-[#141417]">
        <h2 className="font-semibold text-white">
          Week of {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <p className="text-sm text-[#6b6b75]">Monday is closed</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#141417]">
              <th className="p-3 text-left font-semibold text-[#a0a0a8] w-24">Shift</th>
              {days.map((day, i) => (
                <th key={day.key} className="p-3 text-center font-semibold text-[#a0a0a8] min-w-[120px]">
                  <div>{day.short}</div>
                  <div className="text-xs font-normal text-[#6b6b75]">{getDateForDay(i)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Morning Row */}
            <tr className="border-t border-[#2a2a32]">
              <td className="p-3 bg-[#e5a825]/10 font-medium text-[#e5a825]">
                <div>Morning</div>
                <div className="text-xs font-normal text-[#e5a825]/70">7:15am - 3pm</div>
              </td>
              {days.map(day => {
                const assigned = getAssignmentsForDayAndType(day.key, 'morning');
                return (
                  <td key={`${day.key}-morning`} className="p-3 border-l border-[#2a2a32] align-top">
                    <div className="space-y-1">
                      {assigned.length > 0 ? (
                        assigned.map(empId => {
                          const emp = getEmployeeInfo(empId);
                          return (
                            <div
                              key={empId}
                              className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded px-2 py-1 text-sm"
                            >
                              <span className="font-medium text-[#3b82f6]">{getEmployeeName(empId)}</span>
                              {emp && <div className="flex gap-1 mt-0.5">{getBartendingBadge(emp.bartendingScale)}</div>}
                            </div>
                          );
                        })
                      ) : (
                        day.key !== 'monday' && (
                          <div className="text-[#6b6b75] text-sm italic">-</div>
                        )
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Night Row */}
            <tr className="border-t border-[#2a2a32]">
              <td className="p-3 bg-[#a855f7]/10 font-medium text-[#a855f7]">
                <div>Night</div>
                <div className="text-xs font-normal text-[#a855f7]/70">4pm - 9pm</div>
              </td>
              {days.map(day => {
                // Sunday has no night shift
                if (day.key === 'sunday') {
                  return (
                    <td key={`${day.key}-night`} className="p-3 border-l border-[#2a2a32] bg-[#141417] text-center">
                      <span className="text-[#6b6b75] text-sm">Closed 2:30pm</span>
                    </td>
                  );
                }

                const assigned = getAssignmentsForDayAndType(day.key, 'night');
                return (
                  <td key={`${day.key}-night`} className="p-3 border-l border-[#2a2a32] align-top">
                    <div className="space-y-1">
                      {assigned.length > 0 ? (
                        assigned.map(empId => {
                          const emp = getEmployeeInfo(empId);
                          return (
                            <div
                              key={empId}
                              className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded px-2 py-1 text-sm"
                            >
                              <span className="font-medium text-[#22c55e]">{getEmployeeName(empId)}</span>
                              {emp && <div className="flex gap-1 mt-0.5">{getBartendingBadge(emp.bartendingScale)}</div>}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[#6b6b75] text-sm italic">-</div>
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
      <div className="p-4 border-t border-[#2a2a32] bg-[#141417] flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#a855f7]/20 border border-[#a855f7]/30 rounded"></span>
          <span className="text-[#a0a0a8]">Bar 4-5: Full bartender</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#e5a825]/10 border border-[#e5a825]/30 rounded"></span>
          <span className="text-[#a0a0a8]">Bar 3: Learning bartender</span>
        </div>
      </div>
    </div>
  );
}
