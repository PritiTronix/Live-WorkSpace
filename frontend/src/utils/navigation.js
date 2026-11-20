/**
 * Shared Navigation Helper
 * Provides prefix-based active route matching for sidebar and navigation components.
 * Guarantees that only one top-level sidebar item is active at any time.
 */

/**
 * Determines whether a sidebar navigation target is currently active given the current pathname.
 *
 * @param {string} currentPath - Current router pathname (e.g., location.pathname)
 * @param {string} target - The destination path of the nav item (e.g., "/workspace/settings")
 * @returns {boolean} True if the item should be highlighted
 */
export const isSidebarItemActive = (currentPath, target) => {
  if (!currentPath || !target) return false;

  const current = currentPath.replace(/\/+$/, '');
  const to = target.replace(/\/+$/, '');

  // Exact match
  if (current === to) return true;

  // Collision exclusion: Priority Issues vs Tickets
  // Priority Issues route is /workspace/tickets/critical
  if (to === '/workspace/tickets' && current.startsWith('/workspace/tickets/critical')) {
    return false;
  }
  if (to === '/workspace/tickets/critical' && current.startsWith('/workspace/tickets/critical')) {
    return true;
  }

  // Collision exclusion: My Tasks vs All Tasks
  if (to === '/workspace/tasks/all' || to === '/workspace/tasks') {
    if (current.startsWith('/workspace/tasks/my')) return false;
    if (current === '/workspace/tasks' || current.startsWith('/workspace/tasks/all')) return true;
  }
  if (to === '/workspace/tasks/my-tasks' || to === '/workspace/tasks/my') {
    if (current.startsWith('/workspace/tasks/my')) return true;
  }

  // Strict Home / Dashboard: do not match sub-routes outside dashboard
  if (to === '/workspace/dashboard') {
    return current === '/workspace/dashboard' || current === '/workspace';
  }

  // SLA Overview: do not match /workspace/settings/sla
  if (to === '/workspace/sla') {
    return current === '/workspace/sla' || current.startsWith('/workspace/sla/');
  }

  // Settings: matches /workspace/settings and any sub-route (/workspace/settings/sla, /workspace/settings/profile, etc.)
  if (to === '/workspace/settings') {
    return current === '/workspace/settings' || current.startsWith('/workspace/settings/');
  }

  // Projects: matches /workspace/projects and project details (/workspace/projects/:id/*)
  if (to === '/workspace/projects') {
    return current === '/workspace/projects' || current.startsWith('/workspace/projects/');
  }

  // Tickets: matches /workspace/tickets and views (/workspace/tickets/board, /workspace/tickets/:id, etc.)
  if (to === '/workspace/tickets') {
    return current === '/workspace/tickets' || current.startsWith('/workspace/tickets/');
  }

  // Standard prefix routes with sub-routes
  const prefixRoutes = [
    '/workspace/members',
    '/workspace/discussions',
    '/workspace/files',
    '/workspace/notifications',
    '/workspace/inbox',
    '/workspace/audit-logs',
    '/workspace/analytics',
    '/workspace/rca',
  ];

  if (prefixRoutes.includes(to)) {
    return current === to || current.startsWith(`${to}/`);
  }

  return false;
};

/**
 * Determines whether a given pathname belongs to the onboarding route hierarchy.
 *
 * @param {string} path - Current router pathname (e.g., location.pathname)
 * @returns {boolean} True if the path is an onboarding route
 */
export const isOnboardingPath = (path) => {
  if (!path) return false;
  const clean = path.replace(/\/+$/, '');
  return clean === '/onboarding' || clean.startsWith('/onboarding/');
};

/**
 * Determines whether a given pathname belongs to the workspace route hierarchy.
 *
 * @param {string} path - Current router pathname (e.g., location.pathname)
 * @returns {boolean} True if the path is a workspace route
 */
export const isWorkspacePath = (path) => {
  if (!path) return false;
  const clean = path.replace(/\/+$/, '');
  return clean === '/workspace' || clean.startsWith('/workspace/');
};
