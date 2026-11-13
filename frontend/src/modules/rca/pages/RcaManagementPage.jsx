import React, { useState, useEffect } from 'react';
import { rcaService } from '../services/rcaService';
import ticketsService from '../../../services/ticketsService';
import { authService, DEFAULT_USER } from '../../../services/api';

export const RcaManagementPage = () => {
  const [rcas, setRcas] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUserSync());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form state
  const [ticketId, setTicketId] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rcaList, ticketList, user] = await Promise.all([
        rcaService.list().catch(() => []),
        ticketsService.getTickets().catch(() => []),
        authService.getCurrentUser().catch(() => DEFAULT_USER),
      ]);
      setRcas(rcaList);
      setTickets(ticketList);
      if (user) setCurrentUser(user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRca = async (e) => {
    e.preventDefault();
    if (!ticketId || !rootCause.trim() || !preventiveAction.trim()) {
      setFormError('Please select a ticket, root cause, and preventative action.');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      await rcaService.create({
        ticket_id: ticketId,
        root_cause: rootCause.trim(),
        preventive_action: preventiveAction.trim(),
        timeline: timeline.trim() || null,
        status: 'draft',
      });
      setIsModalOpen(false);
      setTicketId('');
      setRootCause('');
      setPreventiveAction('');
      setTimeline('');
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to submit RCA report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await rcaService.approve(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to approve RCA');
    }
  };

  const filteredRcas = rcas.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      (r.root_cause && r.root_cause.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.ticket_id && r.ticket_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || (r.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canApprove = ['owner', 'admin', 'lead'].includes((currentUser?.role || '').toLowerCase());

  return (
    <div className="flex flex-col gap-space-lg p-space-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[28px] text-primary">assessment</span>
            <h1 className="font-headline-lg text-headline-lg text-text-primary">
              Root Cause Analysis (RCA)
            </h1>
          </div>
          <p className="font-body-md text-body-md text-text-secondary mt-1">
            Standardized incident post-mortems, 5-Whys methodology, and preventative mitigation tracking
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-space-sm px-space-md py-2.5 rounded-xl bg-btn-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-95 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Draft Post-Mortem</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md bg-surface-card p-space-md rounded-xl border border-border-subtle shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search RCAs by root cause or ticket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-canvas-main border border-border-subtle text-text-primary placeholder:text-text-muted font-body-sm text-body-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'DRAFT', 'UNDER_REVIEW', 'APPROVED'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-btn-primary text-on-primary'
                  : 'bg-canvas-main text-text-secondary hover:text-text-primary'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 font-body-md text-text-secondary">Loading RCA records...</span>
        </div>
      ) : filteredRcas.length === 0 ? (
        <div className="bg-surface-card rounded-2xl p-12 border border-border-subtle text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-canvas-lavender flex items-center justify-center text-primary mb-4">
            <span className="material-symbols-outlined text-[32px]">verified</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-text-primary">No RCA records found</h3>
          <p className="font-body-sm text-body-sm text-text-secondary max-w-md mt-1">
            All resolved critical incidents have met stability metrics or need post-mortems logged.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-btn-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-95"
          >
            Create New RCA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-space-md">
          {filteredRcas.map((rca) => {
            const isApproved = (rca.status || '').toLowerCase() === 'approved';
            return (
              <div
                key={rca.id}
                className="bg-surface-card p-space-lg rounded-2xl border border-border-subtle shadow-sm flex flex-col gap-space-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="px-2.5 py-1 rounded-md bg-canvas-lavender text-primary font-mono text-[12px] font-bold">
                      Ticket {rca.ticket_id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold capitalize ${
                        isApproved
                          ? 'bg-status-resolved/15 text-status-resolved'
                          : 'bg-status-on-hold/15 text-status-on-hold'
                      }`}
                    >
                      {rca.status || 'draft'}
                    </span>
                  </div>

                  {canApprove && !isApproved && (
                    <button
                      type="button"
                      onClick={() => handleApprove(rca.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-resolved text-white font-label-sm text-label-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Approve RCA</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  <div className="space-y-1">
                    <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider">
                      Identified Root Cause
                    </h4>
                    <p className="font-body-md text-body-md text-text-primary whitespace-pre-wrap">
                      {rca.root_cause}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-label-md text-label-md text-text-muted uppercase tracking-wider">
                      Preventative & Corrective Action
                    </h4>
                    <p className="font-body-md text-body-md text-text-primary whitespace-pre-wrap">
                      {rca.preventive_action}
                    </p>
                  </div>
                </div>

                {rca.timeline && (
                  <div className="pt-space-sm border-t border-border-subtle">
                    <h4 className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider mb-1">
                      Timeline of Events
                    </h4>
                    <p className="font-body-sm text-body-sm text-text-secondary whitespace-pre-wrap font-mono text-[13px]">
                      {rca.timeline}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RCA Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-surface-card rounded-2xl shadow-2xl border border-border-subtle p-space-xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-border-subtle">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">flag</span>
                <h3 className="font-headline-md text-headline-md text-text-primary">
                  New Incident Post-Mortem (RCA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-muted hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-severity-blocker/10 border border-severity-blocker/20 text-severity-blocker font-body-sm text-body-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRca} className="flex flex-col gap-space-md">
              <div className="space-y-1">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Associated Ticket *
                </label>
                <select
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-primary"
                  required
                >
                  <option value="">Select ticket to link RCA...</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticket_number} — {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Root Cause Analysis (5-Whys) *
                </label>
                <textarea
                  rows={3}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Detail the failure chain and architectural breakdown..."
                  className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Preventative Mitigation & Runbook Updates *
                </label>
                <textarea
                  rows={3}
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  placeholder="Steps to eliminate recurrence (guardrails, circuit breakers, alarms)..."
                  className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Incident Timeline (Optional)
                </label>
                <textarea
                  rows={2}
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g. 14:02 UTC Alert fired | 14:15 Failover initiated | 14:28 Traffic normalized"
                  className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle text-text-primary font-body-sm text-body-sm font-mono text-[12px] focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border-subtle font-label-md text-label-md text-text-secondary hover:bg-canvas-lavender"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-btn-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-95 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish RCA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RcaManagementPage;
