/**
 * NotificationCenterPage (Prompt 17)
 * Full-page notification center at /workspace/notifications.
 * Features: filter tabs (All / Unread / Mentions / System), mark all read,
 * paginated list using shared NotificationItem component and useNotifications hook.
 */
import React, { useState } from 'react';
import NotificationItem from '../components/NotificationItem';
import useNotifications from '../hooks/useNotifications';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'mention', label: 'Mentions' },
  { id: 'system', label: 'System' },
];

export const NotificationCenterPage = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.is_read;
    return n.type === activeFilter;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary">Notifications</h1>
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
            {unreadCount > 0
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
      <div className="flex items-center gap-1 p-1 bg-surface-card rounded-xl border border-border-subtle shadow-sm w-fit">
        {FILTERS.map((f) => {
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
            <p className="font-body-sm text-body-sm">Loading notifications…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
            <span className="material-symbols-outlined text-[48px]">notifications_none</span>
            <div className="text-center">
              <p className="font-label-md text-label-md text-text-primary">
                {activeFilter === 'unread' ? 'No unread notifications' : 'Nothing here'}
              </p>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                {activeFilter === 'unread'
                  ? 'You've read all your notifications.'
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
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>
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
