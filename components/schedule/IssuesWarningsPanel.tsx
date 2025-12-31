'use client';

import { WeeklySchedule } from '@/lib/types';

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const WarningIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);

interface Props {
  schedule: WeeklySchedule;
}

export default function IssuesWarningsPanel({ schedule }: Props) {
  if (schedule.conflicts.length === 0 && schedule.warnings.length === 0) {
    return null;
  }

  return (
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
  );
}
