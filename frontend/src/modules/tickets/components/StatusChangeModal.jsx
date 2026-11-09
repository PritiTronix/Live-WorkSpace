import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';

export const StatusChangeModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [holdReason, setHoldReason] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [additionalRemarks, setAdditionalRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setSelectedStatus(ticket.status || 'open');
      setHoldReason('');
      setFollowUpDate('');
      setAdditionalRemarks('');
      setError(null);
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const statusOptions = [
    { key: 'open', label: 'Open', desc: 'Awaiting triage', dot: 'bg-status-open' },
    { key: 'wip', label: 'WIP', desc: 'Active resolution', dot: 'bg-status-wip' },
    { key: 'on_hold', label: 'On Hold', desc: 'Temporarily blocked', dot: 'bg-status-on-hold' },
    { key: 'resolved', label: 'Resolved', desc: 'Fix deployed', dot: 'bg-status-resolved' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStatus === 'on_hold' && !holdReason) {
      setError('Please select a reason for placing this ticket On Hold.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        status: selectedStatus,
        reason: selectedStatus === 'on_hold' ? holdReason : (additionalRemarks || undefined),
        follow_up_date: followUpDate || undefined,
        remarks: additionalRemarks || undefined,
      };

      const updated = await ticketsService.changeStatus(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update ticket status.');
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
        {/* Header */}
        <div className="p-space-lg bg-surface-card flex items-start justify-between border-b border-border-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-base">published_with_changes</span>
              </div>
              <h2 className="font-headline-md text-headline-md text-text-primary">Change Ticket Status</h2>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Update operational state and notify stakeholders.
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

          {/* Ticket Reference Bar */}
          <div className="p-space-sm rounded-lg bg-canvas-lavender flex flex-col gap-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted font-mono">
                TICKET REF: {ticket.ticket_number}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-label-sm font-semibold capitalize">
                Current: {ticket.status.replace('_', ' ')}
              </span>
            </div>
            <p className="font-label-md text-label-md text-text-primary truncate">{ticket.title}</p>
          </div>

          {/* Transition Cards */}
          <div className="space-y-2">
            <label className="font-label-md text-label-md text-text-primary">
              Transition To New State <span className="text-severity-blocker">*</span>
            </label>
            <div className="grid grid-cols-2 gap-space-xs">
              {statusOptions.map((opt) => {
                const isSelected = selectedStatus === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => setSelectedStatus(opt.key)}
                    className={`p-space-sm rounded-lg cursor-pointer transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-status-on-hold/10 border-status-on-hold text-status-on-hold shadow-sm'
                        : 'bg-surface-card hover:bg-canvas-lavender border-border-subtle text-text-primary'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${opt.dot} shrink-0`} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-label-md text-label-md font-semibold">{opt.label}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-text-muted">{opt.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contextual Parameters for On-Hold */}
          {selectedStatus === 'on_hold' && (
            <div className="p-space-md rounded-xl bg-canvas-lavender space-y-space-md shadow-sm border border-border-subtle animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-status-on-hold font-label-md text-label-md font-semibold">
                <span className="material-symbols-outlined text-base">rule</span>
                <span>Required On-Hold Parameters</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary">
                  Reason for Pause <span className="text-severity-blocker">*</span>
                </label>
                <select
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full h-10 px-space-md bg-surface-card rounded-lg font-body-md text-body-md text-text-primary outline-none focus:ring-2 focus:ring-primary-light shadow-sm cursor-pointer"
                  required
                >
                  <option value="">Select reason...</option>
                  <option value="vendor_blocker">Blocked on 3rd-party vendor / external provider</option>
                  <option value="awaiting_customer">Awaiting customer / client information</option>
                  <option value="security_review">Pending internal security / architecture review</option>
                  <option value="sprint_deferral">Deferred to upcoming sprint cycle</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary">
                  Expected Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full h-10 px-space-md bg-surface-card rounded-lg font-body-md text-body-md text-text-primary shadow-sm outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary">Additional Remarks</label>
                <textarea
                  value={additionalRemarks}
                  onChange={(e) => setAdditionalRemarks(e.target.value)}
                  placeholder="State external ticket IDs, contact person, or incident references..."
                  className="w-full h-20 p-space-sm bg-surface-card rounded-lg font-body-md text-body-md text-text-primary outline-none shadow-sm resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Governance Notice */}
          <div className="p-space-sm rounded-lg bg-surface-container flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-primary mt-0.5">info</span>
            <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
              <span className="font-semibold text-text-primary">Governance Note:</span> Transitioning to "Resolved" requires formal Root Cause Analysis (RCA) reference and customer impact sign-off.
            </p>
          </div>

          {/* SLA Pause Notice */}
          {selectedStatus === 'on_hold' && (
            <div className="p-space-sm rounded-lg bg-status-on-hold/10 flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-status-on-hold mt-0.5">timer_pause</span>
              <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
                This transition pauses operational SLA resolution timers and records an immutable ledger entry.
              </p>
            </div>
          )}
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
            <span>{submitting ? 'Updating...' : 'Confirm Status Change'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusChangeModal;

