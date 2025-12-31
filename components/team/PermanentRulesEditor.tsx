'use client';

import { PermanentRule, DayOfWeek } from '@/lib/types';

interface Props {
  rules: PermanentRule[];
  onUpdateRules: (rules: PermanentRule[]) => void;
}

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

export default function PermanentRulesEditor({ rules, onUpdateRules }: Props) {
  const addRule = () => {
    const newRule: PermanentRule = {
      id: Date.now().toString(),
      type: 'fixed_shift',
      day: 'monday',
      days: [],
      startTime: '',
      endTime: '',
      reason: '',
      isActive: true,
    };
    onUpdateRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<PermanentRule>) => {
    onUpdateRules(
      rules.map(r => r.id === id ? { ...r, ...updates } : r)
    );
  };

  const removeRule = (id: string) => {
    onUpdateRules(rules.filter(r => r.id !== id));
  };

  const toggleRuleActive = (id: string) => {
    onUpdateRules(
      rules.map(r =>
        r.id === id ? { ...r, isActive: !r.isActive } : r
      )
    );
  };

  const toggleRuleDay = (id: string, day: DayOfWeek) => {
    onUpdateRules(
      rules.map(r => {
        if (r.id !== id) return r;
        const days = (r.days || []).includes(day)
          ? (r.days || []).filter(d => d !== day)
          : [...(r.days || []), day];
        return { ...r, days };
      })
    );
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Permanent Rules</h4>
        <button
          type="button"
          onClick={addRule}
          className="text-xs text-[#22c55e] hover:text-[#4ade80] font-medium"
        >
          + Add Rule
        </button>
      </div>
      <p className="text-xs text-[#6b6b75] mb-3">
        Set fixed recurring schedules (e.g., &quot;Only works Saturday 9am-12pm&quot;)
      </p>
      {rules.length === 0 && (
        <p className="text-xs text-[#6b6b75]">No permanent rules set</p>
      )}
      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className={`p-3 bg-[#141417] rounded-lg border ${r.isActive ? 'border-[#22c55e]/30' : 'border-[#3a3a45] opacity-50'}`}>
            {/* Rule Header with Toggle and Delete */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleRuleActive(r.id)}
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    r.isActive ? 'bg-[#22c55e]' : 'bg-[#3a3a45]'
                  }`}
                  title={r.isActive ? 'Click to disable' : 'Click to enable'}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                    r.isActive ? 'left-4' : 'left-0.5'
                  }`} />
                </button>
                <span className="text-xs text-[#6b6b75]">{r.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <button
                type="button"
                onClick={() => removeRule(r.id)}
                className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Rule Type */}
            <div className="mb-2">
              <select
                value={r.type}
                onChange={(e) => updateRule(r.id, { type: e.target.value as PermanentRule['type'] })}
                className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40"
              >
                <option value="fixed_shift">Fixed Shift (always schedule this time)</option>
                <option value="only_available">Only Available (can ONLY work this time)</option>
                <option value="never_schedule">Never Schedule (never work this day)</option>
              </select>
            </div>

            {/* Day Selection - Multi-select for fixed_shift, single for others */}
            <div className="mb-2">
              <div className="text-xs text-[#6b6b75] mb-1">
                {r.type === 'fixed_shift' ? 'Days (select multiple):' : 'Day:'}
              </div>
              <div className="flex flex-wrap gap-1">
                {(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((day) => {
                  const isSelected = r.type === 'fixed_shift'
                    ? (r.days || [r.day]).includes(day)
                    : r.day === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (r.type === 'fixed_shift') {
                          toggleRuleDay(r.id, day);
                        } else {
                          updateRule(r.id, { day });
                        }
                      }}
                      className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                        isSelected
                          ? 'bg-[#22c55e] text-white'
                          : 'bg-[#2a2a32] text-[#6b6b75] hover:bg-[#3a3a45]'
                      }`}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Range (for fixed_shift and only_available) */}
            {r.type !== 'never_schedule' && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="time"
                  value={r.startTime || ''}
                  onChange={(e) => updateRule(r.id, { startTime: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40"
                />
                <span className="text-xs text-[#6b6b75]">to</span>
                <input
                  type="time"
                  value={r.endTime || ''}
                  onChange={(e) => updateRule(r.id, { endTime: e.target.value })}
                  className="flex-1 px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40"
                />
              </div>
            )}

            {/* Reason */}
            <input
              type="text"
              placeholder="Reason (e.g., Second job, School)"
              value={r.reason || ''}
              onChange={(e) => updateRule(r.id, { reason: e.target.value })}
              className="w-full px-2 py-1 bg-[#0d0d0f] border border-[#2a2a32] rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#22c55e]/40 placeholder:text-[#6b6b75]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
