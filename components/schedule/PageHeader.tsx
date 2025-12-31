'use client';

const ArchiveBoxIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0016.5 19.5H6.75z" />
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.125A59.769 59.769 0 0121.94 12c6.839-6.02 12.67-3.06 16.06 3.125L21 12a9.003 9.003 0 00-15-8.875z" />
  </svg>
);

interface Props {
  schedule: boolean;
  onClear: () => void;
  onPrint: () => void;
  onArchive?: () => void;
  onPublish?: () => void;
}

export default function PageHeader({ schedule, onClear, onPrint, onArchive, onPublish }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Schedule</h1>
        <p className="text-xs sm:text-sm text-[#6b6b75] mt-1">Manage your weekly staff schedule</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {schedule && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[#ef4444] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#ef4444]/30 hover:border-[#ef4444]/50 hover:bg-[#ef4444]/10"
          >
            Clear
          </button>
        )}
        {schedule && (
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#2a2a32] hover:border-[#3a3a45] hover:bg-[#222228]"
          >
            Print
          </button>
        )}
        {schedule && onArchive && (
          <button
            onClick={onArchive}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[#a855f7] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#a855f7]/30 hover:border-[#a855f7]/50 hover:bg-[#a855f7]/10"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
            Save
          </button>
        )}
        {schedule && onPublish && (
          <button
            onClick={onPublish}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[#22c55e] text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 border border-[#22c55e]/30 hover:border-[#22c55e]/50 hover:bg-[#22c55e]/10"
            title="Publish this schedule so employees can view it"
          >
            <SendIcon className="w-4 h-4" />
            Publish
          </button>
        )}
      </div>
    </div>
  );
}
