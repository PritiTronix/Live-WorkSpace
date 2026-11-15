/**
 * NotificationDropdown (Prompt 16)
 * Popover panel anchored to the bell icon in GlobalTopBar.
 * Shows up to 5 recent notifications with mark-read actions and a link to the full center.
 * Rendered through a React portal into document.body to avoid header clipping.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import useNotifications from '../hooks/useNotifications';

export const NotificationDropdown = ({ isOpen, onClose, triggerRef: triggerRefProp }) => {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const [positionStyle, setPositionStyle] = useState({ top: 68, right: 24 });

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = triggerRefProp?.current || document.activeElement;

    // Calculate position anchored to bell icon
    const trigger = triggerRefProp?.current || document.getElementById('notif-bell-btn') || triggerRef.current;
    if (trigger && typeof trigger.getBoundingClientRect === 'function') {
      const rect = trigger.getBoundingClientRect();
      setPositionStyle({
        top: Math.round(rect.bottom + 8),
        right: Math.max(16, Math.round(window.innerWidth - rect.right)),
      });
    }

    const timer = setTimeout(() => {
      const focusable = dropdownRef.current?.querySelector('button, [href], [tabindex]:not([tabindex="-1"])');
      if (focusable) {
        focusable.focus();
      } else {
        dropdownRef.current?.focus?.();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      const targetTrigger = triggerRefProp?.current || triggerRef.current || document.getElementById('notif-bell-btn');
      if (targetTrigger && document.body.contains(targetTrigger) && typeof targetTrigger.focus === 'function') {
        targetTrigger.focus();
      }
    };
  }, [isOpen, triggerRefProp]);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const preview = notifications.slice(0, 5);
  const hasNotifications = preview.length > 0;

  const dropdownContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Full-screen Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dropdownRef}
        tabIndex={-1}
        style={{ top: `${positionStyle.top}px`, right: `${positionStyle.right}px` }}
        className="fixed w-96 max-w-[calc(100vw-2rem)] bg-surface-card rounded-2xl shadow-2xl border border-border-subtle z-50 overflow-hidden outline-none animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
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
    </div>
  );

  return createPortal(dropdownContent, document.body);
};

export default NotificationDropdown;
