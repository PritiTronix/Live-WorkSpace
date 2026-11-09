/**
 * NotificationDropdown (Prompt 16)
 * Popover panel anchored to the bell icon in GlobalTopBar.
 * Shows up to 5 recent notifications with mark-read actions and a link to the full center.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import useNotifications from '../hooks/useNotifications';

export const NotificationDropdown = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  if (!isOpen) return null;

  const preview = notifications.slice(0, 5);
  const hasNotifications = preview.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="absolute right-0 top-14 w-96 bg-surface-card rounded-2xl shadow-2xl border border-border-subtle z-50 overflow-hidden"
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-[10px] font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                type="button"
                className="font-label-sm text-label-sm text-primary hover:underline px-2 py-1 rounded transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="w-7 h-7 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
              aria-label="Close notifications"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-border-subtle/50">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
              <span className="material-symbols-outlined text-[32px] animate-spin">refresh</span>
              <span className="font-body-sm text-body-sm">Loading…</span>
            </div>
          )}

          {!loading && !hasNotifications && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
              <span className="material-symbols-outlined text-[40px]">notifications_none</span>
              <p className="font-label-md text-label-md">You're all caught up!</p>
              <p className="font-body-sm text-body-sm text-center px-6">
                No new notifications at this time.
              </p>
            </div>
          )}

          {!loading && preview.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkRead={(id) => { markRead(id); }}
              compact
            />
          ))}
        </div>

        {/* Footer */}
        {hasNotifications && (
          <div className="border-t border-border-subtle px-4 py-3">
            <Link
              to="/workspace/notifications"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg font-label-md text-label-md text-primary hover:bg-canvas-lavender transition-colors"
            >
              <span>View all notifications</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationDropdown;
