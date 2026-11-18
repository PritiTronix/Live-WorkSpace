/**
 * Shared Project Constants
 * Standardized lowercase project roles and helper derivations.
 */

export const PROJECT_ROLES = [
  { value: 'owner', label: 'Owner', access_scope: 'Full Control (Governance, Keys, Budget)' },
  { value: 'lead', label: 'Project Lead', access_scope: 'Project Leadership & Architecture' },
  { value: 'admin', label: 'Admin', access_scope: 'Admin / Governance Access' },
  { value: 'maintainer', label: 'Maintainer', access_scope: 'Full Repository Write Access' },
  { value: 'developer', label: 'Developer', access_scope: 'Code & Task Write Access' },
  { value: 'qa', label: 'QA Reviewer', access_scope: 'Test & Review Access' },
  { value: 'viewer', label: 'Viewer', access_scope: 'Read-only Access' },
];

/** Roles that can be assigned or selected for new members/invitations */
export const ASSIGNABLE_PROJECT_ROLES = [
  { value: 'developer', label: 'Developer', access_scope: 'Code & Task Write Access' },
  { value: 'maintainer', label: 'Maintainer', access_scope: 'Full Repository Write Access' },
  { value: 'admin', label: 'Admin', access_scope: 'Admin / Governance Access' },
  { value: 'qa', label: 'QA Reviewer', access_scope: 'Test & Review Access' },
  { value: 'viewer', label: 'Viewer', access_scope: 'Read-only Access' },
];

/** Format role code into human-friendly label */
export const getRoleLabel = (roleValue) => {
  if (!roleValue) return 'Member';
  const found = PROJECT_ROLES.find((r) => r.value.toLowerCase() === roleValue.toLowerCase());
  if (found) return found.label;
  return roleValue
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

/** Get default access scope description for a role */
export const getRoleAccessScope = (roleValue) => {
  const found = PROJECT_ROLES.find((r) => r.value.toLowerCase() === roleValue?.toLowerCase());
  return found?.access_scope || 'Standard Access';
};
