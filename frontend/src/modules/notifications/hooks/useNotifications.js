/**
 * useNotifications — shared hook for notification data + WebSocket
 * Used by NotificationDropdown (top bar) and NotificationCenterPage (full page).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, connectNotificationsWebSocket, safeCloseWebSocket, authService } from '../../../services/api';

export const useNotifications = ({ autoConnect = true, inboxOnly = false } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const currentUserId = authService.getCurrentUserSync()?.id;

  const fetchNotifications = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const mergedParams = { ...(inboxOnly ? { inbox_only: true } : {}), ...params };
      const data = await notificationService.list(mergedParams);
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [inboxOnly]);

  const markRead = useCallback(async (id) => {
    await notificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }
  }, []);

  // WebSocket handler — strictly scoped to current active user
  const handleWsMessage = useCallback((data) => {
    if (!data?.event) return;

    // Filter events targeted to specific users
    if (data.user_id && currentUserId && data.user_id !== currentUserId) return;
    if (data.recipient_id && currentUserId && data.recipient_id !== currentUserId) return;

    switch (data.event) {
      case 'init':
        setUnreadCount(data.unread_count ?? 0);
        break;
      case 'new_notification':
        if (data.notification) {
          // If inbox-only view, only add actionable types
          if (inboxOnly && !['ticket_assigned', 'mention', 'comment'].includes(data.notification.type)) {
            break;
          }
          setNotifications((prev) => [data.notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
        break;
      case 'notification_read':
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === data.notification_id ? { ...n, is_read: true } : n
          )
        );
        break;
      case 'all_notifications_read':
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        break;
      default:
        break;
    }
  }, [currentUserId, inboxOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!autoConnect) return;
    wsRef.current = connectNotificationsWebSocket(handleWsMessage);
    return () => {
      if (wsRef.current) {
        safeCloseWebSocket(wsRef.current);
        wsRef.current = null;
      }
    };
  }, [autoConnect, handleWsMessage]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markRead,
    markAllRead,
  };
};

export default useNotifications;
