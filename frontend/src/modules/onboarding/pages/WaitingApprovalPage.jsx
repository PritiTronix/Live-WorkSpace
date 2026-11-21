import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ArrowLeft, Loader2, Building, Radio, RefreshCw } from 'lucide-react';
import { organizationService, authService, connectNotificationsWebSocket, getApiErrorMessage, resolveApiUrl } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

/**
 * WaitingApprovalPage
 * Route: /onboarding/waiting
 * Real-time Join Request Status:
 * - Shows organization name, status badge, and cancel action.
 * - Subscribes to notification WebSocket for instant approval/rejection updates.
 * - On approval -> refreshes authenticated user profile -> transitions to /workspace/dashboard.
 * - On rejection -> displays clear rejection feedback and action to try again.
 * - If no pending or active request exists -> automatically steers to /onboarding.
 */
export const WaitingApprovalPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const wsRef = useRef(null);

  // Checks current user's join requests
  const fetchRequestStatus = useCallback(async () => {
    try {
      const requests = await organizationService.myJoinRequests();
      if (!Array.isArray(requests) || requests.length === 0) {
        // If there is no pending or prior request, redirect to /onboarding
        navigate('/onboarding', { replace: true });
        return;
      }

      // Check if there is an active pending request or the most recent request
      const pendingReq = requests.find((r) => r.status === 'pending');
      const mostRecentReq = requests[0];
      const targetReq = pendingReq || mostRecentReq;

      if (!targetReq) {
        navigate('/onboarding', { replace: true });
        return;
      }

      // If approved -> force fresh session check -> dashboard
      if (targetReq.status === 'approved') {
        const refreshedUser = await refreshUser({ force: true });
        if (refreshedUser && !refreshedUser.organization_required) {
          navigate('/workspace/dashboard', { replace: true });
        } else {
          navigate('/workspace/dashboard', { replace: true });
        }
        return;
      }

      // If cancelled and not pending -> steer back to onboarding
      if (targetReq.status === 'cancelled') {
        navigate('/onboarding', { replace: true });
        return;
      }

      setActiveRequest(targetReq);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to fetch join request status.'));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Initial load and periodic poll fallback
  useEffect(() => {
    fetchRequestStatus();

    // Re-verify on window focus/visibility change
    const handleFocus = () => {
      fetchRequestStatus();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 8-second polling fallback
    const pollInterval = setInterval(() => {
      fetchRequestStatus();
    }, 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      clearInterval(pollInterval);
    };
  }, [fetchRequestStatus]);

  // Notifications WebSocket Live Listener
  useEffect(() => {
    const handleWsMessage = (data) => {
      // Whenever a join request decision or notification arrives, re-check status
      if (
        data.event === 'join_request_approved' ||
        data.event === 'join_request_decided' ||
        data.event === 'new_notification' ||
        data.type === 'join_request'
      ) {
        fetchRequestStatus();
      }
    };

    const handleWsStatus = (status) => {
      setIsWsConnected(status === 'open');
    };

    const ws = connectNotificationsWebSocket(
      handleWsMessage,
      () => setIsWsConnected(false),
      handleWsStatus
    );
    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchRequestStatus]);

  // Cancel join request handler
  const handleCancel = async () => {
    if (!activeRequest || cancelling) return;

    setCancelling(true);
    setActionError(null);

    try {
      await organizationService.cancelJoinRequest(activeRequest.id);
      // Cancelled successfully -> return to onboarding
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to cancel join request.'));
      setCancelling(false);
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Clock className="w-6 h-6 text-btn-primary" />
        </div>
        <p className="font-body text-sm font-medium text-text-secondary animate-pulse">
          Retrieving organization request status...
        </p>
      </div>
    );
  }

  // Active Pending State
  if (activeRequest?.status === 'pending') {
    return (
      <div className="w-full max-w-xl mx-auto py-6 px-4 animate-in fade-in duration-200">
        <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-6 sm:p-8">
          {/* Header Badge */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4 relative">
              <Clock className="w-7 h-7" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Pending Administrator Approval</span>
            </div>

            <h1 className="font-headline font-bold text-2xl text-text-primary tracking-tight">
              Request Submitted
            </h1>
            <p className="font-body text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              Your membership request is currently awaiting review from workspace administrators.
            </p>
          </div>

          {/* Action error banner */}
          {actionError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 text-severity-blocker text-sm font-medium"
            >
              {actionError}
            </div>
          )}

          {/* Organization Details Card */}
          <div className="p-4 rounded-xl bg-canvas-main border border-border-subtle mb-6 space-y-3">
            <div className="flex items-center gap-3">
              {activeRequest.organization_logo ? (
                <img
                  src={resolveApiUrl(activeRequest.organization_logo)}
                  alt={activeRequest.organization_name || 'Organization'}
                  className="w-12 h-12 rounded-xl object-cover border border-border-subtle shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                  <Building className="w-6 h-6 text-btn-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs text-text-muted font-medium block">
                  Target Workspace
                </span>
                <span className="font-headline font-semibold text-base text-text-primary truncate block">
                  {activeRequest.organization_name || 'Live Workspace Organization'}
                </span>
              </div>
            </div>

            {activeRequest.message && (
              <div className="pt-3 border-t border-border-subtle/80 text-xs text-text-secondary">
                <span className="font-medium text-text-primary block mb-0.5">Your Message:</span>
                <p className="italic bg-surface-card p-2.5 rounded-lg border border-border-subtle/60 text-text-secondary">
                  "{activeRequest.message}"
                </p>
              </div>
            )}
          </div>

          {/* Live Sync Status Indicator */}
          <div className="flex items-center justify-between text-xs text-text-muted px-1 mb-6">
            <div className="flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isWsConnected ? 'text-status-resolved animate-pulse' : 'text-text-muted'}`} />
              <span>{isWsConnected ? 'Real-time sync active' : 'Syncing updates...'}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchRequestStatus()}
              className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Cancel Request Action */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full h-11 rounded-xl border border-severity-blocker/30 bg-severity-blocker/5 hover:bg-severity-blocker/10 text-severity-blocker font-label-md text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cancelling Request...</span>
                </>
              ) : (
                <span>Cancel Join Request</span>
              )}
            </button>
            <p className="text-center text-[11px] text-text-muted">
              Cancelling will remove your pending submission and allow you to enter a new code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rejected / Declined State
  if (activeRequest?.status === 'rejected') {
    return (
      <div className="w-full max-w-xl mx-auto py-6 px-4 animate-in fade-in duration-200">
        <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-severity-blocker/10 text-severity-blocker flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-severity-blocker/10 text-severity-blocker text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Request Declined</span>
          </div>

          <h1 className="font-headline font-bold text-2xl text-text-primary tracking-tight">
            Join Request Not Approved
          </h1>
          <p className="font-body text-sm text-text-secondary mt-1.5 max-w-md mx-auto">
            Your request to join <span className="font-semibold text-text-primary">{activeRequest.organization_name || 'the organization'}</span> was declined by workspace administrators.
          </p>

          {activeRequest.decision_reason && (
            <div className="my-5 p-3.5 rounded-xl bg-canvas-main border border-border-subtle text-left text-xs">
              <span className="font-medium text-text-primary block mb-1">Feedback provided:</span>
              <p className="italic text-text-secondary leading-relaxed">
                "{activeRequest.decision_reason}"
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/onboarding')}
              className="w-full h-11 rounded-xl bg-btn-primary text-white font-label-md text-sm font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/onboarding/create-org')}
              className="w-full h-11 rounded-xl border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary text-sm font-medium transition-colors"
            >
              <span>Create an Organization Instead</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback fallback if status resolved or unknown
  return (
    <div className="w-full max-w-xl mx-auto py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-status-resolved/10 text-status-resolved flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-6 h-6" />
      </div>
      <h2 className="font-headline font-semibold text-xl text-text-primary">
        Status Updated
      </h2>
      <p className="font-body text-xs text-text-secondary mt-1 mb-6">
        Redirecting to workspace...
      </p>
      <button
        type="button"
        onClick={() => navigate('/onboarding', { replace: true })}
        className="px-4 py-2 rounded-xl bg-btn-primary text-white text-xs font-semibold"
      >
        Continue
      </button>
    </div>
  );
};

export default WaitingApprovalPage;
