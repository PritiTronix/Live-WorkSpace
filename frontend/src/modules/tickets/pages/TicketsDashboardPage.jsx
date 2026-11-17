import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import TicketViewSwitcher from '../components/TicketViewSwitcher';
import CreateTicketModal from '../components/CreateTicketModal';
import { STATUS_CONFIG, SEVERITY_CONFIG } from '../constants/ticketConstants';
import ErrorState from '../../design-system/components/ErrorState';

/**
 * Screen 61: Ticket Management Dashboard (Prompts 36 & 37)
 * Visual Reference: Stitch Screen 61 (`5af6a129297e4745acd1d0e8cd506e70`)
 * Route: `/workspace/tickets`
 */
export const TicketsDashboardPage = () => {
  const navigate = useNavigate();

  const {
    tickets,
    stats,
    loading,
    error,
    isRetrying,
    isWsConnected,
    search,
    setSearch,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    refetch,
  } = useTickets();

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const totalCount = stats?.total ?? 0;
  const hasTotal = totalCount > 0;
  const slaBreachedCount = stats?.sla_breached ?? 0;

  return (
    <div className="p-space-lg max-w-7xl mx-auto w-full space-y-space-lg">
      {/* View Switcher Header & Toolbar */}
      <TicketViewSwitcher
        search={search}
        onSearchChange={setSearch}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onOpenCreateModal={() => setShowCreateModal(true)}
        isWsConnected={isWsConnected}
      />

      {/* Summary KPI Stat Cards Row (Screen 61) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-sm">
        {/* Total */}
        <div className="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:bg-canvas-lavender/30 transition-all border border-border-subtle/50">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="font-label-md text-label-md">Total Tickets</span>
            <span className="material-symbols-outlined text-text-muted text-lg">confirmation_number</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {totalCount}
            </span>
            {hasTotal && (
              <span className="font-label-sm text-label-sm text-text-muted">100% Volume</span>
            )}
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: hasTotal ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Open */}
        <div className="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:bg-canvas-lavender/30 transition-all border border-border-subtle/50">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="font-label-md text-label-md">Open</span>
            <span className="material-symbols-outlined text-status-open text-lg">radio_button_unchecked</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {stats?.open ?? 0}
            </span>
            {hasTotal && (
              <span className="font-label-sm text-label-sm text-status-open">
                {Math.round(((stats?.open ?? 0) / totalCount) * 100)}%
              </span>
            )}
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-status-open h-full transition-all duration-300"
              style={{ width: `${hasTotal ? Math.round(((stats?.open ?? 0) / totalCount) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:bg-canvas-lavender/30 transition-all border border-border-subtle/50">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="font-label-md text-label-md">In Progress</span>
            <span className="material-symbols-outlined text-status-wip text-lg">timelapse</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {stats?.wip ?? 0}
            </span>
            {hasTotal && (
              <span className="font-label-sm text-label-sm text-status-wip">
                {Math.round(((stats?.wip ?? 0) / totalCount) * 100)}%
              </span>
            )}
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-status-wip h-full transition-all duration-300"
              style={{ width: `${hasTotal ? Math.round(((stats?.wip ?? 0) / totalCount) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* On Hold */}
        <div className="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:bg-canvas-lavender/30 transition-all border border-border-subtle/50">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="font-label-md text-label-md">On Hold</span>
            <span className="material-symbols-outlined text-status-on-hold text-lg">pause_circle</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {stats?.on_hold ?? 0}
            </span>
            {hasTotal && (
              <span className="font-label-sm text-label-sm text-status-on-hold">
                {Math.round(((stats?.on_hold ?? 0) / totalCount) * 100)}%
              </span>
            )}
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-status-on-hold h-full transition-all duration-300"
              style={{ width: `${hasTotal ? Math.round(((stats?.on_hold ?? 0) / totalCount) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-surface-card p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:bg-canvas-lavender/30 transition-all border border-border-subtle/50">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="font-label-md text-label-md">Resolved</span>
            <span className="material-symbols-outlined text-status-resolved text-lg">task_alt</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {stats?.resolved ?? 0}
            </span>
            {hasTotal && (
              <span className="font-label-sm text-label-sm text-status-resolved">
                {Math.round(((stats?.resolved ?? 0) / totalCount) * 100)}%
              </span>
            )}
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-status-resolved h-full transition-all duration-300"
              style={{ width: `${hasTotal ? Math.round(((stats?.resolved ?? 0) / totalCount) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* SLA Breached Attention Card */}
        <div className="bg-error-container/40 p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:bg-error-container/60 transition-all border border-severity-blocker/30">
          <div className="flex items-center justify-between text-on-error-container">
            <span className="font-label-md text-label-md font-bold text-severity-blocker flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              SLA Breached
            </span>
            {slaBreachedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-on-error bg-severity-blocker font-label-sm text-xs font-semibold animate-pulse">
                ATTN
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-severity-blocker font-bold">
              {slaBreachedCount}
            </span>
            {slaBreachedCount > 0 && (
              <span className="font-label-sm text-label-sm font-semibold text-severity-blocker">Action Req</span>
            )}
          </div>
          <div className="w-full bg-white/60 h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-severity-blocker h-full transition-all duration-300"
              style={{ width: `${hasTotal ? Math.min(100, Math.round((slaBreachedCount / totalCount) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Ticket Table View (Screen 61) */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle/50 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <span className="ml-3 font-body-md text-text-secondary">Loading ticket records...</span>
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              variant="500"
              title="Unable to Load Tickets"
              description={error}
              onRetry={() => refetch(true)}
              isRetrying={isRetrying}
            />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-space-2xl text-center">
            <span className="material-symbols-outlined text-5xl text-text-muted mb-2">confirmation_number</span>
            <h3 className="font-headline-sm text-headline-sm text-text-primary">No tickets found</h3>
            <p className="font-body-sm text-text-secondary mt-1">Adjust filters or create a new ticket.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead className="bg-canvas-lavender/70 font-label-sm text-label-sm text-text-muted uppercase tracking-wider border-b border-border-subtle select-none">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/40">
                {tickets.map((t) => {
                  const sevKey = (t.severity || '').toLowerCase();
                  const stKey = (t.status || '').toLowerCase();
                  const sevConfig = SEVERITY_CONFIG[sevKey] || SEVERITY_CONFIG.minor;
                  const stConfig = STATUS_CONFIG[stKey] || STATUS_CONFIG.open;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/workspace/tickets/${t.id}`)}
                      className="hover:bg-canvas-lavender/30 transition-colors cursor-pointer group"
                    >
                      {/* Ticket Number */}
                      <td className="py-3 px-4 font-mono font-bold text-text-primary text-xs">
                        {t.ticket_number}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 font-semibold text-text-primary group-hover:text-primary transition-colors max-w-md truncate">
                        {t.title}
                      </td>

                      {/* Project Badge */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-mono text-xs font-bold">
                          {t.project?.key || 'PLTFRM'}
                        </span>
                      </td>

                      {/* Severity Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-label-sm text-label-sm font-semibold ${sevConfig.bgBadge} ${sevConfig.textBadge}`}>
                          <span className="material-symbols-outlined text-sm">{sevConfig.icon}</span>
                          <span>{sevConfig.label}</span>
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${stConfig.badge}`}>
                          {stConfig.label}
                        </span>
                      </td>

                      {/* Assignee Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-border-subtle"
                            src={t.assignee?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAmt0YGYVVOxPr4ec8yeLMlH3eFipVV14C1qMrM6ZWl_Q3CsXSe8erXqQl5aoC-hylXdMtlpm7vAxewtZVSavdi540cHwdI20sNUsCMCCuak-zOLUoAcw0tZ70DFuiIx8Gb3wEnQn4Dk5w51h-GTXmS7PCFEawLwniAxRH1k2msgs1oH4D8Wa8mKn_ucl6LFJ6K4rpqwTBjlPjHt5Cq9qIpjIgWgzOnHZ7pEjeLmA8W"}
                            alt=""
                          />
                          <span className="text-text-secondary truncate text-xs">
                            {t.assignee?.full_name || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/workspace/tickets/${t.id}`)}
                          className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-canvas-lavender"
                        >
                          <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen 64 Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTicketCreated={() => refetch()}
        />
      )}
    </div>
  );
};

export default TicketsDashboardPage;
