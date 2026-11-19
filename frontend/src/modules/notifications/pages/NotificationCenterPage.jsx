/**
 * NotificationCenterPage (Prompt 17)
 * Full-page notification center at /workspace/notifications and /workspace/inbox.
 * Features:
 * - When at /workspace/inbox: strictly scopes to actionable updates (mentions, assignments, comments).
 * - When at /workspace/notifications: comprehensive activity stream including system and SLA alerts.
 * - Filter tabs, mark all read, chronological grouping (Today / Earlier).
 * - NotificationDetailModal when clicking any notification.
 */
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationItem from '../components/NotificationItem';
import NotificationDetailModal from '../components/NotificationDetailModal';
import useNotifications from '../hooks/useNotifications';

const NOTIF_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'mention', label: 'Mentions' },
  { id: 'system', label: 'System' },
];

const INBOX_FILTERS = [
  { id: 'all', label: 'All Actionable' },
  { id: 'unread', label: 'Unread' },
  { id: 'mention', label: 'Mentions' },
  { id: 'ticket_assigned', label: 'Assigned to Me' },
  { id: 'comment', label: 'Comments' },
];

export const NotificationCenterPage = () => {
  const location = useLocation();
  const isInbox = location.pathname.includes('/inbox');
  const filters = isInbox ? INBOX_FILTERS : NOTIF_FILTERS;

  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications({
    inboxOnly: isInbox,
  });

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.is_read;
    return n.type === activeFilter;
  });

  const handleSelectNotification = (notif) => {
    if (!notif.is_read) {
      markRead(notif.id);
    }
    setSelectedNotification(notif);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary">
            {isInbox ? 'Inbox' : 'Notifications'}
          </h1>
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
            {isInbox
              ? unreadCount > 0
                ? `${unreadCount} actionable update${unreadCount > 1 ? 's' : ''} requiring attention`
                : 'Inbox zero — all actionable items addressed'
              : unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle text-primary font-label-md text-label-md hover:bg-canvas-lavender transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-card rounded-xl border border-border-subtle shadow-sm w-full sm:w-fit overflow-x-auto no-scrollbar">
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          const count = f.id === 'unread' ? unreadCount : null;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              type="button"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-label-md text-label-md transition-all
                ${isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-canvas-lavender'
                }`}
            >
              {f.label}
              {count != null && count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold leading-none
                  ${isActive ? 'bg-white/30 text-white' : 'bg-primary text-on-primary'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List Card */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <span className="material-symbols-outlined text-[40px] animate-spin">refresh</span>
            <p className="font-body-sm text-body-sm">
              {isInbox ? 'Loading inbox items…' : 'Loading notifications…'}
            </p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
            <span className="material-symbols-outlined text-[48px]">
              {isInbox ? 'inbox' : 'notifications_none'}
            </span>
            <div className="text-center">
              <p className="font-label-md text-label-md text-text-primary">
                {isInbox
                  ? activeFilter === 'unread' ? 'No unread actionable items' : 'Your inbox is clear'
                  : activeFilter === 'unread' ? 'No unread notifications' : 'Nothing here'}
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {isInbox
                  ? "You're up to date on all assigned tasks, mentions, and comments."
                  : activeFilter === 'unread'
                    ? "You've read all your notifications."
                    : 'No notifications match this filter.'}
              </p>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-border-subtle">
            {/* Today section */}
            {filtered.some((n) => isToday(n.created_at)) && (
              <>
                <div className="px-4 py-2 bg-canvas-main">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Today</span>
                </div>
                {filtered
                  .filter((n) => isToday(n.created_at))
                  .map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkRead={markRead}
                      onSelect={handleSelectNotification}
                    />
                  ))}
              </>
            )}

            {/* Earlier section */}
            {filtered.some((n) => !isToday(n.created_at)) && (
              <>
                <div className="px-4 py-2 bg-canvas-main">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Earlier</span>
                </div>
                {filtered
                  .filter((n) => !isToday(n.created_at))
                  .map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkRead={markRead}
                      onSelect={handleSelectNotification}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <NotificationDetailModal
          isOpen={Boolean(selectedNotification)}
          onClose={() => setSelectedNotification(null)}
          notification={selectedNotification}
          onMarkRead={markRead}
        />
      )}
    </div>
  );
};

function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default NotificationCenterPage;
