'use client';

const DataIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const SyncIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const ExportIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const PrintIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
  </svg>
);

const ResetIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0113.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

interface Props {
  onSyncEmployees?: () => void;
  missingEmployeeCount?: number;
  onExportSchedule?: () => void;
  onPrintSchedule?: () => void;
  onReset?: () => void;
}

export default function DataManagementCard({
  onSyncEmployees,
  missingEmployeeCount,
  onExportSchedule,
  onPrintSchedule,
  onReset
}: Props) {
  return (
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
        {onPrintSchedule && (
          <button
            onClick={onPrintSchedule}
            className="px-4 py-2 bg-[#141417] text-white border border-[#2a2a32] rounded-lg font-medium hover:bg-[#222228] transition-colors flex items-center gap-2"
          >
            <PrintIcon className="w-4 h-4" />
            Print Schedule
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-[#141417] text-[#ef4444] border border-[#2a2a32] rounded-lg font-medium hover:bg-[#ef4444]/10 hover:border-[#ef4444]/30 transition-colors flex items-center gap-2"
          >
            <ResetIcon className="w-4 h-4" />
            Reset to Defaults
          </button>
        )}
      </div>
    </div>
  );
}
