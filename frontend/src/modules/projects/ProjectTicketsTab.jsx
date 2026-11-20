import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext, useNavigate, Link } from 'react-router-dom';
import ticketsService from '../../services/ticketsService';
import CreateTicketModal from '../tickets/components/CreateTicketModal';
import Avatar from '../../components/common/Avatar';

const SEVERITY_COLORS = {
  blocker: 'bg-severity-blocker/15 text-severity-blocker border-severity-blocker/30',
  critical: 'bg-severity-critical/15 text-severity-critical border-severity-critical/30',
  major: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  minor: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

const STATUS_COLORS = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  wip: 'bg-purple-50 text-btn-primary border-purple-200',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * Screen 40 / Tickets Tab: Project Workspace Tickets
 * Lists all tickets scoped to this project with search, filters, and a direct "File Ticket" entry point.
 * Route: `/workspace/projects/:id/tickets`
 */
export const ProjectTicketsTab = () => {
  const { id } = useParams();
  const outletContext = useOutletContext();
  const onProjectUpdated = outletContext?.onProjectUpdated;
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchTickets = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await ticketsService.getTickets({ project_id: id });
      const items = Array.isArray(res) ? res : res?.items || res?.tickets || [];
      setTickets(items);
    } catch (err) {
      console.error('Failed to load project tickets:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      !search ||
      (t.title && t.title.toLowerCase().includes(search.toLowerCase())) ||
      (t.ticket_number && t.ticket_number.toLowerCase().includes(search.toLowerCase()));
    const matchesSeverity = severityFilter === 'all' || (t.severity && t.severity.toLowerCase() === severityFilter);
    const matchesStatus = statusFilter === 'all' || (t.status && t.status.toLowerCase() === statusFilter);
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-space-md">
      {/* Action Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle/50">
        <div className="flex flex-wrap items-center gap-space-sm flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search project tickets..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Severity Filter Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-canvas-main border border-border-subtle font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="blocker">Blocker</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-canvas-main border border-border-subtle font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="wip">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Primary Action Button: File Ticket for this project */}
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="h-9 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>File Ticket</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-surface-card rounded-xl p-12 shadow-sm border border-border-subtle/50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
          <span className="font-body-md text-text-secondary">Loading project tickets...</span>
        </div>
      ) : error ? (
        <div className="bg-surface-card rounded-xl p-8 shadow-sm border border-border-subtle/50 text-center flex flex-col items-center">
          <span className="material-symbols-outlined text-[36px] text-error mb-2">error</span>
          <h3 className="font-headline-sm text-headline-sm text-text-primary mb-1">Failed to load tickets</h3>
          <p className="font-body-sm text-text-secondary mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchTickets}
            className="px-4 py-2 rounded-lg bg-canvas-lavender text-primary hover:bg-primary/10 font-label-md text-label-md transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-surface-card rounded-xl p-12 shadow-sm border border-border-subtle/50 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-canvas-lavender flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px] text-primary">confirmation_number</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-text-primary mb-1">No Tickets Found</h3>
          <p className="font-body-md text-text-secondary max-w-md mb-6">
            {tickets.length === 0
              ? 'No tickets have been filed for this project yet. File an operational incident or request to start tracking.'
              : 'No tickets match the selected search or filter criteria.'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>File First Ticket</span>
          </button>
        </div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-canvas-main/40 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-canvas-lavender/30 transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-label-sm font-bold text-primary">
                      <Link
                        to={`/workspace/tickets/${ticket.id}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px] text-text-muted group-hover:text-primary transition-colors">
                          confirmation_number
                        </span>
                        {ticket.ticket_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <Link
                        to={`/workspace/tickets/${ticket.id}`}
                        className="font-label-md text-label-md text-text-primary hover:text-primary transition-colors line-clamp-1 block"
                      >
                        {ticket.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          SEVERITY_COLORS[ticket.severity?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {ticket.severity || 'unspecified'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          STATUS_COLORS[ticket.status?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {ticket.status || 'open'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={ticket.assignee.full_name}
                            avatarUrl={ticket.assignee.avatar_url}
                            size="sm"
                          />
                          <span className="font-body-sm text-body-sm text-text-primary truncate max-w-[120px]">
                            {ticket.assignee.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="font-body-sm text-body-sm text-text-muted italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-body-sm text-body-sm text-text-secondary whitespace-nowrap">
                      {ticket.deadline
                        ? new Date(ticket.deadline).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/workspace/tickets/${ticket.id}`)}
                        className="p-1 rounded hover:bg-canvas-lavender text-text-muted hover:text-primary transition-colors"
                        title="View details"
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Filing Ticket with THIS project pre-selected */}
      {showCreateModal && (
        <CreateTicketModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          defaultProjectId={id}
          onTicketCreated={(newTicket) => {
            setTickets((prev) => [newTicket, ...prev]);
            setShowCreateModal(false);
            if (onProjectUpdated) onProjectUpdated();
          }}
        />
      )}
    </div>
  );
};

export default ProjectTicketsTab;
