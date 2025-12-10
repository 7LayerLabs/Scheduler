'use client';

import { useState } from 'react';
import { WeeklyStaffingNeeds, DayStaffing, StaffingSlot } from '@/lib/types';

interface Props {
  weekStart: Date;
  changeWeek: (delta: number) => void;
  formatWeekRange: (start: Date) => string;
  staffingNeeds: WeeklyStaffingNeeds;
  setStaffingNeeds: (needs: WeeklyStaffingNeeds) => void;
}

export default function StaffingView({
  weekStart,
  changeWeek,
  formatWeekRange,
  staffingNeeds,
  setStaffingNeeds
}: Props) {
  const [copiedDay, setCopiedDay] = useState<{ slots: StaffingSlot[]; notes?: string; fromDay: string } | null>(null);

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
    // Create new slots with unique IDs for the target day
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

  const addSlot = (day: keyof WeeklyStaffingNeeds) => {
    const newNeeds = { ...staffingNeeds };
    const dayData = newNeeds[day];
    const slots = dayData.slots || [];
    const newSlot: StaffingSlot = {
      id: `${day}-${Date.now()}`,
      startTime: '09:00',
      endTime: '17:00',
      label: `Server ${slots.length + 1}`
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

  const updateNotes = (day: keyof WeeklyStaffingNeeds, notes: string) => {
    const newNeeds = { ...staffingNeeds };
    newNeeds[day] = { ...newNeeds[day], notes };
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
          <h1 className="text-2xl font-semibold text-gray-900">Staffing Needs</h1>
          <p className="text-sm text-gray-500 mt-1">Configure time slots and notes for each day</p>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="px-4 py-1 text-sm font-medium text-slate-700 min-w-[200px] text-center">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {days.map(({ key, fullLabel }) => {
          const dayData = staffingNeeds[key];
          const slots = dayData.slots || [];

          return (
            <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{fullLabel}</h3>
                <div className="flex items-center gap-2">
                  {/* Copy Button */}
                  <button
                    onClick={() => copyDay(key)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copy this day's slots"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </button>
                  {/* Paste Button */}
                  <button
                    onClick={() => pasteDay(key)}
                    disabled={!copiedDay}
                    className={`p-1.5 rounded-lg transition-colors ${copiedDay
                      ? 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                      : 'text-slate-200 cursor-not-allowed'
                      }`}
                    title={copiedDay ? `Paste from ${copiedDay.fromDay}` : 'Copy a day first'}
                  >
                    <PasteIcon className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {slots.length} slot{slots.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2 mb-4">
                {slots.map((slot, index) => (
                  <div key={slot.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-medium text-slate-500 w-6">{index + 1}.</span>

                    {/* Label */}
                    <input
                      type="text"
                      value={slot.label || ''}
                      onChange={(e) => updateSlot(key, slot.id, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
                    />

                    {/* Start Time */}
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(key, slot.id, 'startTime', e.target.value)}
                      className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    {/* End Time */}
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(key, slot.id, 'endTime', e.target.value)}
                      className="px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />

                    {/* Time Display */}
                    <span className="text-xs text-slate-500 w-28 text-right">
                      {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                    </span>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeSlot(key, slot.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add Slot Button */}
                <button
                  onClick={() => addSlot(key)}
                  className="w-full py-2 px-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Slot
                </button>
              </div>

              {/* Notes Section */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Notes for this day
                </label>
                <textarea
                  value={dayData.notes || ''}
                  onChange={(e) => updateNotes(key, e.target.value)}
                  placeholder="e.g., Krisann leaves at 1pm, need coverage from 1pm..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Weekly Total</span>
          <span className="text-sm text-gray-900 font-semibold">
            {getTotalSlots()} time slots
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Changes take effect when you regenerate the schedule. Notes can specify time-based instructions like &quot;Ali leaves at 1pm&quot;.
      </p>
    </div>
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

