'use client';

import { useState } from 'react';
import { incrementTemplateUsage } from '@/lib/instantdb';
import { applyTemplateToWeek } from '@/lib/templates/applyTemplate';
import type { ScheduleTemplate } from '@/lib/instantdb';

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ScheduleTemplate | null;
  currentAssignments?: any[];
  onApply?: (assignments: any[]) => void;
}

export default function ApplyTemplateModal({
  isOpen,
  onClose,
  template,
  currentAssignments,
  onApply,
}: ApplyTemplateModalProps) {
  const [targetDate, setTargetDate] = useState(getNextMonday().toISOString().split('T')[0]);
  const [mergeMode, setMergeMode] = useState<'replace' | 'merge'>('replace');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !template) return null;

  const handleApply = async () => {
    setIsApplying(true);
    setError(null);

    try {
      const targetDate_ = new Date(targetDate);
      const result = applyTemplateToWeek(template, targetDate_, currentAssignments || []);

      if (!result.success) {
        setError(
          result.conflicts[0]?.reason || 'Failed to apply template'
        );
        return;
      }

      // Increment usage counter
      await incrementTemplateUsage(template.id);

      // Call parent handler
      if (result.assignments) {
        onApply?.(result.assignments);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setIsApplying(false);
    }
  };

  const targetDate_ = new Date(targetDate);
  const weekEnd = new Date(targetDate_);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a32]">
          <h2 className="text-lg font-bold text-white">Apply Template</h2>
          <p className="text-sm text-[#6b6b75] mt-1">{template.name}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444] rounded-lg">
              <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
          )}

          {/* Target Week */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Target Week
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
            <p className="text-xs text-[#6b6b75] mt-1">
              Week of {targetDate_.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
            </p>
          </div>

          {/* Merge Mode */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Merge Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mergeMode"
                  value="replace"
                  checked={mergeMode === 'replace'}
                  onChange={() => setMergeMode('replace')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">
                  Replace existing schedule
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mergeMode"
                  value="merge"
                  checked={mergeMode === 'merge'}
                  onChange={() => setMergeMode('merge')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-white">
                  Merge with existing shifts
                </span>
              </label>
            </div>
            <p className="text-xs text-[#6b6b75] mt-2">
              {mergeMode === 'replace'
                ? 'This will completely replace your current schedule.'
                : 'This will add template shifts without removing existing ones.'}
            </p>
          </div>

          {/* Preview */}
          <div className="bg-[#141417] rounded-lg p-3">
            <p className="text-xs font-medium text-[#6b6b75] mb-2">Preview</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {(() => {
                try {
                  const assignments = JSON.parse(template.assignments);
                  return assignments.slice(0, 3).map((a: any, i: number) => (
                    <p key={i} className="text-xs text-white">
                      {a.employeeName}: {a.type}
                    </p>
                  ));
                } catch {
                  return <p className="text-xs text-[#6b6b75]">Unable to preview</p>;
                }
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2a32] flex gap-3">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="flex-1 px-4 py-2 bg-[#141417] text-white rounded-lg hover:bg-[#1a1a1f] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg hover:bg-[#f0b429] transition-colors disabled:opacity-50 font-medium"
          >
            {isApplying ? 'Applying...' : 'Apply Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getNextMonday(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
}
