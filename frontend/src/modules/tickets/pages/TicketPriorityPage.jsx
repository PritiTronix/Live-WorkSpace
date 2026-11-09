import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketsService } from '../../../services/ticketsService';
import TicketViewSwitcher from '../components/TicketViewSwitcher';
import CreateTicketModal from '../components/CreateTicketModal';
import { STATUS_CONFIG, SEVERITY_CONFIG, TICKET_SEVERITIES } from '../constants/ticketConstants';

export const TicketPriorityPage = () => {
  const navigate = useNavigate();
  const [groupedTickets, setGroupedTickets] = useState({
    blocker: [],
    critical: [],
    major: [],
    minor: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [autoTriageActive, setAutoTriageActive] = useState(true);
  const [silenced, setSilenced] = useState(false);

  // Load Priority Data
  const fetchPriority = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketsService.getPriority();
      setGroupedTickets({
        blocker: data.blocker || [],
        critical: data.critical || [],
        major: data.major || [],
        minor: data.minor || [],
      });
    } catch (err) {
      console.error('Failed to load priority tickets:', err);
      setError('Unable to load priority view. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriority();
  }, [fetchPriority]);

  // WebSocket Live Real-Time Updates
  useEffect(() => {
    const ws = ticketsService.createTicketsWebSocket('org_01', (event) => {
      if (['ticket_created', 'ticket_updated', 'ticket_deleted', 'ticket_comment_added'].includes(event.type)) {
        fetchPriority();
      }
    });
    return () => {
      if (ws) ws.close();
    };
  }, [fetchPriority]);

  // Calculate Breaches & Stats
  const now = new Date();
  const breachedCount = useMemo(() => {
    return Object.values(groupedTickets).flat().filter(ticket => {
      if (['resolved', 'closed'].includes(ticket.status)) return false;
      return ticket.deadline && new Date(ticket.deadline) < now;
    }).length;
  }, [groupedTickets, now]);

  const blockerCount = groupedTickets.blocker?.length || 0;

  // Filtered tickets by search
  const filteredGroupedTickets = useMemo(() => {
    if (!searchQuery.trim()) return groupedTickets;
    const query = searchQuery.toLowerCase();
    const result = {};
    for (const [severity, list] of Object.entries(groupedTickets)) {
      result[severity] = list.filter(t =>
        (t.ticket_number && t.ticket_number.toLowerCase().includes(query)) ||
        (t.title && t.title.toLowerCase().includes(query)) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }
    return result;
  }, [groupedTickets, searchQuery]);

  // Quick ticket created handler
  const handleTicketCreated = () => {
    fetchPriority();
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-canvas-main pb-space-2xl">
      <div className="px-space-xl py-space-lg flex flex-col gap-space-lg">
        {/* Header & View Switcher */}
        <TicketViewSwitcher
          search={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
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
          </div>

          <div className="flex items-center gap-space-sm">
            <span className="text-body-sm text-text-secondary">
              Total High Severity: <strong>{blockerCount + (groupedTickets.critical?.length || 0)}</strong>
            </span>
          </div>
        </div>

        {/* Real-time SLA Breach Alert Banner */}
        {breachedCount > 0 && !silenced && (
          <div className="bg-gradient-to-r from-surface-card via-canvas-lavender to-surface-card rounded-xl p-space-md shadow-sm border border-severity-blocker/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-error-container text-severity-blocker flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-2xl">
                  emergency_home
                </span>
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
                className="h-9 px-3 bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-sm text-label-sm rounded-lg shadow-sm transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">notifications_paused</span>
                <span>Silence Alert</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const firstBlocker = groupedTickets.blocker[0];
                  if (firstBlocker) navigate(`/workspace/tickets/${firstBlocker.id}`);
                }}
                className="h-9 px-3 bg-severity-blocker text-on-error font-label-sm text-label-sm rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">video_call</span>
                <span>Join Incident Room</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <span className="material-symbols-outlined text-4xl animate-spin text-btn-primary mb-3">sync</span>
            <p className="font-label-md text-label-md">Loading priority matrix...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-space-lg bg-surface-card rounded-xl text-center space-y-3 border border-border-subtle">
            <span className="material-symbols-outlined text-4xl text-severity-blocker">error</span>
            <p className="font-body-md text-body-md text-text-primary">{error}</p>
            <button
              onClick={fetchPriority}
              className="px-4 py-2 bg-btn-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Priority Swimlanes */}
        {!loading && !error && (
          <div className="flex flex-col gap-space-xl">
            {TICKET_SEVERITIES.map((severityKey) => {
              const config = SEVERITY_CONFIG[severityKey];
              const tickets = filteredGroupedTickets[severityKey] || [];

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
                        {tickets.length} Active
                      </span>
                      <span className="hidden sm:inline font-body-sm text-body-sm text-text-muted">
                        | {config.subtext}
                      </span>
                    </div>
                  </div>

                  {/* Cards Container */}
                  {tickets.length === 0 ? (
                    <div className="p-6 bg-surface-card rounded-xl border border-dashed border-border-subtle text-center text-text-muted font-body-sm">
                      No active tickets in {config.label.toLowerCase()} tier.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-space-sm">
                      {tickets.map((ticket) => {
                        const statusBadge = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                        const isBreached = ticket.deadline && new Date(ticket.deadline) < now && !['resolved', 'closed'].includes(ticket.status);

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
                                  {ticket.ticket_number}
                                </span>
                                <span className="font-label-sm text-label-sm text-text-muted mt-0.5 truncate max-w-28">
                                  {ticket.project?.title || 'Core Ops'}
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
