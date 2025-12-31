'use client';

import { useState } from 'react';
import { useNotifications } from '@/lib/notifications/useNotifications';
import { useCurrentUser } from '@/lib/instantdb';
import NotificationDropdown from './NotificationDropdown';
import { FEATURES } from '@/lib/featureFlags';

export default function NotificationBell() {
  const { profile } = useCurrentUser();
  const { unreadCount } = useNotifications(profile?.id || null);
  const [isOpen, setIsOpen] = useState(false);

  if (!FEATURES.NOTIFICATIONS) return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#6b6b75] hover:text-[#e5a825] hover:bg-[#e5a825]/10 rounded-lg transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#ef4444] rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-[#1a1a1f] border border-[#2a2a32] rounded-lg shadow-lg z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <NotificationDropdown onClose={() => setIsOpen(false)} userId={profile?.id || null} />
        </div>
      )}

      {/* Close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
