import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ticketsService, { createTicketsWebSocket } from '../../../services/ticketsService';
import TicketViewSwitcher from '../components/TicketViewSwitcher';
import CreateTicketModal from '../components/CreateTicketModal';
import { STATUS_CONFIG, SEVERITY_CONFIG, TICKET_STATUSES } from '../constants/ticketConstants';

/**
 * Screen 62: Ticket Board View (Prompt 38)
 * Visual Reference: Stitch Screen 62 (`38c0cd47fa204ab99dddc8bd1cf2748a`)
 * Route: `/workspace/tickets/board`
 */
export const TicketBoardPage = () => {
  const navigate = useNavigate();

  const [board, setBoard] = useState({
    open: [],
    wip: [],
    on_hold: [],
    resolved: [],
    closed: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedTicketId, setDraggedTicketId] = useState(null);

  const columns = TICKET_STATUSES.map(key => ({
    key,
    label: STATUS_CONFIG[key].label,
    color: STATUS_CONFIG[key].dot,
  }));

  const fetchBoard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketsService.getBoard({
        search: search.trim() || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
      });
      setBoard(data || {});
    } catch (err) {
      console.error('Failed to load ticket board:', err);
      setError(err.message || 'Failed to load ticket board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [search, severityFilter]);

  // Real-time updates
  useEffect(() => {
    const cleanup = createTicketsWebSocket('org_01', (payload) => {
      if (['ticket_created', 'ticket_updated', 'ticket_status_changed', 'ticket_deleted'].includes(payload.event)) {
        fetchBoard();
      }
    });
    return cleanup;
  }, []);

  // Drag and drop handlers
  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('text/plain', ticketId);
    setDraggedTicketId(ticketId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain') || draggedTicketId;
    if (!ticketId) return;

    // Optimistic UI update
    setBoard((prev) => {
      let foundTicket = null;
      const updated = {};

      // Remove ticket from source
      for (const [colKey, ticketsList] of Object.entries(prev)) {
        const remaining = [];
        for (const t of ticketsList) {
          if (t.id === ticketId) {
            foundTicket = { ...t, status: targetStatus };
          } else {
            remaining.push(t);
          }
        }
        updated[colKey] = remaining;
      }

      // Add to target column
      if (foundTicket && updated[targetStatus]) {
        updated[targetStatus] = [foundTicket, ...updated[targetStatus]];
      }

      return updated;
    });

    setDraggedTicketId(null);

    try {
      await ticketsService.updateTicket(ticketId, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update status on drop:', err);
      fetchBoard(); // rollback
    }
  };

  return (
    <div className="p-space-lg max-w-7xl mx-auto w-full space-y-space-lg">
      <TicketViewSwitcher
        search={search}
        onSearchChange={setSearch}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        onOpenCreateModal={() => setShowCreateModal(true)}
      />

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 font-body-md text-text-secondary">Loading ticket board...</span>
        </div>
      ) : (
        /* 5 Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-space-md items-start overflow-x-auto pb-4">
          {columns.map((col) => {
            const colTickets = board[col.key] || [];

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className="bg-canvas-main/80 rounded-xl p-space-md flex flex-col gap-space-sm min-h-96 border border-border-subtle/50 transition-colors hover:bg-canvas-lavender/30"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <span className="font-headline-sm text-headline-sm text-text-primary font-bold">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-card text-text-secondary font-label-sm text-label-sm font-semibold shadow-xs">
                      {colTickets.length}
                    </span>
                  </div>
                </div>

                {/* Cards Stack */}
                <div className="flex flex-col gap-space-sm pt-space-xs">
                  {colTickets.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-border-subtle/80 rounded-xl">
                      <span className="font-body-sm text-xs text-text-muted">No tickets</span>
                    </div>
                  ) : (
                    colTickets.map((t) => {
                      const isBlocker = t.severity === 'blocker';
                      const sev = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.minor;

                      return (
                        <article
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onClick={() => navigate(`/workspace/tickets/${t.id}`)}
                          className="bg-surface-card p-space-md rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-space-sm border border-border-subtle/50 hover:border-primary-light group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-text-muted text-xs">
                              {t.ticket_number}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase border ${sev.bgBadge} ${sev.textBadge}`}>
                              {sev.shortLabel}
                            </span>
                          </div>

                          <h3 className="font-headline-sm text-sm text-text-primary group-hover:text-primary transition-colors leading-snug font-semibold line-clamp-2">
                            {t.title}
                          </h3>

                          <div className="pt-space-xs flex items-center justify-between mt-auto border-t border-border-subtle/40">
                            <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-primary font-mono text-xs font-bold">
                              {t.project?.key || 'PLTFRM'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {isBlocker && (
                                <span className="material-symbols-outlined text-severity-blocker text-base animate-pulse">
                                  warning
                                </span>
                              )}
                              <img
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-border-subtle"
                                src={t.assignee?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAmt0YGYVVOxPr4ec8yeLMlH3eFipVV14C1qMrM6ZWl_Q3CsXSe8erXqQl5aoC-hylXdMtlpm7vAxewtZVSavdi540cHwdI20sNUsCMCCuak-zOLUoAcw0tZ70DFuiIx8Gb3wEnQn4Dk5w51h-GTXmS7PCFEawLwniAxRH1k2msgs1oH4D8Wa8mKn_ucl6LFJ6K4rpqwTBjlPjHt5Cq9qIpjIgWgzOnHZ7pEjeLmA8W"}
                                alt=""
                              />
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onTicketCreated={() => fetchBoard()}
        />
      )}
    </div>
  );
};

export default TicketBoardPage;
