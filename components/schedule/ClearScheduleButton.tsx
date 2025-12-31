'use client';

import { useState } from 'react';

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

interface Props {
  onClearSchedule: () => void;
}

export default function ClearScheduleButton({ onClearSchedule }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-white bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg hover:bg-[#ef4444]/20 hover:border-[#ef4444]/50 transition-colors text-sm"
      >
        <TrashIcon className="w-4 h-4" />
        Clear
      </button>

      {showConfirm && (
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
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-[#a0a0a8] font-medium hover:bg-[#222228] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearSchedule();
                  setShowConfirm(false);
                }}
                className="px-4 py-2 bg-[#ef4444] text-white font-medium rounded-lg hover:bg-[#dc2626] shadow-lg shadow-[#ef4444]/20 transition-all"
              >
                Yes, Clear It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
