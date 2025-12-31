'use client';

import { useState } from 'react';
import { saveCurrentScheduleAsTemplate } from '@/lib/templates/saveTemplate';

interface ScheduleAssignment {
  employeeId: string;
  employeeName: string;
  date: string;
  type: 'morning' | 'mid' | 'night';
  startTime: string;
  endTime: string;
}

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: ScheduleAssignment[];
  userId: string;
  onSuccess?: () => void;
}

export default function SaveTemplateModal({
  isOpen,
  onClose,
  assignments,
  userId,
  onSuccess,
}: SaveTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'seasonal' | 'event' | 'standard' | 'custom'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (assignments.length === 0) {
      setError('Cannot save template with no assignments');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await saveCurrentScheduleAsTemplate({
        name: templateName,
        description: description || undefined,
        category,
        assignments,
        userId,
      });

      onSuccess?.();
      onClose();
      setTemplateName('');
      setDescription('');
      setCategory('standard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stats = {
    shifts: assignments.length,
    employees: new Set(assignments.map(a => a.employeeId)).size,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2a32]">
          <h2 className="text-lg font-bold text-white">Save as Template</h2>
          <p className="text-sm text-[#6b6b75] mt-1">Create a reusable schedule template</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444] rounded-lg">
              <p className="text-sm text-[#ef4444]">{error}</p>
            </div>
          )}

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Summer Weekends, Holiday Week"
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white placeholder-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when/why you'd use this template..."
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white placeholder-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
              rows={2}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              <option value="standard">Standard</option>
              <option value="seasonal">Seasonal</option>
              <option value="event">Event</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Preview Stats */}
          <div className="bg-[#141417] rounded-lg p-3">
            <p className="text-xs text-[#6b6b75] mb-2">Preview</p>
            <div className="flex gap-4">
              <div>
                <p className="text-sm font-bold text-white">{stats.shifts}</p>
                <p className="text-xs text-[#6b6b75]">Shifts</p>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{stats.employees}</p>
                <p className="text-xs text-[#6b6b75]">Employees</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2a2a32] flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-[#141417] text-white rounded-lg hover:bg-[#1a1a1f] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !templateName.trim()}
            className="flex-1 px-4 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg hover:bg-[#f0b429] transition-colors disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
