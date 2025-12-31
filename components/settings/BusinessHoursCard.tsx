'use client';

import { useState } from 'react';
import { AppSettings } from '../SettingsView';

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
);

const PasteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
);

const ApplyAllIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
  </svg>
);

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

interface Props {
  businessHours: AppSettings['businessHours'];
  onUpdateBusinessHours: (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => void;
}

export default function BusinessHoursCard({ businessHours, onUpdateBusinessHours }: Props) {
  const [copiedHours, setCopiedHours] = useState<{ open: string; close: string } | null>(null);

  const copyHours = (day: string) => {
    const hours = businessHours[day];
    setCopiedHours({ open: hours.open, close: hours.close });
  };

  const pasteHours = (day: string) => {
    if (!copiedHours) return;
    onUpdateBusinessHours(day, 'open', copiedHours.open);
    onUpdateBusinessHours(day, 'close', copiedHours.close);
    onUpdateBusinessHours(day, 'closed', false);
  };

  const applyToAllDays = (day: string) => {
    const hours = businessHours[day];
    for (const d of days) {
      if (d !== day && d !== 'monday') {
        onUpdateBusinessHours(d, 'open', hours.open);
        onUpdateBusinessHours(d, 'close', hours.close);
        onUpdateBusinessHours(d, 'closed', hours.closed);
      }
    }
  };

  return (
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
          const hours = businessHours[day];
          return (
            <div key={day} className="flex items-center gap-4 p-3 bg-[#141417] rounded-lg border border-[#2a2a32]">
              <div className="w-28">
                <span className="text-sm font-medium text-white">{dayLabels[day]}</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hours.closed}
                  onChange={(e) => onUpdateBusinessHours(day, 'closed', e.target.checked)}
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
                      onChange={(e) => onUpdateBusinessHours(day, 'open', e.target.value)}
                      className="px-3 py-1.5 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                    />
                    <span className="text-[#6b6b75]">to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => onUpdateBusinessHours(day, 'close', e.target.value)}
                      className="px-3 py-1.5 bg-[#0d0d0f] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
                    />
                  </div>

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
                      className={`p-1.5 rounded transition-colors ${copiedHours
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
  );
}
