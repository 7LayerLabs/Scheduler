'use client';

import { useState } from 'react';
import { useNotifications, markNotificationAsRead, deleteNotification } from '@/lib/instantdb';
import { useCurrentUser } from '@/lib/instantdb';
import type { Notification } from '@/lib/instantdb';

type FilterTab = 'all' | 'unread' | 'read';
type NotificationType = Notification['type'] | 'all';

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'schedule_published':
      return '📅';
    case 'swap_requested':
      return '🔄';
    case 'swap_approved':
      return '✅';
    case 'swap_denied':
      return '❌';
    case 'template_applied':
      return '📋';
    default:
      return 'ℹ️';
  }
}

function getNotificationColor(type: Notification['type']) {
  switch (type) {
    case 'swap_approved':
      return 'text-[#22c55e]';
    case 'swap_denied':
      return 'text-[#ef4444]';
    case 'schedule_published':
      return 'text-[#3b82f6]';
    default:
      return 'text-[#e5a825]';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

const ITEMS_PER_PAGE = 20;

export default function NotificationCenter() {
  const { profile } = useCurrentUser();
  const { notifications } = useNotifications(profile?.id || null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [filterType, setFilterType] = useState<NotificationType>('all');
  const [page, setPage] = useState(0);

  // Filter notifications
  const filtered = notifications.filter((n) => {
    // Tab filter
    if (filterTab === 'unread' && n.isRead) return false;
    if (filterTab === 'read' && !n.isRead) return false;

    // Type filter
    if (filterType !== 'all' && n.type !== filterType) return false;

    return true;
  });

  // Sort by newest first
  const sorted = [...filtered].sort((a, b) => b.createdAt - a.createdAt);

  // Paginate
  const startIdx = page * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paged = sorted.slice(startIdx, endIdx);
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markNotificationAsRead(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Notifications</h1>
        <p className="text-xs sm:text-sm text-[#6b6b75] mt-1">
          {sorted.length} total • {notifications.filter(n => !n.isRead).length} unread
        </p>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-4">
        <div className="space-y-4">
          {/* Tab Filter */}
          <div>
            <p className="text-xs font-medium text-[#6b6b75] mb-2 uppercase tracking-wider">View</p>
            <div className="flex gap-2">
              {(['all', 'unread', 'read'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setFilterTab(tab);
                    setPage(0);
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    filterTab === tab
                      ? 'bg-[#e5a825] text-[#0d0d0f]'
                      : 'bg-[#141417] text-[#6b6b75] hover:text-[#a0a0a8]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <p className="text-xs font-medium text-[#6b6b75] mb-2 uppercase tracking-wider">Type</p>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as NotificationType);
                setPage(0);
              }}
              className="px-3 py-1.5 bg-[#141417] border border-[#2a2a32] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e5a825]/40"
            >
              <option value="all">All Types</option>
              <option value="schedule_published">Schedule Published</option>
              <option value="swap_requested">Swap Requested</option>
              <option value="swap_approved">Swap Approved</option>
              <option value="swap_denied">Swap Denied</option>
              <option value="template_applied">Template Applied</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {sorted.length === 0 ? (
        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] p-12 text-center">
          <p className="text-[#6b6b75]">No notifications to display</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1f] rounded-xl border border-[#2a2a32] overflow-hidden">
          <div className="divide-y divide-[#2a2a32]">
            {paged.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-[#141417] transition-colors ${
                  !notification.isRead ? 'bg-[#e5a825]/5' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`text-xl flex-shrink-0 mt-0.5 ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium ${
                          !notification.isRead ? 'text-white' : 'text-[#a0a0a8]'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-[#6b6b75] mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[#4a4a55] mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id, notification.isRead)}
                            title="Mark as read"
                            className="p-1.5 text-[#6b6b75] hover:text-[#e5a825] hover:bg-[#e5a825]/10 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          title="Delete notification"
                          className="p-1.5 text-[#6b6b75] hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[#2a2a32]">
              <p className="text-xs text-[#6b6b75]">
                Showing {startIdx + 1}-{Math.min(endIdx, sorted.length)} of {sorted.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 bg-[#141417] text-[#6b6b75] rounded disabled:opacity-50 disabled:cursor-not-allowed hover:text-white transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        page === i
                          ? 'bg-[#e5a825] text-[#0d0d0f]'
                          : 'bg-[#141417] text-[#6b6b75] hover:text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                  className="px-3 py-1 bg-[#141417] text-[#6b6b75] rounded disabled:opacity-50 disabled:cursor-not-allowed hover:text-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
