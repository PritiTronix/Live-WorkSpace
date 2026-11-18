/**
 * Centralized Ticket Constants & Label Mappings
 * Ensures strict lowercase enum compliance across the frontend.
 */

export const TICKET_STATUSES = ['open', 'wip', 'on_hold', 'resolved', 'closed'];

export const TICKET_SEVERITIES = ['blocker', 'critical', 'major', 'minor'];

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Shared Ticket Views & Navigation Constants
 * Labels match Stitch screens:
 * - 'Ticket Management Dashboard (Prompts 36 & 37)' -> 'List View'
 * - 'Ticket Board View (Prompt 38)' -> 'Board View'
 * - 'Ticket Priority View (Prompt 39)' -> 'Priority View'
 * - 'Priority Issues Page (Prompt 54)' -> 'Priority Issues'
 */
export const TICKET_VIEWS = [
  {
    id: 'list',
    label: 'List View',
    route: '/workspace/tickets',
    icon: 'format_list_bulleted',
    end: true,
  },
  {
    id: 'board',
    label: 'Board View',
    route: '/workspace/tickets/board',
    icon: 'view_kanban',
    end: false,
  },
  {
    id: 'priority',
    label: 'Priority View',
    route: '/workspace/tickets/priority',
    icon: 'crisis_alert',
    end: false,
  },
];

export const PRIORITY_ISSUES_NAV = {
  id: 'priority_issues',
  label: 'Priority Issues',
  route: '/workspace/tickets/critical',
  icon: 'warning',
  end: false,
};

export const TICKET_NAV_ITEMS = [
  ...TICKET_VIEWS,
  PRIORITY_ISSUES_NAV,
];

export const STATUS_CONFIG = {
  open: {
    key: 'open',
    label: 'Open',
    bg: 'bg-status-open/10',
    text: 'text-status-open',
    dot: 'bg-status-open',
    badge: 'bg-status-open/15 text-status-open',
    icon: 'radio_button_unchecked',
  },
  wip: {
    key: 'wip',
    label: 'Work in Progress',
    bg: 'bg-status-wip/15',
    text: 'text-status-wip',
    dot: 'bg-status-wip',
    badge: 'bg-status-wip/15 text-status-wip',
    icon: 'timelapse',
  },
  in_progress: {
    key: 'in_progress',
    label: 'Work in Progress',
    bg: 'bg-status-wip/15',
    text: 'text-status-wip',
    dot: 'bg-status-wip',
    badge: 'bg-status-wip/15 text-status-wip',
    icon: 'timelapse',
  },
  active: {
    key: 'active',
    label: 'Active',
    bg: 'bg-red-50',
    text: 'text-severity-blocker',
    dot: 'bg-severity-blocker',
    badge: 'bg-red-50 text-severity-blocker border border-red-200',
    icon: 'warning',
  },
  on_hold: {
    key: 'on_hold',
    label: 'On Hold',
    bg: 'bg-status-on-hold/15',
    text: 'text-status-on-hold',
    dot: 'bg-status-on-hold',
    badge: 'bg-status-on-hold/15 text-status-on-hold',
    icon: 'pause_circle',
  },
  resolved: {
    key: 'resolved',
    label: 'Resolved',
    bg: 'bg-status-resolved/10',
    text: 'text-status-resolved',
    dot: 'bg-status-resolved',
    badge: 'bg-status-resolved/15 text-status-resolved',
    icon: 'task_alt',
  },
  closed: {
    key: 'closed',
    label: 'Closed',
    bg: 'bg-status-closed/10',
    text: 'text-status-closed',
    dot: 'bg-status-closed',
    badge: 'bg-status-closed/15 text-status-closed',
    icon: 'check_circle',
  },
};

export const SEVERITY_CONFIG = {
  blocker: {
    key: 'blocker',
    label: 'Blocker (P0)',
    shortLabel: 'Blocker',
    icon: 'report',
    color: 'severity-blocker',
    bgBadge: 'bg-error-container',
    textBadge: 'text-severity-blocker',
    dot: 'bg-severity-blocker',
    stripeBg: 'bg-severity-blocker',
    subtext: 'Urgent customer impacting incidents — Immediate Response Required',
    actionText: 'Launch War Room',
  },
  critical: {
    key: 'critical',
    label: 'Critical (P1)',
    shortLabel: 'Critical',
    icon: 'warning',
    color: 'severity-critical',
    bgBadge: 'bg-severity-critical/15',
    textBadge: 'text-severity-critical',
    dot: 'bg-severity-critical',
    stripeBg: 'bg-severity-critical',
    subtext: 'High-impact incidents nearing SLA exposure',
    actionText: 'Investigate',
  },
  major: {
    key: 'major',
    label: 'Major (P2)',
    shortLabel: 'Major',
    icon: 'error_outline',
    color: 'severity-major',
    bgBadge: 'bg-severity-major/15',
    textBadge: 'text-severity-major',
    dot: 'bg-severity-major',
    stripeBg: 'bg-severity-major',
    subtext: 'Degraded non-critical workflows and core issues',
    actionText: 'Review Queue',
  },
  minor: {
    key: 'minor',
    label: 'Minor (P3)',
    shortLabel: 'Minor',
    icon: 'info',
    color: 'text-secondary',
    bgBadge: 'bg-canvas-lavender',
    textBadge: 'text-text-secondary',
    dot: 'bg-outline',
    stripeBg: 'bg-outline-variant',
    subtext: 'Low priority defects, cosmetic fixes, and documentation',
    actionText: 'Inspect',
  },
};
