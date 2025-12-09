'use client';

import { useEffect, useState } from 'react';
import { Employee, ScheduleOverride } from '@/lib/types';
import { parseScheduleNotes, formatParsedOverrides } from '@/lib/parseNotes';

interface Props {
  notes: string;
  setNotes: (notes: string) => void;
  overrides: ScheduleOverride[];
  setOverrides: (overrides: ScheduleOverride[]) => void;
  employees: Employee[];
  weekStart: Date;
}

export default function ScheduleNotes({
  notes,
  setNotes,
  overrides,
  setOverrides,
}: Props) {
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);

  // Parse notes as user types
  useEffect(() => {
    if (notes.trim()) {
      const parsed = parseScheduleNotes(notes);
      const formatted = formatParsedOverrides(parsed);
      setParsedPreview(formatted);
      // Update overrides state with parsed results
      setOverrides(parsed);
    } else {
      setParsedPreview([]);
      setOverrides([]);
    }
  }, [notes, setOverrides]);

  const getOverrideColor = (text: string) => {
    if (text.startsWith('✓')) return 'bg-green-100 border-green-300 text-green-800';
    if (text.startsWith('✗')) return 'bg-red-100 border-red-300 text-red-800';
    if (text.startsWith('★')) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-gray-100 border-gray-300';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>📝</span>
        Schedule Notes
      </h2>

      {/* Freeform Notes - Now the main input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-600 mb-1">
          Type scheduling instructions naturally:
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Examples:
• Kim opens Saturday
• Kris Ann off Tuesday
• Ali works Friday night
• Heidi Wed thru Fri morning
• Christian prefers Saturday"
          className="w-full p-3 border rounded text-sm resize-none h-32 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </div>

      {/* Parsed Rules Preview */}
      {parsedPreview.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2 flex items-center gap-2">
            <span className="text-green-600">✓</span>
            I understood these rules:
          </label>
          <div className="space-y-2">
            {parsedPreview.map((text, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border text-sm font-medium ${getOverrideColor(text)}`}
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parsing Tips */}
      {notes.trim() && parsedPreview.length === 0 && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Tip:</strong> Include an employee name and a day of the week.
          <br />
          Example: &quot;Kim opens Saturday&quot; or &quot;Ali off Friday&quot;
        </div>
      )}

      {/* Instructions */}
      {overrides.length > 0 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          <strong>Click &quot;Regenerate Schedule&quot;</strong> above to apply these rules!
        </div>
      )}

      {/* Quick Reference */}
      <div className="mt-3 text-xs text-gray-500">
        <p className="font-medium mb-1">What I understand:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li><strong>&quot;opens&quot;, &quot;works&quot;, &quot;morning&quot;</strong> = Assign to morning shift</li>
          <li><strong>&quot;night&quot;, &quot;closing&quot;, &quot;dinner&quot;</strong> = Assign to night shift</li>
          <li><strong>&quot;off&quot;, &quot;not&quot;, &quot;can&apos;t&quot;</strong> = Keep them off that day</li>
          <li><strong>&quot;prefers&quot;, &quot;wants&quot;</strong> = Give preference</li>
          <li><strong>&quot;Wed thru Fri&quot;</strong> = Range of days</li>
        </ul>
      </div>
    </div>
  );
}
