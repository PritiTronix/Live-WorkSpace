/**
 * Task enum values — single source of truth for the frontend.
 * Values are lowercase strings matching the backend enums.py.
 * Display labels are derived here and used in UI components.
 */

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_TYPE = {
  FEATURE: 'feature',
  BUG: 'bug',
  CHORE: 'chore',
  SPIKE: 'spike',
  EPIC: 'epic',
};

/** Display label map — status */
export const TASK_STATUS_LABEL = {
  [TASK_STATUS.TODO]: 'To Do',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.IN_REVIEW]: 'In Review',
  [TASK_STATUS.DONE]: 'Done',
  [TASK_STATUS.CANCELLED]: 'Cancelled',
};

/** Display label map — priority */
export const TASK_PRIORITY_LABEL = {
  [TASK_PRIORITY.LOW]: 'Low',
  [TASK_PRIORITY.MEDIUM]: 'Medium',
  [TASK_PRIORITY.HIGH]: 'High',
  [TASK_PRIORITY.URGENT]: 'Urgent',
};

/** Display label map — type */
export const TASK_TYPE_LABEL = {
  [TASK_TYPE.FEATURE]: 'Feature',
  [TASK_TYPE.BUG]: 'Bug',
  [TASK_TYPE.CHORE]: 'Chore',
  [TASK_TYPE.SPIKE]: 'Spike',
  [TASK_TYPE.EPIC]: 'Epic',
};

/** Tailwind classes for status badge */
export const TASK_STATUS_STYLES = {
  [TASK_STATUS.TODO]: 'bg-surface-container text-text-secondary',
  [TASK_STATUS.IN_PROGRESS]: 'bg-status-wip/10 text-status-wip',
  [TASK_STATUS.IN_REVIEW]: 'bg-status-open/10 text-status-open',
  [TASK_STATUS.DONE]: 'bg-status-resolved/10 text-status-resolved',
  [TASK_STATUS.CANCELLED]: 'bg-surface-container text-text-muted line-through',
};

/** Tailwind classes for priority badge */
export const TASK_PRIORITY_STYLES = {
  [TASK_PRIORITY.LOW]: 'bg-surface-container text-text-secondary',
  [TASK_PRIORITY.MEDIUM]: 'bg-status-open/10 text-status-open',
  [TASK_PRIORITY.HIGH]: 'bg-severity-critical/10 text-severity-critical',
  [TASK_PRIORITY.URGENT]: 'bg-severity-blocker/10 text-severity-blocker',
};

/** Material Symbol icon per status */
export const TASK_STATUS_ICON = {
  [TASK_STATUS.TODO]: 'radio_button_unchecked',
  [TASK_STATUS.IN_PROGRESS]: 'motion_photos_on',
  [TASK_STATUS.IN_REVIEW]: 'rate_review',
  [TASK_STATUS.DONE]: 'check_circle',
  [TASK_STATUS.CANCELLED]: 'cancel',
};

/** Material Symbol icon per priority */
export const TASK_PRIORITY_ICON = {
  [TASK_PRIORITY.LOW]: 'arrow_downward',
  [TASK_PRIORITY.MEDIUM]: 'remove',
  [TASK_PRIORITY.HIGH]: 'arrow_upward',
  [TASK_PRIORITY.URGENT]: 'priority_high',
};

/** Sorted option arrays for dropdowns */
export const TASK_STATUS_OPTIONS = Object.values(TASK_STATUS);
export const TASK_PRIORITY_OPTIONS = Object.values(TASK_PRIORITY);
export const TASK_TYPE_OPTIONS = Object.values(TASK_TYPE);
