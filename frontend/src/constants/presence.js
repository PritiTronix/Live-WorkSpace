/**
 * Canonical Presence & Workforce Constants (Frontend Single Source of Truth)
 * ==========================================================================
 * Lowercase presence enums, tokens, and display configurations matching backend definitions.
 */

export const PRESENCE_STATUS = Object.freeze({
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline',
});

export const PRESENCE_CONFIG = Object.freeze({
  [PRESENCE_STATUS.ONLINE]: {
    label: 'Online',
    dotClass: 'bg-[#28C078]',
    ringClass: 'ring-[#28C078]/20',
    badgeClass: 'bg-[#28C078]/15 text-[#28C078] border-[#28C078]/30',
    textClass: 'text-[#28C078]',
  },
  [PRESENCE_STATUS.AWAY]: {
    label: 'Away',
    dotClass: 'bg-[#F8A040]',
    ringClass: 'ring-[#F8A040]/20',
    badgeClass: 'bg-[#F8A040]/15 text-[#F8A040] border-[#F8A040]/30',
    textClass: 'text-[#F8A040]',
  },
  [PRESENCE_STATUS.BUSY]: {
    label: 'Busy',
    dotClass: 'bg-[#E5484D]',
    ringClass: 'ring-[#E5484D]/20',
    badgeClass: 'bg-[#E5484D]/15 text-[#E5484D] border-[#E5484D]/30',
    textClass: 'text-[#E5484D]',
  },
  [PRESENCE_STATUS.OFFLINE]: {
    label: 'Offline',
    dotClass: 'bg-[#9C9CA9]',
    ringClass: 'ring-[#9C9CA9]/20',
    badgeClass: 'bg-[#9C9CA9]/15 text-[#9C9CA9] border-[#9C9CA9]/30',
    textClass: 'text-[#9C9CA9]',
  },
});

export const DEPARTMENT_DISPLAY_LABELS = Object.freeze({
  engineering: 'Engineering',
  'product & design': 'Product & Design',
  product: 'Product & Design',
  design: 'Product & Design',
  operations: 'Operations',
  sre: 'Operations',
  infra: 'Operations',
  general: 'General',
});

export const normalizeDepartmentName = (raw) => {
  if (!raw || !String(raw).trim()) return { key: 'general', label: 'General' };
  const cleaned = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  const label = DEPARTMENT_DISPLAY_LABELS[cleaned] || (raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1));
  return { key: cleaned, label };
};

export const formatLastActive = (timestamp) => {
  if (!timestamp) return 'Never logged in';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Never logged in';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Active now';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `Active ${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `Active ${hours}h ago`;
  }
  if (diffSec < 86400 * 7) {
    const days = Math.floor(diffSec / 86400);
    return `Active ${days}d ago`;
  }
  return `Active ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};
