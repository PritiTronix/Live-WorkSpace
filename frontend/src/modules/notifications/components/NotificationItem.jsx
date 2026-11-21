/**
 * NotificationItem — shared component used in both the dropdown and center page.
 * Shows notification icon, actor avatar/initials, title, body, relative time,
 * target badge, direct navigation arrow, and an unread dot.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveApiUrl } from '../../../utils/apiUrl';

/** Map notification type → Material Symbol icon name + color classes */
export const TYPE_META = {
  sla_breach: { label: 'SLA Breach', icon: 'timer_off', color: 'text-severity-blocker', bg: 'bg-red-100' },
  ticket_assigned: { label: 'Ticket Assigned', icon: 'confirmation_number', color: 'text-status-open', bg: 'bg-blue-100' },
  mention: { label: 'Mention', icon: 'alternate_email', color: 'text-primary', bg: 'bg-canvas-lavender' },
  comment: { label: 'Comment', icon: 'chat_bubble', color: 'text-status-wip', bg: 'bg-indigo-100' },
  join_request: { label: 'Join Request', icon: 'person_add', color: 'text-primary', bg: 'bg-purple-100' },
  join_request_decided: { label: 'Join Decision', icon: 'how_to_reg', color: 'text-status-done', bg: 'bg-emerald-100' },
  system: { label: 'System Alert', icon: 'info', color: 'text-text-muted', bg: 'bg-surface-container' },
};

/** Format ISO string → relative label (e.g. "4m ago", "2h ago") */
export const formatRelative = (isoString) => {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/** Get 2-letter uppercase initials from name */
const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** Safely resolve target route with fallbacks and legacy path normalization */
export const resolveTargetRoute = (notification) => {
  if (!notification) return null;
  let route = notification.target_route;
  if (!route) {
    if (notification.target_type === 'join_request') {
      return '/workspace/members?tab=join-requests';
    }
    if (notification.target_type === 'ticket' && notification.target_id) {
      return `/workspace/tickets/${notification.target_id}`;
    }
    if (notification.target_type === 'task' && notification.target_id) {
      return `/workspace/tasks`;
    }
    return null;
  }
  if (route === '/dashboard') return '/workspace/dashboard';
  if (route.startsWith('/tickets/')) return `/workspace${route}`;
  if (route.startsWith('/members/')) return `/workspace${route}`;
  return route;
};

export const NotificationItem = ({
  notification,
  onMarkRead,
  onSelect,
  onClose,
  compact = false,
}) => {
  const navigate = useNavigate();
  const meta = TYPE_META[notification.type] ?? TYPE_META.system;
  const isUnread = !notification.is_read;
  const targetRoute = resolveTargetRoute(notification);

  const handleClick = () => {
    if (isUnread) onMarkRead?.(notification.id);
    if (onSelect) {
      onSelect(notification);
      return;
    }
    if (onClose) onClose();
    if (targetRoute) {
      navigate(targetRoute);
    } else {
      navigate('/workspace/notifications');
    }
  };

  const handleDirectNavigate = (e) => {
    e.stopPropagation();
    if (isUnread) onMarkRead?.(notification.id);
    if (onClose) onClose();
    if (targetRoute) {
      navigate(targetRoute);
    } else {
      navigate('/workspace/notifications');
    }
  };

  const actorInitials = getInitials(notification.actor?.name);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group w-full text-left flex items-start gap-3 px-4 transition-colors rounded-xl cursor-pointer select-none
        ${isUnread ? 'bg-canvas-lavender/60 hover:bg-canvas-lavender' : 'hover:bg-canvas-main'}
        ${compact ? 'py-2.5' : 'py-3.5'}`}
    >
      {/* Actor avatar / initials or type icon */}
      <div className="flex-shrink-0 relative mt-0.5">
        {notification.actor?.avatar_url ? (
          <img
            src={resolveApiUrl(notification.actor.avatar_url)}
            alt={notification.actor.name || 'User'}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-border-subtle"
          />
        ) : actorInitials ? (
          <div className="w-9 h-9 rounded-full bg-btn-primary/90 text-white font-label-md text-xs font-bold flex items-center justify-center shadow-xs">
            {actorInitials}
          </div>
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.bg}`}>
            <span className={`material-symbols-outlined text-[18px] ${meta.color}`}>{meta.icon}</span>
          </div>
        )}

        {/* Small type icon badge over avatar */}
        {(notification.actor?.avatar_url || actorInitials) && (
          <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-surface-card ${meta.bg}`}>
            <span className={`material-symbols-outlined text-[10px] ${meta.color}`}>{meta.icon}</span>
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-label-md text-sm leading-snug truncate ${isUnread ? 'text-text-primary font-bold' : 'text-text-primary font-medium'}`}>
            {notification.title}
          </p>
          <span className="font-label-sm text-xs text-text-muted whitespace-nowrap flex-shrink-0">
            {formatRelative(notification.created_at)}
          </span>
        </div>

        {!compact ? (
          <p className="font-body-sm text-xs text-text-secondary mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        ) : (
          <p className="font-body-sm text-xs text-text-secondary mt-0.5 truncate">
            {notification.body}
          </p>
        )}

        {notification.target_id && (
          <span className="inline-flex items-center mt-1.5 font-mono text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
            {notification.target_id}
          </span>
        )}
      </div>

      {/* Action icons / Unread indicator */}
      <div className="flex items-center gap-1.5 shrink-0 self-center">
        {targetRoute && (
          <button
            type="button"
            onClick={handleDirectNavigate}
            title={notification.type === 'join_request' ? 'Review Join Requests' : 'Go directly to target'}
            className="w-7 h-7 rounded-lg text-text-muted hover:text-primary hover:bg-canvas-lavender flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
          </button>
        )}
        {isUnread && (
          <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread" />
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
