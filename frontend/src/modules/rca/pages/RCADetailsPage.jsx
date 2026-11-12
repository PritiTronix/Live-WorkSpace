import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { rcaService } from "../../../services/api";
import RCAFiveWhysEditor from "../components/RCAFiveWhysEditor";
import RCATimelineEditor from "../components/RCATimelineEditor";
import RCAActionItemsTracker from "../components/RCAActionItemsTracker";
import RCAVersionHistoryDrawer from "../components/RCAVersionHistoryDrawer";
import ApiErrorState from "../../../components/ApiErrorState";

export default function RCADetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rca, setRca] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const loadRca = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await rcaService.getRcaById(id);
      setRca(res?.data || res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadRca();
    }
  }, [id]);

  const handleApprove = async () => {
    if (!rca) return;
    try {
      setActionLoading(true);
      await rcaService.approveRca(rca.id);
      await loadRca();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to approve RCA");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!rca) return;
    try {
      setActionLoading(true);
      await rcaService.publishRca(rca.id);
      await loadRca();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to publish RCA");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-text-muted">
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-body-md text-body-md">Loading RCA details...</span>
        </div>
      </div>
    );
  }

  if (error || !rca) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <ApiErrorState
          error={error}
          onRetry={loadRca}
          title="RCA Record Not Available"
          message="Could not load the requested root cause analysis document."
        />
      </div>
    );
  }

  // Active document data (either historical snapshot or current rca record)
  const activeDoc = selectedSnapshot || rca;
  const isViewingHistoricalSnapshot = Boolean(selectedSnapshot);

  return (
    <div className="flex flex-col w-full space-y-6 pb-20">
      {/* Historical snapshot banner if viewing older version */}
      {isViewingHistoricalSnapshot && (
        <div className="bg-severity-major/15 border border-severity-major/30 text-text-primary px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-severity-major">history</span>
            <span className="text-sm font-semibold">
              Viewing Historical Snapshot: Version {selectedSnapshot.version_number} (Created{" "}
              {new Date(selectedSnapshot.created_at).toLocaleString()})
            </span>
          </div>
          <button
            onClick={() => setSelectedSnapshot(null)}
            className="text-xs font-semibold px-3 py-1 bg-surface-card hover:bg-surface-container rounded-lg shadow-sm"
          >
            Return to Current Version
          </button>
        </div>
      )}

      {/* Governance Assurance Banner */}
      <div className="relative overflow-hidden bg-surface-container-high rounded-xl p-4 shadow-sm border border-border-subtle/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">verified_user</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm">Formal Compliance Record</span>
                <span className="px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved text-xs font-semibold">
                  v{activeDoc.version || activeDoc.version_number}.0
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                This document is an audited incident artifact. Revisions are version-locked and isolated from ticket threads.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-text-muted">Retention Policy: Tier-1 SOC2</span>
            <div className="h-4 w-px bg-outline-variant/40" />
            <span className="text-xs text-btn-primary font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">lock</span>
              {rca.status === "draft" ? "Draft Mode" : "Locked Audit Record"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Deck */}
      <div className="bg-surface-card rounded-xl p-6 shadow-sm border border-border-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {activeDoc.ticket_id && (
              <span className="px-2.5 py-0.5 rounded-full bg-btn-primary/10 text-btn-primary text-xs font-semibold">
                #{activeDoc.ticket_id}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize flex items-center gap-1.5 ${
                activeDoc.status === "approved" || activeDoc.status === "published"
                  ? "bg-status-resolved/15 text-status-resolved"
                  : activeDoc.status === "submitted" || activeDoc.status === "under_review"
                  ? "bg-status-open/15 text-status-open"
                  : "bg-surface-container text-text-secondary"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {activeDoc.status || "draft"} (v{activeDoc.version || activeDoc.version_number}.0)
            </span>
            <span className="text-text-muted text-xs">•</span>
            <span className="text-xs text-text-secondary">
              Updated {new Date(activeDoc.updated_at || activeDoc.created_at).toLocaleDateString()}
            </span>
            {activeDoc.severity && (
              <>
                <span className="text-text-muted text-xs">•</span>
                <span className="px-2 py-0.5 rounded bg-severity-blocker/10 text-severity-blocker text-xs font-semibold uppercase">
                  {activeDoc.severity}
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl font-bold text-text-primary tracking-tight font-headline-xl">
            {activeDoc.title}
          </h1>

          {/* Workflow Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {rca.lead_investigator && (
              <div className="flex items-center gap-2 bg-canvas-lavender px-3 py-1 rounded-lg text-xs">
                <span className="material-symbols-outlined text-sm text-text-muted">person</span>
                <span className="font-semibold text-text-primary">
                  {rca.lead_investigator.full_name || rca.lead_investigator.email}
                </span>
                <span className="text-text-muted">(Lead Investigator)</span>
              </div>
            )}
            {rca.approved_at && (
              <div className="flex items-center gap-1.5 bg-status-resolved/10 text-status-resolved px-3 py-1 rounded-lg text-xs font-semibold">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Approved on {new Date(rca.approved_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Deck */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="h-9 px-3 bg-surface-card hover:bg-canvas-lavender text-text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-border-subtle shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Version History</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3 bg-surface-card hover:bg-canvas-lavender text-text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-border-subtle shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert("RCA document URL copied to clipboard.");
              }
            }}
            className="h-9 px-3 bg-surface-card hover:bg-canvas-lavender text-text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-border-subtle shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span>Share</span>
          </button>

          {/* Edit / Revise Button */}
          <button
            type="button"
            onClick={() => navigate(`/workspace/rca/${rca.id}/edit`)}
            className="h-9 px-3 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>{rca.status === "draft" ? "Edit Draft" : "Create Revision"}</span>
          </button>

          {/* Workflow approval buttons for submitted documents */}
          {rca.status === "submitted" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleApprove}
              className="h-9 px-3.5 bg-status-resolved hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">check</span>
              <span>Approve RCA</span>
            </button>
          )}

          {rca.status === "approved" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handlePublish}
              className="h-9 px-3.5 bg-btn-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">publish</span>
              <span>Publish RCA</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid: Left 8 Cols (Document) + Right 4 Cols (Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Primary Document Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Problem Summary */}
          <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-3">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">1</span>
              Problem Summary
            </h2>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
              {activeDoc.problem_summary || (
                <span className="text-text-muted italic">No problem summary provided.</span>
              )}
            </p>
          </div>

          {/* Root Cause */}
          <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">2</span>
                Root Cause Mechanism
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-severity-blocker/10 text-severity-blocker text-xs font-semibold">
                Deterministic Cause
              </span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
              {activeDoc.root_cause || (
                <span className="text-text-muted italic">No root cause details specified.</span>
              )}
            </p>
          </div>

          {/* Technical Details & Stack Traces */}
          {activeDoc.technical_details && (
            <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-3">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">3</span>
                Technical Details &amp; Stack Traces
              </h2>
              <div className="p-4 rounded-lg bg-surface-container-low font-mono text-xs text-text-primary overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {activeDoc.technical_details}
              </div>
            </div>
          )}

          {/* Five Whys Methodology */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2 px-1">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">4</span>
              Five Whys Causal Investigation
            </h2>
            <RCAFiveWhysEditor
              whys={Array.isArray(activeDoc.five_whys) ? activeDoc.five_whys : []}
              readOnly={true}
            />
          </div>

          {/* Incident Timeline Chronology */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2 px-1">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">5</span>
              Incident Timeline &amp; Key Milestones
            </h2>
            <RCATimelineEditor
              events={Array.isArray(activeDoc.timeline_events) ? activeDoc.timeline_events : []}
              readOnly={true}
            />
          </div>

          {/* Preventative Action Items */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2 px-1">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">6</span>
              Preventative Action Items
            </h2>
            <RCAActionItemsTracker
              rcaId={rca.id}
              actionItems={Array.isArray(rca.action_items) ? rca.action_items : []}
              onActionItemsUpdated={(items) => {
                setRca((prev) => (prev ? { ...prev, action_items: items } : prev));
              }}
              isFormMode={false}
            />
          </div>
        </div>

        {/* Right Column (4 cols): Bento Summary & Scope */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Target Incident */}
          <div className="rounded-xl bg-surface-card p-5 shadow-sm border border-border-subtle space-y-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
              Incident Details
            </span>
            <div className="flex items-center gap-2">
              {activeDoc.severity && (
                <span className="px-2 py-0.5 rounded bg-severity-blocker/10 text-severity-blocker text-xs font-bold uppercase">
                  {activeDoc.severity}
                </span>
              )}
              <span className="text-base font-bold text-text-primary">
                {activeDoc.ticket_id ? `#${activeDoc.ticket_id}` : "Standalone RCA"}
              </span>
            </div>
            {activeDoc.service_affected && (
              <p className="text-xs text-text-secondary">
                Service: <strong className="text-text-primary">{activeDoc.service_affected}</strong>
              </p>
            )}
            {activeDoc.outage_duration_minutes !== null && (
              <p className="text-xs text-text-secondary">
                Duration: <strong className="text-text-primary">{activeDoc.outage_duration_minutes} minutes</strong>
              </p>
            )}
          </div>

          {/* Card 2: Impact */}
          {activeDoc.customer_impact && (
            <div className="rounded-xl bg-surface-card p-5 shadow-sm border border-border-subtle space-y-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block">
                Customer Impact
              </span>
              <p className="text-xs text-text-secondary leading-relaxed">
                {activeDoc.customer_impact}
              </p>
            </div>
          )}

          {/* Card 3: Governance Identity */}
          <div className="rounded-xl bg-surface-card p-5 shadow-sm border border-border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Governance Scope
              </span>
              <span className="material-symbols-outlined text-sm text-status-resolved">task_alt</span>
            </div>
            <div className="text-base font-bold text-primary tracking-wide">
              RCA-REV-{activeDoc.version || activeDoc.version_number}
            </div>
            <p className="text-xs text-text-secondary">
              Mandate: SOC2 Section 4.12 post-incident documentation policy.
            </p>
          </div>
        </div>
      </div>

      {/* Audit & Version History Drawer */}
      <RCAVersionHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        rcaId={rca.id}
        currentVersion={rca.version}
        onSelectVersion={(snap) => {
          setSelectedSnapshot(snap);
          setHistoryOpen(false);
        }}
      />
    </div>
  );
}
