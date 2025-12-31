'use client';

import { useState } from 'react';
import { useAnalyticsHistory } from '@/lib/instantdb';
import { getTopEmployees, formatMetrics, calculateMetrics } from '@/lib/analytics/scheduleAnalytics';
import {
  exportAnalyticsToCSV,
  exportEmployeeUtilizationToCSV,
  downloadCSV,
  generateCSVFilename,
} from '@/lib/analytics/csvExport';
import type { WeeklyAnalytics } from '@/lib/instantdb';

export default function AnalyticsDashboard() {
  const { analytics, isLoading } = useAnalyticsHistory(12);
  const [dateRange, setDateRange] = useState<'4weeks' | '12weeks'>('12weeks');

  const filteredAnalytics =
    dateRange === '4weeks' ? analytics.slice(0, 4) : analytics;

  const handleExportAnalytics = () => {
    const csv = exportAnalyticsToCSV(
      filteredAnalytics.reverse()
    );
    downloadCSV(csv, generateCSVFilename('analytics'));
  };

  const handleExportUtilization = () => {
    const csv = exportEmployeeUtilizationToCSV(
      filteredAnalytics.reverse()
    );
    downloadCSV(csv, generateCSVFilename('utilization'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border border-[#e5a825] border-t-transparent" />
      </div>
    );
  }

  if (filteredAnalytics.length === 0) {
    return (
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-12 text-center">
        <p className="text-[#6b6b75]">No analytics data available</p>
        <p className="text-xs text-[#6b6b75] mt-2">
          Publish schedules to generate analytics
        </p>
      </div>
    );
  }

  // Calculate aggregate metrics
  const allMetrics = filteredAnalytics.map(a => {
    try {
      return {
        weekKey: a.weekKey,
        shiftDist: JSON.parse(a.shiftTypeDistribution),
        utilization: JSON.parse(a.employeeUtilization),
        totalShifts: a.totalShifts,
        totalHours: a.totalHours,
        bartenderRate: a.bartenderCoverageRate,
      };
    } catch {
      return null;
    }
  });

  const validMetrics = allMetrics.filter((m) => m !== null);
  const totalShifts = validMetrics.reduce((sum, m) => sum + m!.totalShifts, 0);
  const totalHours = validMetrics.reduce((sum, m) => sum + m!.totalHours, 0);
  const avgBartenderRate =
    validMetrics.length > 0
      ? validMetrics.reduce((sum, m) => sum + m!.bartenderRate, 0) /
        validMetrics.length
      : 0;

  // Get top employees
  const topEmployees =
    filteredAnalytics.length > 0
      ? getTopEmployees(filteredAnalytics[0], 5)
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics</h1>
        <p className="text-xs sm:text-sm text-[#6b6b75] mt-1">
          {filteredAnalytics.length} weeks of scheduling data
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setDateRange('4weeks')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              dateRange === '4weeks'
                ? 'bg-[#e5a825] text-[#0d0d0f]'
                : 'bg-[#141417] text-[#6b6b75] hover:text-white'
            }`}
          >
            Last 4 Weeks
          </button>
          <button
            onClick={() => setDateRange('12weeks')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              dateRange === '12weeks'
                ? 'bg-[#e5a825] text-[#0d0d0f]'
                : 'bg-[#141417] text-[#6b6b75] hover:text-white'
            }`}
          >
            Last 12 Weeks
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportAnalytics}
            className="px-3 py-1.5 bg-[#141417] text-[#6b6b75] hover:text-white rounded text-sm font-medium transition-colors"
          >
            📊 Export Analytics
          </button>
          <button
            onClick={handleExportUtilization}
            className="px-3 py-1.5 bg-[#141417] text-[#6b6b75] hover:text-white rounded text-sm font-medium transition-colors"
          >
            👥 Export Utilization
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
          <p className="text-xs text-[#6b6b75] mb-1">Total Shifts</p>
          <p className="text-2xl font-bold text-white">{totalShifts}</p>
          <p className="text-xs text-[#6b6b75] mt-1">
            {(totalShifts / Math.max(1, validMetrics.length)).toFixed(0)} per week
          </p>
        </div>

        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
          <p className="text-xs text-[#6b6b75] mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-white">
            {totalHours.toFixed(0)}h
          </p>
          <p className="text-xs text-[#6b6b75] mt-1">
            {(totalHours / Math.max(1, validMetrics.length)).toFixed(0)}h per week
          </p>
        </div>

        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
          <p className="text-xs text-[#6b6b75] mb-1">Avg Shift Duration</p>
          <p className="text-2xl font-bold text-white">
            {(totalHours / Math.max(1, totalShifts)).toFixed(1)}h
          </p>
          <p className="text-xs text-[#6b6b75] mt-1">hours per shift</p>
        </div>

        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
          <p className="text-xs text-[#6b6b75] mb-1">Bartender Coverage</p>
          <p className="text-2xl font-bold text-white">
            {(avgBartenderRate * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-[#6b6b75] mt-1">dinner shifts covered</p>
        </div>
      </div>

      {/* Shift Distribution Chart */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="font-bold text-white mb-4">Shift Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          {(() => {
            const distribution = {
              morning: 0,
              mid: 0,
              night: 0,
            };

            for (const metric of validMetrics) {
              if (metric) {
                distribution.morning += metric.shiftDist.morning;
                distribution.mid += metric.shiftDist.mid;
                distribution.night += metric.shiftDist.night;
              }
            }

            const total =
              distribution.morning + distribution.mid + distribution.night;

            return [
              {
                label: 'Morning',
                count: distribution.morning,
                color: '#3b82f6',
              },
              { label: 'Mid', count: distribution.mid, color: '#f59e0b' },
              { label: 'Night', count: distribution.night, color: '#8b5cf6' },
            ].map(shift => {
              const pct = total > 0 ? (shift.count / total) * 100 : 0;
              return (
                <div key={shift.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-white font-medium">
                      {shift.label}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {shift.count}
                    </span>
                  </div>
                  <div className="w-full bg-[#141417] rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: shift.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#6b6b75] mt-1">{pct.toFixed(0)}%</p>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Top Employees */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="font-bold text-white mb-4">Most Scheduled Employees</h2>
        <div className="space-y-3">
          {topEmployees.length > 0 ? (
            topEmployees.map((emp, idx) => (
              <div key={emp.employeeId} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#e5a825]/20 flex items-center justify-center text-sm font-bold text-[#e5a825]">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {emp.employeeId}
                  </p>
                  <p className="text-xs text-[#6b6b75]">
                    {emp.hours.toFixed(1)} hours
                  </p>
                </div>
                <div className="text-sm font-bold text-white">
                  {emp.hours.toFixed(1)}h
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6b6b75]">No data available</p>
          )}
        </div>
      </div>

      {/* Weekly Timeline */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h2 className="font-bold text-white mb-4">Weekly Trend</h2>
        <div className="space-y-2">
          {filteredAnalytics.map(week => (
            <div key={week.weekKey} className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#6b6b75] w-12 text-right">
                {week.weekKey}
              </span>
              <div className="flex-1 bg-[#141417] rounded-lg h-8 overflow-hidden">
                <div
                  className="bg-[#e5a825] h-full flex items-center justify-center"
                  style={{
                    width: `${(week.totalShifts / Math.max(...filteredAnalytics.map(w => w.totalShifts))) * 100}%`,
                  }}
                >
                  {week.totalShifts > 0 && (
                    <span className="text-xs font-bold text-[#0d0d0f]">
                      {week.totalShifts}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-white w-8 text-right">
                {week.totalHours.toFixed(0)}h
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
