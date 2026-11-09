/**
 * useNotifications — shared hook for notification data + WebSocket
 * Used by NotificationDropdown (top bar) and NotificationCenterPage (full page).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, connectNotificationsWebSocket } from '../../services/api';

export const useNotifications = ({ autoConnect = true } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const fetchNotifications = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.list(params);
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    await notificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  // WebSocket handler
  const handleWsMessage = useCallback((data) => {
    if (!data?.event) return;
    switch (data.event) {
      case 'init':
        setUnreadCount(data.unread_count ?? 0);
        break;
      case 'new_notification':
        if (data.notification) {
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
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!autoConnect) return;
    wsRef.current = connectNotificationsWebSocket(handleWsMessage);
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
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
