'use client';

import { useState, useMemo } from 'react';
import { generateSchedule } from '@/lib/scheduler';
import { employees as initialEmployees } from '@/lib/employees';
import { Employee, WeeklySchedule, ScheduleOverride, LockedShift, WeeklyStaffingNeeds } from '@/lib/types';
import Sidebar from '@/components/Sidebar';
import ScheduleView from '@/components/ScheduleView';
import TeamView from '@/components/TeamView';
import StaffingView from '@/components/StaffingView';
import NotesView from '@/components/NotesView';

export default function Home() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Store notes per week using week start date as key
  const [weeklyNotes, setWeeklyNotes] = useState<Record<string, string>>({});
  const [weeklyOverrides, setWeeklyOverrides] = useState<Record<string, ScheduleOverride[]>>({});

  // Get week key for storage
  const getWeekKey = (date: Date) => date.toISOString().split('T')[0];
  const currentWeekKey = getWeekKey(weekStart);

  // Get notes for current week
  const notes = weeklyNotes[currentWeekKey] || '';
  const setNotes = (newNotes: string) => {
    setWeeklyNotes(prev => ({ ...prev, [currentWeekKey]: newNotes }));
  };

  // Get overrides for current week
  const overrides = weeklyOverrides[currentWeekKey] || [];
  const setOverrides = (newOverrides: ScheduleOverride[]) => {
    setWeeklyOverrides(prev => ({ ...prev, [currentWeekKey]: newOverrides }));
  };
  const [lockedShifts, setLockedShifts] = useState<LockedShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const DEFAULT_STAFFING_NEEDS: WeeklyStaffingNeeds = {
    tuesday: {
      slots: [
        { id: 'tue-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'tue-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'tue-3', startTime: '16:00', endTime: '21:00', label: 'Closer' },
      ],
      notes: ''
    },
    wednesday: {
      slots: [
        { id: 'wed-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'wed-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'wed-3', startTime: '16:00', endTime: '21:00', label: 'Closer' },
      ],
      notes: ''
    },
    thursday: {
      slots: [
        { id: 'thu-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'thu-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'thu-3', startTime: '16:00', endTime: '21:00', label: 'Closer' },
      ],
      notes: ''
    },
    friday: {
      slots: [
        { id: 'fri-1', startTime: '07:15', endTime: '14:00', label: 'Opener' },
        { id: 'fri-2', startTime: '11:00', endTime: '16:00', label: '2nd Server' },
        { id: 'fri-3', startTime: '15:00', endTime: '21:00', label: 'Dinner 1' },
        { id: 'fri-4', startTime: '17:00', endTime: '21:00', label: 'Dinner 2' },
      ],
      notes: ''
    },
    saturday: {
      slots: [
        { id: 'sat-1', startTime: '07:15', endTime: '15:00', label: 'Opener' },
        { id: 'sat-2', startTime: '10:00', endTime: '15:00', label: '2nd Server' },
        { id: 'sat-3', startTime: '15:00', endTime: '21:00', label: 'Dinner 1' },
        { id: 'sat-4', startTime: '17:00', endTime: '21:00', label: 'Dinner 2' },
      ],
      notes: ''
    },
    sunday: {
      slots: [
        { id: 'sun-1', startTime: '07:15', endTime: '14:30', label: 'Opener' },
        { id: 'sun-2', startTime: '08:00', endTime: '14:30', label: '2nd Server' },
        { id: 'sun-3', startTime: '09:00', endTime: '14:30', label: '3rd Server' },
      ],
      notes: ''
    },
  };

  const [weeklyStaffingNeeds, setWeeklyStaffingNeeds] = useState<Record<string, WeeklyStaffingNeeds>>({});

  // Get staffing needs for current week or use default
  const staffingNeeds = weeklyStaffingNeeds[currentWeekKey] || DEFAULT_STAFFING_NEEDS;

  const setStaffingNeeds = (newNeeds: WeeklyStaffingNeeds) => {
    setWeeklyStaffingNeeds(prev => ({ ...prev, [currentWeekKey]: newNeeds }));
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    ));
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    // Also remove any locked shifts for this employee
    setLockedShifts(prev => prev.filter(lock => lock.employeeId !== employeeId));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Convert locked shifts to overrides for the scheduler
      const lockedOverrides: ScheduleOverride[] = lockedShifts.map(lock => ({
        id: `locked-${lock.employeeId}-${lock.day}-${lock.shiftType}`,
        type: 'assign' as const,
        employeeId: lock.employeeId,
        day: lock.day,
        shiftType: lock.shiftType,
        note: 'Locked shift',
      }));
      const allOverrides = [...overrides, ...lockedOverrides];
      // Pass locked shifts and existing assignments so they persist through regeneration
      const existingAssignments = schedule?.assignments || [];
      const newSchedule = generateSchedule(weekStart, allOverrides, employees, staffingNeeds, lockedShifts, existingAssignments);
      setSchedule(newSchedule);
      setIsGenerating(false);
    }, 500);
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
  };

  const changeWeek = (delta: number) => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + delta * 7);
    setWeekStart(newDate);
    setSchedule(null);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!schedule) {
      return {
        totalShifts: 0,
        staffScheduled: 0,
        conflicts: 0,
        coverage: 0,
      };
    }

    const uniqueStaff = new Set(schedule.assignments.map(a => a.employeeId));
    return {
      totalShifts: schedule.assignments.length,
      staffScheduled: uniqueStaff.size,
      conflicts: schedule.conflicts.length,
      coverage: schedule.conflicts.length === 0 ? 100 : Math.round((1 - schedule.conflicts.length / 12) * 100),
    };
  }, [schedule]);

  const handleClearSchedule = () => {
    setSchedule(null);
    setLockedShifts([]);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-auto">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-10 shadow-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Search */}
              <div className="flex-1 max-w-lg">
                <div className="relative group">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search employees, shifts..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 focus:bg-white transition-all duration-200 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-4">
                <button className="relative p-2.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all duration-200">
                  <BellIcon className="w-5 h-5" />
                  {(schedule?.conflicts.length || 0) > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-full animate-pulse ring-2 ring-white" />
                  )}
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-200 ring-2 ring-white">
                  <span className="text-white font-semibold text-sm">DT</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {activeTab === 'schedule' && (
            <ScheduleView
              weekStart={weekStart}
              changeWeek={changeWeek}
              formatWeekRange={formatWeekRange}
              schedule={schedule}
              setSchedule={setSchedule}
              handleGenerate={handleGenerate}
              onClearSchedule={handleClearSchedule}
              isGenerating={isGenerating}
              employees={employees}
              stats={stats}
              lockedShifts={lockedShifts}
              setLockedShifts={setLockedShifts}
              notes={notes}
              setNotes={setNotes}
              overrides={overrides}
              setOverrides={setOverrides}
              staffingNeeds={staffingNeeds}
            />
          )}

          {activeTab === 'staffing' && (
            <StaffingView
              weekStart={weekStart}
              changeWeek={changeWeek}
              formatWeekRange={formatWeekRange}
              staffingNeeds={staffingNeeds}
              setStaffingNeeds={setStaffingNeeds}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              notes={notes}
              setNotes={setNotes}
              overrides={overrides}
              setOverrides={setOverrides}
              employees={employees}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              employees={employees}
              onUpdateEmployee={handleUpdateEmployee}
              onAddEmployee={handleAddEmployee}
              onRemoveEmployee={handleRemoveEmployee}
            />
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-200/50">
                <SettingsIcon className="w-10 h-10 text-violet-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Settings Coming Soon</h2>
              <p className="text-slate-500">Configure shifts, notifications, and preferences.</p>
            </div>
          )}
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          aside, header {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

// Icon Components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
