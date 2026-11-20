import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import TicketViewSwitcher from '../components/TicketViewSwitcher';
import CreateTicketModal from '../components/CreateTicketModal';
import { STATUS_CONFIG, SEVERITY_CONFIG, TICKET_STATUSES } from '../constants/ticketConstants';
import ErrorState from '../../design-system/components/ErrorState';
import Avatar from '../../../components/common/Avatar';

/**
 * Screen 62: Ticket Board View (Prompt 38)
 * Visual Reference: Stitch Screen 62 (`38c0cd47fa204ab99dddc8bd1cf2748a`)
 * Route: `/workspace/tickets/board`
 */
export const TicketBoardPage = () => {
  const navigate = useNavigate();

  const {
    boardTickets,
    loading,
    error,
    isRetrying,
    isWsConnected,
    actionError,
    setActionError,
    search,
    setSearch,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    updateTicketStatus,
    refetch,
  } = useTickets();

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedTicketId, setDraggedTicketId] = useState(null);

  const columns = TICKET_STATUSES.map((key) => ({
    key,
    label: STATUS_CONFIG[key]?.label || key,
    color: STATUS_CONFIG[key]?.dot || 'bg-outline',
  }));

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

    setDraggedTicketId(null);
    await updateTicketStatus(ticketId, targetStatus);
  };

  return (
    <div className="p-space-lg max-w-7xl mx-auto w-full space-y-space-lg">
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

      {/* Action Error Banner (e.g. Drag & Drop failure / rollback notice) */}
      {actionError && (
        <div className="bg-error-container/80 text-on-error-container p-3 sm:p-4 rounded-xl flex items-center justify-between gap-3 border border-error/30 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-severity-blocker text-lg">error</span>
            <span className="font-body-sm text-xs sm:text-body-sm font-medium">{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 font-body-md text-text-secondary">Loading ticket board...</span>
        </div>
      ) : error ? (
        <div className="bg-surface-card rounded-xl p-6 border border-border-subtle/50">
          <ErrorState
            variant="500"
            title="Unable to Load Ticket Board"
            description={error}
            onRetry={() => refetch(true)}
            isRetrying={isRetrying}
          />
        </div>
      ) : (
        /* 5 Kanban Columns Container: Smooth Horizontal Scroll on mobile/tablet, 5-col Grid on Desktop */
        <div className="flex overflow-x-auto pb-4 gap-space-md xl:grid xl:grid-cols-5 xl:overflow-x-visible items-start">
          {columns.map((col) => {
            const colTickets = boardTickets[col.key] || [];

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className="w-[280px] sm:w-[320px] shrink-0 xl:w-auto xl:shrink bg-canvas-main/80 rounded-xl p-space-md flex flex-col gap-space-sm min-h-96 border border-border-subtle/50 transition-colors hover:bg-canvas-lavender/30"
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
                      const sevKey = (t.severity || '').toLowerCase();
                      const isBlocker = sevKey === 'blocker';
                      const sev = SEVERITY_CONFIG[sevKey] || SEVERITY_CONFIG.minor;

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
                              {t.assignee && (
                                <Avatar
                                  src={t.assignee.avatar_url}
                                  name={t.assignee.full_name}
                                  size="xs"
                                  ring="ring-1 ring-border-subtle"
                                />
                              )}
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
          onTicketCreated={() => refetch()}
        />
      )}
    </div>
  );
};

export default TicketBoardPage;
