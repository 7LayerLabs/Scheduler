'use client';

import React from 'react';
import { WeeklySchedule, Employee } from '@/lib/types';

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

interface Stats {
  totalShifts: number;
  staffScheduled: number;
  coverage: number;
  conflicts: number;
}

interface Props {
  stats: Stats;
  schedule: WeeklySchedule | null;
  employees: Employee[];
  weekStart: Date;
  formatWeekRange: (date: Date) => string;
  onChangeWeek: (direction: number) => void;
}

function StatCard({
  label,
  value,
  icon,
  trend,
  color,
  weekNav,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
  weekNav?: { onPrev: () => void; onNext: () => void };
}) {
  const colorClasses: Record<string, { bg: string; icon: string; shadow: string }> = {
    blue: { bg: 'bg-[#3b82f6]', icon: 'text-white', shadow: 'shadow-[#3b82f6]/30' },
    green: { bg: 'bg-[#22c55e]', icon: 'text-white', shadow: 'shadow-[#22c55e]/30' },
    emerald: { bg: 'bg-[#22c55e]', icon: 'text-white', shadow: 'shadow-[#22c55e]/30' },
    red: { bg: 'bg-[#ef4444]', icon: 'text-white', shadow: 'shadow-[#ef4444]/30' },
    purple: { bg: 'bg-[#a855f7]', icon: 'text-white', shadow: 'shadow-[#a855f7]/30' },
  };

  const colorStyle = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-5 hover:border-[#3a3a45] transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#6b6b75]">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorStyle.bg} shadow-lg ${colorStyle.shadow} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && <p className="text-xs text-[#6b6b75] mt-1">{trend}</p>}
        </div>
        {weekNav && (
          <div className="flex gap-1">
            <button
              onClick={weekNav.onPrev}
              className="p-1.5 hover:bg-[#222228] rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronLeftIcon className="w-4 h-4 text-[#6b6b75]" />
            </button>
            <button
              onClick={weekNav.onNext}
              className="p-1.5 hover:bg-[#222228] rounded-lg transition-all duration-200 hover:scale-110"
            >
              <ChevronRightIcon className="w-4 h-4 text-[#6b6b75]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatsPanel({
  stats,
  schedule,
  employees,
  weekStart,
  formatWeekRange,
  onChangeWeek,
}: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Total Shifts"
        value={stats.totalShifts}
        icon={<CalendarIcon className="w-5 h-5" />}
        trend={schedule ? '+12% from last week' : undefined}
        color="blue"
      />
      <StatCard
        label="Staff Scheduled"
        value={stats.staffScheduled}
        icon={<UsersIcon className="w-5 h-5" />}
        trend={schedule ? `of ${employees.length} employees` : undefined}
        color="green"
      />
      <StatCard
        label="Coverage"
        value={schedule ? `${stats.coverage}%` : '-'}
        icon={<CheckIcon className="w-5 h-5" />}
        trend={stats.conflicts > 0 ? `${stats.conflicts} gaps` : schedule ? 'Full coverage' : undefined}
        color={stats.conflicts > 0 ? 'red' : 'emerald'}
      />
      <StatCard
        label="Week"
        value={formatWeekRange(weekStart).split(',')[0]}
        icon={<ClockIcon className="w-5 h-5" />}
        color="purple"
        weekNav={{ onPrev: () => onChangeWeek(-1), onNext: () => onChangeWeek(1) }}
      />
    </div>
  );
}
