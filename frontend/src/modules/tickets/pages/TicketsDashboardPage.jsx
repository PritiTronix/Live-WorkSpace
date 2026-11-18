import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import TicketViewSwitcher from '../components/TicketViewSwitcher';
import CreateTicketModal from '../components/CreateTicketModal';
import { STATUS_CONFIG, SEVERITY_CONFIG } from '../constants/ticketConstants';
import ErrorState from '../../design-system/components/ErrorState';
import Avatar from '../../../components/common/Avatar';

/**
 * Screen 61: Ticket Management Dashboard (Prompts 36 & 37)
 * Visual Reference: Stitch Screen 61 (`5af6a129297e4745acd1d0e8cd506e70`)
 * Route: `/workspace/tickets`
 */
export const TicketsDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameters
  const urlSla = searchParams.get('sla') || 'all';
  const urlStatus = searchParams.get('status') || 'all';
  const urlSeverity = searchParams.get('severity') || 'all';
  const urlSearch = searchParams.get('search') || '';

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
    slaFilter,
    setSlaFilter,
    refetch,
  } = useTickets({
    initialSearch: urlSearch,
    initialSeverity: urlSeverity,
    initialStatus: urlStatus,
    initialSla: urlSla,
  });

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  const totalCount = stats?.total ?? 0;
  const hasTotal = totalCount > 0;
  const slaBreachedCount = stats?.sla_breached ?? 0;

  // Sync state to URL search parameters
  const updateUrlParams = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === 'all' || val === '') {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Sync state when URL search params change externally (browser back/forward)
  useEffect(() => {
    const s = searchParams.get('sla') || 'all';
    if (s !== slaFilter) setSlaFilter(s);
    const st = searchParams.get('status') || 'all';
    if (st !== statusFilter) setStatusFilter(st);
    const sev = searchParams.get('severity') || 'all';
    if (sev !== severityFilter) setSeverityFilter(sev);
    const q = searchParams.get('search') || '';
    if (q !== search) setSearch(q);
  }, [searchParams]);

  // Card filter actions
  const handleSlaCardClick = () => {
    const nextVal = slaFilter === 'breached' ? 'all' : 'breached';
    setSlaFilter(nextVal);
    updateUrlParams({ sla: nextVal });
  };

  const handleStatusCardClick = (targetStatus) => {
    const isCurrentlyActive =
      statusFilter === targetStatus ||
      (['wip', 'in_progress'].includes(targetStatus) && ['wip', 'in_progress'].includes(statusFilter));
    const nextVal = isCurrentlyActive ? 'all' : targetStatus;
    setStatusFilter(nextVal);
    updateUrlParams({ status: nextVal });
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    updateUrlParams({ search: val });
  };

  const handleSeverityChange = (val) => {
    setSeverityFilter(val);
    updateUrlParams({ severity: val });
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    updateUrlParams({ status: val });
  };

  return (
    <div className="p-space-lg max-w-7xl mx-auto w-full space-y-space-lg">
      {/* View Switcher Header & Toolbar */}
      <TicketViewSwitcher
        search={search}
        onSearchChange={handleSearchChange}
        severityFilter={severityFilter}
        onSeverityChange={handleSeverityChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        onOpenCreateModal={() => setShowCreateModal(true)}
        isWsConnected={isWsConnected}
      />

      {/* Summary KPI Stat Cards Row (Screen 61) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-space-sm" role="region" aria-label="Ticket Summary Cards">
        {/* Total */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('all')}
          aria-label="Show all tickets"
          className={`text-left w-full p-space-md rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
            statusFilter === 'all' && slaFilter !== 'breached'
              ? 'bg-surface-card ring-2 ring-primary border-primary shadow-md'
              : 'bg-surface-card hover:bg-canvas-lavender/30 border border-border-subtle/50'
          }`}
        >
          <div className="flex items-center justify-between text-text-secondary">
            <span className="font-label-md text-label-md">Total Tickets</span>
            <span className="material-symbols-outlined text-text-muted text-lg">confirmation_number</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-headline-lg text-headline-lg text-text-primary font-bold">
              {totalCount}
            </span>
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: hasTotal ? '100%' : '0%' }}
            />
          </div>
        </button>

        {/* Open */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('open')}
          aria-label={`Show ${stats?.open ?? 0} open tickets`}
          className={`text-left w-full p-space-md rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-status-open ${
            statusFilter === 'open'
              ? 'bg-surface-card ring-2 ring-status-open border-status-open shadow-md'
              : 'bg-surface-card hover:bg-canvas-lavender/30 border border-border-subtle/50'
          }`}
        >
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
        </button>

        {/* In Progress */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('wip')}
          aria-label={`Show ${stats?.wip ?? 0} in progress tickets`}
          className={`text-left w-full p-space-md rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-status-wip ${
            statusFilter === 'wip' || statusFilter === 'in_progress'
              ? 'bg-surface-card ring-2 ring-status-wip border-status-wip shadow-md'
              : 'bg-surface-card hover:bg-canvas-lavender/30 border border-border-subtle/50'
          }`}
        >
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
        </button>

        {/* On Hold */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('on_hold')}
          aria-label={`Show ${stats?.on_hold ?? 0} on hold tickets`}
          className={`text-left w-full p-space-md rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-status-on-hold ${
            statusFilter === 'on_hold'
              ? 'bg-surface-card ring-2 ring-status-on-hold border-status-on-hold shadow-md'
              : 'bg-surface-card hover:bg-canvas-lavender/30 border border-border-subtle/50'
          }`}
        >
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
        </button>

        {/* Resolved */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('resolved')}
          aria-label={`Show ${stats?.resolved ?? 0} resolved tickets`}
          className={`text-left w-full p-space-md rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-status-resolved ${
            statusFilter === 'resolved'
              ? 'bg-surface-card ring-2 ring-status-resolved border-status-resolved shadow-md'
              : 'bg-surface-card hover:bg-canvas-lavender/30 border border-border-subtle/50'
          }`}
        >
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
        </button>

        {/* SLA Breached Attention Card (Button) */}
        <button
          type="button"
          onClick={handleSlaCardClick}
          aria-label={slaBreachedCount === 1 ? 'Show 1 ticket with breached SLA' : `Show ${slaBreachedCount} tickets with breached SLA`}
          className={`text-left w-full p-space-md rounded-xl shadow-sm flex flex-col justify-between transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-severity-blocker ${
            slaBreachedCount > 0
              ? slaFilter === 'breached'
                ? 'bg-error-container/60 ring-2 ring-severity-blocker border-severity-blocker shadow-md'
                : 'bg-error-container/40 hover:bg-error-container/60 border border-severity-blocker/30'
              : slaFilter === 'breached'
                ? 'bg-surface-card ring-2 ring-severity-blocker border-severity-blocker shadow-md'
                : 'bg-surface-card hover:bg-canvas-lavender/30 border border-border-subtle/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-label-md text-label-md font-bold flex items-center gap-1 ${
                slaBreachedCount > 0 ? 'text-severity-blocker' : 'text-text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {slaBreachedCount > 0 ? 'warning' : 'verified'}
              </span>
              SLA Breached
            </span>
            {slaBreachedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-on-error bg-severity-blocker font-label-sm text-xs font-semibold animate-pulse">
                ATTN
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`font-headline-lg text-headline-lg font-bold ${
                slaBreachedCount > 0 ? 'text-severity-blocker' : 'text-text-primary'
              }`}
            >
              {slaBreachedCount}
            </span>
            {slaBreachedCount > 0 && (
              <span className="font-label-sm text-label-sm font-semibold text-severity-blocker">Action Req</span>
            )}
          </div>
          <div className="w-full bg-canvas-lavender h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-severity-blocker h-full transition-all duration-300"
              style={{
                width: `${hasTotal && slaBreachedCount > 0 ? Math.min(100, Math.round((slaBreachedCount / totalCount) * 100)) : 0}%`,
              }}
            />
          </div>
        </button>
      </div>

      {/* Active Filter Chips Bar */}
      {(slaFilter === 'breached' || statusFilter !== 'all' || severityFilter !== 'all' || search.trim() !== '') && (
        <div className="flex flex-wrap items-center gap-2 pt-1" role="region" aria-label="Active Filters">
          <span className="font-label-sm text-label-sm text-text-muted">Active Filters:</span>

          {slaFilter === 'breached' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-severity-blocker/15 text-severity-blocker border border-severity-blocker/30 shadow-xs">
              <span className="material-symbols-outlined text-sm">alarm_off</span>
              <span>Breached SLA</span>
              <button
                type="button"
                onClick={() => {
                  setSlaFilter('all');
                  updateUrlParams({ sla: 'all' });
                }}
                className="hover:bg-severity-blocker/20 rounded-full p-0.5 ml-0.5 transition-colors flex items-center justify-center"
                aria-label="Remove Breached SLA filter"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-canvas-lavender text-text-primary border border-border-subtle">
              <span>Status: {STATUS_CONFIG[statusFilter]?.label || statusFilter}</span>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  updateUrlParams({ status: 'all' });
                }}
                className="hover:bg-canvas-main rounded-full p-0.5 ml-0.5 transition-colors flex items-center justify-center"
                aria-label="Remove status filter"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          )}

          {severityFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-canvas-lavender text-text-primary border border-border-subtle">
              <span>Severity: {SEVERITY_CONFIG[severityFilter]?.label || severityFilter}</span>
              <button
                type="button"
                onClick={() => {
                  setSeverityFilter('all');
                  updateUrlParams({ severity: 'all' });
                }}
                className="hover:bg-canvas-main rounded-full p-0.5 ml-0.5 transition-colors flex items-center justify-center"
                aria-label="Remove severity filter"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          )}

          {search.trim() !== '' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-canvas-lavender text-text-primary border border-border-subtle">
              <span>Search: "{search}"</span>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  updateUrlParams({ search: '' });
                }}
                className="hover:bg-canvas-main rounded-full p-0.5 ml-0.5 transition-colors flex items-center justify-center"
                aria-label="Remove search filter"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setSlaFilter('all');
              setStatusFilter('all');
              setSeverityFilter('all');
              setSearch('');
              updateUrlParams({ sla: 'all', status: 'all', severity: 'all', search: '' });
            }}
            className="text-xs text-text-muted hover:text-text-primary underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

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
              variant={error === 'Cannot reach the server' ? 'network' : error === 'The filter is not valid' ? 'empty-search' : '500'}
              title={error === 'Cannot reach the server' ? 'Connection Error' : error === 'The filter is not valid' ? 'Invalid Filter' : 'Unable to Load Tickets'}
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
                      className={`hover:bg-canvas-lavender/30 transition-colors cursor-pointer group ${
                        t.is_breached ? 'bg-error-container/10' : ''
                      }`}
                    >
                      {/* Ticket Number & Breach Overrun Badge */}
                      <td className="py-3 px-4 font-mono font-bold text-text-primary text-xs whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{t.ticket_number}</span>
                          {t.is_breached && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-error/15 text-severity-blocker border border-severity-blocker/30 shrink-0"
                              title={`SLA breached at ${t.breached_at ? new Date(t.breached_at).toLocaleString() : ''}`}
                            >
                              <span className="material-symbols-outlined text-[13px]">alarm_off</span>
                              <span>+{t.overrun_duration || 'Breached'}</span>
                            </span>
                          )}
                        </div>
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
                          <Avatar
                            src={t.assignee?.avatar_url}
                            name={t.assignee?.full_name || 'Unassigned'}
                            size="xs"
                            ring="ring-1 ring-border-subtle"
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
                          aria-label={`View details for ticket ${t.ticket_number}`}
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
