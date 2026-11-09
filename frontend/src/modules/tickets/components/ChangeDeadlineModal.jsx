import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';

export const ChangeDeadlineModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [newDeadline, setNewDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [operationalRemarks, setOperationalRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setNewDeadline(ticket.deadline ? ticket.deadline.slice(0, 16) : '');
      setReason('');
      setOperationalRemarks('');
      setError(null);
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDeadline) {
      setError('Please select a new target deadline.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason for deadline adjustment is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        deadline: new Date(newDeadline).toISOString(),
        reason: reason.trim(),
        operational_remarks: operationalRemarks.trim() || undefined,
      };

      const updated = await ticketsService.changeDeadline(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update ticket deadline.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentDeadlineFormatted = ticket.deadline
    ? new Date(ticket.deadline).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No deadline set';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-surface-card rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-space-lg pb-space-sm bg-surface-card flex items-start justify-between border-b border-border-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-severity-critical" />
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                Lifecycle State
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">
              Change Ticket Deadline
            </h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Adjust operational target completion date and assess SLA compliance risk.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-space-lg space-y-space-md overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Ticket Reference */}
          <div className="p-space-sm bg-canvas-lavender rounded-lg flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs min-w-0">
                <span className="font-label-md text-label-md font-mono text-status-wip">
                  {ticket.ticket_number}
                </span>
                <span className="text-outline-variant">•</span>
                <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-severity-blocker/15 text-severity-blocker font-semibold capitalize">
                  {ticket.severity}
                </span>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-status-wip/15 text-status-wip font-semibold capitalize">
                {ticket.status}
              </span>
            </div>
            <p className="font-label-md text-label-md text-text-primary truncate">{ticket.title}</p>
          </div>

          {/* Current Deadline & Lead */}
          <div className="grid grid-cols-2 gap-space-sm p-space-sm rounded-lg bg-surface-container-low border border-border-subtle">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-sm text-label-sm text-text-secondary">Current Deadline</span>
              <span className="font-label-md text-label-md text-text-primary font-medium">
                {currentDeadlineFormatted}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-sm text-label-sm text-text-secondary">Incident Lead</span>
              <span className="font-label-md text-label-md text-text-primary font-medium">
                {ticket.assignee?.full_name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Proposed New Deadline */}
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-text-primary flex items-center justify-between">
              <span>
                Proposed New Deadline <span className="text-severity-blocker">*</span>
              </span>
              <span className="font-label-sm text-label-sm text-text-muted">Local Time</span>
            </label>
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="w-full h-10 px-space-md bg-canvas-main rounded-lg font-body-md text-body-md text-text-primary shadow-sm outline-none border border-border-subtle"
              required
            />
          </div>

          {/* Reason for Change */}
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-text-primary flex items-center justify-between">
              <span>
                Reason for Change <span className="text-severity-blocker">*</span>
              </span>
              <span className="font-label-sm text-label-sm text-text-muted">Audited entry</span>
            </label>
            <textarea
              rows="2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Mitigation rollback required canary bake time before full cluster traffic..."
              className="w-full p-2.5 bg-canvas-main rounded-lg font-body-sm text-body-sm text-text-primary outline-none shadow-sm resize-none border border-border-subtle"
              required
            />
          </div>

          {/* Optional Remarks */}
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-text-primary">
              Optional Operational Remarks
            </label>
            <input
              type="text"
              value={operationalRemarks}
              onChange={(e) => setOperationalRemarks(e.target.value)}
              placeholder="Customer communications team notified..."
              className="w-full h-10 px-3 bg-canvas-main rounded-lg font-body-sm text-body-sm text-text-primary outline-none shadow-sm border border-border-subtle"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-space-lg py-space-md bg-canvas-lavender flex items-center justify-end gap-space-sm border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 px-space-md rounded-lg bg-surface-container-low text-text-primary hover:bg-canvas-lavender font-label-md text-label-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-10 px-space-lg bg-btn-primary hover:bg-primary-hover active:bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{submitting ? 'Updating...' : 'Update Deadline'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeDeadlineModal;

