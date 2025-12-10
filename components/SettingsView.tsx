'use client';

import { useState } from 'react';
import { WeeklySchedule, Employee, ScheduleAssignment } from '@/lib/types';

export interface AppSettings {
  // Business Settings
  restaurantName: string;
  closedDays: string[];

  // Business Hours
  businessHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };

  // Scheduling Rules
  overtimeThreshold: number;
  minRestBetweenShifts: number;
  bartendingThreshold: number;
  aloneThreshold: number;

  // Display Preferences
  timeFormat: '12h' | '24h';
  weekStartDay: 'sunday' | 'monday';
}

interface Props {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onExportSchedule?: () => void;
  schedule?: WeeklySchedule | null;
  employees?: Employee[];
  weekStart?: Date;
  formatWeekRange?: (date: Date) => string;
}

const DEFAULT_SETTINGS: AppSettings = {
  restaurantName: "Bobola's Restaurant",
  closedDays: ['monday'],
  businessHours: {
    monday: { open: '00:00', close: '00:00', closed: true },
    tuesday: { open: '07:15', close: '21:00', closed: false },
    wednesday: { open: '07:15', close: '21:00', closed: false },
    thursday: { open: '07:15', close: '21:00', closed: false },
    friday: { open: '07:15', close: '21:00', closed: false },
    saturday: { open: '07:15', close: '21:00', closed: false },
    sunday: { open: '07:15', close: '14:30', closed: false },
  },
  overtimeThreshold: 40,
  minRestBetweenShifts: 8,
  bartendingThreshold: 3,
  aloneThreshold: 3,
  timeFormat: '12h',
  weekStartDay: 'monday',
};

export { DEFAULT_SETTINGS };

