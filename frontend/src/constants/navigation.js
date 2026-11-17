/**
 * Centralized Navigation & Filter Constants for Home Dashboard and Workspace Views.
 * Ensures strict lowercase enum compliance and single source of truth across widgets and target pages.
 */
import { TASK_STATUS } from '../modules/tasks/constants/taskEnums';
import { TICKET_STATUSES, TICKET_SEVERITIES } from '../modules/tickets/constants/ticketConstants';

// Task statuses used in dashboard links (all lowercase)
export const TASK_STATUS_FILTER = {
  TODO: TASK_STATUS.TODO,               // 'todo'
  IN_PROGRESS: TASK_STATUS.IN_PROGRESS, // 'in_progress'
  IN_REVIEW: TASK_STATUS.IN_REVIEW,     // 'in_review'
  DONE: TASK_STATUS.DONE,               // 'done'
};

// Ticket statuses used in dashboard links (all lowercase)
export const TICKET_STATUS_FILTER = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WIP: 'wip',
  ON_HOLD: 'on_hold',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  ACTIVE: 'active',
};

// Ticket severities used in dashboard links (all lowercase)
export const TICKET_SEVERITY_FILTER = {
  BLOCKER: 'blocker',
  CRITICAL: 'critical',
  MAJOR: 'major',
  MINOR: 'minor',
};

// SLA filter states used in dashboard links (all lowercase)
export const SLA_FILTER = {
  BREACHED: 'breached',
};

// Dashboard navigation destinations
export const DASHBOARD_ROUTES = {
  PROJECTS: '/workspace/projects',
  PROJECT_DETAIL: (id) => `/workspace/projects/${id}`,
  TASKS: '/workspace/tasks',
  TASKS_MY: '/workspace/tasks/my-tasks',
  TASKS_BY_STATUS: (status) => `/workspace/tasks?status=${status}`,
  TICKETS: '/workspace/tickets',
  TICKETS_BY_STATUS: (status) => `/workspace/tickets?status=${status}`,
  TICKETS_BY_SEVERITY: (severity) => `/workspace/tickets?severity=${severity}`,
  TICKETS_BY_SLA: (sla) => `/workspace/tickets?sla=${sla}`,
  TICKET_DETAIL: (id) => `/workspace/tickets/${id}`,
  SLA: '/workspace/sla',
  ANALYTICS: '/workspace/analytics',
  MEMBERS_BY_TEAM: (team) => `/workspace/members?team=${encodeURIComponent(team.toLowerCase())}`,
};
