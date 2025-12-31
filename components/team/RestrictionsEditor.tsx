'use client';

import { EmployeeRestriction, DayOfWeek } from '@/lib/types';

interface Props {
  restrictions: EmployeeRestriction[];
  onUpdateRestrictions: (restrictions: EmployeeRestriction[]) => void;
}

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function RestrictionsEditor({ restrictions, onUpdateRestrictions }: Props) {
  const addRestriction = () => {
    const newRestriction: EmployeeRestriction = {
      id: Date.now().toString(),
      type: 'no_before',
      time: '',
      days: [],
      reason: '',
      startTime: '',
      endTime: '',
    };
    onUpdateRestrictions([...restrictions, newRestriction]);
  };

  const updateRestriction = (id: string, updates: Partial<EmployeeRestriction>) => {
    onUpdateRestrictions(
      restrictions.map(r => r.id === id ? { ...r, ...updates } : r)
    );
  };

  const removeRestriction = (id: string) => {
    onUpdateRestrictions(restrictions.filter(r => r.id !== id));
  };

  const toggleRestrictionDay = (id: string, day: DayOfWeek) => {
    onUpdateRestrictions(
      restrictions.map(r => {
        if (r.id !== id) return r;
        const days = r.days.includes(day)
          ? r.days.filter(d => d !== day)
          : [...r.days, day];
        return { ...r, days };
      })
    );
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Time Restrictions</h4>
        <button
          type="button"
          onClick={addRestriction}
          className="text-xs text-[#e5a825] hover:text-[#f0b429] font-medium"
        >
          + Add Restriction
        </button>
      </div>
      {restrictions.length === 0 && (
        <p className="text-xs text-[#6b6b75]">No restrictions set</p>
      )}
      <div className="space-y-3">
        {restrictions.map((r) => (
          <div key={r.id} className="p-3 bg-[#141417] rounded-lg border border-[#2a2a32]">
            {/* Restriction Type */}
            <div className="flex items-center gap-2 mb-2">
              <select
                value={r.type}
                onChange={(e) => updateRestriction(r.id, { type: e.target.value as EmployeeRestriction['type'] })}
                className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
              >
                <option value="no_before">Cannot start before</option>
                <option value="no_after">Must finish by</option>
                <option value="unavailable_range">Unavailable range</option>
              </select>
              <button
                type="button"
                onClick={() => removeRestriction(r.id)}
                className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Time Input(s) */}
            {(r.type === 'no_before' || r.type === 'no_after') && (
              <div className="mb-2">
                <input
                  type="time"
                  value={r.time || ''}
                  onChange={(e) => updateRestriction(r.id, { time: e.target.value })}
                  className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                />
              </div>
            )}
            {r.type === 'unavailable_range' && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="time"
                  value={r.startTime || ''}
                  onChange={(e) => updateRestriction(r.id, { startTime: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                />
                <span className="text-xs text-[#6b6b75]">to</span>
                <input
                  type="time"
                  value={r.endTime || ''}
                  onChange={(e) => updateRestriction(r.id, { endTime: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40"
                />
              </div>
            )}

            {/* Days Selection */}
            <div className="mb-2">
              <div className="text-xs text-[#6b6b75] mb-1">Applies to (leave empty for all days):</div>
              <div className="flex flex-wrap gap-1">
                {(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleRestrictionDay(r.id, day)}
                    className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                      r.days.includes(day)
                        ? 'bg-[#ef4444] text-white'
                        : 'bg-[#2a2a32] text-[#6b6b75] hover:bg-[#3a3a45]'
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <input
              type="text"
              placeholder="Reason (optional)"
              value={r.reason || ''}
              onChange={(e) => updateRestriction(r.id, { reason: e.target.value })}
              className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#e5a825]/40 placeholder:text-[#6b6b75]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
