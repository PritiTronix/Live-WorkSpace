/**
 * NotificationItem — shared component used in both the dropdown and center page.
 * Shows notification icon, actor avatar/initials, title, body, relative time,
 * target badge, and an unread dot.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

/** Map notification type → Material Symbol icon name + color classes */
const TYPE_META = {
  sla_breach: { icon: 'timer_off', color: 'text-severity-blocker', bg: 'bg-red-100' },
  ticket_assigned: { icon: 'confirmation_number', color: 'text-status-open', bg: 'bg-blue-100' },
  mention: { icon: 'alternate_email', color: 'text-primary', bg: 'bg-canvas-lavender' },
  comment: { icon: 'chat_bubble', color: 'text-status-wip', bg: 'bg-indigo-100' },
  system: { icon: 'info', color: 'text-text-muted', bg: 'bg-surface-container' },
};

/** Format ISO string → relative label (e.g. "4m ago", "2h ago") */
const formatRelative = (isoString) => {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const NotificationItem = ({ notification, onMarkRead, compact = false }) => {
  const navigate = useNavigate();
  const { icon, color, bg } = TYPE_META[notification.type] ?? TYPE_META.system;
  const isUnread = !notification.is_read;

  const handleClick = () => {
    if (isUnread) onMarkRead?.(notification.id);
    if (notification.target_route) navigate(notification.target_route);
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors rounded-lg
        ${isUnread ? 'bg-canvas-lavender/60 hover:bg-canvas-lavender' : 'hover:bg-canvas-main'}
        ${compact ? 'py-2.5' : 'py-3'}`}
    >
      {/* Actor avatar or type icon */}
      <div className="flex-shrink-0 relative mt-0.5">
        {notification.actor?.avatar_url ? (
          <img
            src={notification.actor.avatar_url}
            alt={notification.actor.name}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bg}`}>
            <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
          </div>
        )}
        {/* Type icon badge over avatar */}
        {notification.actor?.avatar_url && (
          <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${bg}`}>
            <span className={`material-symbols-outlined text-[11px] ${color}`}>{icon}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-label-md text-label-md leading-snug truncate ${isUnread ? 'text-text-primary font-semibold' : 'text-text-primary'}`}>
            {notification.title}
          </p>
          <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap flex-shrink-0">
            {formatRelative(notification.created_at)}
          </span>
        </div>
        {!compact && (
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        {compact && (
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">
            {notification.body}
          </p>
        )}
        {notification.target_id && (
          <span className="inline-flex items-center mt-1 font-label-sm text-label-sm text-primary bg-canvas-lavender px-1.5 py-0.5 rounded">
            {notification.target_id}
          </span>
        )}
      </div>

      {/* Unread dot */}
      {isUnread && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" aria-label="Unread" />
      )}
    </button>
  );
};

export default NotificationItem;
