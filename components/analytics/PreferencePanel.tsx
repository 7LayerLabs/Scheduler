'use client';

import { usePreferenceAnalysis } from '@/lib/instantdb';
import type { EmployeePreferenceAnalysis } from '@/lib/instantdb';
import {
  getPreferenceScore,
  getConfidenceLevel,
  formatPreferences,
  hasEnoughDataForAnalysis,
} from '@/lib/analytics/preferenceAnalysis';

interface PreferencePanelProps {
  employeeId: string;
  employeeName: string;
}

export default function PreferencePanel({
  employeeId,
  employeeName,
}: PreferencePanelProps) {
  const { analysis } = usePreferenceAnalysis(employeeId);

  if (!analysis || !hasEnoughDataForAnalysis(analysis.totalShiftsAnalyzed)) {
    return (
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-6">
        <h3 className="font-bold text-white mb-2">Shift Preferences</h3>
        <p className="text-sm text-[#6b6b75]">
          Not enough shift history ({analysis?.totalShiftsAnalyzed || 0}/8 shifts analyzed)
        </p>
      </div>
    );
  }

  const shiftPrefs = JSON.parse(analysis.preferredShiftTypes);
  const dayPrefs = JSON.parse(analysis.preferredDays);
  const confidenceLevel = getConfidenceLevel(analysis.confidenceScore);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white">Shift Preferences</h3>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              confidenceLevel === 'High'
                ? 'bg-[#22c55e]/20 text-[#22c55e]'
                : confidenceLevel === 'Medium'
                  ? 'bg-[#eab308]/20 text-[#eab308]'
                  : 'bg-[#6b6b75]/20 text-[#6b6b75]'
            }`}
          >
            {confidenceLevel} Confidence
          </span>
        </div>
        <p className="text-xs text-[#6b6b75]">
          Based on {analysis.totalShiftsAnalyzed} shifts analyzed
        </p>
      </div>

      {/* Shift Type Distribution */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
        <p className="text-sm font-medium text-white mb-3">Preferred Shift Types</p>
        <div className="space-y-2">
          {[
            { label: 'Morning', key: 'morning', color: '#3b82f6' },
            { label: 'Mid', key: 'mid', color: '#f59e0b' },
            { label: 'Night', key: 'night', color: '#8b5cf6' },
          ].map(shift => {
            const pct = Math.round((shiftPrefs[shift.key] || 0) * 100);
            return (
              <div key={shift.key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-[#a0a0a8]">{shift.label}</span>
                  <span className="text-xs font-medium text-white">{pct}%</span>
                </div>
                <div className="w-full bg-[#141417] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: shift.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Preferences */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
        <p className="text-sm font-medium text-white mb-3">Preferred Days</p>
        <div className="grid grid-cols-7 gap-1">
          {[
            { label: 'Mon', key: 'monday' },
            { label: 'Tue', key: 'tuesday' },
            { label: 'Wed', key: 'wednesday' },
            { label: 'Thu', key: 'thursday' },
            { label: 'Fri', key: 'friday' },
            { label: 'Sat', key: 'saturday' },
            { label: 'Sun', key: 'sunday' },
          ].map(day => {
            const pct = Math.round((dayPrefs[day.key] || 0) * 100);
            const intensity = Math.max(0.2, pct / 100);
            return (
              <div
                key={day.key}
                className="flex flex-col items-center gap-1 p-2 rounded-lg"
                style={{
                  backgroundColor: `rgba(229, 168, 37, ${intensity * 0.2})`,
                }}
              >
                <span className="text-xs font-medium text-white">{day.label}</span>
                <span className="text-xs text-[#6b6b75]">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#6b6b75] mb-1">Avg Shift Duration</p>
            <p className="text-lg font-bold text-white">
              {analysis.avgShiftDuration.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b6b75] mb-1">Avg Hours/Week</p>
            <p className="text-lg font-bold text-white">
              {analysis.avgHoursPerWeek.toFixed(1)}h
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b6b75] mb-1">Swap Request Rate</p>
            <p className="text-lg font-bold text-white">
              {(analysis.swapRequestRate * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6b6b75] mb-1">Confidence</p>
            <p className="text-lg font-bold text-white">
              {(analysis.confidenceScore * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-[#6b6b75] text-center">
        Last updated {new Date(analysis.lastUpdated).toLocaleDateString()}
      </p>
    </div>
  );
}
