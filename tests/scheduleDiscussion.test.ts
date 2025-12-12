import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeDiscussionBody,
  sortDiscussionMessagesAscending,
  type ScheduleDiscussionMessage,
  SCHEDULE_DISCUSSION_MAX_CHARS,
} from '../lib/scheduleDiscussion';

test('normalizeDiscussionBody trims and preserves newlines', () => {
  const input = '  hello  \nworld  \n\n';
  const out = normalizeDiscussionBody(input);
  assert.equal(out, 'hello\nworld');
});

test('normalizeDiscussionBody enforces max length', () => {
  const input = 'a'.repeat(SCHEDULE_DISCUSSION_MAX_CHARS + 50);
  const out = normalizeDiscussionBody(input);
  assert.equal(out.length, SCHEDULE_DISCUSSION_MAX_CHARS);
});

test('sortDiscussionMessagesAscending sorts by createdAt', () => {
  const msgs: ScheduleDiscussionMessage[] = [
    { id: 'b', weekKey: '2025-12-08', authorUserId: 'u', authorName: 'U', authorEmail: 'u@x.com', body: '2', createdAt: 200 },
    { id: 'a', weekKey: '2025-12-08', authorUserId: 'u', authorName: 'U', authorEmail: 'u@x.com', body: '1', createdAt: 100 },
    { id: 'c', weekKey: '2025-12-08', authorUserId: 'u', authorName: 'U', authorEmail: 'u@x.com', body: '3', createdAt: 300 },
  ];

  const sorted = sortDiscussionMessagesAscending(msgs);
  assert.deepEqual(sorted.map(m => m.id), ['a', 'b', 'c']);
});


