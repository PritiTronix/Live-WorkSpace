/**
 * Live Workspace - SLA Module Constants
 * All enum values are lowercase strings
 */

export const SLA_STATUS = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  BREACHED: 'breached',
  PAUSED: 'paused',
  MET: 'met',
};

export const SLA_PRIORITY = {
  BLOCKER: 'blocker',
  CRITICAL: 'critical',
  MAJOR: 'major',
  MINOR: 'minor',
};

export const SLA_TIER = {
  TIER_1: 'tier_1',
  TIER_2: 'tier_2',
  TIER_3: 'tier_3',
  STANDARD: 'standard',
};

export const ESCALATION_TIER = {
  TIER_1: 'tier_1',
  TIER_2: 'tier_2',
  EXECUTIVE: 'executive',
};

export const TIMER_TYPE = {
  FIRST_RESPONSE: 'first_response',
  RESOLUTION: 'resolution',
};

export const STATUS_LABELS = {
  [SLA_STATUS.ON_TRACK]: 'On Track',
  [SLA_STATUS.AT_RISK]: 'At Risk',
  [SLA_STATUS.BREACHED]: 'Breached',
  [SLA_STATUS.PAUSED]: 'Paused',
  [SLA_STATUS.MET]: 'Fulfilled',
};

export const PRIORITY_LABELS = {
  [SLA_PRIORITY.BLOCKER]: 'Blocker (P0)',
  [SLA_PRIORITY.CRITICAL]: 'Critical (P1)',
  [SLA_PRIORITY.MAJOR]: 'Major (P2)',
  [SLA_PRIORITY.MINOR]: 'Minor (P3)',
};
