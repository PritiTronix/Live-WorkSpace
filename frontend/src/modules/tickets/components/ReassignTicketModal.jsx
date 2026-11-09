import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';
import { projectsService } from '../../../services/projectsService';

export const ReassignTicketModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [members, setMembers] = useState([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [reason, setReason] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setSelectedAssigneeId(ticket.assignee_id || '');
      setReason('');
      setHandoverNote('');
      setError(null);

      // Load members for the ticket's project
      if (ticket.project_id) {
        projectsService.getProject(ticket.project_id)
          .then((res) => {
            if (res && res.members) {
              setMembers(res.members.map((m) => m.user).filter(Boolean));
            }
          })
          .catch((e) => console.error('Failed to load project members:', e));
      }
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const currentAssignee = ticket.assignee;
  const targetAssignee = members.find((m) => m.id === selectedAssigneeId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAssigneeId) {
      setError('Please select a target team member.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        assignee_id: selectedAssigneeId,
        reason: reason.trim() || undefined,
        handover_note: handoverNote.trim() || undefined,
      };

      const updated = await ticketsService.reassignTicket(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to reassign ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-xl bg-surface-card rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Accent Ribbon */}
        <div className="h-1.5 w-full bg-btn-primary" />

        {/* Modal Header */}
        <div className="p-space-lg pb-space-sm bg-surface-card flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-space-xs">
              <span className="p-1 rounded bg-primary-container/15 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">swap_horiz</span>
              </span>
              <span className="font-label-sm text-label-sm text-primary tracking-wide uppercase font-semibold">
                Ownership Transfer
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-text-primary">Reassign Ticket</h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Transfer operational ownership and issue accountability.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-canvas-lavender transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Context Strip */}
        <div className="mx-space-lg p-space-sm bg-canvas-lavender rounded-lg flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="font-mono font-bold text-label-sm text-label-sm text-primary">
              {ticket.ticket_number}
            </span>
            <span className="text-text-muted">•</span>
            <span className="font-body-sm text-body-sm text-text-primary truncate">{ticket.title}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-status-wip/10 text-status-wip font-semibold capitalize shrink-0">
            {ticket.status}
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-space-lg space-y-space-md overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Side-by-Side Ownership Migration Card */}
          <div className="p-space-md rounded-xl bg-canvas-lavender space-y-space-sm border border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase font-semibold tracking-wider text-text-muted">
                Ownership Migration
              </span>
              <span className="font-label-sm text-label-sm text-text-secondary">Domain Realignment</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm bg-surface-card p-space-md rounded-lg shadow-sm">
              {/* Current Assignee */}
              <div className="flex items-center gap-space-sm flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                  {currentAssignee ? currentAssignee.full_name.slice(0, 2).toUpperCase() : 'UA'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-label-md font-bold text-text-primary truncate">
                      {currentAssignee ? currentAssignee.full_name : 'Unassigned'}
                    </span>
                    <span className="text-label-sm font-normal text-text-muted">(Current)</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-secondary truncate">
                    {currentAssignee?.title || currentAssignee?.role || 'Team Member'}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 self-center">
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </div>

              {/* Target Assignee */}
              <div className="flex items-center gap-space-sm flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {targetAssignee ? targetAssignee.full_name.slice(0, 2).toUpperCase() : '??'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-label-md text-label-md font-bold text-primary truncate">
                      {targetAssignee ? targetAssignee.full_name : 'Select Member'}
                    </span>
                    <span className="font-label-sm text-label-sm px-1.5 py-0.2 bg-primary/10 text-primary rounded font-semibold">
                      New
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-secondary truncate">
                    {targetAssignee?.title || targetAssignee?.role || 'Active Engineer'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignee Selector Dropdown */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-text-primary">
              Select Specialist or Team Lead <span className="text-severity-blocker">*</span>
            </label>
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="w-full h-10 px-space-md bg-canvas-lavender rounded-lg font-body-md text-body-md text-text-primary shadow-sm outline-none cursor-pointer"
              required
            >
              <option value="">Select engineer...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} — {m.title || m.role || 'Member'}
                </option>
              ))}
            </select>
          </div>

          {/* Reason for Reassignment */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-text-primary">
              Reason for Reassignment
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Root cause resides in envoy gateway ingress infrastructure..."
              className="w-full h-10 px-space-md bg-canvas-lavender rounded-lg font-body-md text-body-md text-text-primary focus:outline-none focus:bg-surface-card shadow-sm"
            />
          </div>

          {/* Handover Note */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-text-primary">
              Handover Note & Technical Summary
            </label>
            <textarea
              rows="3"
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              placeholder="Add key context, active traces, or pending canary rollbacks for the incoming engineer..."
              className="w-full p-space-sm bg-canvas-lavender rounded-lg font-body-md text-body-md text-text-primary focus:outline-none focus:bg-surface-card shadow-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-space-lg py-space-md bg-canvas-lavender flex items-center justify-end gap-space-sm border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 px-space-md bg-surface-card hover:bg-canvas-main text-text-primary font-label-md text-label-md rounded-lg shadow-sm transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 px-space-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">check</span>
            <span>{submitting ? 'Transferring...' : 'Confirm Reassignment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReassignTicketModal;

