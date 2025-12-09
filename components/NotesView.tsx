'use client';

import { useEffect, useState } from 'react';
import { ScheduleOverride, Employee } from '@/lib/types';
import { parseScheduleNotes, formatParsedOverrides } from '@/lib/parseNotes';

interface Props {
  notes: string;
  setNotes: (notes: string) => void;
  overrides: ScheduleOverride[];
  setOverrides: (overrides: ScheduleOverride[]) => void;
  employees: Employee[];
}

export default function NotesView({ notes, setNotes, setOverrides, employees }: Props) {
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);

  // Parse notes as user types
  useEffect(() => {
    if (notes.trim()) {
      const parsed = parseScheduleNotes(notes, employees);
      const formatted = formatParsedOverrides(parsed, employees);
      setParsedPreview(formatted);
      setOverrides(parsed);
    } else {
      setParsedPreview([]);
      setOverrides([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, employees]); // Don't include setOverrides to prevent infinite loop

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Schedule Notes</h1>
        <p className="text-sm text-gray-500 mt-1">Add instructions that will be applied when generating the schedule</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduling Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type natural language instructions...

Examples:
- Kim opens Saturday
- Kris Ann off Tuesday
- Ali works Friday night
- Heidi Wed thru Fri morning"
              className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Keywords: &quot;opens&quot;, &quot;off&quot;, &quot;night&quot;, &quot;morning&quot;, &quot;prefers&quot;, &quot;closing&quot;, &quot;works&quot; - Nicknames work too (Chris = Kris Ann, Hales = Haley, etc.)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parsed Rules {parsedPreview.length > 0 && `(${parsedPreview.length})`}
            </label>
            <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-y-auto">
              {parsedPreview.length > 0 ? (
                <div className="space-y-2">
                  {parsedPreview.map((text, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        text.startsWith('✓')
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : text.startsWith('✗')
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  Rules will appear here as you type
                </div>
              )}
            </div>
            {parsedPreview.length > 0 && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckIcon className="w-3 h-3" />
                Click &quot;Regenerate&quot; on the Schedule page to apply these rules
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
