import { db, tx, id } from '@/lib/instantdb';
import type { ScheduleAssignment, WeeklySchedule } from '@/lib/types';

export interface DraftScheduleRecord {
  id: string;
  weekKey: string; // YYYY-MM-DD
  weekStart: string; // ISO string
  assignments: string; // JSON stringified ScheduleAssignment[]
  updatedAt: number;
  updatedBy: string;
}

function parseAssignments(raw: string): ScheduleAssignment[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as ScheduleAssignment[];
}

export function useDraftScheduleForWeek(weekKey: string) {
  const { data, isLoading, error } = db.useQuery(
    weekKey ? { draftSchedules: { $: { where: { weekKey } } } } : null
  );

  const record = (data?.draftSchedules?.[0] as DraftScheduleRecord | undefined) || null;

  let schedule: WeeklySchedule | null = null;
  if (record) {
    try {
      schedule = {
        weekStart: new Date(record.weekStart),
        assignments: parseAssignments(record.assignments),
        conflicts: [],
        warnings: [],
      };
    } catch {
      schedule = null;
    }
  }

  return { record, schedule, isLoading, error };
}

export async function upsertDraftScheduleForWeek(input: {
  weekKey: string;
  weekStart: string;
  assignments: string;
  updatedBy: string;
}) {
  const result = await db.queryOnce({ draftSchedules: { $: { where: { weekKey: input.weekKey } } } });
  const existing = result.data?.draftSchedules?.[0] as { id: string } | undefined;
  const draftId = existing?.id || id();

  await db.transact(
    tx.draftSchedules[draftId].update({
      weekKey: input.weekKey,
      weekStart: input.weekStart,
      assignments: input.assignments,
      updatedAt: Date.now(),
      updatedBy: input.updatedBy,
    })
  );

  return draftId;
}

export async function deleteDraftScheduleForWeek(weekKey: string) {
  const result = await db.queryOnce({ draftSchedules: { $: { where: { weekKey } } } });
  const existing = result.data?.draftSchedules?.[0] as { id: string } | undefined;
  if (!existing?.id) return;
  await db.transact(tx.draftSchedules[existing.id].delete());
}


