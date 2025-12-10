'use client';

import { useEffect, useState } from 'react';
import { ScheduleOverride, Employee, WeeklyStaffingNeeds, StaffingSlot } from '@/lib/types';
import { parseScheduleNotes, formatParsedOverrides } from '@/lib/parseNotes';

interface Props {
  notes: string;
  setNotes: (notes: string) => void;
  overrides: ScheduleOverride[];
  setOverrides: (overrides: ScheduleOverride[]) => void;
  employees: Employee[];
  weekStart: Date;
  changeWeek: (delta: number) => void;
  formatWeekRange: (start: Date) => string;
  staffingNeeds: WeeklyStaffingNeeds;
  setStaffingNeeds: (needs: WeeklyStaffingNeeds) => void;
  saveAsDefaultTemplate?: () => void;
  showSavedDefaultMessage?: boolean;
  // Permanent rules (apply to ALL weeks)
  permanentRules: ScheduleOverride[];
  setPermanentRules: (rules: ScheduleOverride[]) => void;
  permanentRulesDisplay: string[];
  setPermanentRulesDisplay: (display: string[]) => void;
  setPermanentRulesAndDisplay?: (rules: ScheduleOverride[], display: string[]) => void;
  // Week-specific rules (only for current week)
  weekLockedRules: ScheduleOverride[];
  setWeekLockedRules: (rules: ScheduleOverride[]) => void;
  weekLockedRulesDisplay: string[];
  setWeekLockedRulesDisplay: (display: string[]) => void;
  setWeekLockedRulesAndDisplay?: (rules: ScheduleOverride[], display: string[]) => void;
}