export default function SettingsView({ settings, onUpdateSettings, onExportSchedule, schedule, employees, weekStart, formatWeekRange }: Props) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [copiedHours, setCopiedHours] = useState<{ open: string; close: string } | null>(null);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const copyHours = (day: string) => {
    const hours = localSettings.businessHours[day];
    setCopiedHours({ open: hours.open, close: hours.close });
  };

  const pasteHours = (day: string) => {
    if (!copiedHours) return;
    setLocalSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          open: copiedHours.open,
          close: copiedHours.close,
          closed: false
        }
      }
    }));
    setHasChanges(true);
  };

  const applyToAllDays = (day: string) => {
    const hours = localSettings.businessHours[day];
    const newBusinessHours = { ...localSettings.businessHours };
    for (const d of days) {
      if (d !== day && d !== 'monday') { // Don't change the source day or Monday (typically closed)
        newBusinessHours[d] = {
          ...newBusinessHours[d],
          open: hours.open,
          close: hours.close,
          closed: hours.closed
        };
      }
    }
    setLocalSettings(prev => ({ ...prev, businessHours: newBusinessHours }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  // Format time to 12h format
  const formatTime12h = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Print schedule in a clean format
  const handlePrintSchedule = () => {
    if (!schedule || !employees || !weekStart) {
      alert('No schedule to print. Please generate a schedule first.');
      return;
    }

    const weekRange = formatWeekRange ? formatWeekRange(weekStart) : '';
    const scheduleDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabelsShort: Record<string, string> = {
      tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
      friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
    };

    // Group assignments by day - check shiftId for day name
    const assignmentsByDay: Record<string, ScheduleAssignment[]> = {};
    for (const day of scheduleDays) {
      assignmentsByDay[day] = [];
    }

    for (const assignment of schedule.assignments) {
      // shiftId format can be: "tuesday-07:15", "tuesday-morning", "tue-1", etc.
      const shiftIdLower = assignment.shiftId.toLowerCase();

      // Find which day this assignment belongs to
      for (const day of scheduleDays) {
        // Check for full day name or 3-letter abbreviation
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
          <div class="day-header">${dayLabelsShort[day]}</div>
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
            padding: 12px 8px;
            text-align: center;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-radius: 8px 8px 0 0;
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
          <div class="logo">${localSettings.restaurantName.replace("'", "<span>'</span>")}</div>
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-[#6b6b75] mt-1">Configure your scheduling preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {showSaved && (
            <span className="text-sm text-[#22c55e] flex items-center gap-1">
              <CheckIcon className="w-4 h-4" />
              Saved!
            </span>
          )}
          {hasChanges && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg font-medium hover:bg-[#f5b835] transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Business Settings */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BuildingIcon className="w-5 h-5 text-[#e5a825]" />
          Business Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              value={localSettings.restaurantName}
              onChange={(e) => updateSetting('restaurantName', e.target.value)}
              className="w-full max-w-md px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825]"
            />
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-[#e5a825]" />
            Business Hours
          </h2>
          {copiedHours && (
            <span className="text-xs text-[#22c55e] flex items-center gap-1">
              <CheckIcon className="w-3 h-3" />
              Copied: {copiedHours.open} - {copiedHours.close}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {days.map(day => {
            const hours = localSettings.businessHours[day];
            return (
              <div key={day} className="flex items-center gap-4 p-3 bg-[#141417] rounded-lg border border-[#2a2a32]">
                <div className="w-28">
                  <span className="text-sm font-medium text-white">{dayLabels[day]}</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hours.closed}
                    onChange={(e) => updateBusinessHours(day, 'closed', e.target.checked)}
                    className="w-4 h-4 rounded border-[#2a2a32] bg-[#0d0d0f] text-[#e5a825] focus:ring-[#e5a825]/40"
                  />
                  <span className="text-sm text-[#6b6b75]">Closed</span>
                </label>

                {!hours.closed && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                        className="px-3 py-1.5 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                      />
                      <span className="text-[#6b6b75]">to</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                        className="px-3 py-1.5 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                      />
                    </div>

                    {/* Copy/Paste/Apply buttons */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => copyHours(day)}
                        className="p-1.5 text-[#6b6b75] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded transition-colors"
                        title="Copy these hours"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => pasteHours(day)}
                        disabled={!copiedHours}
                        className={`p-1.5 rounded transition-colors ${
                          copiedHours
                            ? 'text-[#6b6b75] hover:text-[#22c55e] hover:bg-[#22c55e]/10'
                            : 'text-[#3a3a45] cursor-not-allowed'
                        }`}
                        title={copiedHours ? 'Paste copied hours' : 'Copy hours first'}
                      >
                        <PasteIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => applyToAllDays(day)}
                        className="p-1.5 text-[#6b6b75] hover:text-[#a855f7] hover:bg-[#a855f7]/10 rounded transition-colors"
                        title="Apply to all other days"
                      >
                        <ApplyAllIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {hours.closed && (
                  <span className="text-sm text-[#ef4444] flex-1">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduling Rules */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <RulesIcon className="w-5 h-5 text-[#e5a825]" />
          Scheduling Rules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Overtime Threshold (hours/week)
            </label>
            <input
              type="number"
              min="20"
              max="60"
              value={localSettings.overtimeThreshold}
              onChange={(e) => updateSetting('overtimeThreshold', parseInt(e.target.value) || 40)}
              className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
            <p className="text-xs text-[#6b6b75] mt-1">Warn when employee approaches this many hours</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Min Rest Between Shifts (hours)
            </label>
            <input
              type="number"
              min="4"
              max="24"
              value={localSettings.minRestBetweenShifts}
              onChange={(e) => updateSetting('minRestBetweenShifts', parseInt(e.target.value) || 8)}
              className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
            <p className="text-xs text-[#6b6b75] mt-1">Minimum hours between end of one shift and start of next</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Bartending Skill Threshold
            </label>
            <select
              value={localSettings.bartendingThreshold}
              onChange={(e) => updateSetting('bartendingThreshold', parseInt(e.target.value))}
              className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} stars</option>
              ))}
            </select>
            <p className="text-xs text-[#6b6b75] mt-1">Employees below this need a higher-rated bartender on shift</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Can Work Alone Threshold
            </label>
            <select
              value={localSettings.aloneThreshold}
              onChange={(e) => updateSetting('aloneThreshold', parseInt(e.target.value))}
              className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} stars</option>
              ))}
            </select>
            <p className="text-xs text-[#6b6b75] mt-1">Rating needed for an employee to work alone</p>
          </div>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DisplayIcon className="w-5 h-5 text-[#e5a825]" />
          Display Preferences
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Time Format
            </label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                localSettings.timeFormat === '12h'
                  ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
                  : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
                <input
                  type="radio"
                  name="timeFormat"
                  value="12h"
                  checked={localSettings.timeFormat === '12h'}
                  onChange={() => updateSetting('timeFormat', '12h')}
                  className="hidden"
                />
                <span className="text-sm font-medium">12-hour (2:00 PM)</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                localSettings.timeFormat === '24h'
                  ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
                  : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
                <input
                  type="radio"
                  name="timeFormat"
                  value="24h"
                  checked={localSettings.timeFormat === '24h'}
                  onChange={() => updateSetting('timeFormat', '24h')}
                  className="hidden"
                />
                <span className="text-sm font-medium">24-hour (14:00)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Week Starts On
            </label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                localSettings.weekStartDay === 'monday'
                  ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
                  : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
                <input
                  type="radio"
                  name="weekStart"
                  value="monday"
                  checked={localSettings.weekStartDay === 'monday'}
                  onChange={() => updateSetting('weekStartDay', 'monday')}
                  className="hidden"
                />
                <span className="text-sm font-medium">Monday</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                localSettings.weekStartDay === 'sunday'
                  ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
                  : 'bg-[#141417] border-[#2a2a32] text-[#6b6b75] hover:border-[#3a3a45]'
              }`}>
                <input
                  type="radio"
                  name="weekStart"
                  value="sunday"
                  checked={localSettings.weekStartDay === 'sunday'}
                  onChange={() => updateSetting('weekStartDay', 'sunday')}
                  className="hidden"
                />
                <span className="text-sm font-medium">Sunday</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DataIcon className="w-5 h-5 text-[#e5a825]" />
          Data Management
        </h2>

        <div className="flex flex-wrap gap-3">
          {onExportSchedule && (
            <button
              onClick={onExportSchedule}
              className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg font-medium hover:bg-[#2563eb] transition-colors flex items-center gap-2"
            >
              <ExportIcon className="w-4 h-4" />
              Export Schedule
            </button>
          )}
          <button
            onClick={handlePrintSchedule}
            className="px-4 py-2 bg-[#141417] text-white border border-[#2a2a32] rounded-lg font-medium hover:bg-[#222228] transition-colors flex items-center gap-2"
          >
            <PrintIcon className="w-4 h-4" />
            Print Schedule
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-[#141417] text-[#ef4444] border border-[#2a2a32] rounded-lg font-medium hover:bg-[#ef4444]/10 hover:border-[#ef4444]/30 transition-colors flex items-center gap-2"
          >
            <ResetIcon className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
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

function RulesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function DisplayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function DataIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
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

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );
}

function PasteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ApplyAllIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0115 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
    </svg>
  );
}
