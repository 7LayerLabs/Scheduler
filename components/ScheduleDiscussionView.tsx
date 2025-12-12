'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@/lib/instantdb';
import type { WeeklySchedule } from '@/lib/types';
import { createScheduleDiscussionMessage, useScheduleDiscussionMessages } from '@/lib/scheduleDiscussion';

interface Props {
  currentUser: User;
  weekStart: Date;
  weekKey: string;
  formatWeekRange: (start: Date) => string;
  changeWeek: (delta: number) => void;
  schedule: WeeklySchedule | null;
  onGoToSchedule: () => void;
}

export default function ScheduleDiscussionView({
  currentUser,
  weekStart,
  weekKey,
  formatWeekRange,
  changeWeek,
  schedule,
  onGoToSchedule,
}: Props) {
  const { messages, isLoading, error } = useScheduleDiscussionMessages(weekKey);

  const [draftBody, setDraftBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const canPost = currentUser.role === 'manager' && Boolean(schedule);

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ block: 'end' });
    }
  }, [lastMessageId]);

  const headerSubtitle = useMemo(() => {
    const range = formatWeekRange(weekStart);
    if (schedule) return `${range} • Draft schedule loaded`;
    return `${range} • No draft schedule`;
  }, [formatWeekRange, weekStart, schedule]);

  const handleSend = async () => {
    if (!canPost) return;
    setSendError(null);
    setIsSending(true);
    try {
      await createScheduleDiscussionMessage({
        weekKey,
        authorUserId: currentUser.id,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        body: draftBody,
      });
      setDraftBody('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not send message.';
      setSendError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Schedule Discussion</h1>
          <p className="text-xs sm:text-sm text-[#6b6b75] mt-1">{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeWeek(-1)}
            className="p-2 hover:bg-[#222228] rounded-lg transition-all duration-200"
            aria-label="Previous week"
          >
            <ChevronLeftIcon className="w-5 h-5 text-[#6b6b75]" />
          </button>
          <button
            type="button"
            onClick={() => changeWeek(1)}
            className="p-2 hover:bg-[#222228] rounded-lg transition-all duration-200"
            aria-label="Next week"
          >
            <ChevronRightIcon className="w-5 h-5 text-[#6b6b75]" />
          </button>
        </div>
      </div>

      {!schedule && (
        <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e5a825]/10 flex items-center justify-center border border-[#e5a825]/30">
              <InfoIcon className="w-5 h-5 text-[#e5a825]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white font-semibold">No draft schedule for this week yet</p>
              <p className="text-sm text-[#a0a0a8] mt-1">
                Generate a schedule first so managers can review and comment against the draft.
              </p>
              <button
                type="button"
                onClick={onGoToSchedule}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#e5a825] hover:bg-[#f0b429] text-[#0d0d0f] text-sm font-semibold rounded-xl transition-colors"
              >
                Go to Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1f] rounded-2xl border border-[#2a2a32] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a32] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatBubbleIcon className="w-5 h-5 text-[#a0a0a8]" />
            <h2 className="text-sm font-semibold text-white">Thread</h2>
          </div>
          <span className="text-xs text-[#6b6b75]">{messages.length} message{messages.length === 1 ? '' : 's'}</span>
        </div>

        <div className="h-[420px] overflow-y-auto px-5 py-4 space-y-3">
          {isLoading && (
            <div className="text-sm text-[#6b6b75]">Loading messages...</div>
          )}

          {error && (
            <div className="text-sm text-[#ef4444]">Could not load messages.</div>
          )}

          {!isLoading && !error && messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-sm text-[#6b6b75]">
              No messages yet.
            </div>
          )}

          {!isLoading && !error && messages.map((m) => (
            <div key={m.id} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2a2a32] flex items-center justify-center text-xs font-semibold text-white">
                {m.authorName.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">{m.authorName}</span>
                  <span className="text-xs text-[#6b6b75]">{formatTimestamp(m.createdAt)}</span>
                </div>
                <div className="mt-1 text-sm text-[#a0a0a8] whitespace-pre-wrap break-words">
                  {m.body}
                </div>
              </div>
            </div>
          ))}

          <div ref={scrollAnchorRef} />
        </div>

        <div className="border-t border-[#2a2a32] p-4">
          <div className="flex gap-3">
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={!canPost || isSending}
              placeholder={canPost ? 'Write a comment... (Enter to send, Shift+Enter for new line)' : 'Generate a draft schedule to enable comments'}
              className="flex-1 h-20 p-3 bg-[#141417] border border-[#2a2a32] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40 focus:border-[#e5a825] resize-none transition-all duration-200 placeholder:text-[#6b6b75] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canPost || isSending}
              className="self-end px-4 py-2.5 bg-[#e5a825] hover:bg-[#f0b429] disabled:bg-[#3a3a45] text-[#0d0d0f] disabled:text-[#6b6b75] text-sm font-semibold rounded-xl transition-colors"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>

          {sendError && (
            <div className="mt-2 text-xs text-[#ef4444]">{sendError}</div>
          )}

          {!canPost && (
            <div className="mt-2 text-xs text-[#6b6b75]">
              Posting is enabled for managers after a draft schedule exists for the selected week.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6.632 3.136 1.757 4.268.474.478.758 1.12.758 1.792v1.204a.75.75 0 00.987.716l2.066-.688a2.25 2.25 0 011.143-.04c.68.16 1.39.244 2.13.244h3.64c4.418 0 8-3.045 8-6.8 0-3.756-3.582-6.8-8-6.8h-3.64c-4.418 0-8 3.044-8 6.8z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25h1.5v6h-1.5v-6zM12 8.25h.008v.008H12V8.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}


