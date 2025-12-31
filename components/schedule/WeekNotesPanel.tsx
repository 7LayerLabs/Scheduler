'use client';

import { useState } from 'react';

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

interface Props {
  notes: string;
  onNotesChange: (notes: string) => void;
  onApplyWeek: () => void;
  onApplyPermanent: () => void;
  weekRules: string[];
  permanentRules: string[];
  onRemoveWeekRule: (index: number) => void;
  onRemovePermanentRule: (index: number) => void;
  onClearWeekRules: () => void;
  onClearPermanentRules: () => void;
  weekRange: string;
  parsedPreview: string[];
}

export default function WeekNotesPanel({
  notes,
  onNotesChange,
  onApplyWeek,
  onApplyPermanent,
  weekRules,
  permanentRules,
  onRemoveWeekRule,
  onRemovePermanentRule,
  onClearWeekRules,
  onClearPermanentRules,
  weekRange,
  parsedPreview,
}: Props) {
  const [showClear, setShowClear] = useState(false);

  return (
    <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-4 sm:p-5 hover:border-[#3a3a45] transition-colors duration-200">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Left: Input */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[#a0a0a8]">
              Week Notes <span className="text-[#6b6b75] font-normal">({weekRange})</span>
            </label>
            {notes.trim() && (
              <button
                onClick={() => onNotesChange('')}
                className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="e.g., December 24 closing at 2pm, December 25 CLOSED, [Name] opens Saturday, [Name] off Tuesday..."
            className="w-full h-20 p-3 bg-[#141417] border border-[#2a2a32] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] resize-none transition-all duration-200 placeholder:text-[#6b6b75]"
          />
          <p className="mt-2 text-[11px] text-[#6b6b75]">
            Tip: Click &quot;This Week&quot; or &quot;Always&quot; to save rules.
          </p>
          {/* Preview */}
          {parsedPreview.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parsedPreview.map((text, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    text.includes('CLOSED')
                      ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30'
                      : text.includes('Close at')
                        ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30'
                        : text.startsWith('✗')
                          ? 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30'
                          : 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/30'
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
          <div className="flex flex-col items-center">
            <button
              onClick={onApplyWeek}
              disabled={parsedPreview.length === 0}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                parsedPreview.length > 0
                  ? 'bg-[#e5a825] text-[#0d0d0f] hover:bg-[#f5b835] shadow-lg shadow-[#e5a825]/30 hover:scale-110'
                  : 'bg-[#2a2a32] text-[#6b6b75] cursor-not-allowed'
              }`}
              title="Apply to this week only"
            >
              <ArrowRightIcon className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-[#6b6b75] mt-0.5">This Week</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={onApplyPermanent}
              disabled={parsedPreview.length === 0}
              className={`p-2.5 rounded-full transition-all duration-200 ${
                parsedPreview.length > 0
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

        {/* Right: Active Rules */}
        <div className="w-full lg:w-72 space-y-2">
          {/* This Week Rules */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-[#e5a825] flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                This Week {weekRules.length > 0 && `(${weekRules.length})`}
              </label>
              {weekRules.length > 0 && (
                <button onClick={onClearWeekRules} className="text-[10px] text-[#ef4444] hover:text-[#f87171]">
                  Clear
                </button>
              )}
            </div>
            <div className="h-16 bg-[#141417] border border-[#e5a825]/30 rounded-lg p-1.5 overflow-y-auto">
              {weekRules.length > 0 ? (
                <div className="space-y-1">
                  {weekRules.map((text, idx) => (
                    <div
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center justify-between gap-1 bg-[#e5a825]/10 text-[#e5a825] border border-[#e5a825]/30"
                    >
                      <span className="truncate">{text}</span>
                      <button onClick={() => onRemoveWeekRule(idx)} className="hover:text-[#ef4444] flex-shrink-0">
                        <XIcon className="w-2.5 h-2.5" />
                      </button>
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
                Always {permanentRules.length > 0 && `(${permanentRules.length})`}
              </label>
              {permanentRules.length > 0 && (
                <button onClick={onClearPermanentRules} className="text-[10px] text-[#ef4444] hover:text-[#f87171]">
                  Clear
                </button>
              )}
            </div>
            <div className="h-16 bg-[#141417] border border-[#a855f7]/30 rounded-lg p-1.5 overflow-y-auto">
              {permanentRules.length > 0 ? (
                <div className="space-y-1">
                  {permanentRules.map((text, idx) => (
                    <div
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center justify-between gap-1 bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/30"
                    >
                      <span className="truncate">{text}</span>
                      <button onClick={() => onRemovePermanentRule(idx)} className="hover:text-[#ef4444] flex-shrink-0">
                        <XIcon className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-[#6b6b75]">
                  Saved rules (persist after refresh)
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
