import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';

export const ReopenTicketModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [reopenReason, setReopenReason] = useState('');
  const [telemetryNotes, setTelemetryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setReopenReason('');
      setTelemetryNotes('');
      setError(null);
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason) {
      setError('Required reason for reopening must be selected.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        reason: reopenReason,
        regression_context: telemetryNotes.trim() || undefined,
        operational_notes: telemetryNotes.trim() || undefined,
      };

      const updated = await ticketsService.reopenTicket(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to reopen ticket.');
    } finally {
      setSubmitting(false);
    }
  };

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
              <span className="w-2 h-2 rounded-full bg-status-wip" />
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                Lifecycle State
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">
              Reopen Ticket
            </h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Return a resolved or closed issue to active triage and operational tracking.
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
                <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-severity-critical/15 text-severity-critical font-semibold capitalize">
                  {ticket.severity}
                </span>
              </div>
              <span className="font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-semibold flex items-center gap-1 capitalize">
                <span className="material-symbols-outlined text-xs">done_all</span>
                {ticket.status}
              </span>
            </div>
            <p className="font-label-md text-label-md text-text-primary truncate">{ticket.title}</p>
          </div>

          {/* Operational Effect Notice */}
          <div className="p-space-md bg-canvas-lavender rounded-xl flex items-start gap-space-sm border border-border-subtle">
            <span className="material-symbols-outlined text-status-wip text-lg mt-0.5 shrink-0">info</span>
            <div className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-text-primary font-semibold">
                Operational Workflow Effect
              </span>
              <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                Reopening will transition this ticket back to <strong className="text-text-primary">Open</strong> status, notify the original assignee and project leads, and resume SLA monitoring.
              </p>
            </div>
          </div>

          {/* Reason for Reopening */}
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-text-primary flex items-center justify-between">
              <span>
                Required Reason for Reopening <span className="text-severity-blocker">*</span>
              </span>
              <span className="font-label-sm text-label-sm text-text-muted">Classification</span>
            </label>
            <select
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full h-10 px-3 bg-canvas-main rounded-lg font-body-sm text-body-sm text-text-primary outline-none shadow-sm cursor-pointer border border-border-subtle"
              required
            >
              <option value="">Select classification...</option>
              <option value="regression">Regression or Recurring Symptom</option>
              <option value="ineffective_fix">Fix Ineffective in Production</option>
              <option value="incomplete_verification">Incomplete Test Verification</option>
              <option value="secondary_effects">Secondary Side-Effects Detected</option>
            </select>
          </div>

          {/* Incident Details & Telemetry Notes */}
          <div className="flex flex-col gap-space-xs">
            <label className="font-label-md text-label-md text-text-primary flex items-center justify-between">
              <span>Incident Details & Telemetry Notes</span>
              <span className="font-label-sm text-label-sm text-text-muted">Trace / Alert Link</span>
            </label>
            <textarea
              rows="3"
              value={telemetryNotes}
              onChange={(e) => setTelemetryNotes(e.target.value)}
              placeholder="e.g. Secondary replica lag spiked again immediately after backup job..."
              className="w-full p-2.5 bg-canvas-main rounded-lg font-body-sm text-body-sm text-text-primary outline-none shadow-sm resize-none border border-border-subtle"
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
            className="h-10 px-space-lg bg-primary-container hover:bg-primary-hover active:bg-primary text-on-primary font-label-md text-label-md rounded-lg flex items-center gap-1.5 shadow-sm transition-colors font-semibold disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            <span>{submitting ? 'Reopening...' : 'Reopen Ticket'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReopenTicketModal;

