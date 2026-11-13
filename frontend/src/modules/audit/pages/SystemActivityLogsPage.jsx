import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auditLogsService } from '../../../services/auditLogsService';
import LogDetailDrawer from '../components/LogDetailDrawer';
import AuditExportDialog from '../components/AuditExportDialog';

export const SystemActivityLogsPage = () => {
  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [timeHorizon, setTimeHorizon] = useState('7d');
  const [eventType, setEventType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actorId, setActorId] = useState('all');
  const [actorsList, setActorsList] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data State
  const [logsData, setLogsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Load real organization actors for filter dropdown (F-12)
  useEffect(() => {
    auditLogsService.getActors().then((data) => {
      setActorsList(Array.isArray(data) ? data : []);
    }).catch(() => {
      setActorsList([]);
    });
  }, []);

  const fetchLogs = () => {
    setIsLoading(true);
    auditLogsService
      .listLogs({
        search: search.trim() || undefined,
        time_horizon: timeHorizon,
        event_type: eventType,
        severity: severity,
        status: statusFilter,
        actor_id: actorId,
        page: page,
        page_size: pageSize,
      })
      .then((data) => {
        setLogsData(data);
        setLastFetchedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit logs:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [timeHorizon, eventType, severity, statusFilter, actorId, page, pageSize]);

  // Handle search with enter or button
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setTimeHorizon('7d');
    setEventType('all');
    setSeverity('all');
    setStatusFilter('all');
    setActorId('all');
    setPage(1);
  };

  // Zero synthetic fallbacks (F-04)
  const kpis = logsData?.kpis || {
    event_volume_24h: 0,
    event_volume_delta_pct: null,
    escalations_count: 0,
    signoffs_count: 0,
    automated_ingests_count: null,
    automated_ingests_pct: null,
    ledger_hash: null,
  };

  const items = logsData?.items || [];
  const total = logsData?.total || 0;
  const totalPages = logsData?.total_pages || 1;

  const formatUtcTimestamp = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getUTCMonth()];
      const day = d.getUTCDate();
      const year = d.getUTCFullYear();
      const time = d.toISOString().slice(11, 19);
      return `${month} ${day}, ${year} • ${time} UTC`;
    } catch {
      return dateStr;
    }
  };

  const getEventTypePill = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('status')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#3888F8]/10 text-[#3888F8]">
          <span className="material-symbols-outlined text-[14px]">sync_alt</span>
          Status Change
        </span>
      );
    }
    if (act.includes('severity') || act.includes('escalat')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-severity-critical/10 text-severity-critical">
          <span className="material-symbols-outlined text-[14px]">warning</span>
          Severity Escalation
        </span>
      );
    }
    if (act.includes('reassign')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[14px]">person_outline</span>
          Reassignment
        </span>
      );
    }
    if (act.includes('deadline')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-warning/10 text-status-warning">
          <span className="material-symbols-outlined text-[14px]">event</span>
          Deadline Adjusted
        </span>
      );
    }
    if (act.includes('reopen')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#8870F0]/10 text-[#8870F0]">
          <span className="material-symbols-outlined text-[14px]">replay</span>
          Ticket Reopened
        </span>
      );
    }
    if (act.includes('close') || act.includes('signoff')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-status-resolved/10 text-status-resolved">
          <span className="material-symbols-outlined text-[14px]">verified</span>
          Closed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-canvas-lavender text-text-secondary">
        <span className="material-symbols-outlined text-[14px]">bolt</span>
        {action.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-canvas-default text-text-primary p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm text-text-muted">Audit & Governance</span>
            <span className="text-text-muted text-[12px]">•</span>
            <span className="font-label-sm text-label-sm text-text-muted">
              {lastFetchedAt ? `Updated ${lastFetchedAt}` : 'Activity Stream'}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary">
            System Activity Logs
          </h1>
          <p className="font-body-md text-body-md text-text-secondary mt-0.5">
            Chronological audit trail of ticket state transitions and modifications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-canvas-lavender border border-primary/20 text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">domain</span>
            <span>Organization Scoped</span>
          </div>

          <button
            onClick={() => setIsExportOpen(true)}
            type="button"
            className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all transform active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* ── 2. Four KPI Cards (Truthful database metrics F-04) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 24h Event Volume */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="font-label-sm text-label-sm">24h Event Volume</span>
            <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-text-primary">
            {kpis.event_volume_24h.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-1 font-medium">
            {kpis.event_volume_delta_pct !== null ? (
              <span className={`flex items-center gap-1 ${kpis.event_volume_delta_pct >= 0 ? 'text-status-resolved font-semibold' : 'text-text-secondary'}`}>
                <span className="material-symbols-outlined text-[14px]">
                  {kpis.event_volume_delta_pct >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span>{kpis.event_volume_delta_pct > 0 ? `+${kpis.event_volume_delta_pct}%` : `${kpis.event_volume_delta_pct}%`} vs prev 24h</span>
              </span>
            ) : (
              <span>No comparison data</span>
            )}
          </div>
        </div>

        {/* Escalations & Severities */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="font-label-sm text-label-sm">Escalations</span>
            <span className="material-symbols-outlined text-[18px] text-severity-critical">warning</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-severity-critical">
            {kpis.escalations_count}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {kpis.escalations_count > 0 ? 'Severity changes logged (24h)' : 'No escalations (24h)'}
          </div>
        </div>

        {/* Sign-Off Events */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="font-label-sm text-label-sm">Resolution & Closes</span>
            <span className="material-symbols-outlined text-[18px] text-status-resolved">task_alt</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-status-resolved">
            {kpis.signoffs_count}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {kpis.signoffs_count > 0 ? 'Tickets closed (24h)' : 'No tickets closed (24h)'}
          </div>
        </div>

        {/* Automated Ingests */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1">
            <span className="font-label-sm text-label-sm">Automated Ingests</span>
            <span className="material-symbols-outlined text-[18px] text-text-muted">smart_toy</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-text-muted">
            {kpis.automated_ingests_count !== null && kpis.automated_ingests_count !== undefined
              ? kpis.automated_ingests_count
              : 'N/A'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {kpis.automated_ingests_count !== null && kpis.automated_ingests_count !== undefined ? (
              <span><strong className="text-text-primary">{kpis.automated_ingests_pct}%</strong> automated events</span>
            ) : (
              <span>Not available — event source metadata not recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Activity Notice Banner (Truthful F-10) ── */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-canvas-lavender text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">history</span>
          </div>
          <div>
            <h3 className="font-label-md text-label-md font-bold text-text-primary">
              Organization Activity History
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Chronological record of status changes, reassignments, and updates across organization tickets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-canvas-default px-3 py-1.5 rounded-lg border border-border-subtle font-mono text-xs text-text-secondary">
          <span className="text-text-muted">Total Events:</span>
          <span className="font-bold text-primary">{total}</span>
        </div>
      </div>

      {/* ── 4. Filter Toolbar (With real Actor selector F-12) ── */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket ID, description, or actor..."
              className="w-full pl-9 pr-3 py-2 bg-canvas-default border border-border-subtle rounded-lg font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time Window */}
            <select
              value={timeHorizon}
              onChange={(e) => {
                setTimeHorizon(e.target.value);
                setPage(1);
              }}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-2 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="7d">Last 7 Days</option>
              <option value="today">Today (24h)</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            {/* Event Type */}
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value);
                setPage(1);
              }}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-2 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Event Types</option>
              <option value="status_change">Status Changes</option>
              <option value="severity_change">Severity Escalations</option>
              <option value="reassign">Reassignments</option>
              <option value="deadline_change">Deadline Changes</option>
              <option value="ticket_reopen">Reopen Events</option>
              <option value="ticket_closed">Close Events</option>
            </select>

            {/* Severity */}
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-2 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Severities</option>
              <option value="blocker">Blocker (P0)</option>
              <option value="critical">Critical (P1)</option>
              <option value="major">Major (P2)</option>
              <option value="minor">Minor (P3)</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-2 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="wip">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Actor Filter (Real backend data F-12) */}
            <select
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                setPage(1);
              }}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-2 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary max-w-[150px] truncate"
            >
              <option value="all">All Actors</option>
              {actorsList.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.full_name || act.email}
                </option>
              ))}
            </select>

            <button
              onClick={handleResetFilters}
              type="button"
              className="p-2 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary transition-colors"
              title="Reset Filters"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Audit Ledger Table ── */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas-default border-b border-border-subtle text-text-muted font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-5">Date & Time (UTC)</th>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-5">Authorized Actor</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-6">Description</th>
                <th className="py-3 px-4">Previous Value</th>
                <th className="py-3 px-4">New Value</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-body-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <span>Loading activity records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    <span className="material-symbols-outlined text-[36px] text-text-muted/60 block mb-2">
                      inbox
                    </span>
                    No activity records found matching the current criteria.
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-canvas-lavender/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-5 font-mono text-xs text-text-secondary whitespace-nowrap">
                      {formatUtcTimestamp(log.created_at)}
                    </td>

                    {/* Ticket */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.ticket_id ? (
                        <Link
                          to={`/workspace/tickets/${log.ticket_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-bold text-primary hover:underline"
                        >
                          {log.ticket_number}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-text-muted">{log.ticket_number}</span>
                      )}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-canvas-lavender flex items-center justify-center font-bold text-primary text-[10px] flex-shrink-0">
                          {log.actor?.avatar_url ? (
                            <img
                              src={log.actor.avatar_url}
                              alt={log.actor.full_name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            (log.actor?.full_name || 'Sys').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-text-primary text-xs">
                          {log.actor?.full_name || 'System'}
                        </span>
                      </div>
                    </td>

                    {/* Event Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getEventTypePill(log.event_type)}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-6 text-text-primary text-xs max-w-xs truncate" title={log.description}>
                      {log.description}
                    </td>

                    {/* Previous Value */}
                    <td className="py-3.5 px-4 font-mono text-xs text-text-muted whitespace-nowrap">
                      {log.previous_value || '—'}
                    </td>

                    {/* New Value */}
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-text-primary whitespace-nowrap">
                      {log.new_value || '—'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLogId(log.id);
                        }}
                        type="button"
                        className="px-2.5 py-1 rounded-md text-xs font-medium text-primary hover:bg-canvas-lavender transition-colors inline-flex items-center gap-1"
                      >
                        <span>View Detail</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. Pagination Footer ── */}
        <div className="p-4 border-t border-border-subtle bg-canvas-default flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <span>
              Showing {total > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(page * pageSize, total)} of {total} records
            </span>
            <span className="text-text-muted">•</span>
            <div className="flex items-center gap-1">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-surface-card border border-border-subtle rounded px-2 py-0.5 font-mono text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              type="button"
              className="p-1 rounded border border-border-subtle hover:bg-canvas-lavender disabled:opacity-40 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="font-semibold text-text-primary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              type="button"
              className="p-1 rounded border border-border-subtle hover:bg-canvas-lavender disabled:opacity-40 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 7. Drawer & Dialog Integrations ── */}
      <LogDetailDrawer
        logId={selectedLogId}
        isOpen={Boolean(selectedLogId)}
        onClose={() => setSelectedLogId(null)}
      />

      <AuditExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultTimeHorizon={timeHorizon}
      />
    </div>
  );
};

export default SystemActivityLogsPage;
