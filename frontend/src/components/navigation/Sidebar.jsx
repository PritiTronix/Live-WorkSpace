/**
 * Sidebar
 * Real-time, per-user organization switcher, live badges, and dynamic user card.
 */
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { authService, organizationService } from '../../services/api';
import HelpSupportModal from '../modals/HelpSupportModal';
import KeyboardShortcutsModal from '../modals/KeyboardShortcutsModal';

const getInitials = (str) => {
  if (!str) return 'W';
  const parts = str.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
};

/** Single nav link with optional badge and tooltip for collapsed state */
const NavItem = ({ to, icon, label, badge, isCollapsed, end = false }) => (
  <NavLink
    to={to}
    end={end}
    title={isCollapsed ? label : undefined}
    className={({ isActive }) =>
      `relative flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-canvas-lavender text-primary font-semibold'
          : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
      }`
    }
  >
    <div className="flex items-center gap-space-sm">
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {!isCollapsed && <span className="font-label-md text-label-md">{label}</span>}
    </div>
    {!isCollapsed && badge > 0 && (
      <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-primary-fixed text-primary font-bold leading-none">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {isCollapsed && badge > 0 && (
      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-severity-blocker" />
    )}
  </NavLink>
);

/** Collapsible sub-section for nested items (e.g. Tickets views) */
const ExpandableNavItem = ({ to, icon, label, isCollapsed, children }) => {
  const location = useLocation();
  const isParentActive = location.pathname.startsWith(to);
  const [open, setOpen] = useState(isParentActive);

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        type="button"
        title={isCollapsed ? label : undefined}
        className={`w-full flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
          isParentActive
            ? 'bg-canvas-lavender text-primary font-semibold'
            : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
        }`}
      >
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
          {!isCollapsed && <span className="font-label-md text-label-md">{label}</span>}
        </div>
        {!isCollapsed && (
          <span className="material-symbols-outlined text-[16px] text-text-muted">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        )}
      </button>
      {open && !isCollapsed && (
        <div className="mt-0.5 ml-6 space-y-0.5 border-l border-border-subtle pl-3">
          {children}
        </div>
      )}
    </div>
  );
};

