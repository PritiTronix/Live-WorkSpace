import React, { useState } from 'react';
import {
  LifeBuoy,
  Keyboard,
  BookOpen,
  Mail,
  Activity,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Modal from '../../modules/design-system/components/Modal';
import { supportService } from '../../services/api';
import pkg from '../../../package.json';

/**
 * HelpSupportModal
 * Stitch Reference: 'Live Workspace - Help & Support & Logout Modal (Prompts 79 & 80)'
 *
 * Implements ONLY the Help & Support modal with strict real-data sources:
 * - Keyboard shortcuts: opens KeyboardShortcutsModal
 * - Documentation: VITE_DOCS_URL (hidden if empty)
 * - Contact support: VITE_SUPPORT_EMAIL (hidden if empty)
 * - System status: VITE_STATUS_URL (hidden if empty)
 * - App version: read from package.json at build time
 * - Report a problem: validated form submitting to POST /api/v1/support/requests
 * - All invented metrics, search, fake articles, and demo FAQs are removed.
 */
export const HelpSupportModal = ({
  isOpen,
  onClose,
  onOpenShortcuts,
  triggerRef,
}) => {
  // Public environment variables (no hardcoded secrets or URLs)
  const docsUrl = import.meta.env.VITE_DOCS_URL?.trim();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
  const statusUrl = import.meta.env.VITE_STATUS_URL?.trim();
  const appVersion = pkg.version || '1.0.0';

  // Problem report form state - all empty by default
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Reset form when modal closes or opens
  const handleClose = () => {
    setSubmitError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!subject.trim() || !category || !message.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supportService.createRequest({
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      setSubmitSuccess(response);
      setSubject('');
      setCategory('');
      setMessage('');
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to submit support request. Please try again.';
      setSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if any external resource link is configured
  const hasExternalResources = Boolean(docsUrl || supportEmail || statusUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Help & Support"
      subtitle={`Live Workspace v${appVersion}`}
      icon={LifeBuoy}
      size="xl"
      triggerRef={triggerRef}
    >
      <div className="space-y-6">
        {/* Quick Resource & Navigation Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-headline text-headline-sm text-text-primary text-sm font-semibold tracking-tight">
              Resources & Tools
            </h4>
            <span className="font-label text-label-sm text-text-muted">
              v{appVersion}
            </span>
          </div>

          <div
            className={`grid gap-3 ${
              hasExternalResources
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                : 'grid-cols-1'
            }`}
          >
            {/* 1. Keyboard Shortcuts (Real: launches KeyboardShortcutsModal) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenShortcuts) onOpenShortcuts();
              }}
              className="p-3.5 rounded-xl bg-canvas-main hover:bg-canvas-lavender/70 border border-border-subtle transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center transition-transform group-hover:scale-105">
                  <Keyboard className="w-4 h-4" />
                </div>
                <kbd className="px-2 py-0.5 text-label-sm font-label-sm font-mono text-text-muted bg-white rounded border border-border-subtle shadow-xs">
                  ?
                </kbd>
              </div>
              <div>
                <span className="font-label text-label-md text-text-primary font-semibold block group-hover:text-primary transition-colors">
                  Keyboard Shortcuts
                </span>
                <span className="font-body text-body-sm text-text-secondary text-xs line-clamp-1">
                  Productivity hotkeys & cheatsheet
                </span>
              </div>
            </button>

            {/* 2. Documentation Link (Real: VITE_DOCS_URL, hidden if empty) */}
            {docsUrl && (
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-canvas-main hover:bg-canvas-lavender/70 border border-border-subtle transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary-container/15 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="font-label text-label-md text-text-primary font-semibold block group-hover:text-primary transition-colors">
                    Documentation
                  </span>
                  <span className="font-body text-body-sm text-text-secondary text-xs line-clamp-1">
                    Runbooks, guides & API references
                  </span>
                </div>
              </a>
            )}

            {/* 3. Contact Support Link (Real: VITE_SUPPORT_EMAIL, hidden if empty) */}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}?subject=Live%20Workspace%20Support%20Request`}
                className="p-3.5 rounded-xl bg-canvas-main hover:bg-canvas-lavender/70 border border-border-subtle transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-severity-critical/15 text-severity-critical flex items-center justify-center transition-transform group-hover:scale-105">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-label font-medium text-text-muted truncate max-w-[80px]">
                    Email
                  </span>
                </div>
                <div>
                  <span className="font-label text-label-md text-text-primary font-semibold block group-hover:text-primary transition-colors">
                    Contact Support
                  </span>
                  <span className="font-body text-body-sm text-text-secondary text-xs truncate block" title={supportEmail}>
                    {supportEmail}
                  </span>
                </div>
              </a>
            )}

            {/* 4. System Status Link (Real: VITE_STATUS_URL, hidden if empty) */}
            {statusUrl && (
              <a
                href={statusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-canvas-main hover:bg-canvas-lavender/70 border border-border-subtle transition-all duration-200 text-left flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-status-resolved/15 text-status-resolved flex items-center justify-center transition-transform group-hover:scale-105">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved text-[11px] font-label font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-resolved animate-pulse" />
                    Status
                  </div>
                </div>
                <div>
                  <span className="font-label text-label-md text-text-primary font-semibold block group-hover:text-primary transition-colors">
                    System Status
                  </span>
                  <span className="font-body text-body-sm text-text-secondary text-xs line-clamp-1">
                    Live platform health & services
                  </span>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Report a Problem Section (Matches Stitch Form Design) */}
        <div className="bg-canvas-main/60 rounded-xl border border-border-subtle p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center flex-shrink-0">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-headline text-headline-sm text-text-primary text-sm font-semibold tracking-tight">
                Report a Problem
              </h4>
              <p className="font-body text-body-sm text-text-secondary text-xs">
                Submit an issue or support inquiry directly to your organization desk
              </p>
            </div>
          </div>

          {/* Submission Feedback Messages */}
          {submitSuccess && (
            <div className="mb-4 p-3.5 rounded-xl bg-status-resolved/10 border border-status-resolved/20 text-text-primary flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-status-resolved flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-label font-semibold text-status-resolved block">
                  Support Request Submitted
                </span>
                <span className="font-body text-text-secondary mt-0.5 block">
                  Your ticket has been recorded with reference ID{' '}
                  <code className="font-mono font-bold text-text-primary">
                    {submitSuccess.id?.slice(0, 8)}
                  </code>
                  . The engineering team will review it shortly.
                </span>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3.5 rounded-xl bg-error-container/30 border border-error/20 text-text-primary flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-label font-semibold text-error block">
                  Submission Failed
                </span>
                <span className="font-body text-text-secondary mt-0.5 block">
                  {submitError}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Subject Title Input */}
              <div className="sm:col-span-8 flex flex-col gap-1.5">
                <label
                  htmlFor="support-subject"
                  className="font-label text-label-md text-text-primary text-xs font-medium"
                >
                  Subject Title <span className="text-error">*</span>
                </label>
                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Ingress webhook latency discrepancy"
                  maxLength={200}
                  disabled={isSubmitting}
                  required
                  className="w-full h-9 px-3 rounded-lg bg-surface-card border border-border-subtle text-text-primary placeholder:text-text-muted font-body text-body-sm text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-light disabled:opacity-50"
                />
              </div>

              {/* Category Dropdown */}
              <div className="sm:col-span-4 flex flex-col gap-1.5">
                <label
                  htmlFor="support-category"
                  className="font-label text-label-md text-text-primary text-xs font-medium"
                >
                  Category <span className="text-error">*</span>
                </label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="w-full h-9 px-3 rounded-lg bg-surface-card border border-border-subtle text-text-primary font-body text-body-sm text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-light disabled:opacity-50"
                >
                  <option value="" disabled>
                    Select category...
                  </option>
                  <option value="incident">Incident Triage</option>
                  <option value="billing">Billing & Licenses</option>
                  <option value="api">API & Integrations</option>
                  <option value="bug">Bug Report</option>
                  <option value="security">Security & Disclosure</option>
                  <option value="general">General Support</option>
                </select>
              </div>
            </div>

            {/* Description Textarea */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="support-message"
                  className="font-label text-label-md text-text-primary text-xs font-medium"
                >
                  Description & Steps <span className="text-error">*</span>
                </label>
                <span className="font-label text-label-sm text-text-muted text-[11px]">
                  {message.length} / 5000
                </span>
              </div>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the steps to reproduce, expected vs observed results, and any relevant details..."
                rows={3}
                maxLength={5000}
                disabled={isSubmitting}
                required
                className="w-full p-3 rounded-lg bg-surface-card border border-border-subtle text-text-primary placeholder:text-text-muted font-body text-body-sm text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-light disabled:opacity-50 resize-y"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label text-label-md text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-primary text-on-primary font-label text-label-md text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Support Request'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default HelpSupportModal;
