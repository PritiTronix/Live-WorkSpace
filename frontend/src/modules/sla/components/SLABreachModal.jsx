import React, { useState } from 'react';
import { AlertOctagon, X, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { slaService } from '../../../services/api';

/**
 * SLABreachModal
 * Screen 4: SLA Warning & Breach Alert Components (Prompt 51)
 * Emergent breach popup with real-time escalation triage and acknowledgment.
 */
export const SLABreachModal = ({
  isOpen = false,
  breachData,
  onClose,
  onAcknowledged,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen || !breachData) return null;

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      await slaService.acknowledgeBreach(breachData.id || breachData.timer_id);
      setAcknowledged(true);
      setTimeout(() => {
        if (onAcknowledged) onAcknowledged(breachData.id);
        if (onClose) onClose();
      }, 800);
    } catch (err) {
      console.warn('Failed to acknowledge SLA breach:', err);
      // Still close smoothly
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#191a2b]/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-surface-card rounded-2xl border border-rose-200 shadow-2xl p-6 overflow-hidden flex flex-col"
      >
        {/* Top ambient danger glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-canvas-lavender"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-severity-blocker">
            <AlertOctagon className="w-7 h-7 text-severity-blocker animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-severity-blocker text-[11px] font-semibold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-3 h-3" />
              <span>SLA Target Breached</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-text-primary">
              Immediate Escalation Alert
            </h2>
          </div>
        </div>

        {/* Breach Details Box */}
        <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 my-2 space-y-3 text-xs">
          <div className="flex justify-between items-start">
            <span className="text-text-secondary font-medium">Incident / Ticket</span>
            <span className="font-mono font-bold text-text-primary">
              {breachData.ticket_number || breachData.ticket_id || 'TKT-1028'}
            </span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-text-secondary font-medium">Description</span>
            <span className="text-text-primary font-medium text-right max-w-xs truncate">
              {breachData.ticket_title || breachData.reason || 'Payment Gateway Latency & Webhook Queue Lag'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-medium">Policy Tier</span>
            <span className="font-semibold text-primary">
              {breachData.policy_name || 'Standard SaaS Tier 1'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-medium">Overdue Elapsed</span>
            <span className="font-mono font-bold text-severity-blocker">
              {breachData.elapsed_formatted || '+00:14:22'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-text-secondary font-medium">Escalation Recipient</span>
            <span className="font-medium text-text-primary">
              {breachData.escalation_tier ? `Tier ${breachData.escalation_tier}` : 'Primary SRE On-Call'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-lg hover:bg-canvas-lavender"
          >
            Dismiss
          </button>

          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={isSubmitting || acknowledged}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-[#471ac8] text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            {acknowledged ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Acknowledged</span>
              </>
            ) : (
              <>
                <span>Acknowledge Breach</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SLABreachModal;
