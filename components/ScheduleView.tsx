'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Employee, WeeklySchedule, LockedShift, DayOfWeek, ScheduleOverride, WeeklyStaffingNeeds } from '@/lib/types';
import { parseScheduleNotes, formatParsedOverrides } from '@/lib/parseNotes';

interface Props {
  weekStart: Date;
  changeWeek: (delta: number) => void;
  formatWeekRange: (start: Date) => string;
  schedule: WeeklySchedule | null;
  setSchedule: (schedule: WeeklySchedule | null) => void;
  handleGenerate: () => void;
  onClearSchedule: () => void;
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
  staffingNeeds: WeeklyStaffingNeeds;
  // Week-specific rules (optional - may not be passed initially)
  weekLockedRules?: ScheduleOverride[];
  setWeekLockedRules?: (rules: ScheduleOverride[]) => void;
  weekLockedRulesDisplay?: string[];
  setWeekLockedRulesDisplay?: (display: string[]) => void;
  // Permanent rules (all weeks)
  permanentRules?: ScheduleOverride[];
  setPermanentRules?: (rules: ScheduleOverride[]) => void;
  permanentRulesDisplay?: string[];
  setPermanentRulesDisplay?: (display: string[]) => void;
  onArchiveSchedule?: () => void;
}

export default function ScheduleView({
  weekStart,
  changeWeek,
  formatWeekRange,
  schedule,
  setSchedule,
  handleGenerate,
  onClearSchedule,
  isGenerating,
  employees,
  stats,
  lockedShifts,
  setLockedShifts,
  notes,
  setNotes,
  staffingNeeds,
  weekLockedRules,
  setWeekLockedRules,
  weekLockedRulesDisplay,
  setWeekLockedRulesDisplay,
  permanentRules,
  setPermanentRules,
  permanentRulesDisplay,
  setPermanentRulesDisplay,
  onArchiveSchedule,
}: Props) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Local state for notes to handle clearing immediately
  const [localNotes, setLocalNotes] = useState(notes);
  const justClearedRef = useRef(false);

  // Sync local notes when DB notes change (e.g., when switching weeks)
  // But skip if we just cleared notes locally
  useEffect(() => {
    if (justClearedRef.current) {
      justClearedRef.current = false;
      return;
    }
    // This is intentional - syncing from external source (DB) to local state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalNotes(notes);
  }, [notes]);

  // Handle notes change - update both local state and DB
  const handleNotesChange = (newNotes: string) => {
    setLocalNotes(newNotes);
    setNotes(newNotes);
  };

  // Derive parsed preview and rules from localNotes using useMemo (no setState in effects)
  const { parsedPreview, parsedRules } = useMemo(() => {
    if (localNotes.trim()) {
      const parsed = parseScheduleNotes(localNotes, employees);
      const formatted = formatParsedOverrides(parsed, employees);
      return { parsedPreview: formatted, parsedRules: parsed };
    }
    return { parsedPreview: [], parsedRules: [] };
  }, [localNotes, employees]);

  // Format time to 12h format
  const formatTime12h = (time: string): string => {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Print schedule function
  const handlePrintSchedule = () => {
    if (!schedule) return;

    const weekRange = formatWeekRange(weekStart);
    const scheduleDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabelsFull: Record<string, string> = {
      tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
      friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
    };
    const dayOffsets: Record<string, number> = {
      tuesday: 1, wednesday: 2, thursday: 3,
      friday: 4, saturday: 5, sunday: 6
    };

    // Get actual date for each day
    const getDateForDay = (day: string): number => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + dayOffsets[day]);
      return date.getDate();
    };

    // Group assignments by day
    const assignmentsByDay: Record<string, typeof schedule.assignments> = {};
    for (const day of scheduleDays) {
      assignmentsByDay[day] = [];
    }

    for (const assignment of schedule.assignments) {
      const shiftIdLower = assignment.shiftId.toLowerCase();
      for (const day of scheduleDays) {
        const abbrev = day.substring(0, 3);
        if (shiftIdLower.startsWith(day) || shiftIdLower.startsWith(abbrev + '-')) {
          assignmentsByDay[day].push(assignment);
          break;
        }
      }
    }

    // Sort each day's assignments by start time
    for (const day of scheduleDays) {
      assignmentsByDay[day].sort((a, b) => {
        const aTime = a.startTime || '00:00';
        const bTime = b.startTime || '00:00';
        return aTime.localeCompare(bTime);
      });
    }

    // Build HTML table cells for each day
    let tableContent = '';
    for (const day of scheduleDays) {
      const dayAssignments = assignmentsByDay[day];
      const dayDate = getDateForDay(day);
      let cellContent = '';

      if (dayAssignments.length === 0) {
        cellContent = '<div class="empty">No shifts</div>';
      } else {
        for (const assignment of dayAssignments) {
          const emp = employees.find(e => e.id === assignment.employeeId);
          const name = emp?.name || 'Unknown';
          const start = assignment.startTime ? formatTime12h(assignment.startTime) : '';
          const end = assignment.endTime ? formatTime12h(assignment.endTime) : '';
          cellContent += `
            <div class="shift">
              <div class="name">${name}</div>
              <div class="time">${start} - ${end}</div>
            </div>
          `;
        }
      }

      tableContent += `
        <div class="day-column">
          <div class="day-header">
            <div class="day-name">${dayLabelsFull[day]}</div>
            <div class="day-date">${dayDate}</div>
          </div>
          <div class="day-content">${cellContent}</div>
        </div>
      `;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schedule - ${weekRange}</title>
        <style>
          @page {
            size: landscape;
            margin: 0.4in;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background: white;
            color: #1a1a1a;
          }
          .header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 3px solid #e5a825;
          }
          .logo {
            font-size: 32px;
            font-weight: 800;
            color: #1a1a1a;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
          }
          .logo span {
            color: #e5a825;
          }
          .week-range {
            font-size: 16px;
            color: #666;
            font-weight: 500;
          }
          .schedule-grid {
            display: flex;
            gap: 8px;
            margin-top: 16px;
          }
          .day-column {
            flex: 1;
            min-width: 0;
          }
          .day-header {
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            color: white;
            padding: 10px 8px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .day-name {
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .day-date {
            font-size: 22px;
            font-weight: 800;
            margin-top: 2px;
            color: #e5a825;
          }
          .day-content {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-top: none;
            border-radius: 0 0 8px 8px;
            min-height: 200px;
            padding: 8px;
          }
          .shift {
            background: white;
            border: 1px solid #dee2e6;
            border-left: 4px solid #e5a825;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .shift:last-child {
            margin-bottom: 0;
          }
          .name {
            font-weight: 700;
            font-size: 14px;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          .time {
            font-size: 12px;
            color: #666;
            font-weight: 500;
          }
          .empty {
            color: #adb5bd;
            font-style: italic;
            text-align: center;
            padding: 20px;
            font-size: 13px;
          }
          .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Bobola<span>'</span>s</div>
          <div class="week-range">Week of ${weekRange}</div>
        </div>
        <div class="schedule-grid">
          ${tableContent}
        </div>
        <div class="footer">
          <span>Staff Schedule</span>
          <span>Printed ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      // Wait for content to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 100);
      };
      // Fallback if onload doesn't fire
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('Please allow pop-ups to print the schedule');
    }
  };

  // Ensure arrays are never undefined
  const safeWeekLockedRules = weekLockedRules || [];
  const safeWeekLockedRulesDisplay = weekLockedRulesDisplay || [];
  const safePermanentRules = permanentRules || [];
  const safePermanentRulesDisplay = permanentRulesDisplay || [];

  // Apply rules to this week only
  const handleApplyWeekRules = () => {
    if (parsedRules.length > 0 && setWeekLockedRules && setWeekLockedRulesDisplay) {
      const newRules = [...safeWeekLockedRules, ...parsedRules];
      const newDisplay = [...safeWeekLockedRulesDisplay, ...parsedPreview];
      setWeekLockedRules(newRules);
      setWeekLockedRulesDisplay(newDisplay);
      // Clear input after applying - set flag to prevent re-sync from DB
      justClearedRef.current = true;
      setLocalNotes('');
      setNotes('');
    }
  };

  // Apply rules permanently (all weeks - persists after refresh)
  const handleApplyPermanentRules = () => {
    if (parsedRules.length > 0 && setPermanentRules && setPermanentRulesDisplay) {
      const newRules = [...safePermanentRules, ...parsedRules];
      const newDisplay = [...safePermanentRulesDisplay, ...parsedPreview];
      setPermanentRules(newRules);
      setPermanentRulesDisplay(newDisplay);
      // Clear input after applying - set flag to prevent re-sync from DB
      justClearedRef.current = true;
      setLocalNotes('');
      setNotes('');
    }
  };

  // Clear week rules
  const handleClearWeekRules = () => {
    if (setWeekLockedRules && setWeekLockedRulesDisplay) {
      setWeekLockedRules([]);
      setWeekLockedRulesDisplay([]);
    }
  };

  // Clear permanent rules
  const handleClearPermanentRules = () => {
    if (setPermanentRules && setPermanentRulesDisplay) {
      setPermanentRules([]);
      setPermanentRulesDisplay([]);
    }
  };

  // Remove single week rule
  const handleRemoveWeekRule = (index: number) => {
    if (setWeekLockedRules && setWeekLockedRulesDisplay) {
      setWeekLockedRules(safeWeekLockedRules.filter((_, i) => i !== index));
      setWeekLockedRulesDisplay(safeWeekLockedRulesDisplay.filter((_, i) => i !== index));
    }
  };

  // Remove single permanent rule
  const handleRemovePermanentRule = (index: number) => {
    if (setPermanentRules && setPermanentRulesDisplay) {
      setPermanentRules(safePermanentRules.filter((_, i) => i !== index));
      setPermanentRulesDisplay(safePermanentRulesDisplay.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Schedule</h1>
          <p className="text-xs sm:text-sm text-[#6b6b75] mt-1">Manage your weekly staff schedule</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {schedule && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#ef4444]/30 hover:border-[#ef4444]/50"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Schedule</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}

          {schedule && (
            <button
              onClick={handlePrintSchedule}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#1a1a1f] hover:bg-[#222228] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#2a2a32] hover:border-[#3a3a45]"
            >
              <PrintIcon className="w-4 h-4" />
              Print
            </button>
          )}

          {schedule && onArchiveSchedule && (
            <button
              onClick={onArchiveSchedule}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 text-[#a855f7] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#a855f7]/30 hover:border-[#a855f7]/50"
            >
              <ArchiveBoxIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
              <span className="sm:hidden">Save</span>
            </button>
          )}

          {/* Clear Confirmation Modal */}
          {showClearConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-[#1a1a1f] rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 transform transition-all scale-100 border border-[#2a2a32]">
                <div className="flex items-center gap-3 mb-4 text-[#ef4444]">
                  <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
                    <TrashIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Clear Schedule?</h3>
                </div>
                <p className="text-[#a0a0a8] mb-6">
                  Are you sure you want to clear the entire schedule? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 text-[#a0a0a8] font-medium hover:bg-[#222228] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onClearSchedule();
                      setShowClearConfirm(false);
                    }}
                    className="px-4 py-2 bg-[#ef4444] text-white font-medium rounded-lg hover:bg-[#dc2626] shadow-lg shadow-[#ef4444]/20 transition-all"
                  >
                    Yes, Clear It
                  </button>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#e5a825] hover:bg-[#f0b429] disabled:bg-[#3a3a45] text-[#0d0d0f] disabled:text-[#6b6b75] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#e5a825]/20 hover:shadow-[#e5a825]/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner />
                <span className="hidden sm:inline">Generating...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{schedule ? 'Regenerate' : 'Generate Schedule'}</span>
                <span className="sm:hidden">{schedule ? 'Regen' : 'Generate'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          value={schedule ? `${stats.coverage}%` : '-'}
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
      <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-4 sm:p-5 hover:border-[#3a3a45] transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Left: Input */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#a0a0a8]">
                Week Notes <span className="text-[#6b6b75] font-normal">({formatWeekRange(weekStart).split(',')[0]})</span>
              </label>
              {localNotes.trim() && (
                <button
                  onClick={() => {
                    justClearedRef.current = true;
                    setLocalNotes('');
                    setNotes('');
                  }}
                  className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={localNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="e.g., December 24 closing at 2pm, December 25 CLOSED, [Name] opens Saturday, [Name] off Tuesday..."
              className="w-full h-20 p-3 bg-[#141417] border border-[#2a2a32] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] resize-none transition-all duration-200 placeholder:text-[#6b6b75]"
            />
            {/* Preview */}
            {parsedPreview.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {parsedPreview.map((text, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${text.includes('CLOSED') ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30' :
                      text.includes('Close at') ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30' :
                        text.startsWith('✗') ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30' :
                          'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                      }`}
                  >
                    {text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Middle: Apply Buttons */}
          <div className="flex lg:flex-col items-center justify-center gap-4 lg:gap-2 lg:pt-6">
            {/* This Week Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleApplyWeekRules}
                disabled={parsedPreview.length === 0}
                className={`p-2.5 rounded-full transition-all duration-200 ${parsedPreview.length > 0
                  ? 'bg-[#e5a825] text-[#0d0d0f] hover:bg-[#f5b835] shadow-lg shadow-[#e5a825]/30 hover:scale-110'
                  : 'bg-[#2a2a32] text-[#6b6b75] cursor-not-allowed'
                  }`}
                title="Apply to this week only"
              >
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-[#6b6b75] mt-0.5">This Week</span>
            </div>
            {/* Save Permanently Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleApplyPermanentRules}
                disabled={parsedPreview.length === 0}
                className={`p-2.5 rounded-full transition-all duration-200 ${parsedPreview.length > 0
                  ? 'bg-[#a855f7] text-white hover:bg-[#b975f9] shadow-lg shadow-[#a855f7]/30 hover:scale-110'
                  : 'bg-[#2a2a32] text-[#6b6b75] cursor-not-allowed'
                  }`}
                title="Save permanently (all weeks, persists after refresh)"
              >
                <LockClosedIcon className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-[#6b6b75] mt-0.5">Always</span>
            </div>
          </div>

          {/* Right: Active Rules (Two Sections) */}
          <div className="w-full lg:w-72 space-y-2">
            {/* This Week Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-medium text-[#e5a825] flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  This Week {safeWeekLockedRulesDisplay.length > 0 && `(${safeWeekLockedRulesDisplay.length})`}
                </label>
                {safeWeekLockedRulesDisplay.length > 0 && (
                  <button onClick={handleClearWeekRules} className="text-[10px] text-[#ef4444] hover:text-[#f87171]">Clear</button>
                )}
              </div>
              <div className="h-16 bg-[#141417] border border-[#e5a825]/30 rounded-lg p-1.5 overflow-y-auto">
                {safeWeekLockedRulesDisplay.length > 0 ? (
                  <div className="space-y-1">
                    {safeWeekLockedRulesDisplay.map((text, idx) => (
                      <div key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center justify-between gap-1 bg-[#e5a825]/10 text-[#e5a825] border border-[#e5a825]/30">
                        <span className="truncate">{text}</span>
                        <button onClick={() => handleRemoveWeekRule(idx)} className="hover:text-[#ef4444] flex-shrink-0"><XIcon className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] text-[#6b6b75]">Only this week</div>
                )}
              </div>
            </div>
            {/* Permanent Rules */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-medium text-[#a855f7] flex items-center gap-1">
                  <LockClosedIcon className="w-3 h-3" />
                  Always {safePermanentRulesDisplay.length > 0 && `(${safePermanentRulesDisplay.length})`}
                </label>
                {safePermanentRulesDisplay.length > 0 && (
                  <button onClick={handleClearPermanentRules} className="text-[10px] text-[#ef4444] hover:text-[#f87171]">Clear</button>
                )}
              </div>
              <div className="h-16 bg-[#141417] border border-[#a855f7]/30 rounded-lg p-1.5 overflow-y-auto">
                {safePermanentRulesDisplay.length > 0 ? (
                  <div className="space-y-1">
                    {safePermanentRulesDisplay.map((text, idx) => (
                      <div key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center justify-between gap-1 bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/30">
                        <span className="truncate">{text}</span>
                        <button onClick={() => handleRemovePermanentRule(idx)} className="hover:text-[#ef4444] flex-shrink-0"><XIcon className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-[10px] text-[#6b6b75]">Saved rules (persist after refresh)</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] overflow-hidden hover:border-[#3a3a45] transition-colors duration-200">
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
              onUpdateSchedule={setSchedule}
            />
          ) : (
            <EmptyState onGenerate={handleGenerate} />
          )}
        </div>
      </div>

      {/* Conflicts & Warnings */}
      {schedule && (schedule.conflicts.length > 0 || schedule.warnings.length > 0) && (
        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
          <h3 className="text-sm font-medium text-white mb-4">Issues & Warnings</h3>
          <div className="space-y-3">
            {schedule.conflicts.map((conflict, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/20">
                <div className="w-8 h-8 bg-[#ef4444]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertIcon className="w-4 h-4 text-[#ef4444]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#ef4444]">
                    {conflict.type === 'rule_violation' ? 'Rule Violation' :
                      conflict.type === 'no_bartender' ? 'Missing Bartender' :
                        'Coverage Gap'}
                  </p>
                  <p className="text-sm text-[#ef4444]/80">{conflict.message}</p>
                </div>
              </div>
            ))}
            {schedule.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-[#e5a825]/10 rounded-lg border border-[#e5a825]/20">
                <div className="w-8 h-8 bg-[#e5a825]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <WarningIcon className="w-4 h-4 text-[#e5a825]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#e5a825]">
                    {warning.type === 'overtime' ? 'Overtime Alert' : 'Scheduling Note'}
                  </p>
                  <p className="text-sm text-[#e5a825]/80">{warning.message}</p>
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
    blue: { bg: 'bg-[#3b82f6]', icon: 'text-white', shadow: 'shadow-[#3b82f6]/30' },
    green: { bg: 'bg-[#22c55e]', icon: 'text-white', shadow: 'shadow-[#22c55e]/30' },
    emerald: { bg: 'bg-[#22c55e]', icon: 'text-white', shadow: 'shadow-[#22c55e]/30' },
    red: { bg: 'bg-[#ef4444]', icon: 'text-white', shadow: 'shadow-[#ef4444]/30' },
    purple: { bg: 'bg-[#a855f7]', icon: 'text-white', shadow: 'shadow-[#a855f7]/30' },
  };

  const colorStyle = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-5 hover:border-[#3a3a45] transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#6b6b75]">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorStyle.bg} shadow-lg ${colorStyle.shadow} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && <p className="text-xs text-[#6b6b75] mt-1">{trend}</p>}
        </div>
        {weekNav && (
          <div className="flex gap-1">
            <button
              onClick={weekNav.onPrev}
              className="p-1.5 hover:bg-[#222228] rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronLeftIcon className="w-4 h-4 text-[#6b6b75]" />
            </button>
            <button
              onClick={weekNav.onNext}
              className="p-1.5 hover:bg-[#222228] rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronRightIcon className="w-4 h-4 text-[#6b6b75]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to format time (24h to 12h)
function formatTime(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24 || '';
  const parts = time24.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10) || 0;
  if (isNaN(hours)) return time24;
  const period = hours >= 12 ? 'p' : 'a';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  if (minutes === 0) {
    return `${hour12}${period}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`;
}

// Schedule Grid Component
function ScheduleGrid({
  schedule,
  weekStart,
  lockedShifts,
  onToggleLock,
  employees,
  onUpdateSchedule,
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
  onUpdateSchedule?: (schedule: WeeklySchedule) => void;
}) {
  const [draggedItem, setDraggedItem] = useState<{
    employeeId: string;
    day: DayOfWeek;
    shiftType: 'morning' | 'night';
    assignmentIndex: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    employeeId: string;
    day: DayOfWeek;
  } | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dayToFull: Record<string, DayOfWeek> = {
    Mon: 'monday',
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
    Sat: 'saturday',
    Sun: 'sunday',
  };

  const getDateForDay = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return date.getDate();
  };

  const getDateStringForDay = (day: DayOfWeek) => {
    const dayOffsets: Record<DayOfWeek, number> = {
      monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6
    };
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayOffsets[day]);
    return date.toISOString().split('T')[0];
  };

  const getAssignmentForEmployeeDay = (employeeId: string, day: string) => {
    const dayFull = dayToFull[day];
    const assignments = schedule.assignments.filter(a =>
      a.employeeId === employeeId &&
      a.date === getDateStringForDay(dayFull)
    );
    return assignments;
  };

  // Determine shift type based on start time: before 10 = morning, 10-16 = mid, 16+ = dinner/night
  const getShiftTypeFromTime = (startTime?: string): 'morning' | 'mid' | 'night' => {
    if (!startTime) return 'morning';
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 10) return 'morning';
    if (hour < 16) return 'mid';
    return 'night';
  };

  const getShiftType = (shiftId: string): 'morning' | 'night' => {
    if (shiftId.includes('night')) return 'night';
    return 'morning';
  };

  const isLocked = (employeeId: string, day: DayOfWeek, shiftType: 'morning' | 'night') => {
    return lockedShifts.some(
      l => l.employeeId === employeeId && l.day === day && l.shiftType === shiftType
    );
  };

  const handleDragStart = (e: React.DragEvent, employeeId: string, day: DayOfWeek, shiftType: 'morning' | 'night', assignmentIndex: number) => {
    if (isLocked(employeeId, day, shiftType)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ employeeId, day, shiftType, assignmentIndex });
  };

  const handleDragOver = (e: React.DragEvent, employeeId: string, day: DayOfWeek) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ employeeId, day });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetEmployeeId: string, targetDay: DayOfWeek) => {
    e.preventDefault();
    if (!draggedItem || !onUpdateSchedule) return;

    const targetDayFull = targetDay;
    const sourceDayFull = draggedItem.day;

    // Find the source assignment
    const sourceAssignmentIdx = schedule.assignments.findIndex(a =>
      a.employeeId === draggedItem.employeeId &&
      a.date === getDateStringForDay(sourceDayFull) &&
      getShiftType(a.shiftId) === draggedItem.shiftType
    );

    if (sourceAssignmentIdx === -1) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const sourceAssignment = schedule.assignments[sourceAssignmentIdx];
    const newAssignments = [...schedule.assignments];

    // Check if the target cell already has an assignment
    const targetAssignmentIdx = newAssignments.findIndex(a =>
      a.employeeId === targetEmployeeId &&
      a.date === getDateStringForDay(targetDayFull)
    );

    if (targetAssignmentIdx !== -1) {
      // Swap: move target to source location
      const targetAssignment = newAssignments[targetAssignmentIdx];

      // Update target assignment to source location
      newAssignments[targetAssignmentIdx] = {
        ...targetAssignment,
        employeeId: draggedItem.employeeId,
        date: sourceAssignment.date,
        shiftId: sourceAssignment.shiftId.replace(draggedItem.day.slice(0, 3), targetDay.toLowerCase().slice(0, 3)),
      };

      // Update source assignment to target location
      newAssignments[sourceAssignmentIdx] = {
        ...sourceAssignment,
        employeeId: targetEmployeeId,
        date: getDateStringForDay(targetDayFull),
        shiftId: targetAssignment.shiftId,
      };
    } else {
      // Move: just update the source assignment to the new location
      newAssignments[sourceAssignmentIdx] = {
        ...sourceAssignment,
        employeeId: targetEmployeeId,
        date: getDateStringForDay(targetDayFull),
      };
    }

    onUpdateSchedule({
      ...schedule,
      assignments: newAssignments
    });

    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border-b-2 border-[#2a2a32] bg-[#141417] text-left min-w-[150px] text-[#a0a0a8] text-sm font-medium">Employee</th>
            {days.map((day, idx) => (
              <th key={day} className="p-2 border-b-2 border-[#2a2a32] bg-[#141417] min-w-[120px]">
                <div className="text-xs font-medium text-[#6b6b75] uppercase">{day}</div>
                <div className="text-lg font-semibold text-white">{getDateForDay(idx)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id} className="border-b border-[#2a2a32] hover:bg-[#222228]/50">
              <td className="p-3 font-medium text-white bg-[#141417] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
                {emp.name}
              </td>
              {days.map(day => {
                const dayFull = dayToFull[day];
                const assignments = getAssignmentForEmployeeDay(emp.id, day);
                const isClosed = day === 'Mon';
                const isDropping = dropTarget?.employeeId === emp.id && dropTarget?.day === dayFull;

                return (
                  <td
                    key={day}
                    className={`p-2 border-l border-[#2a2a32] text-center relative group transition-all ${isDropping ? 'bg-[#3b82f6]/10 ring-2 ring-[#3b82f6] ring-inset' : ''
                      }`}
                    onDragOver={(e) => handleDragOver(e, emp.id, dayFull)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, emp.id, dayFull)}
                  >
                    {assignments.length > 0 ? (
                      <div className="space-y-1">
                        {assignments.map((a, i) => {
                          const shiftType = getShiftType(a.shiftId);
                          const shiftTypeByTime = getShiftTypeFromTime(a.startTime);
                          const locked = isLocked(emp.id, dayFull, shiftType);
                          const isDragging = draggedItem?.employeeId === emp.id && draggedItem?.day === dayFull;

                          // Colors: morning = orange, mid = green, night/dinner = red
                          const shiftColorClass = shiftTypeByTime === 'night'
                            ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30' // red for dinner
                            : shiftTypeByTime === 'mid'
                              ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30' // green for mid
                              : 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30'; // orange for morning

                          return (
                            <div
                              key={i}
                              draggable={!locked}
                              onDragStart={(e) => handleDragStart(e, emp.id, dayFull, shiftType, i)}
                              onDragEnd={handleDragEnd}
                              className={`relative text-sm py-1 px-2 rounded-md font-medium cursor-grab active:cursor-grabbing transition-all ${locked ? 'ring-2 ring-[#e5a825]' : ''
                                } ${isDragging ? 'opacity-50 scale-95' : ''
                                } ${shiftColorClass}`}
                            >
                              {a.startTime && a.endTime ? (
                                <span>{formatTime(a.startTime)} - {formatTime(a.endTime)}</span>
                              ) : (
                                <span>{shiftType === 'night' ? 'Night' : 'Morning'}</span>
                              )}

                              {/* Lock Toggle Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleLock(emp.id, dayFull, shiftType);
                                }}
                                className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${locked
                                  ? 'bg-[#e5a825] text-[#0d0d0f] shadow-md'
                                  : 'bg-[#2a2a32] text-[#6b6b75] opacity-0 group-hover:opacity-100 hover:bg-[#3a3a45]'
                                  }`}
                                title={locked ? 'Unlock shift' : 'Lock shift'}
                              >
                                {locked ? 'L' : 'U'}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateSchedule) {
                                    const newAssignments = schedule.assignments.filter((_, idx) => {
                                      const assignmentDate = getDateStringForDay(dayFull);
                                      const currentAssignment = schedule.assignments[idx];
                                      // Find the matching assignment to remove
                                      return !(
                                        currentAssignment.employeeId === emp.id &&
                                        currentAssignment.date === assignmentDate &&
                                        currentAssignment.shiftId === a.shiftId
                                      );
                                    });
                                    onUpdateSchedule({
                                      ...schedule,
                                      assignments: newAssignments
                                    });
                                  }
                                }}
                                className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all bg-[#ef4444] text-white opacity-0 group-hover:opacity-100 hover:bg-[#dc2626] shadow-md"
                                title="Delete shift"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className={`h-8 flex items-center justify-center text-[#6b6b75] text-sm rounded-md transition-all ${isDropping ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-2 border-dashed border-[#3b82f6]/50' : ''
                          }`}
                      >
                        {isClosed ? 'CLOSED' : isDropping ? 'Drop here' : 'OFF'}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Empty State Component
function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-[#222228] rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg border border-[#2a2a32]">
        <CalendarIcon className="w-10 h-10 text-[#e5a825]" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No schedule generated</h3>
      <p className="text-sm text-[#6b6b75] mb-6 max-w-sm mx-auto">
        Generate a schedule to automatically assign staff based on their availability and preferences.
      </p>
      <button
        onClick={onGenerate}
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#e5a825] hover:bg-[#f0b429] text-[#0d0d0f] text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#e5a825]/20 hover:shadow-[#e5a825]/40 hover:scale-[1.02]"
      >
        <SparklesIcon className="w-4 h-4" />
        Generate Schedule
      </button>
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArchiveBoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
