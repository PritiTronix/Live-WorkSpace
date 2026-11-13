import React, { useState } from 'react';
import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonTable } from '../components/Skeleton';
import ErrorState from '../components/ErrorState';
import RbacState from '../components/RbacState';

/**
 * Screen 25: Live Workspace - Skeleton Loading, Error & RBAC States
 * Stitch ID: 9401addd63864bb5a08ec0426ea34e5a
 * Route: /design-system/states or /workspace/design-system/states
 */
export const StatesCatalogPage = () => {
  const [activeTab, setActiveTab] = useState('skeletons'); // 'skeletons' | 'errors' | 'rbac'
  const [showLoadedState, setShowLoadedState] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSimulateRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      setFeedback('Reconnection verified. Service responding normally.');
      setTimeout(() => setFeedback(null), 3000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-canvas-main p-6 lg:p-10">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-text-primary text-white font-label-md text-label-md shadow-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Screen 25 • Stitch Design System
              </span>
              <span className="text-text-muted text-xs">Prompts 86-88</span>
            </div>
            <h1 className="font-headline text-headline-xl text-text-primary tracking-tight">
              Skeleton Loading, Error & RBAC States
            </h1>
            <p className="font-body text-body-md text-text-secondary mt-1 max-w-2xl">
              Design standards for asynchronous states: pulse shimmer placeholders, server error diagnostics, and zero-trust permission boundaries.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-white border border-border-subtle shadow-sm self-start">
            <button
              type="button"
              onClick={() => setActiveTab('skeletons')}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
                activeTab === 'skeletons'
                  ? 'bg-btn-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>1. Skeletons</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('errors')}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
                activeTab === 'errors'
                  ? 'bg-btn-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>2. Error States</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rbac')}
              className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-2 ${
                activeTab === 'rbac'
                  ? 'bg-btn-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>3. RBAC & Access</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* TAB 1: SKELETON LOADING (Prompt 86) */}
        {activeTab === 'skeletons' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Control Bar */}
            <div className="p-4 rounded-xl bg-white border border-border-subtle shadow-sm flex items-center justify-between">
              <div>
                <span className="font-headline text-headline-sm text-text-primary block">
                  Skeleton Loading Matrix
                </span>
                <span className="font-body text-body-sm text-text-secondary">
                  Toggle to preview placeholder animations vs loaded component representations.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLoadedState(!showLoadedState)}
                className="px-4 py-2 rounded-lg border border-border-subtle bg-canvas-main hover:bg-canvas-lavender font-label-md text-label-md text-text-primary transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>{showLoadedState ? 'Show Shimmer Placeholders' : 'Show Loaded State'}</span>
              </button>
            </div>

            {/* Metric Skeletons */}
            <div>
              <h3 className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-3">
                Metric Card Placeholders
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white border border-border-subtle shadow-sm">
                    {showLoadedState ? (
                      <div>
                        <span className="font-body-sm text-body-sm text-text-secondary block">
                          SLA Adherence Rate
                        </span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="font-headline text-headline-lg text-text-primary">99.8%</span>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            +0.4%
                          </span>
                        </div>
                        <span className="text-xs text-text-muted mt-2 block">Against Tier 1 Target</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Card Shimmer Components */}
            <div>
              <h3 className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-3">
                Ticket & Incident Card Shimmer
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((idx) => (
                  <SkeletonCard key={idx} />
                ))}
              </div>
            </div>

            {/* Table Shimmer Component */}
            <div>
              <h3 className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-3">
                Data Table Shimmer
              </h3>
              <SkeletonTable rows={4} cols={4} />
            </div>
          </div>
        )}

        {/* TAB 2: ERROR STATES (Prompt 87) */}
        {activeTab === 'errors' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 500 Error State */}
              <div>
                <span className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-2 block">
                  500 Server / API Exception
                </span>
                <ErrorState
                  variant="500"
                  onRetry={handleSimulateRetry}
                  isRetrying={isRetrying}
                />
              </div>

              {/* 404 Error State */}
              <div>
                <span className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-2 block">
                  404 Resource Not Found
                </span>
                <ErrorState
                  variant="404"
                  title="Incident TKT-9999 Not Found"
                  description="The incident ticket or RCA report you searched for does not exist in this project."
                />
              </div>

              {/* Network Lost */}
              <div>
                <span className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-2 block">
                  Network Disconnection
                </span>
                <ErrorState
                  variant="network"
                  onRetry={handleSimulateRetry}
                  isRetrying={isRetrying}
                />
              </div>

              {/* Empty Search State */}
              <div>
                <span className="font-label-md text-label-md text-text-muted uppercase tracking-wider mb-2 block">
                  Empty Search Filter
                </span>
                <ErrorState
                  variant="empty-search"
                  title="No Matching Tickets"
                  description="No tickets match the active status 'Blocker' and assignee 'Maya Shah'."
                  actionText="Reset Filter Matrix"
                  onAction={() => showFeedback('Filters reset to default.')}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RBAC & PERMISSION BOUNDARIES (Prompt 88) */}
        {activeTab === 'rbac' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <RbacState
              requiredRole="Platform SRE Lead"
              currentRole="Platform Engineer (Member)"
              resourceName="Kafka Production Cluster & Incident RCA Escalation Engine"
              onRequestAccess={(justification) => {
                setFeedback(`Elevation requested: "${justification.slice(0, 35)}..."`);
              }}
            />

            {/* Role Matrix Reference */}
            <div className="p-6 rounded-2xl bg-white border border-border-subtle shadow-sm">
              <h3 className="font-headline text-headline-sm text-text-primary mb-2">
                Workspace Role & Privilege Hierarchy
              </h3>
              <p className="font-body text-body-sm text-text-secondary mb-4">
                Enterprise RBAC roles enforced by backend middleware and route guards:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { role: 'Owner', badge: 'bg-primary text-white', desc: 'Full organization authority, billing, deletion' },
                  { role: 'Admin', badge: 'bg-primary-fixed text-primary', desc: 'Member provisioning, project settings, SLA configuration' },
                  { role: 'Manager / Lead', badge: 'bg-canvas-lavender text-text-primary', desc: 'Ticket triage, RCA approvals, sprint dispatch' },
                  { role: 'Member', badge: 'bg-canvas-main text-text-secondary', desc: 'Create tasks, comment, update assigned work' },
                ].map((item) => (
                  <div key={item.role} className="p-4 rounded-xl bg-canvas-main border border-border-subtle/80">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block mb-2 ${item.badge}`}>
                      {item.role}
                    </span>
                    <p className="font-body text-body-sm text-text-secondary">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatesCatalogPage;

