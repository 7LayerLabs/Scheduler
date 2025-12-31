'use client';

import { useState } from 'react';
import { useScheduleTemplates, deleteScheduleTemplate } from '@/lib/instantdb';
import { formatTemplate, getTemplateStats } from '@/lib/templates/saveTemplate';
import type { ScheduleTemplate } from '@/lib/instantdb';

interface TemplateLiaryProps {
  onApply?: (template: ScheduleTemplate) => void;
  onEdit?: (template: ScheduleTemplate) => void;
}

export default function TemplateLibrary({ onApply, onEdit }: TemplateLiaryProps) {
  const { templates, isLoading } = useScheduleTemplates();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed' | 'usage'>('lastUsed');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTemplates = templates
    .filter(t => {
      if (searchTerm && !t.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterCategory !== 'all' && t.category !== filterCategory) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'lastUsed') {
        return (b.lastUsedAt || 0) - (a.lastUsedAt || 0);
      } else {
        return b.usageCount - a.usageCount;
      }
    });

  const handleDelete = async (templateId: string) => {
    setDeletingId(templateId);
    try {
      await deleteScheduleTemplate(templateId);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border border-[#e5a825] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Schedule Templates</h2>
        <p className="text-sm text-[#6b6b75] mt-1">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-[#6b6b75] mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Template name..."
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded text-sm text-white placeholder-[#6b6b75] focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-[#6b6b75] mb-2">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              <option value="all">All</option>
              <option value="seasonal">Seasonal</option>
              <option value="event">Event</option>
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-[#6b6b75] mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#141417] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              <option value="lastUsed">Last Used</option>
              <option value="name">Name</option>
              <option value="usage">Most Used</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-12 text-center">
          <p className="text-[#6b6b75]">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => {
            const formatted = formatTemplate(template);
            const stats = getTemplateStats(template);

            return (
              <div
                key={template.id}
                className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-4 hover:border-[#e5a825]/50 transition-colors"
              >
                {/* Title & Category */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-white truncate">{template.name}</h3>
                    <span className="text-xs font-medium text-[#e5a825] bg-[#e5a825]/10 px-2 py-1 rounded whitespace-nowrap">
                      {formatted.category}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-xs text-[#6b6b75] line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="bg-[#141417] rounded-lg p-3 mb-4 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6b6b75]">Shifts:</span>
                    <span className="text-white font-medium">{stats.shiftCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6b6b75]">Staff:</span>
                    <span className="text-white font-medium">{stats.employeeCount}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6b6b75]">Used:</span>
                    <span className="text-white font-medium">{template.usageCount}x</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6b6b75]">Last:</span>
                    <span className="text-white font-medium text-right">{formatted.lastUsed}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {onApply && (
                    <button
                      onClick={() => onApply(template)}
                      className="flex-1 px-3 py-2 bg-[#e5a825] text-[#0d0d0f] rounded-lg hover:bg-[#f0b429] transition-colors font-medium text-sm"
                    >
                      Apply
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(template)}
                      className="flex-1 px-3 py-2 bg-[#141417] text-white rounded-lg hover:bg-[#1a1a1f] transition-colors font-medium text-sm"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(template.id)}
                    disabled={deletingId === template.id}
                    className="px-3 py-2 bg-[#ef4444]/10 text-[#ef4444] rounded-lg hover:bg-[#ef4444]/20 transition-colors disabled:opacity-50"
                    title="Delete template"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
