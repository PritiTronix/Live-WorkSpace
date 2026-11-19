/**
 * useTickets — Unified hook for tickets data management, filtering, and real-time updates.
 * Provides a single shared source of truth for:
 * - TicketsDashboardPage (List View)
 * - TicketBoardPage (Board View)
 * - TicketPriorityPage (Priority View)
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ticketsService, { createTicketsWebSocket } from '../../../services/ticketsService';
import { authService, getApiErrorMessage } from '../../../services/api';
import { TICKET_STATUSES, TICKET_SEVERITIES } from '../constants/ticketConstants';

export const useTickets = ({
  initialSearch = '',
  initialSeverity = 'all',
  initialStatus = 'all',
  initialSla = 'all',
  autoConnectWs = true,
} = {}) => {
  const [search, setSearch] = useState(initialSearch);
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [slaFilter, setSlaFilter] = useState(initialSla);

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [actionError, setActionError] = useState(null);

  const wsCleanupRef = useRef(null);

  // Unified fetch function
  const fetchTicketsData = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) {
        setIsRetrying(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (severityFilter !== 'all') params.severity = severityFilter.toLowerCase();
      if (statusFilter !== 'all') params.status = statusFilter.toLowerCase();
      if (slaFilter !== 'all') params.sla = slaFilter.toLowerCase();

      const [statsData, ticketsData] = await Promise.all([
        ticketsService.getStats().catch((err) => {
          console.warn('Failed to load ticket stats:', err);
          return null;
        }),
        ticketsService.getTickets(params),
      ]);

      const items = Array.isArray(ticketsData) ? ticketsData : (ticketsData?.items || []);
      setTickets(items);

      if (statsData) {
        setStats(statsData);
      } else {
        // Fallback computation from tickets if stats endpoint fails
        const total = items.length;
        const open = items.filter((t) => (t.status || '').toLowerCase() === 'open').length;
        const wip = items.filter((t) => ['wip', 'in_progress'].includes((t.status || '').toLowerCase())).length;
        const on_hold = items.filter((t) => (t.status || '').toLowerCase() === 'on_hold').length;
        const resolved = items.filter((t) => (t.status || '').toLowerCase() === 'resolved').length;
        const closed = items.filter((t) => (t.status || '').toLowerCase() === 'closed').length;
        const sla_breached = items.filter((t) => t.is_breached).length;

        setStats({ total, open, wip, on_hold, resolved, closed, sla_breached });
      }
    } catch (err) {
      console.error('Failed to load tickets data:', err);
      setError(getApiErrorMessage(err, 'Failed to load tickets.'));
      setTickets([]);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [search, severityFilter, statusFilter, slaFilter]);

  useEffect(() => {
    fetchTicketsData();
  }, [fetchTicketsData]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!autoConnectWs) return;

    let isMounted = true;

    const connectWs = async () => {
      try {
        const user = await authService.getCurrentUser().catch(() => authService.getCurrentUserSync());
        const orgId =
          user?.organization_id ||
          localStorage.getItem('organization_id') ||
          localStorage.getItem('active_workspace_id');

        if (!isMounted) return;

        if (!orgId) {
          setIsWsConnected(false);
          return;
        }

        wsCleanupRef.current = createTicketsWebSocket(
          orgId,
          (payload) => {
            const eventType = payload?.event || payload?.type;
            if (
              [
                'ticket_created',
                'ticket_updated',
                'ticket_status_changed',
                'ticket_severity_changed',
                'ticket_deleted',
                'ticket_comment_added',
              ].includes(eventType)
            ) {
              fetchTicketsData();
            }
          },
          (connected) => {
            if (isMounted) {
              setIsWsConnected(connected);
            }
          }
        );
      } catch (err) {
        console.warn('Failed to establish tickets WebSocket:', err);
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (wsCleanupRef.current) {
        if (typeof wsCleanupRef.current === 'function') {
          wsCleanupRef.current();
        } else if (typeof wsCleanupRef.current.close === 'function') {
          wsCleanupRef.current.close();
        }
        wsCleanupRef.current = null;
      }
    };
  }, [autoConnectWs, fetchTicketsData]);

  // Group tickets by status for Board View (using lowercase enum values)
  const boardTickets = useMemo(() => {
    const groups = {};
    for (const st of TICKET_STATUSES) {
      groups[st] = [];
    }
    for (const t of tickets) {
      const st = (t.status || '').toLowerCase();
      if (groups[st]) {
        groups[st].push(t);
      } else {
        groups.open.push(t);
      }
    }
    return groups;
  }, [tickets]);

  // Group tickets by severity for Priority View (using lowercase enum values)
  const priorityTickets = useMemo(() => {
    const groups = {};
    for (const sev of TICKET_SEVERITIES) {
      groups[sev] = [];
    }
    for (const t of tickets) {
      const sev = (t.severity || '').toLowerCase();
      if (groups[sev]) {
        groups[sev].push(t);
      } else {
        groups.major.push(t);
      }
    }
    return groups;
  }, [tickets]);

  // Optimistic status update with automatic rollback on error
  const updateTicketStatus = useCallback(async (ticketId, targetStatus) => {
    const normalizedTarget = (targetStatus || '').toLowerCase();
    if (!TICKET_STATUSES.includes(normalizedTarget)) {
      setActionError(`Invalid status: ${targetStatus}`);
      return false;
    }

    let previousTickets = null;
    setTickets((prev) => {
      previousTickets = prev;
      return prev.map((t) => (t.id === ticketId ? { ...t, status: normalizedTarget } : t));
    });
    setActionError(null);

    try {
      await ticketsService.updateTicket(ticketId, { status: normalizedTarget });
      return true;
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      // Revert optimistic update
      if (previousTickets) {
        setTickets(previousTickets);
      }
      const errMsg =
        err.response?.data?.detail || err.message || 'Failed to update ticket status. Changes reverted.';
      setActionError(errMsg);
      return false;
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSeverityFilter('all');
    setStatusFilter('all');
    setSlaFilter('all');
  }, []);

  return {
    tickets,
    stats,
    boardTickets,
    priorityTickets,
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
    slaFilter,
    setSlaFilter,
    updateTicketStatus,
    fetchTicketsData,
    refetch: fetchTicketsData,
    resetFilters,
  };
};

export default useTickets;