export default function NotesAndStaffingView({
  notes,
  setNotes,
  setOverrides,
  employees,
  weekStart,
  changeWeek,
  formatWeekRange,
  staffingNeeds,
  setStaffingNeeds,
  saveAsDefaultTemplate,
  showSavedDefaultMessage,
  permanentRules,
  setPermanentRules,
  permanentRulesDisplay,
  setPermanentRulesDisplay,
  setPermanentRulesAndDisplay,
  weekLockedRules,
  setWeekLockedRules,
  weekLockedRulesDisplay,
  setWeekLockedRulesDisplay,
  setWeekLockedRulesAndDisplay
}: Props) {
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);
  const [parsedRules, setParsedRules] = useState<ScheduleOverride[]>([]);
  const [copiedDay, setCopiedDay] = useState<{ slots: StaffingSlot[]; notes?: string; fromDay: string } | null>(null);

  // Parse notes as user types (preview only)
  useEffect(() => {
    console.log('Notes changed:', notes);
    if (notes.trim()) {
      const parsed = parseScheduleNotes(notes, employees);
      const formatted = formatParsedOverrides(parsed, employees);
      console.log('Parsed rules:', parsed.length, parsed);
      console.log('Formatted preview:', formatted);
      setParsedPreview(formatted);
      setParsedRules(parsed);
    } else {
      setParsedPreview([]);
      setParsedRules([]);
    }
  }, [notes, employees]);

  // Combine permanent + week-specific rules for overrides
  useEffect(() => {
    const allRules = [...permanentRules, ...weekLockedRules];
    setOverrides(allRules);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permanentRules, weekLockedRules]);

  // Apply rules for THIS WEEK ONLY
  const handleApplyWeekRules = () => {
    // Parse fresh to avoid stale state issues
    const freshParsed = notes.trim() ? parseScheduleNotes(notes, employees) : [];
    const freshDisplay = notes.trim() ? formatParsedOverrides(freshParsed, employees) : [];

    console.log('Apply Week Rules clicked, freshParsed:', freshParsed.length);
    if (freshParsed.length > 0) {
      const newRules = [...weekLockedRules, ...freshParsed];
      const newDisplay = [...weekLockedRulesDisplay, ...freshDisplay];
      console.log('Setting week rules:', newRules.length);
      // Use combined setter to avoid race condition, fall back to individual setters
      if (setWeekLockedRulesAndDisplay) {
        setWeekLockedRulesAndDisplay(newRules, newDisplay);
      } else {
        setWeekLockedRules(newRules);
        setWeekLockedRulesDisplay(newDisplay);
      }
      // Clear input and parsed state after applying
      setNotes('');
      setParsedPreview([]);
      setParsedRules([]);
    }
  };

  // Apply rules PERMANENTLY (all weeks)
  const handleApplyPermanentRules = () => {
    // Parse fresh to avoid stale state issues
    const freshParsed = notes.trim() ? parseScheduleNotes(notes, employees) : [];
    const freshDisplay = notes.trim() ? formatParsedOverrides(freshParsed, employees) : [];

    console.log('Apply Permanent Rules clicked, freshParsed:', freshParsed.length);
    if (freshParsed.length > 0) {
      const newRules = [...permanentRules, ...freshParsed];
      const newDisplay = [...permanentRulesDisplay, ...freshDisplay];
      console.log('Setting permanent rules:', newRules.length);
      // Use combined setter to avoid race condition, fall back to individual setters
      if (setPermanentRulesAndDisplay) {
        setPermanentRulesAndDisplay(newRules, newDisplay);
      } else {
        setPermanentRules(newRules);
        setPermanentRulesDisplay(newDisplay);
      }
      // Clear input and parsed state after applying
      setNotes('');
      setParsedPreview([]);
      setParsedRules([]);
    }
  };

  // Clear week-specific rules
  const handleClearWeekRules = () => {
    if (setWeekLockedRulesAndDisplay) {
      setWeekLockedRulesAndDisplay([], []);
    } else {
      setWeekLockedRules([]);
      setWeekLockedRulesDisplay([]);
    }
  };

  // Clear permanent rules
  const handleClearPermanentRules = () => {
    if (setPermanentRulesAndDisplay) {
      setPermanentRulesAndDisplay([], []);
    } else {
      setPermanentRules([]);
      setPermanentRulesDisplay([]);
    }
  };

  // Remove single permanent rule
  const handleRemovePermanentRule = (index: number) => {
    const newRules = permanentRules.filter((_, i) => i !== index);
    const newDisplay = permanentRulesDisplay.filter((_, i) => i !== index);
    if (setPermanentRulesAndDisplay) {
      setPermanentRulesAndDisplay(newRules, newDisplay);
    } else {
      setPermanentRules(newRules);
      setPermanentRulesDisplay(newDisplay);
    }
  };

  // Remove single week rule
  const handleRemoveWeekRule = (index: number) => {
    const newRules = weekLockedRules.filter((_, i) => i !== index);
    const newDisplay = weekLockedRulesDisplay.filter((_, i) => i !== index);
    if (setWeekLockedRulesAndDisplay) {
      setWeekLockedRulesAndDisplay(newRules, newDisplay);
    } else {
      setWeekLockedRules(newRules);
      setWeekLockedRulesDisplay(newDisplay);
    }
  };

  const days: { key: keyof WeeklyStaffingNeeds; label: string; fullLabel: string }[] = [
    { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
    { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
    { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
    { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
    { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
    { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
  ];

  const formatTimeDisplay = (time: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const copyDay = (day: keyof WeeklyStaffingNeeds) => {
    const dayData = staffingNeeds[day];
    setCopiedDay({
      slots: dayData.slots || [],
      notes: dayData.notes,
      fromDay: day
    });
  };

  const pasteDay = (day: keyof WeeklyStaffingNeeds) => {
    if (!copiedDay) return;
    const newNeeds = { ...staffingNeeds };
    const newSlots = copiedDay.slots.map((slot, idx) => ({
      ...slot,
      id: `${day}-${Date.now()}-${idx}`
    }));
    newNeeds[day] = {
      ...newNeeds[day],
      slots: newSlots,
      notes: copiedDay.notes
    };
    setStaffingNeeds(newNeeds);
  };

  const getSlotLabel = (index: number): string => {
    const labels = ['Opener', '2nd Server', 'Bar', '3rd Server', '4th Server', '5th Server', '6th Server'];
    return labels[index] || `Server ${index + 1}`;
  };

  const addSlot = (day: keyof WeeklyStaffingNeeds) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    const slots = dayData.slots || [];
    const newSlot: StaffingSlot = {
      id: `${day}-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00',
      label: getSlotLabel(slots.length)
    };
    newNeeds[day] = { ...dayData, slots: [...slots, newSlot] };
    setStaffingNeeds(newNeeds);
  };

  const removeSlot = (day: keyof WeeklyStaffingNeeds, slotId: string) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    const slots = (dayData.slots || []).filter(s => s.id !== slotId);
    newNeeds[day] = { ...dayData, slots };
    setStaffingNeeds(newNeeds);
  };

  const updateSlot = (day: keyof WeeklyStaffingNeeds, slotId: string, field: keyof StaffingSlot, value: string) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    const slots = (dayData.slots || []).map(s =>
      s.id === slotId ? { ...s, [field]: value } : s
    );
    newNeeds[day] = { ...dayData, slots };
    setStaffingNeeds(newNeeds);
  };

  // Copy/paste for slots
  const [copiedSlot, setCopiedSlot] = useState<{ startTime: string; endTime: string; label: string } | null>(null);

  const copySlot = (slot: StaffingSlot) => {
    setCopiedSlot({ startTime: slot.startTime, endTime: slot.endTime, label: slot.label || '' });
  };

  const pasteSlot = (day: keyof WeeklyStaffingNeeds) => {
    if (!copiedSlot) return;
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    const slots = dayData.slots || [];
    const newSlot: StaffingSlot = {
      id: `${day}-${Date.now()}`,
      startTime: copiedSlot.startTime,
      endTime: copiedSlot.endTime,
      label: copiedSlot.label
    };
    newNeeds[day] = { ...dayData, slots: [...slots, newSlot] };
    setStaffingNeeds(newNeeds);
  };

  const updateDayNotes = (day: keyof WeeklyStaffingNeeds, dayNotes: string) => {
    const newNeeds = { ...staffingNeeds };
    newNeeds[day] = { ...newNeeds[day], notes: dayNotes };
    setStaffingNeeds(newNeeds);
  };

  const getTotalSlots = () => {
    return Object.values(staffingNeeds).reduce((sum, day) => sum + (day.slots?.length || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Schedule Notes & Staffing</h1>
          <p className="text-sm text-[#6b6b75] mt-1">Add notes and configure time slots for each day</p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-1">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 hover:bg-[#222228] text-[#6b6b75] hover:text-white rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="px-4 py-1 text-sm font-medium text-white min-w-[200px] text-center">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 hover:bg-[#222228] text-[#6b6b75] hover:text-white rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Schedule Notes Section */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <NotesIcon className="w-5 h-5 text-[#e5a825]" />
          Schedule Notes
        </h2>
        <div className="flex gap-4 items-stretch">
          {/* Left: Instructions Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#a0a0a8] mb-2">
              Scheduling Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type natural language instructions...

Examples:
- Kim opens Saturday
- Kris Ann off Tuesday
- Ali works Friday night
- Heidi Wed thru Fri morning"
              className="w-full h-44 p-4 bg-[#141417] border border-[#2a2a32] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] resize-none placeholder:text-[#6b6b75]"
            />
            <p className="text-xs text-[#6b6b75] mt-2">
              Keywords: &quot;opens&quot;, &quot;off&quot;, &quot;night&quot;, &quot;morning&quot;, &quot;prefers&quot;, &quot;closing&quot;, &quot;works&quot;
            </p>
            {/* Preview of what will be parsed */}
            {parsedPreview.length > 0 && (
              <div className="mt-2 p-2 bg-[#141417] border border-[#2a2a32] rounded-lg">
                <p className="text-xs text-[#6b6b75] mb-1">Preview ({parsedPreview.length} rules detected):</p>
                <div className="text-xs text-[#a0a0a8] max-h-16 overflow-y-auto">
                  {parsedPreview.slice(0, 3).join(' | ')}
                  {parsedPreview.length > 3 && ` +${parsedPreview.length - 3} more`}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Two Arrow Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 px-2">
            {/* This Week Only Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleApplyWeekRules}
                disabled={parsedPreview.length === 0}
                className={`p-3 rounded-full transition-all duration-200 ${
                  parsedPreview.length > 0
                    ? 'bg-[#e5a825] text-[#0d0d0f] hover:bg-[#f5b835] shadow-lg shadow-[#e5a825]/30 hover:scale-110'
                    : 'bg-[#2a2a32] text-[#6b6b75] cursor-not-allowed'
                }`}
                title="Apply rules to this week only"
              >
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <span className="text-xs text-[#6b6b75] text-center mt-1 whitespace-nowrap">
                This Week
              </span>
            </div>

            {/* All Weeks (Permanent) Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleApplyPermanentRules}
                disabled={parsedPreview.length === 0}
                className={`p-3 rounded-full transition-all duration-200 ${
                  parsedPreview.length > 0
                    ? 'bg-[#a855f7] text-white hover:bg-[#b975f9] shadow-lg shadow-[#a855f7]/30 hover:scale-110'
                    : 'bg-[#2a2a32] text-[#6b6b75] cursor-not-allowed'
                }`}
                title="Apply rules to ALL weeks permanently"
              >
                <LockIcon className="w-5 h-5" />
              </button>
              <span className="text-xs text-[#6b6b75] text-center mt-1 whitespace-nowrap">
                All Weeks
              </span>
            </div>
          </div>

          {/* Right: Locked Rules (Two Sections) */}
          <div className="flex-1 space-y-3">
            {/* Week-Specific Rules (Top - matches top button) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#e5a825] flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  This Week Only {weekLockedRulesDisplay.length > 0 && `(${weekLockedRulesDisplay.length})`}
                </label>
                {weekLockedRulesDisplay.length > 0 && (
                  <button
                    onClick={handleClearWeekRules}
                    className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="h-20 bg-[#141417] border-2 border-[#e5a825]/30 rounded-lg p-2 overflow-y-auto">
                {weekLockedRulesDisplay.length > 0 ? (
                  <div className="space-y-1">
                    {weekLockedRulesDisplay.map((text, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 rounded text-xs font-medium flex items-center justify-between gap-2 bg-[#e5a825]/10 text-[#e5a825] border border-[#e5a825]/30"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                          {text}
                        </span>
                        <button
                          onClick={() => handleRemoveWeekRule(idx)}
                          className="text-[#e5a825] hover:text-[#ef4444] flex-shrink-0"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#6b6b75]">
                    Only for {formatWeekRange(weekStart)}
                  </div>
                )}
              </div>
            </div>

            {/* Permanent Rules (Bottom - matches bottom button) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#a855f7] flex items-center gap-1">
                  <LockIcon className="w-3 h-3" />
                  Permanent Rules {permanentRulesDisplay.length > 0 && `(${permanentRulesDisplay.length})`}
                </label>
                {permanentRulesDisplay.length > 0 && (
                  <button
                    onClick={handleClearPermanentRules}
                    className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="h-20 bg-[#141417] border-2 border-[#a855f7]/30 rounded-lg p-2 overflow-y-auto">
                {permanentRulesDisplay.length > 0 ? (
                  <div className="space-y-1">
                    {permanentRulesDisplay.map((text, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-1 rounded text-xs font-medium flex items-center justify-between gap-2 bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/30"
                      >
                        <span className="flex items-center gap-1 truncate">
                          <LockIcon className="w-3 h-3 flex-shrink-0" />
                          {text}
                        </span>
                        <button
                          onClick={() => handleRemovePermanentRule(idx)}
                          className="text-[#a855f7] hover:text-[#ef4444] flex-shrink-0"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#6b6b75]">
                    Applies to all weeks
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {(permanentRulesDisplay.length > 0 || weekLockedRulesDisplay.length > 0) && (
          <div className="mt-4 p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg">
            <p className="text-xs text-[#22c55e] flex items-center gap-1">
              <CheckIcon className="w-3 h-3" />
              {permanentRulesDisplay.length + weekLockedRulesDisplay.length} rules will be applied when you generate the schedule
            </p>
          </div>
        )}
      </div>

      {/* Staffing Needs Section */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <GridIcon className="w-5 h-5 text-[#e5a825]" />
            Staffing Needs
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#a0a0a8]">
              {getTotalSlots()} total slots
            </span>
            {saveAsDefaultTemplate && (
              <button
                onClick={saveAsDefaultTemplate}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  showSavedDefaultMessage
                    ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
                    : 'bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/20 hover:border-[#a855f7]/50'
                }`}
                title="Save current staffing setup as the default for new weeks"
              >
                {showSavedDefaultMessage ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    Saved!
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-3.5 h-3.5" />
                    Save as Default
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Day Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {days.map(({ key, fullLabel }) => {
            const dayData = staffingNeeds[key];
            const slots = dayData.slots || [];

            return (
              <div key={key} className="bg-[#141417] rounded-xl border border-[#2a2a32] p-4 hover:border-[#3a3a45] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-white">{fullLabel}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyDay(key)}
                      className="p-1.5 text-[#6b6b75] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors"
                      title="Copy this day's slots"
                    >
                      <CopyIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => pasteDay(key)}
                      disabled={!copiedDay}
                      className={`p-1.5 rounded-lg transition-colors ${copiedDay
                        ? 'text-[#6b6b75] hover:text-[#22c55e] hover:bg-[#22c55e]/10'
                        : 'text-[#3a3a45] cursor-not-allowed'
                        }`}
                      title={copiedDay ? `Paste from ${copiedDay.fromDay}` : 'Copy a day first'}
                    >
                      <PasteIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-[#6b6b75] bg-[#0d0d0f] px-2 py-1 rounded-full border border-[#2a2a32]">
                      {slots.length} slot{slots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2 mb-3">
                  {slots.map((slot, index) => (
                    <div key={slot.id} className="flex items-center gap-2 p-2 bg-[#0d0d0f] rounded-lg border border-[#2a2a32]">
                      <span className="text-xs font-medium text-[#6b6b75] w-5">{index + 1}.</span>

                      <input
                        type="text"
                        value={slot.label || ''}
                        onChange={(e) => updateSlot(key, slot.id, 'label', e.target.value)}
                        placeholder="Label"
                        className="flex-1 px-2 py-1 text-sm bg-[#141417] border border-[#2a2a32] rounded text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] placeholder:text-[#6b6b75]"
                      />

                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(key, slot.id, 'startTime', e.target.value)}
                        className="px-2 py-1 text-sm bg-[#141417] border border-[#2a2a32] rounded text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                      />
                      <span className="text-[#6b6b75] text-xs">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(key, slot.id, 'endTime', e.target.value)}
                        className="px-2 py-1 text-sm bg-[#141417] border border-[#2a2a32] rounded text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                      />

                      <span className="text-xs text-[#6b6b75] w-24 text-right hidden xl:block">
                        {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                      </span>

                      <button
                        onClick={() => copySlot(slot)}
                        className="p-1 text-[#6b6b75] hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded transition-colors"
                        title="Copy this slot"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => removeSlot(key, slot.id)}
                        className="p-1 text-[#6b6b75] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
                        title="Remove slot"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <button
                      onClick={() => addSlot(key)}
                      className="flex-1 py-2 px-3 border-2 border-dashed border-[#2a2a32] rounded-lg text-sm text-[#6b6b75] hover:border-[#e5a825] hover:text-[#e5a825] hover:bg-[#e5a825]/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Slot
                    </button>
                    {copiedSlot && (
                      <button
                        onClick={() => pasteSlot(key)}
                        className="py-2 px-3 border-2 border-dashed border-[#22c55e]/50 rounded-lg text-sm text-[#22c55e] hover:border-[#22c55e] hover:bg-[#22c55e]/10 transition-colors flex items-center justify-center gap-2"
                        title={`Paste: ${copiedSlot.label} (${copiedSlot.startTime}-${copiedSlot.endTime})`}
                      >
                        <PasteIcon className="w-4 h-4" />
                        Paste
                      </button>
                    )}
                  </div>
                </div>

                {/* Day Notes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[#6b6b75]">
                      Notes for this day
                    </label>
                    {dayData.notes && (
                      <button
                        onClick={() => updateDayNotes(key, '')}
                        className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors flex items-center gap-1"
                      >
                        <XIcon className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    value={dayData.notes || ''}
                    onChange={(e) => updateDayNotes(key, e.target.value)}
                    placeholder="Add notes here..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-[#0d0d0f] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] resize-none placeholder:text-[#6b6b75]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[#6b6b75]">
        Changes take effect when you regenerate the schedule.
      </p>
    </div>
  );
}

// Icons
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

function NotesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
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
