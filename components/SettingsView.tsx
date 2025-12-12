'use client';

import { useState } from 'react';
import { WeeklySchedule, Employee, ScheduleAssignment, WeeklyStaffingNeeds, StaffingSlot, DayOfWeek } from '@/lib/types';
import UserManagement from './UserManagement';
import { User } from '@/lib/instantdb';
import { normalizeStaffingSlotLabel } from '@/lib/scheduling/labels';
import { cloneWeeklyStaffingNeedsWithFreshIds, RECOMMENDED_WEEKLY_STAFFING_NEEDS } from '@/lib/staffingPresets';
import { validateStaffingNeeds } from '@/lib/staffingValidation';

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
  minShiftHours: number; // Minimum hours per shift (default 3)

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
  logoUrl?: string | null;
  onLogoChange?: (url: string | null) => void;
  onSyncEmployees?: () => void;
  missingEmployeeCount?: number;
  // User management props
  currentUser?: User;
  profilePicUrl?: string | null;
  // Staffing needs props
  staffingNeeds?: WeeklyStaffingNeeds;
  setStaffingNeeds?: (needs: WeeklyStaffingNeeds) => void;
  saveAsDefaultTemplate?: () => void;
  showSavedDefaultMessage?: boolean;
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
  minShiftHours: 3,
  timeFormat: '12h',
  weekStartDay: 'monday',
};

export { DEFAULT_SETTINGS };

