'use client';

import { ScheduleConflict, ScheduleWarning } from '@/lib/types';

interface Props {
  conflicts: ScheduleConflict[];
  warnings: ScheduleWarning[];
}

export default function ConflictsPanel({ conflicts, warnings }: Props) {
  if (conflicts.length === 0 && warnings.length === 0) {
    return (
      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <span className="text-xl">✅</span>
          <span className="font-medium">Schedule looks good!</span>
        </div>
        <p className="text-green-600 text-sm mt-1">
          All shifts are covered and constraints are satisfied.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <span className="text-xl">🚨</span>
            <span className="font-medium">Conflicts ({conflicts.length})</span>
          </div>
          <ul className="space-y-2">
            {conflicts.map((conflict, i) => (
              <li key={i} className="flex items-start gap-2 text-red-600 text-sm">
                <span className="shrink-0">
                  {conflict.type === 'no_coverage' && '❌'}
                  {conflict.type === 'no_bartender' && '🍺'}
                  {conflict.type === 'employee_unavailable' && '🚫'}
                  {conflict.type === 'alone_constraint' && '👤'}
                </span>
                <span>{conflict.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-700 mb-2">
            <span className="text-xl">⚠️</span>
            <span className="font-medium">Warnings ({warnings.length})</span>
          </div>
          <ul className="space-y-2">
            {warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2 text-yellow-700 text-sm">
                <span className="shrink-0">
                  {warning.type === 'overtime' && '⏰'}
                  {warning.type === 'under_hours' && '📉'}
                  {warning.type === 'preference_violated' && '💭'}
                  {warning.type === 'approaching_limit' && '📊'}
                </span>
                <span>{warning.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
