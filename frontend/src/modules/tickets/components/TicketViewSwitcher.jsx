import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Shared Header, View Switcher & Filter Toolbar
 * Used across Screen 61 (List), Screen 62 (Board), Screen 63 (Priority)
 */
export const TicketViewSwitcher = ({
  search = '',
  onSearchChange,
  severityFilter = 'all',
  onSeverityChange,
  statusFilter = 'all',
  onStatusChange,
  onOpenCreateModal,
}) => {
  return (
    <div className="flex flex-col gap-space-md">
      {/* Top Banner Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-card p-4 sm:p-space-lg rounded-xl shadow-sm border border-border-subtle/50">
        <div>
          <div className="flex flex-wrap items-center gap-space-sm">
            <h1 className="font-headline-xl text-xl sm:text-headline-xl text-text-primary tracking-tight">
              Ticket Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-status-open/10 text-status-open font-label-sm text-xs font-semibold">
              SLA Engine Live
            </span>
          </div>
          <p className="font-body-md text-xs sm:text-body-md text-text-secondary mt-1">
            Real-time incident response, severity matrix, triage workflows, and SLA resolution timers.
          </p>
        </div>

        {/* View Switcher Tabs + Create Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-space-sm">
          {/* Navigation Views */}
          <div className="flex items-center p-1 bg-canvas-main rounded-lg border border-border-subtle">
            <NavLink
              to="/workspace/tickets"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-md text-xs sm:text-label-md transition-all ${
                  isActive
                    ? 'bg-surface-card text-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-base">view_list</span>
              <span>List</span>
            </NavLink>

            <NavLink
              to="/workspace/tickets/board"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-md text-xs sm:text-label-md transition-all ${
                  isActive
                    ? 'bg-surface-card text-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-base">view_kanban</span>
              <span>Board</span>
            </NavLink>

            <NavLink
              to="/workspace/tickets/priority"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-md text-xs sm:text-label-md transition-all ${
                  isActive
                    ? 'bg-surface-card text-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-base">crisis_alert</span>
              <span>Priority</span>
            </NavLink>
          </div>

          {/* Create Ticket Trigger */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="h-9 px-3 sm:px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-xs sm:text-label-md flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-card p-3 sm:p-space-sm px-4 rounded-xl shadow-sm border border-border-subtle/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm flex-1 w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] w-full sm:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-2 text-text-muted text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Filter by title or ticket #..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filters Group */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Severity Dropdown */}
            <div className="flex-1 sm:flex-initial">
              <select
                value={severityFilter}
                onChange={(e) => onSeverityChange && onSeverityChange(e.target.value)}
                className="w-full sm:w-auto h-9 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-xs sm:text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Severity: All</option>
                <option value="blocker">Blocker (P0)</option>
                <option value="critical">Critical (P1)</option>
                <option value="major">Major (P2)</option>
                <option value="minor">Minor (P3)</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
                className="w-full sm:w-auto h-9 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-xs sm:text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Status: All</option>
                <option value="open">Open</option>
                <option value="wip">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketViewSwitcher;
