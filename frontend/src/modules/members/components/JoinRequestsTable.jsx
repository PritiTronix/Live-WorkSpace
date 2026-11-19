import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { membersService } from '../../../services/membersService';
import Avatar from '../../../components/common/Avatar';
import { ConfirmationDialog } from '../../design-system/components/ConfirmationDialog';
import Modal from '../../design-system/components/Modal';

/**
 * JoinRequestsTable
 * Admin/Owner management of applicant join requests.
 * Features:
 * - List: Requester name, email, message, date, status
 * - Lowercase status filter: all, pending, approved, rejected, cancelled
 * - Pagination
 * - Approve with confirmation
 * - Reject with confirmation and optional reason
 * - Real loading, empty, and error states
 * - Triggers roster refresh upon decision
 */
export const JoinRequestsTable = ({ organizationId, onDecisionSuccess, onNotify }) => {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to pending
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Decision Modal States
  const [approveTarget, setApproveTarget] = useState(null);
  const [isApproving, setIsApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const filter = statusFilter === 'all' ? undefined : statusFilter;
      const res = await membersService.listJoinRequests(organizationId, filter, page, pageSize);
      setRequests(res?.items || []);
      setTotal(res?.total || 0);
    } catch (err) {
      setError(err.response?.data?.detail?.message || err.message || 'Failed to load join requests.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, statusFilter, page, pageSize]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Reset page when filter changes
  const handleFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!approveTarget || !organizationId) return;

    setIsApproving(true);
    try {
      await membersService.approveJoinRequest(organizationId, approveTarget.id);
      setApproveTarget(null);
      if (onNotify) {
        onNotify(`Approved ${approveTarget.user?.full_name || approveTarget.requester_name || 'applicant'}.`);
      }
      fetchRequests();
      if (onDecisionSuccess) onDecisionSuccess();
    } catch (err) {
      if (onNotify) {
        onNotify(err.response?.data?.detail?.message || 'Failed to approve request.', 'error');
      }
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async (e) => {
    e?.preventDefault();
    if (!rejectTarget || !organizationId) return;

    setIsRejecting(true);
    try {
      await membersService.rejectJoinRequest(organizationId, rejectTarget.id, decisionReason.trim() || undefined);
      setRejectTarget(null);
      setDecisionReason('');
      if (onNotify) {
        onNotify(`Rejected request from ${rejectTarget.user?.full_name || rejectTarget.requester_name || 'applicant'}.`);
      }
      fetchRequests();
      if (onDecisionSuccess) onDecisionSuccess();
    } catch (err) {
      if (onNotify) {
        onNotify(err.response?.data?.detail?.message || 'Failed to reject request.', 'error');
      }
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const startRange = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRange = Math.min(page * pageSize, total);

  return (
    <div className="bg-white dark:bg-[#1a1b32] rounded-2xl border border-border-subtle dark:border-[#2e2f41] p-5 sm:p-6 shadow-xs space-y-5">
      {/* Table Header & Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-headline font-bold text-base text-text-primary dark:text-white">
            Workspace Membership Requests
          </h3>
          <span className="text-xs text-text-muted">({total} total)</span>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <div className="flex rounded-lg border border-border-subtle dark:border-[#2e2f41] overflow-hidden bg-canvas-main dark:bg-[#141529] p-0.5">
            {[
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-[#242542] text-btn-primary shadow-xs'
                    : 'text-text-secondary dark:text-text-muted hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 flex items-center justify-between gap-3 text-severity-blocker text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchRequests}
            className="underline font-bold hover:text-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-btn-primary animate-spin mb-3" />
          <p className="font-body text-xs font-medium text-text-muted">
            Loading join requests...
          </p>
        </div>
      ) : requests.length === 0 ? (
        /* Empty State */
        <div className="py-12 px-4 rounded-xl border border-dashed border-border-subtle dark:border-[#2e2f41] flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-canvas-main dark:bg-[#141529] text-text-muted flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-headline font-semibold text-sm text-text-primary dark:text-white">
            No {statusFilter === 'all' ? '' : statusFilter} join requests
          </h4>
          <p className="font-body text-xs text-text-muted mt-1 max-w-sm">
            {statusFilter === 'pending'
              ? 'New requests submitted using your organization join code will appear here for review.'
              : 'There are currently no records matching this filter.'}
          </p>
        </div>
      ) : (
        /* Requests Table */
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle dark:border-[#2e2f41] text-text-muted uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-5 sm:px-6">Requester</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60 dark:divide-[#2e2f41]">
              {requests.map((r) => {
                const requesterName = r.user?.full_name || r.requester_name || 'Applicant';
                const requesterEmail = r.user?.email || r.requester_email || '—';
                const isPending = r.status?.toLowerCase() === 'pending';

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-canvas-main/50 dark:hover:bg-[#141529]/50 transition-colors"
                  >
                    {/* Requester Profile */}
                    <td className="py-3.5 px-5 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={r.user?.avatar_url}
                          name={requesterName}
                          size="md"
                          ring="ring-1 ring-border-subtle"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-text-primary dark:text-white block truncate">
                            {requesterName}
                          </span>
                          <span className="text-[11px] text-text-muted block truncate font-mono">
                            {requesterEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Message */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {r.message ? (
                        <div className="flex items-start gap-1.5 text-text-secondary dark:text-text-muted">
                          <MessageSquare className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                          <span className="line-clamp-2 italic" title={r.message}>
                            "{r.message}"
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted italic">No message provided</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-text-secondary dark:text-text-muted whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>

                    {/* Decision Actions */}
                    <td className="py-3.5 px-5 sm:px-6 text-right whitespace-nowrap">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRejectTarget(r)}
                            className="h-8 px-3 rounded-lg border border-severity-blocker/30 hover:bg-severity-blocker/10 text-severity-blocker font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproveTarget(r)}
                            className="h-8 px-3 rounded-lg bg-status-resolved hover:bg-emerald-600 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-text-muted text-[11px]">
                          {r.decided_at
                            ? `Decided ${new Date(r.decided_at).toLocaleDateString()}`
                            : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border-subtle dark:border-[#2e2f41] text-xs text-text-muted">
          <span>
            Showing <span className="font-semibold text-text-primary dark:text-white">{startRange}</span> to{' '}
            <span className="font-semibold text-text-primary dark:text-white">{endRange}</span> of{' '}
            <span className="font-semibold text-text-primary dark:text-white">{total}</span> requests
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-border-subtle dark:border-[#2e2f41] bg-surface-card dark:bg-[#242542] hover:bg-canvas-lavender disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-border-subtle dark:border-[#2e2f41] bg-surface-card dark:bg-[#242542] hover:bg-canvas-lavender disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleConfirmApprove}
        variant="success"
        title="Approve Join Request?"
        description={`Are you sure you want to approve ${approveTarget?.user?.full_name || approveTarget?.requester_name || 'this applicant'}? They will immediately receive active workspace member access.`}
        confirmText="Approve Member"
        cancelText="Cancel"
        isLoading={isApproving}
      />

      {/* Reject Modal with Optional Decision Reason */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setDecisionReason('');
        }}
        title="Reject Join Request"
        subtitle={`Decline workspace access for ${rejectTarget?.user?.full_name || rejectTarget?.requester_name || 'applicant'}.`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              disabled={isRejecting}
              onClick={() => {
                setRejectTarget(null);
                setDecisionReason('');
              }}
              className="px-4 py-2 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRejecting}
              onClick={handleConfirmReject}
              className="px-4 py-2 rounded-lg bg-severity-blocker hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            The applicant will be notified that their request was rejected. You may optionally include a feedback note or explanation below.
          </p>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-xs font-medium text-text-primary dark:text-white">
                Reason for Rejection <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-text-muted">
                {decisionReason.length} / 500
              </span>
            </div>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="e.g., Please contact HR or verify your department join code..."
              className="w-full p-2.5 rounded-lg bg-canvas-main dark:bg-[#141529] border border-border-subtle dark:border-[#2e2f41] text-text-primary dark:text-white text-xs resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default JoinRequestsTable;
