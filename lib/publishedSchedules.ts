import { db, tx, id } from '@/lib/instantdb';
import type { ScheduleAssignment, WeeklySchedule } from '@/lib/types';

export interface PublishedScheduleRecord {
  id: string;
  weekKey: string; // YYYY-MM-DD
  weekStart: string; // ISO string
  assignments: string; // JSON stringified ScheduleAssignment[]
  publishedAt: number;
  publishedBy: string;
}

function parseAssignments(raw: string): ScheduleAssignment[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed as ScheduleAssignment[];
}

export function usePublishedScheduleForWeek(weekKey: string) {
  const { data, isLoading, error } = db.useQuery(
    weekKey ? { publishedSchedules: { $: { where: { weekKey } } } } : null
  );

  const record = (data?.publishedSchedules?.[0] as PublishedScheduleRecord | undefined) || null;

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

export async function upsertPublishedScheduleForWeek(input: {
  weekKey: string;
  weekStart: string;
  assignments: string;
  publishedBy: string;
}) {
  const result = await db.queryOnce({ publishedSchedules: { $: { where: { weekKey: input.weekKey } } } });
  const existing = result.data?.publishedSchedules?.[0] as { id: string } | undefined;
  const publishedId = existing?.id || id();

  await db.transact(
    tx.publishedSchedules[publishedId].update({
      weekKey: input.weekKey,
      weekStart: input.weekStart,
      assignments: input.assignments,
      publishedAt: Date.now(),
      publishedBy: input.publishedBy,
    })
  );

  return publishedId;
}


