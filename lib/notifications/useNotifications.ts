'use client';

import { useEffect } from 'react';
import {
  useNotifications as useNotificationsDB,
  useUnreadNotifications,
  markNotificationAsRead,
} from '@/lib/instantdb';
import type { Notification } from '@/lib/instantdb';

/**
 * Custom hook to manage user notifications
 * - Fetches all notifications for the current user
 * - Counts unread notifications
 * - Provides browser notification support
 * - Auto-handles notification permissions
 */
export function useNotifications(userId: string | null) {
  const { notifications, isLoading, error } = useNotificationsDB(userId);
  const { unreadNotifications } = useUnreadNotifications(userId);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {
          // User denied or browser doesn't support
        });
      }
    }
  }, []);

  // Show browser notification for new unread notifications
  useEffect(() => {
    if (unreadNotifications.length === 0) return;

    const mostRecent = unreadNotifications[0];
    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(mostRecent.title, {
          body: mostRecent.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `notification-${mostRecent.id}`,
        });
      } catch (err) {
        console.error('Failed to show notification:', err);
      }
    }
  }, [unreadNotifications]);

  return {
    notifications: userId ? notifications : [],
    unreadCount: userId ? unreadNotifications.length : 0,
    isLoading,
    error,
    markAsRead: markNotificationAsRead,
  };
}

/**
 * Hook to show a toast-style notification (requires toast library integration)
 * Can be extended to integrate with react-hot-toast or similar
 */
export function useShowNotification() {
  return (notification: Omit<Notification, 'id' | 'createdAt' | 'readAt'>) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: `temp-notification-${Date.now()}`,
          });
        } catch (err) {
          console.error('Failed to show notification:', err);
        }
      }
    }
  };
}
