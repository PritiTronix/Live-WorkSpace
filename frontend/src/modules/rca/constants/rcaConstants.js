/**
 * Live Workspace - RCA Module Constants
 * All enum values are lowercase strings
 */

export const RCA_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
};

export const ACTION_ITEM_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

export const ACTION_ITEM_PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const RCA_SEVERITY = {
  BLOCKER: 'blocker',
  CRITICAL: 'critical',
  MAJOR: 'major',
};

export const TIMELINE_MILESTONE = {
  DETECTION: 'detection',
  ESCALATION: 'escalation',
  MITIGATION: 'mitigation',
  RESOLUTION: 'resolution',
};

export const STATUS_LABELS = {
  [RCA_STATUS.DRAFT]: 'Draft',
  [RCA_STATUS.UNDER_REVIEW]: 'Under Review',
  [RCA_STATUS.APPROVED]: 'Approved',
  [RCA_STATUS.PUBLISHED]: 'Published',
};
