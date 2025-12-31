'use client';

import { useState, useEffect } from 'react';
import { Employee } from '@/lib/types';

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m-.002 0a6.772 6.772 0 003.044 0" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

interface Props {
  employees: Employee[];
  onUpdateEmployee: (employee: Employee) => Promise<void>;
}

export default function EmployeeRankingCard({ employees, onUpdateEmployee }: Props) {
  const [rankingOrder, setRankingOrder] = useState<string[]>([]);
  const [isSavingRanks, setIsSavingRanks] = useState(false);
  const [rankingsChanged, setRankingsChanged] = useState(false);

  // Initialize ranking order from employees when they load
  useEffect(() => {
    if (employees && employees.length > 0 && rankingOrder.length === 0) {
      const activeEmployees = employees.filter(e => e.isActive !== false);
      const sorted = [...activeEmployees]
        .sort((a, b) => (a.valueRank ?? 9999) - (b.valueRank ?? 9999))
        .map(e => e.id);
      setRankingOrder(sorted);
    }
  }, [employees, rankingOrder.length]);

  const moveEmployeeUp = (employeeId: string) => {
    const idx = rankingOrder.indexOf(employeeId);
    if (idx <= 0) return;
    const newOrder = [...rankingOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setRankingOrder(newOrder);
    setRankingsChanged(true);
  };

  const moveEmployeeDown = (employeeId: string) => {
    const idx = rankingOrder.indexOf(employeeId);
    if (idx < 0 || idx >= rankingOrder.length - 1) return;
    const newOrder = [...rankingOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setRankingOrder(newOrder);
    setRankingsChanged(true);
  };

  const saveRankings = async () => {
    setIsSavingRanks(true);
    try {
      for (let i = 0; i < rankingOrder.length; i++) {
        const empId = rankingOrder[i];
        const emp = employees.find(e => e.id === empId);
        if (emp) {
          await onUpdateEmployee({ ...emp, valueRank: i + 1 });
        }
      }
      setRankingsChanged(false);
    } catch (error) {
      console.error('Failed to save rankings:', error);
    } finally {
      setIsSavingRanks(false);
    }
  };

  return (
    <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-[#e5a825]" />
            Employee Value Rankings
          </h2>
          <p className="text-xs text-[#6b6b75] mt-1">
            Drag employees up/down to set scheduling priority. Top = most shifts.
          </p>
        </div>
        {rankingsChanged && (
          <button
            onClick={saveRankings}
            disabled={isSavingRanks}
            className="px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg font-medium hover:bg-[#f5b835] transition-colors disabled:opacity-50"
          >
            {isSavingRanks ? 'Saving...' : 'Save Rankings'}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {rankingOrder.map((empId, idx) => {
          const emp = employees.find(e => e.id === empId);
          if (!emp) return null;
          const isTop3 = idx < 3;

          return (
            <div
              key={empId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isTop3
                ? 'bg-[#e5a825]/5 border-[#e5a825]/30'
                : 'bg-[#141417] border-[#2a2a32]'
                }`}
            >
              {/* Rank number */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-[#ffd700] text-[#0d0d0f]' :
                idx === 1 ? 'bg-[#c0c0c0] text-[#0d0d0f]' :
                  idx === 2 ? 'bg-[#cd7f32] text-white' :
                    'bg-[#2a2a32] text-[#6b6b75]'
                }`}>
                {idx + 1}
              </div>

              {/* Employee name */}
              <div className="flex-1">
                <span className={`font-medium ${isTop3 ? 'text-[#e5a825]' : 'text-white'}`}>
                  {emp.name}
                </span>
                {emp.valueRank && emp.valueRank !== idx + 1 && (
                  <span className="ml-2 text-xs text-[#6b6b75]">
                    (was #{emp.valueRank})
                  </span>
                )}
              </div>

              {/* Skills badges */}
              <div className="flex items-center gap-2 text-xs">
                {emp.bartendingScale >= 3 && (
                  <span className="px-2 py-0.5 bg-[#a855f7]/20 text-[#a855f7] rounded">Bar</span>
                )}
                {emp.aloneScale >= 3 && (
                  <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded">Solo</span>
                )}
              </div>

              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveEmployeeUp(empId)}
                  disabled={idx === 0}
                  className="p-1 hover:bg-[#2a2a32] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move up"
                >
                  <ChevronUpIcon className="w-4 h-4 text-[#6b6b75]" />
                </button>
                <button
                  onClick={() => moveEmployeeDown(empId)}
                  disabled={idx === rankingOrder.length - 1}
                  className="p-1 hover:bg-[#2a2a32] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Move down"
                >
                  <ChevronDownIcon className="w-4 h-4 text-[#6b6b75]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
