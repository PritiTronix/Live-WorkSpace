import React, { useState } from 'react';
import { ShieldAlert, Lock, UserCheck, Send, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

/**
 * Reusable RBAC & Permission Boundary Components (Prompt 88 / Screen 25)
 * Displays access-denied state with current vs required roles and elevation request workflow.
 */
export const RbacState = ({
  requiredRole = 'Workspace Admin',
  currentRole = 'Engineering Member',
  resourceName = 'Security & SLA Governance Configuration',
  onRequestAccess,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onRequestAccess?.(reason);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setIsModalOpen(false);
      setReason('');
    }, 2000);
  };

  return (
    <>
      <div
        className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-border-subtle shadow-sm ${className}`}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-label-sm text-label-sm uppercase tracking-wider font-semibold mb-3">
          403 Access Restricted
        </span>

        <h3 className="font-headline text-headline-md text-text-primary tracking-tight mb-2">
          Insufficient Permissions
        </h3>

        <p className="font-body text-body-md text-text-secondary max-w-lg mb-6 leading-relaxed">
          You do not have the required access role to view or modify{' '}
          <span className="font-semibold text-text-primary">{resourceName}</span>.
          This view is restricted by workspace governance policies.
        </p>

        {/* Role Comparison Card */}
        <div className="w-full max-w-md p-4 rounded-xl bg-canvas-main border border-border-subtle/80 flex items-center justify-between mb-6">
          <div className="text-left">
            <span className="font-label-sm text-label-sm text-text-muted uppercase block">
              Your Current Role
            </span>
            <span className="font-label-md text-label-md text-text-secondary font-medium">
              {currentRole}
            </span>
          </div>

          <div className="h-8 w-px bg-border-subtle" />

          <div className="text-right">
            <span className="font-label-sm text-label-sm text-text-muted uppercase block">
              Required Role
            </span>
            <span className="font-label-md text-label-md text-primary font-bold flex items-center justify-end gap-1">
              <Lock className="w-3.5 h-3.5" />
              {requiredRole}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-md text-label-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Request Elevated Access</span>
          </button>
          <a
            href="mailto:admin@tronix365.cloud?subject=Access%20Request"
            className="px-4 py-2.5 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all"
          >
            Contact Organization Admin
          </a>
        </div>
      </div>

      {/* Access Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Elevated Access"
        subtitle={`Request approval for ${requiredRole} on ${resourceName}`}
        icon={Lock}
        size="md"
      >
        {isSubmitted ? (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-headline text-headline-sm text-text-primary">
              Access Request Dispatched
            </h4>
            <p className="font-body text-body-sm text-text-secondary mt-1">
              Your request was routed to the organization administrators. You will be notified via email upon review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-text-primary mb-1">
                Business Justification <span className="text-error">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need elevated access for this sprint or incident response..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="p-3 rounded-lg bg-canvas-main border border-border-subtle text-text-secondary font-body-sm text-body-sm flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0 mt-0.5">
                verified_user
              </span>
              <span>
                Elevated access is audit-logged and expires automatically after 24 hours per zero-trust compliance standards.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border-subtle text-text-secondary hover:bg-canvas-lavender font-label-md text-label-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason.trim()}
                className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-md text-label-md flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
};

export default RbacState;

