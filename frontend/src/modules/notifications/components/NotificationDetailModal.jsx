import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/common/Modal';
import { TYPE_META, resolveTargetRoute } from './NotificationItem';
import { resolveApiUrl } from '../../../utils/apiUrl';

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

const formatFullDate = (isoString) => {
  if (!isoString) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
};

export const NotificationDetailModal = ({
  isOpen,
  onClose,
  notification,
  onMarkRead,
}) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const meta = TYPE_META[notification.type] || TYPE_META.system;
  const isUnread = !notification.is_read;
  const targetRoute = resolveTargetRoute(notification);

  const handleGoToTarget = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }
    onClose?.();
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleGoToNotificationCenter = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }
    onClose?.();
    navigate('/workspace/notifications');
  };

  // Determine label for primary action button based on notification type
  const getActionLabel = () => {
    switch (notification.type) {
      case 'join_request':
        return 'Review Join Requests';
      case 'join_request_decided':
        return 'Go to Dashboard';
      case 'ticket_assigned':
      case 'sla_breach':
        return 'View Ticket';
      case 'comment':
      case 'mention':
        return 'View Discussion';
      default:
        return 'Open Related Item';
    }
  };

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
      <button
        type="button"
        onClick={handleGoToNotificationCenter}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-sm transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">notifications</span>
        <span>Go to Notifications Window</span>
      </button>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-sm transition-colors"
        >
          Close
        </button>
        {targetRoute && (
          <button
            type="button"
            onClick={handleGoToTarget}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-sm transition-colors shadow-sm"
          >
            <span>{getActionLabel()}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Details"
      subtitle={`${formatRelative(notification.created_at)} • ${formatFullDate(notification.created_at)}`}
      size="md"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Header Summary Card */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-canvas-main border border-border-subtle">
          {notification.actor?.avatar_url ? (
            <img
              src={resolveApiUrl(notification.actor.avatar_url)}
              alt={notification.actor.name || 'User'}
              className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
            />
          ) : (
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${meta.bg}`}>
              <span className={`material-symbols-outlined text-[24px] ${meta.color}`}>{meta.icon}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                <span>{meta.label || notification.type}</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isUnread ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container text-text-muted'
              }`}>
                {isUnread ? 'Unread' : 'Read'}
              </span>
            </div>
            <h3 className="font-headline-sm text-base font-bold text-text-primary leading-snug">
              {notification.title}
            </h3>
          </div>
        </div>

        {/* Notification Body Message */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle shadow-xs">
          <p className="font-label-sm text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">
            Message
          </p>
          <p className="font-body-md text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {notification.body}
          </p>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {notification.actor && (
            <div className="p-3 rounded-xl bg-canvas-main border border-border-subtle">
              <span className="text-text-muted block mb-1">Sender / Requester</span>
              <div className="flex items-center gap-2 font-medium text-text-primary">
                <span className="material-symbols-outlined text-[16px] text-text-secondary">person</span>
                <span className="truncate">{notification.actor.name}</span>
              </div>
            </div>
          )}

          {notification.target_id && (
            <div className="p-3 rounded-xl bg-canvas-main border border-border-subtle">
              <span className="text-text-muted block mb-1">Reference ID</span>
              <div className="flex items-center gap-2 font-medium text-primary font-mono">
                <span className="material-symbols-outlined text-[16px] text-primary">tag</span>
                <span className="truncate">{notification.target_id}</span>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-canvas-main border border-border-subtle">
            <span className="text-text-muted block mb-1">Received Time</span>
            <div className="flex items-center gap-2 font-medium text-text-primary">
              <span className="material-symbols-outlined text-[16px] text-text-secondary">schedule</span>
              <span>{formatFullDate(notification.created_at)}</span>
            </div>
          </div>

          {targetRoute && (
            <div className="p-3 rounded-xl bg-canvas-main border border-border-subtle">
              <span className="text-text-muted block mb-1">Target Destination</span>
              <div className="flex items-center gap-2 font-medium text-text-secondary">
                <span className="material-symbols-outlined text-[16px] text-text-muted">link</span>
                <span className="truncate">{targetRoute}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationDetailModal;
