import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import TicketViewSwitcher from '../components/TicketViewSwitcher';
import CreateTicketModal from '../components/CreateTicketModal';
import { STATUS_CONFIG, SEVERITY_CONFIG, TICKET_SEVERITIES } from '../constants/ticketConstants';
import ErrorState from '../../design-system/components/ErrorState';

/**
 * Screen 63: Ticket Priority View (Prompt 39)
 * Visual Reference: Stitch Screen 63 (`976689d50e2c45f9945df80699e88b99`)
 * Route: `/workspace/tickets/priority`
 */
export const TicketPriorityPage = () => {
  const navigate = useNavigate();

  const {
    priorityTickets,
    tickets,
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
    resetFilters,
  } = useTickets();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [autoTriageActive, setAutoTriageActive] = useState(true);
  const [silenced, setSilenced] = useState(false);

  // Calculate Breaches & Stats from unified dataset
  const now = new Date();
  const breachedCount = useMemo(() => {
    return tickets.filter((ticket) => {
      if (!ticket || ['resolved', 'closed'].includes((ticket.status || '').toLowerCase())) return false;
      return ticket.deadline && new Date(ticket.deadline) < now;
    }).length;
  }, [tickets, now]);

  const blockerCount = priorityTickets.blocker?.length || 0;

  const totalVisibleTickets = useMemo(() => {
    return Object.values(priorityTickets).reduce((acc, list) => acc + (list?.length || 0), 0);
  }, [priorityTickets]);

  const handleTicketCreated = () => {
    refetch();
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-canvas-main pb-space-2xl">
      <div className="px-space-xl py-space-lg flex flex-col gap-space-lg">
        {/* Header & View Switcher */}
        <TicketViewSwitcher
          search={search}
          onSearchChange={setSearch}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          isWsConnected={isWsConnected}
        />

        {/* Operational Filter & Control Bar */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
          <div className="flex flex-wrap items-center gap-space-sm flex-1">
            {/* Live Triage Switch (Client state) */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-canvas-lavender rounded-lg shadow-sm">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="auto-priority-toggle"
                  className="sr-only peer"
                  checked={autoTriageActive}
                  onChange={(e) => setAutoTriageActive(e.target.checked)}
                />
                <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-btn-primary"></div>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-wip opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-wip"></span>
                </span>
                <span className="font-label-sm text-label-sm text-text-primary font-bold">Auto-Triage Active</span>
              </div>
            </div>

            {/* Quick Sort / Indicator */}
            <div className="px-3 py-2 bg-primary-fixed text-on-primary-fixed rounded-lg font-label-md text-label-md flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-base">swap_vert</span>
              <span>SLA Breached First</span>
            </div>

            {(search || severityFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary text-xs font-label-sm flex items-center gap-1 rounded-md hover:bg-canvas-lavender transition-colors"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-space-sm">
            <span className="text-body-sm text-text-secondary">
              Total High Severity: <strong>{blockerCount + (priorityTickets.critical?.length || 0)}</strong>
            </span>
          </div>
        </div>

        {/* Real-time SLA Breach Alert Banner */}
        {breachedCount > 0 && !silenced && (
          <div className="bg-gradient-to-r from-surface-card via-canvas-lavender to-surface-card rounded-xl p-space-md shadow-sm border border-severity-blocker/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-error-container text-severity-blocker flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-2xl">emergency_home</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-text-primary">
                    {breachedCount} Active SLA Breach{breachedCount > 1 ? 'es' : ''} Occurred
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-error-container text-severity-blocker font-label-sm text-label-sm font-bold animate-pulse">
                    ACTION REQUIRED
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  Resolution timeline exceeded response threshold. Escalation pipeline Tier-1/Tier-2 triggered automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-sm self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setSilenced(true)}
                className="px-3.5 py-2 text-text-secondary hover:text-text-primary font-label-md text-label-md rounded-lg transition-colors"
              >
                Silence Alarm
              </button>
              <button
                type="button"
                onClick={() => navigate('/workspace/tickets/critical')}
                className="px-4 py-2 bg-severity-blocker hover:opacity-90 text-on-error font-label-md text-label-md rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Launch War Room</span>
                <span className="material-symbols-outlined text-base">launch</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-16">
            <div className="w-10 h-10 border-4 border-canvas-lavender border-t-btn-primary rounded-full animate-spin"></div>
            <span className="mt-4 font-label-md text-label-md text-text-secondary">
              Loading real-time priority incidents...
            </span>
          </div>
        )}

        {/* Error Handling State with Retry */}
        {!loading && error && (
          <div className="my-8">
            <ErrorState
              variant="500"
              title="Unable to Load Priority Incidents"
              description={error}
              onRetry={() => refetch(true)}
              isRetrying={isRetrying}
            />
          </div>
        )}

        {/* Empty state when 0 tickets visible */}
        {!loading && !error && totalVisibleTickets === 0 && (
          <div className="p-12 bg-surface-card rounded-2xl border border-dashed border-border-subtle text-center flex flex-col items-center justify-center my-8">
            <div className="w-14 h-14 rounded-2xl bg-canvas-lavender text-btn-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-text-primary mb-2">No Priority Tickets</h3>
            <p className="font-body-md text-body-md text-text-secondary max-w-md mb-6">
              {search || severityFilter !== 'all' || statusFilter !== 'all'
                ? 'No tickets match the selected filters. Try clearing your filters.'
                : 'There are currently no tickets in the priority swimlanes for your workspace.'}
            </p>
            <div className="flex items-center gap-3">
              {(search || severityFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Create Ticket</span>
              </button>
            </div>
          </div>
        )}

        {/* Priority Swimlanes */}
        {!loading && !error && totalVisibleTickets > 0 && (
          <div className="flex flex-col gap-space-xl">
            {TICKET_SEVERITIES.map((severityKey) => {
              if (severityFilter !== 'all' && severityFilter !== severityKey) {
                return null;
              }

              const config = SEVERITY_CONFIG[severityKey];
              const tierTickets = priorityTickets[severityKey] || [];

              return (
                <section key={severityKey} className="flex flex-col gap-space-sm">
                  {/* Section Header */}
                  <div className="flex items-center justify-between px-space-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${config.stripeBg} text-white flex items-center justify-center shadow-sm`}>
                        <span className="material-symbols-outlined text-base">
                          {config.icon}
                        </span>
                      </div>
                      <h2 className="font-headline-md text-headline-md text-text-primary">{config.label}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full ${config.bgBadge} ${config.textBadge} font-label-sm text-label-sm font-bold`}>
                        {tierTickets.length} Active
                      </span>
                      <span className="hidden sm:inline font-body-sm text-body-sm text-text-muted">
                        | {config.subtext}
                      </span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  {tierTickets.length === 0 ? (
                    <div className="p-6 bg-surface-card rounded-xl border border-dashed border-border-subtle text-center text-text-muted font-body-sm">
                      No active tickets in {config.label.toLowerCase()} tier.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-space-sm">
                      {tierTickets.map((ticket) => {
                        const statusKey = (ticket.status || '').toLowerCase();
                        const statusBadge = STATUS_CONFIG[statusKey] || STATUS_CONFIG.open;
                        const isBreached =
                          ticket.deadline &&
                          new Date(ticket.deadline) < now &&
                          !['resolved', 'closed'].includes(statusKey);

                        return (
                          <div
                            key={ticket.id}
                            className="bg-surface-card rounded-xl p-space-md shadow-sm hover:shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md relative overflow-hidden transition-all group"
                          >
                            {/* Left Color Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.stripeBg}`}></div>

                            <div className="flex items-start gap-space-md pl-2 flex-1 min-w-0">
                              {/* Key Identifiers */}
                              <div className="flex flex-col shrink-0 min-w-24">
                                <span
                                  onClick={() => navigate(`/workspace/tickets/${ticket.id}`)}
                                  className={`font-mono font-bold text-label-md ${config.textBadge} cursor-pointer hover:underline`}
                                >
                                  {ticket.ticket_number || ticket.id}
                                </span>
                                <span className="font-label-sm text-label-sm text-text-muted mt-0.5 truncate max-w-28">
                                  {ticket.project?.name || ticket.project?.title || 'General'}
                                </span>
                              </div>

                              {/* Content and Summary */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {/* Severity Marker */}
                                  <span className={`px-2 py-0.5 rounded ${config.bgBadge} ${config.textBadge} font-label-sm text-label-sm flex items-center gap-1 font-bold uppercase`}>
                                    <span className="material-symbols-outlined text-xs">
                                      {severityKey === 'blocker' ? 'dangerous' : 'label'}
                                    </span>
                                    {config.shortLabel}
                                  </span>

                                  {/* Status Pill */}
                                  <span className={`px-2.5 py-0.5 rounded-full ${statusBadge.bg} ${statusBadge.text} font-label-sm text-label-sm font-semibold`}>
                                    {statusBadge.label}
                                  </span>

                                  {/* Breached Indicator */}
                                  {isBreached && (
                                    <span className="px-2 py-0.5 rounded bg-severity-blocker text-on-error font-mono font-bold text-label-sm text-label-sm flex items-center gap-1 animate-pulse">
                                      <span className="material-symbols-outlined text-xs">timer_off</span>
                                      BREACHED
                                    </span>
                                  )}
                                </div>

                                <h3
                                  onClick={() => navigate(`/workspace/tickets/${ticket.id}`)}
                                  className="font-headline-sm text-headline-sm text-text-primary truncate cursor-pointer hover:text-btn-primary transition-colors"
                                >
                                  {ticket.title}
                                </h3>

                                <p className="font-body-sm text-body-sm text-text-secondary line-clamp-1 mt-0.5">
                                  {ticket.description || 'No detailed technical replication report provided.'}
                                </p>
                              </div>
                            </div>

                            {/* Metadata, SLA & Actions */}
                            <div className="flex flex-wrap items-center gap-space-lg lg:shrink-0 w-full lg:w-auto justify-between lg:justify-end pl-2 lg:pl-0 pt-2 lg:pt-0">
                              {/* SLA Info */}
                              {ticket.deadline && (
                                <div className="flex items-center gap-3 bg-canvas-main p-2 rounded-lg">
                                  <div className="text-right">
                                    <div className="font-label-sm text-label-sm text-text-muted uppercase">Deadline</div>
                                    <div className="font-mono text-label-sm text-label-sm text-text-primary font-semibold">
                                      {new Date(ticket.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                  <div className="w-px h-6 bg-border-subtle"></div>
                                  <div className="text-left">
                                    <div className={`font-label-sm text-label-sm ${isBreached ? 'text-severity-blocker' : 'text-status-resolved'} uppercase font-bold`}>
                                      SLA State
                                    </div>
                                    <div className={`font-mono text-label-sm text-label-sm ${isBreached ? 'text-severity-blocker font-bold' : 'text-status-resolved font-semibold'}`}>
                                      {isBreached ? 'Breached' : 'Within Window'}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Assignee */}
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md font-bold flex items-center justify-center shrink-0">
                                  {ticket.assignee?.full_name ? ticket.assignee.full_name.slice(0, 2).toUpperCase() : 'UN'}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-label-sm text-label-sm text-text-primary font-bold">
                                    {ticket.assignee?.full_name || 'Unassigned'}
                                  </span>
                                  <span className="font-body-sm text-body-sm text-text-muted">
                                    {ticket.assignee?.role || 'Responder'}
                                  </span>
                                </div>
                              </div>

                              {/* Action Button */}
                              <button
                                type="button"
                                onClick={() => navigate(`/workspace/tickets/${ticket.id}`)}
                                className="h-9 px-3.5 bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-sm text-label-sm rounded-lg shadow-sm border border-border-subtle flex items-center gap-1.5 transition-colors"
                              >
                                <span>{config.actionText}</span>
                                <span className="material-symbols-outlined text-base">arrow_forward</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTicketCreated={handleTicketCreated}
      />
    </div>
  );
};

export default TicketPriorityPage;