/** Sub-nav leaf link (indented under expandable parent) */
const SubNavItem = ({ to, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center px-2 py-1.5 rounded-lg font-label-sm text-label-sm transition-colors ${
        isActive
          ? 'text-primary font-semibold bg-canvas-lavender'
          : 'text-text-secondary hover:text-text-primary hover:bg-canvas-lavender'
      }`
    }
  >
    {label}
  </NavLink>
);

/** Section header label */
const SectionLabel = ({ label, isCollapsed }) =>
  !isCollapsed ? (
    <p className="px-space-sm py-space-xs font-label-sm text-label-sm text-text-muted tracking-wider uppercase">
      {label}
    </p>
  ) : (
    <div className="border-t border-border-subtle my-1 mx-2" />
  );

export const Sidebar = ({
  onOpenCreate,
  isCollapsed,
  onToggleCollapse,
  unreadNotifications = 0,
  inboxCount = 0,
  priorityIssuesCount = 0,
  isMobile = false,
  onOpenShortcuts,
}) => {
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUserSync());
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const helpButtonRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser().then((user) => {
      if (mounted && user) setCurrentUser(user);
    });

    organizationService.list().then((orgs) => {
      if (mounted && orgs && orgs.length > 0) {
        setOrganizations(orgs);
        setCurrentOrg(orgs[0]);
      }
    });

    organizationService.getCurrent().then((workspace) => {
      if (mounted && workspace?.name) {
        setCurrentOrg((prev) => ({
          ...prev,
          name: workspace.name,
          plan: prev?.plan || 'Standard',
        }));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-surface-sidebar flex flex-col justify-between shadow-[0_1px_8px_rgba(20,21,41,0.04)] z-50 overflow-y-auto border-r border-border-subtle transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* ── Top: Brand + Toggle ── */}
      <div className="p-space-md">
        <div className="flex items-center justify-between pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline-sm text-headline-sm font-bold shadow-sm flex-shrink-0">
              {getInitials(currentOrg?.name || 'Live Workspace')}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight leading-none">
                  Live Workspace
                </span>
                <span className="font-label-sm text-label-sm text-text-muted truncate max-w-[130px]">
                  {currentOrg?.name || 'Workspace'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            aria-label={isMobile ? 'Close sidebar' : 'Toggle sidebar'}
            className="w-7 h-7 rounded-lg hover:bg-canvas-lavender hover:text-text-primary text-text-muted flex items-center justify-center transition-colors flex-shrink-0"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isMobile ? 'close' : isCollapsed ? 'dock_to_left' : 'dock_to_right'}
            </span>
          </button>
        </div>

        {/* Org Switcher (Real Organization Data Only) */}
        {!isCollapsed && (
          <div className="relative">
            <div
              onClick={() => organizations.length > 1 && setIsOrgDropdownOpen((p) => !p)}
              className={`mt-space-md mb-space-sm p-space-sm rounded-lg bg-surface-card shadow-[0_1px_3px_rgba(20,21,41,0.04)] flex items-center justify-between border border-border-subtle transition-colors ${
                organizations.length > 1 ? 'cursor-pointer hover:bg-canvas-lavender' : ''
              }`}
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <span className="w-6 h-6 rounded bg-canvas-lavender flex items-center justify-center text-primary font-label-sm text-label-sm font-bold flex-shrink-0">
                  {getInitials(currentOrg?.name || 'Workspace')}
                </span>
                <div className="flex flex-col text-left min-w-0">
                  <span className="font-label-md text-label-md text-text-primary truncate max-w-[130px]">
                    {currentOrg?.name || 'Workspace'}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary capitalize">
                    {currentOrg?.plan || 'Standard'}
                  </span>
                </div>
              </div>
              {organizations.length > 1 && (
                <span className="material-symbols-outlined text-text-muted text-[16px]">unfold_more</span>
              )}
            </div>

            {isOrgDropdownOpen && organizations.length > 1 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-surface-card border border-border-subtle rounded-lg shadow-lg p-1 space-y-1 mt-1">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => {
                      setCurrentOrg(org);
                      setIsOrgDropdownOpen(false);
                    }}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-canvas-lavender cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded bg-canvas-lavender flex items-center justify-center text-primary font-bold text-[10px] flex-shrink-0">
                        {getInitials(org.name)}
                      </span>
                      <span className="font-semibold text-text-primary truncate">{org.name}</span>
                    </div>
                    <span className="text-[10px] text-primary capitalize flex-shrink-0">{org.plan || 'Standard'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Create Button */}
        <div className="mt-space-sm mb-space-md">
          <button
            onClick={onOpenCreate}
            className="w-full h-10 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all transform active:scale-98"
            type="button"
            title={isCollapsed ? 'Create' : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {!isCollapsed && <span>Create Action</span>}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="space-y-space-md">
          {/* Section: Workspace */}
          <div className="space-y-space-xs">
            <SectionLabel label="Workspace" isCollapsed={isCollapsed} />
            <div className="space-y-0.5">
              <NavItem to="/workspace/dashboard" icon="home" label="Home" isCollapsed={isCollapsed} end />
              <NavItem to="/workspace/tasks/my-tasks" icon="task_alt" label="My Tasks" isCollapsed={isCollapsed} />
              <NavItem
                to="/workspace/notifications"
                icon="notifications"
                label="Notifications"
                badge={unreadNotifications > 0 ? unreadNotifications : null}
                isCollapsed={isCollapsed}
              />
              <NavItem
                to="/workspace/inbox"
                icon="inbox"
                label="Inbox"
                badge={inboxCount > 0 ? inboxCount : null}
                isCollapsed={isCollapsed}
              />
            </div>
          </div>

          {/* Section: Project Management */}
          <div className="space-y-space-xs">
            <SectionLabel label="Project Management" isCollapsed={isCollapsed} />
            <div className="space-y-0.5">
              <NavItem to="/workspace/projects" icon="folder_open" label="Projects" isCollapsed={isCollapsed} />
              <NavItem to="/workspace/tasks/all" icon="format_list_bulleted" label="All Tasks" isCollapsed={isCollapsed} />
              {/* Expandable Tickets with sub-nav */}
              <ExpandableNavItem
                to="/workspace/tickets"
                icon="confirmation_number"
                label="Tickets"
                isCollapsed={isCollapsed}
              >
                <SubNavItem to="/workspace/tickets" label="Dashboard" end />
                <SubNavItem to="/workspace/tickets/board" label="Board View" />
                <SubNavItem to="/workspace/tickets/priority" label="Priority View" />
                <SubNavItem to="/workspace/tickets/critical" label="Priority Issues" />
              </ExpandableNavItem>
            </div>
          </div>

          {/* Section: Collaboration */}
          <div className="space-y-space-xs">
            <SectionLabel label="Collaboration" isCollapsed={isCollapsed} />
            <div className="space-y-0.5">
              <NavItem to="/workspace/members" icon="group" label="Team Members" isCollapsed={isCollapsed} />
              <NavItem to="/workspace/discussions" icon="forum" label="Discussions" isCollapsed={isCollapsed} />
              <NavItem to="/workspace/files" icon="attach_file" label="Files" isCollapsed={isCollapsed} />
            </div>
          </div>

          {/* Section: Monitoring */}
          <div className="space-y-space-xs">
            <SectionLabel label="Monitoring" isCollapsed={isCollapsed} />
            <div className="space-y-0.5">
              <NavLink
                to="/workspace/tickets/critical"
                title={isCollapsed ? 'Priority Issues' : undefined}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Priority Issues</span>}
                </div>
                {priorityIssuesCount > 0 && <span className="w-2 h-2 rounded-full bg-severity-blocker" />}
              </NavLink>
              <NavItem to="/workspace/sla" icon="timer" label="SLA Overview" isCollapsed={isCollapsed} />
              <NavItem to="/workspace/audit-logs" icon="history" label="Activity Logs" isCollapsed={isCollapsed} />
              <NavItem to="/workspace/analytics" icon="analytics" label="Reports" isCollapsed={isCollapsed} />
            </div>
          </div>
        </nav>
      </div>

      {/* ── Bottom: Settings + User Card ── */}
      <div className="p-space-md space-y-space-sm border-t border-border-subtle bg-surface-sidebar">
        <nav className="space-y-0.5">
          <NavLink
            to="/workspace/settings"
            title={isCollapsed ? 'Settings' : undefined}
            className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            {!isCollapsed && <span className="font-label-md text-label-md">Settings</span>}
          </NavLink>
          <button
            ref={helpButtonRef}
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            title={isCollapsed ? 'Help & Support' : undefined}
            className="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">help</span>
            {!isCollapsed && <span className="font-label-md text-label-md">Help & Support</span>}
          </button>
        </nav>

        {/* User Card (expanded only) */}
        {!isCollapsed && (
          <NavLink
            to="/workspace/settings/profile"
            className="pt-space-sm flex items-center justify-between px-space-sm py-space-xs rounded-xl hover:bg-canvas-lavender transition-colors cursor-pointer border border-border-subtle"
          >
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="relative flex-shrink-0">
                {currentUser?.avatar_url ? (
                  <img
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    src={currentUser.avatar_url}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-container text-primary font-bold text-xs flex items-center justify-center">
                    {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-status-resolved ring-2 ring-surface-sidebar"></span>
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="font-label-md text-label-md text-text-primary leading-tight truncate">
                  {currentUser?.full_name || 'Team Member'}
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary leading-tight capitalize truncate">
                  {currentUser?.role || 'member'}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[18px]">more_vert</span>
          </NavLink>
        )}

        {/* Collapsed: show avatar only */}
        {isCollapsed && (
          <div className="flex justify-center pt-space-sm">
            <NavLink to="/workspace/settings/profile" className="relative">
              {currentUser?.avatar_url ? (
                <img
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  src={currentUser.avatar_url}
                  title={`${currentUser?.full_name || 'Team Member'} — ${currentUser?.role || 'member'}`}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full bg-primary-container text-primary font-bold text-xs flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  title={`${currentUser?.full_name || 'Team Member'} — ${currentUser?.role || 'member'}`}
                >
                  {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-status-resolved ring-2 ring-surface-sidebar"></span>
            </NavLink>
          </div>
        )}
      </div>

      {/* ── Modals (Help & Support + Keyboard Shortcuts) ── */}
      <HelpSupportModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onOpenShortcuts={() => {
          setIsHelpModalOpen(false);
          if (onOpenShortcuts) {
            onOpenShortcuts();
          } else {
            setIsShortcutsModalOpen(true);
          }
        }}
        triggerRef={helpButtonRef}
      />
      {!onOpenShortcuts && (
        <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />
      )}
    </aside>
  );
};

export default Sidebar;
