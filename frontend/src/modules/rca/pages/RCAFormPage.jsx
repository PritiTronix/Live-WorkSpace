import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { rcaService } from "../../../services/api";
import { RCA_SEVERITY, RCA_STATUS } from "../constants/rcaConstants";
import RCAFiveWhysEditor from "../components/RCAFiveWhysEditor";
import RCATimelineEditor from "../components/RCATimelineEditor";
import RCAActionItemsTracker from "../components/RCAActionItemsTracker";
import ApiErrorState from "../../../components/ApiErrorState";

export default function RCAFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form fields starting strictly empty (per rule: no prefilled fake values)
  const [title, setTitle] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [severity, setSeverity] = useState("");
  const [serviceAffected, setServiceAffected] = useState("");
  const [outageDurationMinutes, setOutageDurationMinutes] = useState("");
  const [customerImpact, setCustomerImpact] = useState("");
  const [problemSummary, setProblemSummary] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [technicalDetails, setTechnicalDetails] = useState("");
  const [fiveWhys, setFiveWhys] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [version, setVersion] = useState(1);
  const [status, setStatus] = useState("draft");

  const loadExistingRca = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await rcaService.getRcaById(id);
      const data = res?.data || res;
      setTitle(data.title || "");
      setTicketId(data.ticket_id || "");
      setSeverity(data.severity || "");
      setServiceAffected(data.service_affected || "");
      setOutageDurationMinutes(data.outage_duration_minutes ?? "");
      setCustomerImpact(data.customer_impact || "");
      setProblemSummary(data.problem_summary || "");
      setRootCause(data.root_cause || "");
      setTechnicalDetails(data.technical_details || "");
      setFiveWhys(Array.isArray(data.five_whys) ? data.five_whys : []);
      setTimelineEvents(Array.isArray(data.timeline_events) ? data.timeline_events : []);
      setActionItems(Array.isArray(data.action_items) ? data.action_items : []);
      setVersion(data.version || 1);
      setStatus(data.status || "draft");
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      loadExistingRca();
    }
  }, [id]);

  const handleSubmit = async (submitForReview = false) => {
    if (!title.trim()) {
      alert("Please provide an RCA title.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        ticket_id: ticketId.trim() || null,
        severity: severity || "major",
        service_affected: serviceAffected.trim() || null,
        outage_duration_minutes: outageDurationMinutes !== "" ? parseInt(outageDurationMinutes, 10) : null,
        customer_impact: customerImpact.trim() || null,
        problem_summary: problemSummary.trim() || null,
        root_cause: rootCause.trim() || null,
        technical_details: technicalDetails.trim() || null,
        five_whys: fiveWhys,
        timeline_events: timelineEvents,
      };

      let rcaRecord;
      if (isEditing) {
        const res = await rcaService.updateRca(id, {
          ...payload,
          changelog_summary: submitForReview ? "Submitted for review" : "Updated draft",
        });
        rcaRecord = res?.data || res;
      } else {
        const res = await rcaService.createRca(payload);
        rcaRecord = res?.data || res;
      }

      const rcaId = rcaRecord.id || id;

      // Also persist any pending action items in draft mode if created locally
      if (!isEditing && actionItems.length > 0 && rcaId) {
        for (const item of actionItems) {
          try {
            await rcaService.createActionItem(rcaId, {
              description: item.description,
              assignee_id: item.assignee_id || null,
              priority: item.priority || "medium",
              due_date: item.due_date || null,
            });
          } catch {
            // Ignore individual action item creation errors on batch
          }
        }
      }

      if (submitForReview && rcaId) {
        await rcaService.submitRca(rcaId);
      }

      navigate(`/workspace/rca/${rcaId}`);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-text-muted">
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-body-md text-body-md">Loading RCA record...</span>
        </div>
      </div>
    );
  }

  if (error && !title && isEditing) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <ApiErrorState
          error={error}
          onRetry={loadExistingRca}
          title="Unable to load RCA form"
          message="Failed to retrieve root cause analysis record from database."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-semibold tracking-wider uppercase">
            <Link to="/workspace/rca" className="hover:text-primary transition-colors">
              RCA Governance
            </Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-text-secondary font-semibold">
              {ticketId ? `#${ticketId}` : "New Analysis"}
            </span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary font-semibold">
              {isEditing ? `Edit (v${version})` : "Create Record"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight font-headline-xl">
              {isEditing ? "Edit Root Cause Analysis (RCA)" : "Root Cause Analysis (RCA) Form"}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-status-wip animate-pulse" />
              <span className="capitalize">{status}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/workspace/rca")}
            className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-container rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">save</span>
            <span>{submitting ? "Saving..." : "Save as Draft"}</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-btn-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>{submitting ? "Submitting..." : "Submit for Review"}</span>
          </button>
        </div>
      </div>

      {error && (
        <ApiErrorState
          error={error}
          onRetry={() => handleSubmit(false)}
          title="Submission Error"
          message="Could not save changes to the database. Please check connection and try again."
        />
      )}

      {/* Governance Explanatory Banner */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-5 shadow-sm border border-border-subtle/40">
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-btn-primary/15 text-btn-primary flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-xl">policy</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary text-base">
                Formal RCA Governance Mandate
              </span>
              <span className="px-2 py-0.5 rounded-md bg-severity-blocker/10 text-severity-blocker text-xs font-bold uppercase">
                Audit Required
              </span>
            </div>
            <p className="text-sm text-text-secondary max-w-4xl leading-relaxed">
              Formal RCA Governance is strictly separate from informal discussion comments. This document establishes post-mortem accountability, SLA remediation metrics, regulatory audit trails, and preventative infrastructure policy across critical edge microservices.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Sections (8 cols) + Guidance / Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Card: Title, Ticket, Severity, Service, Duration */}
          <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">1</span>
              Incident Metadata &amp; Scope
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Incident Title <span className="text-severity-blocker">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Core Gateway TLS Handshake Latency Spike"
                  className="w-full rounded-lg bg-surface-container-low p-2.5 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Associated Ticket ID
                </label>
                <input
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="e.g. TKT-1025"
                  className="w-full rounded-lg bg-surface-container-low p-2.5 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Severity Level <span className="text-severity-blocker">*</span>
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-lg bg-surface-container-low p-2.5 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors capitalize"
                >
                  <option value="">Select severity...</option>
                  {Object.values(RCA_SEVERITY).map((sev) => (
                    <option key={sev} value={sev} className="capitalize">
                      {sev}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Service Affected
                </label>
                <input
                  type="text"
                  value={serviceAffected}
                  onChange={(e) => setServiceAffected(e.target.value)}
                  placeholder="e.g. auth-proxy, edge-gateway"
                  className="w-full rounded-lg bg-surface-container-low p-2.5 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Outage Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={outageDurationMinutes}
                  onChange={(e) => setOutageDurationMinutes(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full rounded-lg bg-surface-container-low p-2.5 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Customer &amp; Business Impact
                </label>
                <textarea
                  rows={2}
                  value={customerImpact}
                  onChange={(e) => setCustomerImpact(e.target.value)}
                  placeholder="Summary of users impacted, HTTP 5xx error rate spikes, financial exposure..."
                  className="w-full rounded-lg bg-surface-container-low p-2.5 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors resize-y"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Problem Summary */}
          <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center text-xs text-primary font-bold">2</span>
                <label className="font-semibold text-text-primary text-base" htmlFor="problemSummary">
                  Problem Summary <span className="text-severity-blocker">*</span>
                </label>
              </div>
              <span className="text-xs text-text-muted">Executive &amp; Stakeholder Visibility</span>
            </div>
            <p className="text-xs text-text-secondary">
              Provide a concise narrative of customer-visible symptoms, timeline triggers, and business service degradation.
            </p>
            <textarea
              id="problemSummary"
              rows={3}
              value={problemSummary}
              onChange={(e) => setProblemSummary(e.target.value)}
              placeholder="Between 10:48 AM and 11:16 AM EST, the global authentication ingress experienced sudden TLS handshake latency spikes..."
              className="w-full rounded-lg bg-surface-container-low p-3 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors resize-y"
            />
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Character count: {problemSummary.length} / 800</span>
              {problemSummary.length >= 50 && (
                <span className="text-status-resolved flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-sm">check_circle</span> Meets Quality Standard
                </span>
              )}
            </div>
          </div>

          {/* Section 3: Root Cause Mechanism */}
          <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center text-xs text-primary font-bold">3</span>
                <label className="font-semibold text-text-primary text-base" htmlFor="rootCause">
                  Root Cause Mechanism <span className="text-severity-blocker">*</span>
                </label>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-severity-blocker/10 text-severity-blocker text-xs font-semibold">
                Deterministic
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Specify the core physical, software, or architectural failure vector rather than incidental secondary effects.
            </p>
            <textarea
              id="rootCause"
              rows={3}
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Identify deterministic underlying fault, misconfiguration, or unhandled exception..."
              className="w-full rounded-lg bg-surface-container-low p-3 text-sm text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors resize-y"
            />
          </div>

          {/* Section 4: Technical Explanation */}
          <div className="rounded-xl bg-surface-card p-6 shadow-sm border border-border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-surface-container flex items-center justify-center text-xs text-primary font-bold">4</span>
                <label className="font-semibold text-text-primary text-base" htmlFor="techExplanation">
                  Technical Explanation &amp; Stack Traces
                </label>
              </div>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">code</span> Code &amp; Markdown Supported
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Document call stack, microservice dependency chain, thread allocation dynamics, and state transitions.
            </p>
            <textarea
              id="techExplanation"
              rows={4}
              value={technicalDetails}
              onChange={(e) => setTechnicalDetails(e.target.value)}
              placeholder="Paste stack traces, log excerpts, or configuration snippets..."
              className="w-full rounded-lg bg-surface-container-low p-3 font-mono text-xs text-text-primary border border-border-subtle focus:outline-none focus:border-primary transition-colors resize-y"
            />
          </div>

          {/* Section 5: Five Whys Editor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">5</span>
              <h2 className="text-base font-semibold text-text-primary">Five Whys Methodology</h2>
            </div>
            <RCAFiveWhysEditor
              whys={fiveWhys}
              onChange={setFiveWhys}
              readOnly={false}
            />
          </div>

          {/* Section 6: Incident Timeline Editor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">6</span>
              <h2 className="text-base font-semibold text-text-primary">Incident Timeline Chronology</h2>
            </div>
            <RCATimelineEditor
              events={timelineEvents}
              onChange={setTimelineEvents}
              readOnly={false}
            />
          </div>

          {/* Section 7: Action Items Tracker (Shared Component) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-6 h-6 rounded-md bg-surface-container text-primary flex items-center justify-center text-xs font-bold">7</span>
              <h2 className="text-base font-semibold text-text-primary">Preventative Action Items</h2>
            </div>
            <RCAActionItemsTracker
              rcaId={id}
              actionItems={actionItems}
              onActionItemsUpdated={setActionItems}
              isFormMode={!isEditing}
            />
          </div>
        </div>

        {/* Right Column: Governance Guidance & Checklist (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Post-Mortem Guidelines */}
          <div className="rounded-xl bg-surface-card p-5 shadow-sm border border-border-subtle space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">checklist</span>
              RCA Quality Checklist
            </h3>
            <ul className="space-y-2.5 text-xs text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-status-resolved shrink-0 mt-0.5">check_circle</span>
                <span>Blameless language focused on systemic and architecture defects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-status-resolved shrink-0 mt-0.5">check_circle</span>
                <span>Quantified customer impact with duration and affected region</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-status-resolved shrink-0 mt-0.5">check_circle</span>
                <span>At least 3 causal layers documented in the 5-Whys section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-sm text-status-resolved shrink-0 mt-0.5">check_circle</span>
                <span>At least one actionable preventative ticket created</span>
              </li>
            </ul>
          </div>

          {/* Workflow & Approvers */}
          <div className="rounded-xl bg-surface-card p-5 shadow-sm border border-border-subtle space-y-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">verified_user</span>
              Approval Workflow
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Once submitted, the record enters <strong>Under Review</strong> status and is locked for peer review by Incident Commanders and Tech Leads.
            </p>
            <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-1.5 text-text-secondary">
              <div className="flex items-center justify-between font-medium text-text-primary">
                <span>Sign-off Mandate:</span>
                <span className="text-primary font-semibold">Tier-1 Protocol</span>
              </div>
              <div>• 1 Incident Commander Sign-off</div>
              <div>• 1 Technical Lead Approval</div>
              <div>• Preventative tasks assigned with due dates</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
