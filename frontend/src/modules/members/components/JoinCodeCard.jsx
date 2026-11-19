import React, { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle, RefreshCw, Trash2, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { membersService } from '../../../services/membersService';
import { ConfirmationDialog } from '../../design-system/components/ConfirmationDialog';
import Modal from '../../design-system/components/Modal';

/**
 * JoinCodeCard
 * Owner & Admin management of organization join code.
 *
 * Rules:
 * - Plain code shown once in-memory with a Copy button and strong warning.
 * - Never stored in browser (no localStorage, no URL params).
 * - Generate / Regenerate with optional expiry and max uses.
 * - Revoke with ConfirmationDialog.
 */
export const JoinCodeCard = ({ organizationId, onNotify }) => {
  // In-memory state only - never persisted to localStorage or URL
  const [activeCodeData, setActiveCodeData] = useState(null); // { code, expires_at, max_uses }
  const [copied, setCopied] = useState(false);

  // Modal dialog states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // Form options for generate
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [maxUses, setMaxUses] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const handleCopy = async () => {
    if (!activeCodeData?.code) return;
    try {
      await navigator.clipboard.writeText(activeCodeData.code);
      setCopied(true);
      if (onNotify) onNotify('Join code copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onNotify) onNotify('Failed to copy code to clipboard.', 'error');
    }
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!organizationId) {
      setActionError('Organization context not found.');
      return;
    }

    setLoading(true);
    setActionError(null);

    const payload = {};
    if (expiresInDays && expiresInDays !== 'never') {
      payload.expires_in_days = parseInt(expiresInDays, 10);
    }
    if (maxUses && parseInt(maxUses, 10) > 0) {
      payload.max_uses = parseInt(maxUses, 10);
    }

    try {
      const res = await membersService.generateJoinCode(organizationId, payload);
      setActiveCodeData(res);
      setShowGenerateModal(false);
      setCopied(false);
      if (onNotify) {
        onNotify('New join code successfully generated.');
      }
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || err.message || 'Failed to generate join code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!organizationId) return;

    setLoading(true);
    setActionError(null);

    try {
      await membersService.revokeJoinCode(organizationId);
      setActiveCodeData(null);
      setShowRevokeConfirm(false);
      if (onNotify) {
        onNotify('Join code successfully revoked.');
      }
    } catch (err) {
      setActionError(err.response?.data?.detail?.message || err.message || 'Failed to revoke join code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1b32] rounded-2xl border border-border-subtle dark:border-[#2e2f41] p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle/80 dark:border-[#2e2f41]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-btn-primary/10 text-btn-primary flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-base text-text-primary dark:text-white">
                Organization Join Code
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-btn-primary/10 text-btn-primary font-label-sm text-[11px] font-semibold">
                Admin Only
              </span>
            </div>
            <p className="font-body text-xs text-text-secondary dark:text-text-muted mt-0.5">
              Distribute an invitation code to enable team members to submit join requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeCodeData ? (
            <>
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                className="h-9 px-3.5 rounded-lg border border-border-subtle dark:border-[#2e2f41] bg-surface-card dark:bg-[#242542] hover:bg-canvas-lavender text-text-secondary dark:text-text-muted hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(true)}
                className="h-9 px-3.5 rounded-lg border border-severity-blocker/30 bg-severity-blocker/5 hover:bg-severity-blocker/10 text-severity-blocker text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="h-9 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Join Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div
          role="alert"
          className="mt-4 p-3 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 text-severity-blocker text-xs font-medium"
        >
          {actionError}
        </div>
      )}

      {/* Code Display Area */}
      {activeCodeData ? (
        <div className="mt-4 space-y-4">
          <div className="p-4 rounded-xl bg-canvas-main dark:bg-[#141529] border border-border-subtle dark:border-[#2e2f41] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Active Plaintext Code
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-bold tracking-widest text-btn-primary select-all">
                  {activeCodeData.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-canvas-lavender border border-border-subtle dark:border-[#2e2f41] text-text-secondary hover:text-text-primary transition-all shadow-xs cursor-pointer"
                  title="Copy join code"
                  aria-label="Copy join code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-status-resolved" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-text-muted sm:text-right space-y-1">
              {activeCodeData.expires_at ? (
                <div className="flex sm:justify-end items-center gap-1 text-text-secondary dark:text-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires: {new Date(activeCodeData.expires_at).toLocaleDateString()}</span>
                </div>
              ) : (
                <span className="block">Never expires</span>
              )}
              {activeCodeData.max_uses && (
                <span className="block">Max uses: {activeCodeData.max_uses}</span>
              )}
            </div>
          </div>

          {/* Ephemeral Warning Banner */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-2.5 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Important:</span> This plain join code will{' '}
              <span className="font-bold underline">not be displayed again</span> after you leave this page. Copy it immediately or share it with your team. Only cryptographic hashes are stored on the server.
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="mt-4 p-5 rounded-xl bg-canvas-main/60 dark:bg-[#141529]/60 border border-dashed border-border-subtle dark:border-[#2e2f41] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-0.5">
            <span className="font-semibold text-xs text-text-primary dark:text-white block">
              No Plain Join Code Displayed
            </span>
            <p className="text-xs text-text-muted">
              Generate a new code to allow coworkers to request workspace membership. Active codes can be revoked anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="h-8 px-3 rounded-lg border border-btn-primary text-btn-primary hover:bg-btn-primary hover:text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            + Generate Code
          </button>
        </div>
      )}

      {/* Generate / Regenerate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title={activeCodeData ? 'Regenerate Organization Join Code' : 'Generate Organization Join Code'}
        subtitle="Invited team members can submit requests using this code."
        size="sm"
        footer={
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              {loading ? 'Generating...' : activeCodeData ? 'Regenerate Code' : 'Generate Code'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {activeCodeData && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <span className="font-bold">Warning:</span> Regenerating will immediately revoke the current active code.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-label-md text-xs font-medium text-text-primary dark:text-white">
              Code Expiration
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-canvas-main dark:bg-[#141529] border border-border-subtle dark:border-[#2e2f41] text-text-primary dark:text-white text-xs"
            >
              <option value="7">Expires in 7 days</option>
              <option value="14">Expires in 14 days</option>
              <option value="30">Expires in 30 days (Default)</option>
              <option value="90">Expires in 90 days</option>
              <option value="never">No Expiration</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-label-md text-xs font-medium text-text-primary dark:text-white">
              Maximum Uses <span className="text-text-muted font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="e.g. 25 (leave blank for unlimited)"
              className="w-full h-10 px-3 rounded-lg bg-canvas-main dark:bg-[#141529] border border-border-subtle dark:border-[#2e2f41] text-text-primary dark:text-white text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* Revoke Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={handleRevoke}
        variant="danger"
        title="Revoke Join Code?"
        description="Are you sure you want to revoke this organization join code? Anyone attempting to use it will receive an invalid code rejection."
        confirmText="Revoke Code"
        cancelText="Keep Code"
        isLoading={loading}
      />
    </div>
  );
};

export default JoinCodeCard;
