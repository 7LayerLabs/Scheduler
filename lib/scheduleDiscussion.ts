import { db, tx, id } from '@/lib/instantdb';

export interface ScheduleDiscussionMessage {
  id: string;
  weekKey: string; // YYYY-MM-DD (matches Home's weekKey)
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: number;
}

export const SCHEDULE_DISCUSSION_MAX_CHARS = 1000;

export function normalizeDiscussionBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  // Keep newlines, but remove trailing whitespace per line.
  const normalizedLines = trimmed
    .split('\n')
    .map(line => line.replace(/\s+$/g, ''));
  return normalizedLines.join('\n').slice(0, SCHEDULE_DISCUSSION_MAX_CHARS);
}

export function sortDiscussionMessagesAscending(messages: ScheduleDiscussionMessage[]): ScheduleDiscussionMessage[] {
  return [...messages].sort((a, b) => a.createdAt - b.createdAt);
}

export function useScheduleDiscussionMessages(weekKey: string) {
  const { data, isLoading, error } = db.useQuery(
    weekKey ? { scheduleDiscussionMessages: { $: { where: { weekKey } } } } : null
  );

  const raw = (data?.scheduleDiscussionMessages || []) as ScheduleDiscussionMessage[];
  const messages = sortDiscussionMessagesAscending(raw);

  return { messages, isLoading, error };
}

export async function createScheduleDiscussionMessage(input: {
  weekKey: string;
  authorUserId: string;
  authorName: string;
  authorEmail: string;
  body: string;
}) {
  const messageId = id();
  const body = normalizeDiscussionBody(input.body);
  if (!body) {
    throw new Error('Message cannot be empty.');
  }

  await db.transact(
    tx.scheduleDiscussionMessages[messageId].update({
      weekKey: input.weekKey,
      authorUserId: input.authorUserId,
      authorName: input.authorName,
      authorEmail: input.authorEmail,
      body,
      createdAt: Date.now(),
    })
  );

  return messageId;
}