export default function SettingsView({ settings, onUpdateSettings, onExportSchedule, schedule, employees, weekStart, formatWeekRange, logoUrl, onLogoChange, onSyncEmployees, missingEmployeeCount, currentUser, profilePicUrl, staffingNeeds, setStaffingNeeds, saveAsDefaultTemplate, showSavedDefaultMessage }: Props) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [copiedHours, setCopiedHours] = useState<{ open: string; close: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'staffing' | 'users'>('general');
  const [copiedDay, setCopiedDay] = useState<{ slots: StaffingSlot[]; notes?: string; fromDay: string } | null>(null);
  const [copiedSlot, setCopiedSlot] = useState<{ startTime: string; endTime: string; label: string } | null>(null);

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

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      // Fallback if popup blocked - use iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.write(printContent);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      }
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
          {showSaved && activeSection === 'general' && (
            <span className="text-sm text-[#22c55e] flex items-center gap-1">
              <CheckIcon className="w-4 h-4" />
              Saved!
            </span>
          )}
          {hasChanges && activeSection === 'general' && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg font-medium hover:bg-[#f5b835] transition-colors"
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 border-b border-[#2a2a32] pb-0">
        <button
          onClick={() => setActiveSection('general')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeSection === 'general'
              ? 'bg-[#1a1a1f] text-[#e5a825] border border-[#2a2a32] border-b-[#1a1a1f] -mb-px'
              : 'text-[#6b6b75] hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <SettingsGearIcon className="w-4 h-4" />
            General
          </span>
        </button>
        <button
          onClick={() => setActiveSection('staffing')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeSection === 'staffing'
              ? 'bg-[#1a1a1f] text-[#e5a825] border border-[#2a2a32] border-b-[#1a1a1f] -mb-px'
              : 'text-[#6b6b75] hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <GridIcon className="w-4 h-4" />
            Staffing
          </span>
        </button>
        <button
          onClick={() => setActiveSection('users')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeSection === 'users'
              ? 'bg-[#1a1a1f] text-[#e5a825] border border-[#2a2a32] border-b-[#1a1a1f] -mb-px'
              : 'text-[#6b6b75] hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <UserGroupIcon className="w-4 h-4" />
            Users
          </span>
        </button>
      </div>

      {/* Users Section */}
      {activeSection === 'users' && currentUser && employees && (
        <UserManagement
          currentUser={currentUser}
          employees={employees}
          profilePicUrl={profilePicUrl}
        />
      )}

      {/* Staffing Section */}
      {activeSection === 'staffing' && staffingNeeds && setStaffingNeeds && (
        <StaffingSection
          staffingNeeds={staffingNeeds}
          setStaffingNeeds={setStaffingNeeds}
          saveAsDefaultTemplate={saveAsDefaultTemplate}
          showSavedDefaultMessage={showSavedDefaultMessage}
          copiedDay={copiedDay}
          setCopiedDay={setCopiedDay}
          copiedSlot={copiedSlot}
          setCopiedSlot={setCopiedSlot}
        />
      )}

      {/* General Settings */}
      {activeSection === 'general' && (
        <>
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

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {/* Current Logo Preview */}
              <div className="w-16 h-16 bg-[#e5a825] rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#0d0d0f] font-bold text-2xl">B</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="px-4 py-2 bg-[#141417] text-white border border-[#2a2a32] rounded-lg font-medium hover:bg-[#222228] transition-colors cursor-pointer flex items-center gap-2">
                    <UploadIcon className="w-4 h-4" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onLogoChange) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            onLogoChange(event.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {logoUrl && onLogoChange && (
                    <button
                      onClick={() => onLogoChange(null)}
                      className="px-3 py-2 bg-[#141417] text-[#ef4444] border border-[#2a2a32] rounded-lg font-medium hover:bg-[#ef4444]/10 hover:border-[#ef4444]/30 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#6b6b75]">
                  Recommended: Square image, at least 88x88 pixels
                </p>
              </div>
            </div>
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

          <div>
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Minimum Shift Hours
            </label>
            <input
              type="number"
              min="1"
              max="8"
              step="0.5"
              value={localSettings.minShiftHours}
              onChange={(e) => updateSetting('minShiftHours', parseFloat(e.target.value) || 3)}
              className="w-full max-w-[120px] px-4 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
            <p className="text-xs text-[#6b6b75] mt-1">Servers must work at least this many hours per shift</p>
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
          {onSyncEmployees && missingEmployeeCount !== undefined && missingEmployeeCount > 0 && (
            <button
              onClick={onSyncEmployees}
              className="px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg font-medium hover:bg-[#f0b429] transition-colors flex items-center gap-2"
            >
              <SyncIcon className="w-4 h-4" />
              Sync Missing Employees ({missingEmployeeCount})
            </button>
          )}
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
        </>
      )}
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

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function SettingsGearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UserGroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

// Staffing Section Component
interface StaffingSectionProps {
  staffingNeeds: WeeklyStaffingNeeds;
  setStaffingNeeds: (needs: WeeklyStaffingNeeds) => void;
  saveAsDefaultTemplate?: () => void;
  showSavedDefaultMessage?: boolean;
  copiedDay: { slots: StaffingSlot[]; notes?: string; fromDay: string } | null;
  setCopiedDay: (day: { slots: StaffingSlot[]; notes?: string; fromDay: string } | null) => void;
  copiedSlot: { startTime: string; endTime: string; label: string } | null;
  setCopiedSlot: (slot: { startTime: string; endTime: string; label: string } | null) => void;
}

function StaffingSection({ staffingNeeds, setStaffingNeeds, saveAsDefaultTemplate, showSavedDefaultMessage, copiedDay, setCopiedDay }: StaffingSectionProps) {
  const [selectedDay, setSelectedDay] = useState<keyof WeeklyStaffingNeeds>('tuesday');
  const [expandedDays, setExpandedDays] = useState<Set<keyof WeeklyStaffingNeeds>>(new Set(['tuesday']));

  const days: { key: keyof WeeklyStaffingNeeds; label: string }[] = [
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' },
  ];

  const formatTime = (time: string) => {
    if (!time) return '--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'p' : 'a';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes}${ampm}`;
  };

  const getShiftDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    return hours.toFixed(1);
  };

  const toggleDay = (day: keyof WeeklyStaffingNeeds) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
    setSelectedDay(day);
  };

  const addSlot = (day: keyof WeeklyStaffingNeeds) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    const slots = dayData.slots || [];

    const labels = [
      day === 'saturday' || day === 'sunday' ? 'Weekend Opener' : 'Opener',
      '2nd Server',
      'Mid Shift',
      'Bar',
      '3rd Server',
      'Closer',
    ];

    const newSlot: StaffingSlot = {
      id: `${day}-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00',
      label: labels[slots.length] || `Server ${slots.length + 1}`
    };
    newNeeds[day] = { ...dayData, slots: [...slots, newSlot] };
    setStaffingNeeds(newNeeds);
  };

  const removeSlot = (day: keyof WeeklyStaffingNeeds, slotId: string) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    newNeeds[day] = { ...dayData, slots: (dayData.slots || []).filter(s => s.id !== slotId) };
    setStaffingNeeds(newNeeds);
  };

  const updateSlot = (day: keyof WeeklyStaffingNeeds, slotId: string, field: keyof StaffingSlot, value: string) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    newNeeds[day] = {
      ...dayData,
      slots: (dayData.slots || []).map(s => s.id === slotId ? { ...s, [field]: value } : s)
    };
    setStaffingNeeds(newNeeds);
  };

  const copyDayToAll = (sourceDay: keyof WeeklyStaffingNeeds) => {
    const source = staffingNeeds[sourceDay];
    const newNeeds = { ...staffingNeeds };
    days.forEach(({ key }) => {
      if (key !== sourceDay) {
        newNeeds[key] = {
          ...newNeeds[key],
          slots: source.slots?.map((s, i) => ({ ...s, id: `${key}-${Date.now()}-${i}` })) || []
        };
      }
    });
    setStaffingNeeds(newNeeds);
  };

  const copyDay = (day: keyof WeeklyStaffingNeeds) => {
    const dayData = staffingNeeds[day];
    setCopiedDay({ slots: dayData.slots || [], notes: dayData.notes, fromDay: day });
  };

  const pasteDay = (day: keyof WeeklyStaffingNeeds) => {
    if (!copiedDay) return;
    const newNeeds = { ...staffingNeeds };
    newNeeds[day] = {
      ...newNeeds[day],
      slots: copiedDay.slots.map((s, i) => ({ ...s, id: `${day}-${Date.now()}-${i}` })),
      notes: copiedDay.notes
    };
    setStaffingNeeds(newNeeds);
  };

  const getTotalSlots = () => Object.values(staffingNeeds).reduce((sum, day) => sum + (day.slots?.length || 0), 0);

  const validationIssues = validateStaffingNeeds({
    staffingNeeds,
    businessOpenTimeByDay: {
      tuesday: '07:15',
      wednesday: '07:15',
      thursday: '07:15',
      friday: '07:15',
      saturday: '07:15',
      sunday: '07:15',
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GridIcon className="w-5 h-5 text-[#e5a825]" />
              Staffing Template
            </h2>
            <p className="text-xs text-[#6b6b75] mt-0.5">{getTotalSlots()} shifts across {days.length} days</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const ok = window.confirm('Replace the current staffing template with the recommended template?');
                if (!ok) return;
                setStaffingNeeds(cloneWeeklyStaffingNeedsWithFreshIds(RECOMMENDED_WEEKLY_STAFFING_NEEDS));
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-[#141417] text-white border border-[#2a2a32] hover:bg-[#222228]"
              title="Applies the recommended weekday pattern (07:15 opener ends 12:00, Friday adds 10:00 and noon shifts)"
            >
              Load Recommended
            </button>
            {saveAsDefaultTemplate && (
              <button
                onClick={saveAsDefaultTemplate}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  showSavedDefaultMessage
                    ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                    : 'bg-[#e5a825] text-[#0d0d0f] hover:bg-[#f5b835]'
                }`}
              >
                {showSavedDefaultMessage ? (
                  <><CheckIcon className="w-3.5 h-3.5" /> Saved!</>
                ) : (
                  <><SaveIcon className="w-3.5 h-3.5" /> Save as Default</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {validationIssues.length > 0 && (
        <div className="bg-[#141417] rounded-xl border border-[#ef4444]/30 p-4">
          <div className="text-sm font-semibold text-white mb-2">Template checks</div>
          <div className="space-y-1">
            {validationIssues.map((issue, idx) => (
              <div key={idx} className="text-xs text-[#fca5a5]">
                {issue.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Overview - Horizontal Day Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map(({ key, label }) => {
          const slots = staffingNeeds[key]?.slots || [];
          const isExpanded = expandedDays.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleDay(key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                isExpanded
                  ? 'bg-[#e5a825]/10 border-[#e5a825] text-[#e5a825]'
                  : 'bg-[#1a1a1f] border-[#2a2a32] text-[#a0a0a8] hover:border-[#3a3a45]'
              }`}
            >
              <span className="font-medium">{label}</span>
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${isExpanded ? 'bg-[#e5a825]/20' : 'bg-[#2a2a32]'}`}>
                {slots.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded Day Editor */}
      {days.filter(({ key }) => expandedDays.has(key)).map(({ key, label }) => {
        const dayData = staffingNeeds[key];
        const slots = dayData?.slots || [];

        return (
          <div key={key} className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] overflow-hidden">
            {/* Day Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a32] bg-[#141417]">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-white">{label}</h3>
                <span className="text-xs text-[#6b6b75]">{slots.length} shift{slots.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyDay(key)}
                  className="p-1.5 text-[#6b6b75] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded transition-colors"
                  title="Copy day"
                >
                  <CopyIcon className="w-4 h-4" />
                </button>
                {copiedDay && (
                  <button
                    onClick={() => pasteDay(key)}
                    className="p-1.5 text-[#22c55e] hover:bg-[#22c55e]/10 rounded transition-colors"
                    title={`Paste from ${copiedDay.fromDay}`}
                  >
                    <PasteIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => copyDayToAll(key)}
                  className="ml-1 px-2 py-1 text-xs text-[#a855f7] hover:bg-[#a855f7]/10 rounded transition-colors"
                  title="Apply this day's schedule to all other days"
                >
                  Apply to All
                </button>
                <button
                  onClick={() => toggleDay(key)}
                  className="p-1.5 text-[#6b6b75] hover:text-white hover:bg-[#2a2a32] rounded transition-colors ml-2"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slots Table */}
            <div className="p-4">
              {slots.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-[#6b6b75] border-b border-[#2a2a32]">
                      <th className="text-left pb-2 font-medium w-8">#</th>
                      <th className="text-left pb-2 font-medium">Role</th>
                      <th className="text-left pb-2 font-medium w-28">Start</th>
                      <th className="text-left pb-2 font-medium w-28">End</th>
                      <th className="text-left pb-2 font-medium w-16">Hours</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, index) => (
                      <tr key={slot.id} className="border-b border-[#2a2a32]/50 last:border-0 group">
                        <td className="py-2 text-[#6b6b75] text-sm">{index + 1}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={slot.label || ''}
                            onChange={(e) => updateSlot(key, slot.id, 'label', e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-[#2a2a32] focus:border-[#e5a825] focus:bg-[#141417] rounded text-white focus:outline-none transition-colors"
                            placeholder="Role name"
                          />
                          <select
                            value={normalizeStaffingSlotLabel({ label: slot.label, day: key as DayOfWeek, startTime: slot.startTime, endTime: slot.endTime })}
                            onChange={(e) => updateSlot(key, slot.id, 'label', e.target.value)}
                            className="px-2 py-1 text-xs bg-[#141417] border border-[#2a2a32] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                            title="Quick label preset"
                          >
                            <option value="Opener">Opener</option>
                            {(key === 'saturday' || key === 'sunday') && <option value="Weekend Opener">Weekend Opener</option>}
                            <option value="2nd Server">2nd Server</option>
                            <option value="3rd Server">3rd Server</option>
                            <option value="Mid Shift">Mid Shift</option>
                            <option value="Bar">Bar</option>
                            <option value="Closer">Closer</option>
                            <option value="Dinner">Dinner</option>
                          </select>
                          </div>
                        </td>
                        <td className="py-2">
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateSlot(key, slot.id, 'startTime', e.target.value)}
                            className="px-2 py-1 text-sm bg-[#141417] border border-[#2a2a32] rounded text-white focus:outline-none focus:border-[#e5a825]"
                          />
                        </td>
                        <td className="py-2">
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateSlot(key, slot.id, 'endTime', e.target.value)}
                            className="px-2 py-1 text-sm bg-[#141417] border border-[#2a2a32] rounded text-white focus:outline-none focus:border-[#e5a825]"
                          />
                        </td>
                        <td className="py-2 text-sm text-[#6b6b75]">
                          {getShiftDuration(slot.startTime, slot.endTime)}h
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => removeSlot(key, slot.id)}
                            className="p-1 text-[#6b6b75] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-[#6b6b75] text-center py-4">No shifts configured</p>
              )}

              {/* Add Shift Button */}
              <button
                onClick={() => addSlot(key)}
                className="mt-3 w-full py-2 border border-dashed border-[#2a2a32] rounded-lg text-sm text-[#6b6b75] hover:border-[#e5a825] hover:text-[#e5a825] transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Add Shift
              </button>
            </div>
          </div>
        );
      })}

      {/* Collapsed Days Summary */}
      {days.filter(({ key }) => !expandedDays.has(key)).length > 0 && (
        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {days.filter(({ key }) => !expandedDays.has(key)).map(({ key, label }) => {
              const slots = staffingNeeds[key]?.slots || [];
              return (
                <button
                  key={key}
                  onClick={() => toggleDay(key)}
                  className="p-3 bg-[#141417] rounded-lg border border-[#2a2a32] hover:border-[#e5a825]/50 transition-colors text-left"
                >
                  <div className="font-medium text-white text-sm">{label}</div>
                  <div className="text-xs text-[#6b6b75] mt-1">
                    {slots.length} shift{slots.length !== 1 ? 's' : ''}
                  </div>
                  {slots.length > 0 && (
                    <div className="text-xs text-[#6b6b75] mt-0.5">
                      {formatTime(slots[0].startTime)} - {formatTime(slots[slots.length - 1].endTime)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
