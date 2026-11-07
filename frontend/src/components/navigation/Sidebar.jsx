import React from 'react';
import { NavLink } from 'react-router-dom';
import { DEFAULT_USER } from '../../services/api';

export const Sidebar = ({ onOpenCreate, isCollapsed, onToggleCollapse }) => {
  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-surface-sidebar flex flex-col justify-between shadow-[0_1px_8px_rgba(20,21,41,0.04)] z-50 overflow-y-auto border-r border-border-subtle transition-all duration-200 ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      <div className="p-space-md">
        {/* App Title & Workspace Brand */}
        <div className="flex items-center justify-between pb-space-sm">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline-sm text-headline-sm font-bold shadow-sm">
              LW
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight leading-none">
                  Live Workspace
                </span>
                <span className="font-label-sm text-label-sm text-text-muted">Tronix365 Cloud</span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            aria-label="Toggle sidebar"
            className="w-7 h-7 rounded-lg hover:bg-canvas-lavender hover:text-text-primary text-text-muted flex items-center justify-center transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'dock_to_left' : 'dock_to_right'}
            </span>
          </button>
        </div>

        {/* Tenant / Organization Switcher */}
        {!isCollapsed && (
          <div className="mt-space-md mb-space-sm p-space-sm rounded-lg bg-surface-card shadow-[0_1px_3px_rgba(20,21,41,0.04)] flex items-center justify-between border border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <span className="w-6 h-6 rounded bg-canvas-lavender flex items-center justify-center text-primary font-label-sm text-label-sm font-bold">
                AT
              </span>
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md text-text-primary truncate max-w-[120px]">Acme Tech</span>
                <span className="font-label-sm text-label-sm text-primary">Enterprise Pro</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[16px]">unfold_more</span>
          </div>
        )}

        {/* Quick Action Primary Button */}
        <div className="mt-space-sm mb-space-md">
          <button
            onClick={onOpenCreate}
            className="w-full h-10 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all transform active:scale-98"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {!isCollapsed && <span>Create Action</span>}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-space-md">
          {/* Section 1: Workspace */}
          <div className="space-y-space-xs">
            {!isCollapsed && (
              <p className="px-space-sm py-space-xs font-label-sm text-label-sm text-text-muted tracking-wider uppercase">
                Workspace
              </p>
            )}
            <div className="space-y-0.5">
              <NavLink
                to="/workspace/dashboard"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Home</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/tasks"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">My Tasks</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/tickets"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">My Tickets</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/inbox"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">inbox</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Inbox</span>}
                </div>
                {!isCollapsed && (
                  <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-primary-fixed text-primary font-bold">
                    3
                  </span>
                )}
              </NavLink>
            </div>
          </div>

          {/* Section 2: Project Management */}
          <div className="space-y-space-xs">
            {!isCollapsed && (
              <p className="px-space-sm py-space-xs font-label-sm text-label-sm text-text-muted tracking-wider uppercase">
                Project Management
              </p>
            )}
            <div className="space-y-0.5">
              <NavLink
                to="/workspace/projects"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">folder_open</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Projects</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/tasks/all"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">All Tasks</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/tickets/all"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">assignment_late</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">All Tickets</span>}
                </div>
              </NavLink>
            </div>
          </div>

          {/* Section 3: Collaboration */}
          <div className="space-y-space-xs">
            {!isCollapsed && (
              <p className="px-space-sm py-space-xs font-label-sm text-label-sm text-text-muted tracking-wider uppercase">
                Collaboration
              </p>
            )}
            <div className="space-y-0.5">
              <NavLink
                to="/workspace/members"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Team Members</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/discussions"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Discussions</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/files"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Files</span>}
                </div>
              </NavLink>
            </div>
          </div>

          {/* Section 4: Monitoring */}
          <div className="space-y-space-xs">
            {!isCollapsed && (
              <p className="px-space-sm py-space-xs font-label-sm text-label-sm text-text-muted tracking-wider uppercase">
                Monitoring
              </p>
            )}
            <div className="space-y-0.5">
              <NavLink
                to="/workspace/monitoring/priority"
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
                <span className="w-2 h-2 rounded-full bg-severity-blocker"></span>
              </NavLink>

              <NavLink
                to="/workspace/sla"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">SLA Overview</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/audit-logs"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">history</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Activity Logs</span>}
                </div>
              </NavLink>

              <NavLink
                to="/workspace/analytics"
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'text-text-secondary hover:bg-canvas-lavender hover:text-text-primary'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">analytics</span>
                  {!isCollapsed && <span className="font-label-md text-label-md">Reports</span>}
                </div>
              </NavLink>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-space-md space-y-space-sm border-t border-border-subtle bg-surface-sidebar">
        <nav className="space-y-0.5">
          <NavLink
            to="/workspace/settings"
            className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            {!isCollapsed && <span className="font-label-md text-label-md">Settings</span>}
          </NavLink>
          <a
            href="#help"
            className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">help</span>
            {!isCollapsed && <span className="font-label-md text-label-md">Help & Support</span>}
          </a>
        </nav>

        {!isCollapsed && (
          <div className="pt-space-sm flex items-center justify-between px-space-sm py-space-xs rounded-xl hover:bg-canvas-lavender transition-colors cursor-pointer border border-border-subtle">
            <div className="flex items-center gap-space-sm">
              <div className="relative">
                <img
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                  src={DEFAULT_USER.avatar_url}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-status-resolved ring-2 ring-surface-sidebar"></span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md text-text-primary leading-tight">
                  {DEFAULT_USER.full_name}
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary leading-tight">
                  {DEFAULT_USER.role}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[18px]">more_vert</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
