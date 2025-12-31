'use client';

import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/instantdb';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/instantdb';

interface Props {
  userId: string | null;
  onClose: () => void;
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'schedule_published':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000-2H2a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 4H9a1 1 0 00-.894.553l-.723 1.447H4z" clipRule="evenodd" />
        </svg>
      );
    case 'swap_requested':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 9a2 2 0 100-4 2 2 0 000 4zM7 11a6 6 0 110-12 6 6 0 010 12zM15.228 13h-1.228V9.236A1.236 1.236 0 0012.764 8h-.529a1 1 0 100 2h.529v3H11a1 1 0 100 2h4.228a1 1 0 100-2z" />
        </svg>
      );
    case 'swap_approved':
      return (
        <svg className="w-4 h-4 text-[#22c55e]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'swap_denied':
      return (
        <svg className="w-4 h-4 text-[#ef4444]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    case 'template_applied':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z" clipRule="evenodd" />
        </svg>
      );
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function NotificationDropdown({ userId, onClose }: Props) {
  const { notifications } = useNotifications(userId);
  const router = useRouter();

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }

    // Navigate if there's an action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (userId) {
      await markAllNotificationsAsRead(userId);
    }
  };

  const recentNotifications = [...notifications]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  return (
    <div className="flex flex-col max-h-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a32]">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {recentNotifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-[#e5a825] hover:text-[#f0b429] transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-[#6b6b75]">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left p-3 border-b border-[#2a2a32] hover:bg-[#141417] transition-colors last:border-b-0 ${
                !notification.isRead ? 'bg-[#e5a825]/5' : ''
              }`}
            >
              <div className="flex gap-3">
                {/* Icon */}
                <div className="text-[#6b6b75] flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    !notification.isRead ? 'text-white' : 'text-[#a0a0a8]'
                  }`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-[#6b6b75] line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-[#4a4a55] mt-1">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>

                {/* Unread Indicator */}
                {!notification.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 bg-[#e5a825] rounded-full mt-1" />
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 10 && (
        <Link
          href="/notifications"
          onClick={onClose}
          className="p-3 border-t border-[#2a2a32] text-center text-sm text-[#e5a825] hover:bg-[#141417] transition-colors"
        >
          View all notifications
        </Link>
      )}
    </div>
  );
}
