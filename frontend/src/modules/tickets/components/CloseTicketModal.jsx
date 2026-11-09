import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';

export const CloseTicketModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [prReference, setPrReference] = useState('');
  const [verifiedInStaging, setVerifiedInStaging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setResolutionSummary('');
      setCommitSha('');
      setPrReference('');
      setVerifiedInStaging(false);
      setError(null);
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      setError('Resolution summary and root cause notes are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const prOrCommit = [commitSha ? `Commit: ${commitSha}` : null, prReference ? `PR: ${prReference}` : null]
        .filter(Boolean)
        .join(' • ');

      const payload = {
        resolution_summary: resolutionSummary.trim(),
        verified_by: verifiedInStaging ? 'Staging Verified' : 'Reporter',
        pr_or_commit: prOrCommit || undefined,
        operational_signoff: true,
      };

      const updated = await ticketsService.closeTicket(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to close ticket.');
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
              <span className="w-2 h-2 rounded-full bg-text-primary" />
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                Lifecycle State
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">
              Close Ticket
            </h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Permanently finalize ticket lifecycle and archive records.
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
                <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded-full bg-severity-major/20 text-text-primary font-semibold capitalize">
                  {ticket.severity}
                </span>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-semibold capitalize">
                {ticket.status}
              </span>
            </div>
            <p className="font-label-md text-label-md text-text-primary truncate">{ticket.title}</p>
          </div>

          {/* Resolution Summary Card */}
          <div className="p-space-md bg-canvas-lavender rounded-xl flex flex-col gap-space-sm border border-border-subtle">
            <span className="font-label-md text-label-md text-text-primary flex items-center gap-1.5 font-semibold">
              <span className="material-symbols-outlined text-base text-status-resolved">task_alt</span>
              Resolution Summary
            </span>
            <textarea
              rows="3"
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="State the resolution deployed, circuit breaker parameters, or RCA findings..."
              className="w-full p-2.5 bg-surface-card rounded-lg font-body-sm text-body-sm text-text-primary outline-none shadow-sm resize-none border border-border-subtle"
              required
            />
          </div>

          {/* Verification Details */}
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-text-secondary">Commit / SHA</label>
              <input
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="#e8f902c"
                className="w-full h-9 px-2.5 bg-canvas-main rounded font-mono text-body-sm text-text-primary outline-none border border-border-subtle"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-text-secondary">PR Reference</label>
              <input
                type="text"
                value={prReference}
                onChange={(e) => setPrReference(e.target.value)}
                placeholder="PR #402"
                className="w-full h-9 px-2.5 bg-canvas-main rounded font-mono text-body-sm text-text-primary outline-none border border-border-subtle"
              />
            </div>
          </div>

          {/* Checkbox verification */}
          <label className="flex items-center gap-2 cursor-pointer p-space-xs">
            <input
              type="checkbox"
              checked={verifiedInStaging}
              onChange={(e) => setVerifiedInStaging(e.target.checked)}
              className="w-4 h-4 text-btn-primary rounded border-border-subtle"
            />
            <span className="font-body-sm text-body-sm text-text-secondary">
              Verified in Staging and confirmed by project leads
            </span>
          </label>
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
            className="h-10 px-space-lg bg-text-primary hover:bg-black text-on-primary font-label-md text-label-md rounded-lg flex items-center gap-1.5 shadow-sm transition-colors font-semibold disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            <span>{submitting ? 'Closing...' : 'Close & Archive Ticket'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseTicketModal;

