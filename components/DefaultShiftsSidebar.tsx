'use client';

import { useMemo } from 'react';
import type { DefaultShiftTemplate } from '@/lib/manualShifts';
import {
  SHIFT_TEMPLATE_MIME_TYPE,
  getAllUniqueDefaultShiftTemplatesFromStaffingNeeds,
  serializeShiftTemplateDragPayload,
} from '@/lib/manualShifts';
import type { WeeklyStaffingNeeds } from '@/lib/types';
import { getShiftBucketFromStartTime } from '@/lib/shiftBuckets';

interface Props {
  staffingNeeds: WeeklyStaffingNeeds;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours || '0', 10);
  const ampm = hour >= 12 ? 'p' : 'a';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minutes}${ampm}`;
}

export default function DefaultShiftsSidebar({ staffingNeeds }: Props) {
  const templates = useMemo(() => {
    return getAllUniqueDefaultShiftTemplatesFromStaffingNeeds(staffingNeeds);
  }, [staffingNeeds]);

  const grouped = useMemo(() => {
    const morning: DefaultShiftTemplate[] = [];
    const mid: DefaultShiftTemplate[] = [];
    const night: DefaultShiftTemplate[] = [];
    for (const t of templates) {
      const bucket = getShiftBucketFromStartTime(t.startTime);
      if (bucket === 'mid') mid.push(t);
      else if (bucket === 'night') night.push(t);
      else morning.push(t);
    }
    return { morning, mid, night };
  }, [templates]);

  const renderGroup = (title: string, items: DefaultShiftTemplate[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold text-[#6b6b75] uppercase tracking-wide">{title}</div>
        <div className="space-y-2">
          {items.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData(
                  SHIFT_TEMPLATE_MIME_TYPE,
                  serializeShiftTemplateDragPayload({ template: t })
                );
              }}
              className="cursor-grab active:cursor-grabbing bg-[#141417] border border-[#2a2a32] rounded-xl px-3 py-2 hover:border-[#3a3a45] transition-colors"
              title="Drag onto the schedule to add"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white truncate">{t.label}</div>
                <div className="text-xs text-[#a0a0a8] whitespace-nowrap">
                  {formatTime(t.startTime)} - {formatTime(t.endTime)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className="lg:w-64 w-full bg-[#141417] border border-[#2a2a32] rounded-2xl p-4 h-fit">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-white">Default Shifts</div>
          <div className="text-xs text-[#6b6b75] mt-0.5">Drag onto an employee day to add</div>
        </div>
      </div>

      <div className="space-y-4">
        {renderGroup('Morning', grouped.morning)}
        {renderGroup('Mid', grouped.mid)}
        {renderGroup('Night', grouped.night)}
      </div>
    </aside>
  );
}


