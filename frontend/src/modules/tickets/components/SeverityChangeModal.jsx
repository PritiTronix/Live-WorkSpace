import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';

export const SeverityChangeModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [selectedSeverity, setSelectedSeverity] = useState('major');
  const [reason, setReason] = useState('');
  const [operationalNotes, setOperationalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setSelectedSeverity(ticket.severity || 'major');
      setReason('');
      setOperationalNotes('');
      setError(null);
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const severityTiers = [
    {
      key: 'blocker',
      pLevel: 'P0 BLOCKER',
      title: 'Customer-Impacting Outage',
      slaText: '2h Resolution SLA',
      description: 'Customer-impacting outage. Triggers immediate on-call pager & executive escalation.',
      badgeClass: 'bg-severity-blocker text-on-error',
      borderClass: 'border-severity-blocker',
      bgSelected: 'bg-severity-blocker/10',
      activeColor: 'text-severity-blocker',
    },
    {
      key: 'critical',
      pLevel: 'P1 CRITICAL',
      title: 'Core Service Impairment',
      slaText: '4h Resolution SLA',
      description: 'Severe degradation or core feature impairment without full tenant loss.',
      badgeClass: 'bg-severity-critical/15 text-severity-critical',
      borderClass: 'border-severity-critical',
      bgSelected: 'bg-severity-critical/10',
      activeColor: 'text-severity-critical',
    },
    {
      key: 'major',
      pLevel: 'P2 MAJOR',
      title: 'Defect / Impairment',
      slaText: '8h Resolution SLA',
      description: 'Non-critical functional defect with operational workaround available.',
      badgeClass: 'bg-severity-major/20 text-text-primary',
      borderClass: 'border-severity-major',
      bgSelected: 'bg-severity-major/15',
      activeColor: 'text-text-primary',
    },
    {
      key: 'minor',
      pLevel: 'P3 MINOR',
      title: 'Cosmetic / Low Priority',
      slaText: '24h Resolution SLA',
      description: 'Cosmetic or trivial issue with no impact on operational workflows.',
      badgeClass: 'bg-surface-container-high text-text-secondary',
      borderClass: 'border-border-subtle',
      bgSelected: 'bg-surface-container/40',
      activeColor: 'text-text-secondary',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Reason for Severity Change is mandatory.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        severity: selectedSeverity,
        reason: reason.trim(),
        operational_notes: operationalNotes.trim() || undefined,
      };

      const updated = await ticketsService.changeSeverity(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update severity.');
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
        {/* Severity Accent Ribbon */}
        <div className="h-1.5 w-full bg-severity-blocker" />

        {/* Modal Header */}
        <div className="p-space-lg pb-space-sm bg-surface-card flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-space-xs">
              <span className="p-1 rounded bg-severity-blocker/10 text-severity-blocker flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">crisis_alert</span>
              </span>
              <span className="font-label-sm text-label-sm text-severity-blocker tracking-wide uppercase font-semibold">
                Elevation Operation
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-text-primary">Update Ticket Severity</h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Changing severity impacts contractual SLA targets and incident response urgency.
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
          <div className="flex items-center gap-space-xs shrink-0">
            <span className="font-label-sm text-label-sm text-text-muted">Current:</span>
            <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-card text-text-primary font-bold capitalize">
              {ticket.severity}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-space-lg space-y-space-md overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Severity Option Cards */}
          <div className="space-y-space-sm">
            <label className="font-label-md text-label-md text-text-primary block">
              Select Target Severity Level <span className="text-severity-blocker">*</span>
            </label>
            {severityTiers.map((tier) => {
              const isSelected = selectedSeverity === tier.key;
              return (
                <div
                  key={tier.key}
                  onClick={() => setSelectedSeverity(tier.key)}
                  className={`flex items-start gap-space-md p-space-md rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? `${tier.bgSelected} ${tier.borderClass} shadow-sm`
                      : 'bg-canvas-main hover:bg-canvas-lavender border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={tier.key}
                    checked={isSelected}
                    onChange={() => setSelectedSeverity(tier.key)}
                    className="mt-1 w-4 h-4 text-primary focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${tier.badgeClass}`}>
                          {tier.pLevel}
                        </span>
                        <span className="font-label-md text-label-md font-bold text-text-primary">
                          {tier.title}
                        </span>
                      </div>
                      <span className={`font-mono text-label-sm text-label-sm font-semibold ${tier.activeColor}`}>
                        {tier.slaText}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary leading-snug">
                      {tier.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SLA Contract Impact Preview */}
          <div className="rounded-xl bg-surface-container-low p-space-md space-y-space-sm border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-severity-blocker text-lg">history_toggle_off</span>
                <span className="font-label-md text-label-md text-text-primary font-bold">
                  SLA Contract Impact Preview
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold bg-severity-blocker/15 text-severity-blocker">
                RECALIBRATION
              </span>
            </div>

            <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
              <div className="bg-surface-card p-space-sm rounded-lg space-y-1">
                <span className="font-label-sm text-label-sm text-text-muted">Target Level</span>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-sm text-status-resolved">check_circle</span>
                  <span className="font-label-md text-label-md font-semibold text-text-primary uppercase">
                    {selectedSeverity}
                  </span>
                </div>
              </div>

              <div className="bg-surface-card p-space-sm rounded-lg space-y-1">
                <span className="font-label-sm text-label-sm text-text-muted">Resolution Target</span>
                <div className="flex items-center gap-space-xs">
                  <span className="font-label-md text-label-md font-bold text-severity-blocker font-mono">
                    {selectedSeverity === 'blocker' ? '2 Hours' : selectedSeverity === 'critical' ? '4 Hours' : '8 Hours'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1">
            <label className="block font-label-md text-label-md text-text-primary">
              Reason for Severity Change <span className="text-severity-blocker">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Discovered customer payment timeouts in EU region..."
              className="w-full h-10 px-space-md bg-canvas-lavender rounded-lg font-body-md text-body-md text-text-primary focus:outline-none focus:bg-surface-card shadow-sm"
              required
            />
          </div>

          {/* Operational Notes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-label-md text-label-md text-text-primary">
                Operational Notes & Scope of Impact
              </label>
              <span className="font-label-sm text-label-sm text-text-muted">Broadcast to incident channel</span>
            </div>
            <textarea
              rows="3"
              value={operationalNotes}
              onChange={(e) => setOperationalNotes(e.target.value)}
              placeholder="Details regarding traffic drops, affected node pools, or upstream cascading errors..."
              className="w-full p-space-sm bg-canvas-lavender rounded-lg font-body-md text-body-md text-text-primary focus:outline-none focus:bg-surface-card shadow-sm resize-none"
            />
          </div>

          {/* Audit Notice */}
          <div className="flex items-start gap-space-xs p-space-sm rounded-lg bg-surface-container-low text-text-secondary">
            <span className="material-symbols-outlined text-sm text-primary shrink-0 mt-0.5">lock_clock</span>
            <p className="font-body-sm text-body-sm leading-tight">
              Audit notice: All severity transitions update incident classification and record an immutable ledger entry.
            </p>
          </div>
        </form>

        {/* Action Footer */}
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
            className="h-10 px-space-lg bg-severity-blocker hover:opacity-90 active:opacity-100 text-on-error font-label-md text-label-md rounded-lg flex items-center gap-space-xs shadow-md transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">bolt</span>
            <span>{submitting ? 'Updating...' : 'Escalate & Update Severity'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeverityChangeModal;

