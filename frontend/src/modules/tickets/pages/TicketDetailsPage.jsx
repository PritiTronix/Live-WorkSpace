import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ticketsService } from '../../../services/ticketsService';
import { STATUS_CONFIG, SEVERITY_CONFIG, TICKET_STATUSES, TICKET_SEVERITIES } from '../constants/ticketConstants';

export const TicketDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Comments state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Status & Severity menu toggles
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isSeverityMenuOpen, setIsSeverityMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  // Upload attachment trigger
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Fetch Ticket Data
  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketsService.getTicket(id);
      setTicket(data);
      setTitleInput(data.title || '');
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
      setError('Ticket not found or unable to load details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // WebSocket Live Updates
  useEffect(() => {
    const ws = ticketsService.createTicketsWebSocket('org_01', (event) => {
      if (
        (event.type === 'ticket_updated' && event.ticket?.id === id) ||
        (event.type === 'ticket_comment_added' && event.ticket_id === id)
      ) {
        fetchTicket();
      }
    });
    return () => {
      if (ws) ws.close();
    };
  }, [id, fetchTicket]);

  // Update Status
  const handleStatusChange = async (newStatus) => {
    setIsStatusMenuOpen(false);
    if (!ticket || ticket.status === newStatus) return;
    try {
      setTicket(prev => ({ ...prev, status: newStatus }));
      await ticketsService.updateTicket(id, { status: newStatus });
      fetchTicket();
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchTicket();
    }
  };

  // Update Severity
  const handleSeverityChange = async (newSeverity) => {
    setIsSeverityMenuOpen(false);
    if (!ticket || ticket.severity === newSeverity) return;
    try {
      setTicket(prev => ({ ...prev, severity: newSeverity }));
      await ticketsService.updateTicket(id, { severity: newSeverity });
      fetchTicket();
    } catch (err) {
      console.error('Failed to update severity:', err);
      fetchTicket();
    }
  };

  // Update Title
  const handleSaveTitle = async () => {
    if (!titleInput.trim() || titleInput === ticket.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      setTicket(prev => ({ ...prev, title: titleInput.trim() }));
      setIsEditingTitle(false);
      await ticketsService.updateTicket(id, { title: titleInput.trim() });
      fetchTicket();
    } catch (err) {
      console.error('Failed to update title:', err);
      fetchTicket();
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    try {
      setSubmittingComment(true);
      await ticketsService.addComment(id, { content: newComment.trim() });
      setNewComment('');
      fetchTicket();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Upload Attachment
  const handleUploadClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.txt,.json,.csv,.log,.pcap,.zip,.md';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        setUploadingAttachment(true);
        await ticketsService.addAttachment(id, file);
        fetchTicket();
      } catch (err) {
        console.error('Failed to attach file:', err);
        alert(err.response?.data?.detail || 'Failed to upload attachment.');
      } finally {
        setUploadingAttachment(false);
      }
    };
    input.click();
  };

  // Check SLA Status
  const isBreached = useMemo(() => {
    if (!ticket || ['resolved', 'closed'].includes(ticket.status)) return false;
    if (!ticket.deadline) return false;
    return new Date(ticket.deadline) < new Date();
  }, [ticket]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-text-secondary">
        <span className="material-symbols-outlined text-4xl animate-spin text-btn-primary mb-3">sync</span>
        <p className="font-label-md text-label-md">Loading ticket specifications...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-space-xl max-w-2xl mx-auto my-12 bg-surface-card rounded-xl shadow-sm text-center space-y-4">
        <span className="material-symbols-outlined text-5xl text-severity-blocker">error_outline</span>
        <h2 className="font-headline-md text-headline-md text-text-primary">Ticket Not Found</h2>
        <p className="font-body-md text-body-md text-text-secondary">{error || 'The requested ticket does not exist.'}</p>
        <button
          onClick={() => navigate('/workspace/tickets')}
          className="px-4 py-2 bg-btn-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm"
        >
          Return to Tickets
        </button>
      </div>
    );
  }

  const severityInfo = SEVERITY_CONFIG[ticket.severity] || SEVERITY_CONFIG.minor;
  const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;

  return (
    <div className="flex flex-col w-full min-h-screen bg-canvas-main pb-space-2xl">
      {/* SLA Breach Ambient Warning Banner */}
      {isBreached && (
        <div className="relative overflow-hidden bg-gradient-to-r from-error/15 via-error/10 to-surface-container-high px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md shadow-sm border-b border-severity-blocker/20">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-lg bg-severity-blocker text-on-error flex items-center justify-center shrink-0 animate-pulse">
              <span className="material-symbols-outlined text-lg">crisis_alert</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md text-severity-blocker uppercase tracking-wider font-bold">
                  SLA Target Breached
                </span>
                <span className="font-mono font-label-md text-label-md px-2 py-0.5 rounded-full bg-severity-blocker text-on-error font-bold">
                  OVERDUE
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary truncate">
                Resolution timeline for incident exceeded target deadline.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs shrink-0">
            <button
              onClick={() => handleStatusChange('wip')}
              className="h-8 px-3 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-sm text-label-sm shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm text-severity-blocker">notifications_active</span>
              <span>Acknowledge Escalation</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Workspace Content */}
      <div className="p-space-lg max-w-7xl w-full mx-auto space-y-space-lg">
        {/* Header & Action Row */}
        <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-md">
          {/* Breadcrumb + Ticket ID + Tags */}
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-2 text-text-secondary">
              <div className="flex items-center gap-1.5 font-label-md text-label-md text-text-muted">
                <Link to="/workspace/tickets" className="hover:text-primary cursor-pointer transition-colors">
                  Tickets
                </Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-primary font-bold">{ticket.ticket_number}</span>
              </div>
              <span className="text-text-muted text-xs">•</span>

              {/* Severity Pill */}
              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${severityInfo.bgBadge} ${severityInfo.textBadge} font-label-sm text-label-sm font-semibold capitalize`}>
                <span className={`w-1.5 h-1.5 rounded-full ${severityInfo.dot}`}></span>
                {severityInfo.shortLabel}
              </div>

              {/* Status Pill */}
              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.text} font-label-sm text-label-sm font-semibold`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                {statusInfo.label}
              </div>

              {ticket.project && (
                <span className="px-2 py-0.5 rounded-md bg-canvas-lavender text-text-secondary font-label-sm text-label-sm font-medium">
                  {ticket.project.title || ticket.project.name}
                </span>
              )}
            </div>

            {/* Quick Top Actions */}
            <div className="flex items-center gap-space-xs relative">
              {/* Change Status Dropdown */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsStatusMenuOpen(prev => !prev)}
                  className="h-9 px-3.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-base text-status-wip">sync_alt</span>
                  <span>Change Status</span>
                  <span className="material-symbols-outlined text-xs">expand_more</span>
                </button>
                {isStatusMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-surface-card rounded-xl shadow-lg border border-border-subtle py-1 z-30 animate-in fade-in">
                    {TICKET_STATUSES.map(st => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`w-full text-left px-3 py-2 text-label-sm font-label-sm flex items-center justify-between hover:bg-canvas-lavender ${ticket.status === st ? 'text-primary font-bold' : 'text-text-primary'}`}
                      >
                        <span>{STATUS_CONFIG[st]?.label}</span>
                        {ticket.status === st && <span className="material-symbols-outlined text-sm">check</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Severity Dropdown */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsSeverityMenuOpen(prev => !prev)}
                  className="h-9 px-3.5 rounded-lg bg-canvas-lavender hover:bg-surface-container text-text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">priority_high</span>
                  <span>Severity</span>
                  <span className="material-symbols-outlined text-xs">expand_more</span>
                </button>
                {isSeverityMenuOpen && (
                  <div className="absolute right-0 mt-1 w-40 bg-surface-card rounded-xl shadow-lg border border-border-subtle py-1 z-30 animate-in fade-in">
                    {TICKET_SEVERITIES.map(sev => (
                      <button
                        key={sev}
                        onClick={() => handleSeverityChange(sev)}
                        className={`w-full text-left px-3 py-2 text-label-sm font-label-sm flex items-center justify-between hover:bg-canvas-lavender ${ticket.severity === sev ? 'text-primary font-bold' : 'text-text-primary'}`}
                      >
                        <span>{SEVERITY_CONFIG[sev]?.shortLabel}</span>
                        {ticket.severity === sev && <span className="material-symbols-outlined text-sm">check</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Back to list */}
              <button
                type="button"
                onClick={() => navigate('/workspace/tickets')}
                className="h-9 px-3 rounded-lg bg-canvas-lavender hover:bg-surface-container text-text-secondary flex items-center justify-center transition-colors shadow-sm"
                title="Return to tickets list"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Main Ticket Title & Editable Row */}
          <div className="flex items-start justify-between gap-space-md pt-space-xs">
            <div className="flex items-baseline gap-space-sm group flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 w-full max-w-2xl">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full text-headline-lg font-headline-lg text-text-primary px-3 py-1 bg-canvas-lavender rounded-lg border border-primary outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="px-3 py-1.5 bg-btn-primary text-on-primary rounded-lg font-label-sm text-label-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setTitleInput(ticket.title);
                      setIsEditingTitle(false);
                    }}
                    className="px-3 py-1.5 bg-canvas-lavender text-text-secondary rounded-lg font-label-sm text-label-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
                    {ticket.title}
                  </h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-text-muted hover:text-primary transition-colors opacity-80 group-hover:opacity-100"
                    title="Edit title"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </>
              )}
            </div>

            <div className="hidden xl:flex items-center gap-3 shrink-0 text-text-secondary font-body-sm text-body-sm bg-canvas-lavender/60 px-3 py-1.5 rounded-lg">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-text-muted">schedule</span>
                Created: {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {ticket.deadline && (
                <>
                  <span className="text-text-muted">•</span>
                  <span className={`flex items-center gap-1 ${isBreached ? 'text-severity-blocker font-bold' : 'text-text-secondary'}`}>
                    <span className="material-symbols-outlined text-base">warning</span>
                    Target: {new Date(ticket.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Asymmetric Bento Grid: Left (Technical Context & Feed) | Right (Metadata, Attachments, Audit Log) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN: 8 Columns */}
          <div className="lg:col-span-8 space-y-space-lg">
            {/* SLA Milestone Flow & KPI Section */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-lg">
              <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">acute</span>
                  <h2 className="font-headline-sm text-headline-sm text-text-primary">Incident SLA Tracking &amp; Milestones</h2>
                </div>
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                  {ticket.severity === 'blocker' ? 'Tier-1 P0 Agreement' : 'Standard Service Level'}
                </span>
              </div>

              {/* Horizontal Stepper Visualization */}
              <div className="py-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                  {/* Step 1: Created */}
                  <div className="flex flex-col space-y-1.5 p-3 rounded-lg bg-canvas-lavender/80">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-status-resolved text-white flex items-center justify-center font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </span>
                      <span className="font-mono text-body-sm font-semibold text-text-primary">
                        {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-label-md text-label-md text-text-primary pt-1">Created</p>
                    <p className="font-body-sm text-body-sm text-text-secondary">Incident ingested</p>
                  </div>

                  {/* Step 2: First Response Met (Real Backend field ticket.first_response_at) */}
                  <div className="flex flex-col space-y-1.5 p-3 rounded-lg bg-status-resolved/10">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-status-resolved text-white flex items-center justify-center font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-sm">task_alt</span>
                      </span>
                      <span className="font-mono text-body-sm font-semibold text-status-resolved">
                        {ticket.first_response_at ? new Date(ticket.first_response_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </span>
                    </div>
                    <p className="font-label-md text-label-md text-text-primary pt-1">First Response</p>
                    <p className="font-body-sm text-body-sm text-status-resolved font-medium">
                      {ticket.first_response_at ? 'Target Met' : 'Awaiting Triage'}
                    </p>
                  </div>

                  {/* Step 3: Target Limit */}
                  <div className="flex flex-col space-y-1.5 p-3 rounded-lg bg-canvas-lavender/80">
                    <div className="flex items-center justify-between">
                      <span className={`w-6 h-6 rounded-full ${isBreached ? 'bg-severity-blocker text-white' : 'bg-outline text-white'} flex items-center justify-center font-label-sm text-label-sm`}>
                        <span className="material-symbols-outlined text-sm">{isBreached ? 'alarm_off' : 'schedule'}</span>
                      </span>
                      <span className="font-mono text-body-sm font-semibold text-text-primary">
                        {ticket.deadline ? new Date(ticket.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Flexible'}
                      </span>
                    </div>
                    <p className="font-label-md text-label-md text-text-primary pt-1">Resolution Target</p>
                    <p className="font-body-sm text-body-sm text-text-secondary">Expected cutoff</p>
                  </div>

                  {/* Step 4: Resolution Status */}
                  <div className={`flex flex-col space-y-1.5 p-3 rounded-lg ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-status-resolved/15' : isBreached ? 'bg-severity-blocker/15' : 'bg-canvas-lavender'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`w-6 h-6 rounded-full ${ticket.status === 'resolved' ? 'bg-status-resolved text-white' : isBreached ? 'bg-severity-blocker text-white animate-pulse' : 'bg-outline text-white'} flex items-center justify-center font-label-sm text-label-sm`}>
                        <span className="material-symbols-outlined text-sm">
                          {ticket.status === 'resolved' ? 'done_all' : isBreached ? 'priority_high' : 'sync'}
                        </span>
                      </span>
                      <span className={`font-mono text-body-sm font-bold ${isBreached ? 'text-severity-blocker' : 'text-text-primary'}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className={`font-label-md text-label-md ${isBreached ? 'text-severity-blocker font-bold' : 'text-text-primary'} pt-1`}>
                      {isBreached ? 'Breached' : statusInfo.label}
                    </p>
                    <p className="font-body-sm text-body-sm text-text-secondary">Current lifecycle</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Description & Specification */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-md">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-headline-sm text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">description</span>
                  Detailed Specification &amp; Description
                </h2>
              </div>
              <div className="font-body-md text-body-md text-text-primary space-y-space-sm leading-relaxed">
                <p>{ticket.description || 'No detailed replication summary provided for this ticket.'}</p>
              </div>

              {/* Steps to Reproduce (Real Backend field ticket.steps_to_reproduce) */}
              {ticket.steps_to_reproduce && (
                <div className="p-space-md bg-canvas-lavender/50 rounded-xl space-y-2 mt-3">
                  <span className="font-label-md text-label-md text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">terminal</span>
                    Steps to Reproduce
                  </span>
                  <div className="font-body-sm text-body-sm text-text-secondary whitespace-pre-wrap">
                    {ticket.steps_to_reproduce}
                  </div>
                </div>
              )}

              {/* Technical Log Snippet Box (Real Backend field ticket.diagnostic_trace) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-text-muted px-1">
                  <span>diagnostic-trace.log [{ticket.ticket_number}]</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(ticket.diagnostic_trace || `Ticket: ${ticket.ticket_number}\nTitle: ${ticket.title}`)}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy Trace
                  </button>
                </div>
                <div className="p-space-md bg-inverse-surface text-inverse-on-surface rounded-xl font-mono text-body-sm overflow-x-auto space-y-1">
                  {ticket.diagnostic_trace ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs">{ticket.diagnostic_trace}</pre>
                  ) : (
                    <>
                      <p className="text-text-muted">[{new Date(ticket.created_at).toISOString()}] INGESTION: {ticket.ticket_number} initialized</p>
                      <p className="text-status-wip">STATUS: Current state is {statusInfo.label} | Priority: {severityInfo.shortLabel}</p>
                      {ticket.deadline && <p className="text-text-muted">TARGET DEADLINE: {new Date(ticket.deadline).toISOString()}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Root Cause Analysis (RCA) Container (Real Backend fields) */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">clinical_notes</span>
                  </span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary">Formal Root Cause Analysis (RCA)</h3>
                    <span className="font-body-sm text-body-sm text-text-muted">Distinct from informal triage chatter</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-status-on-hold/15 text-status-on-hold font-label-sm text-label-sm font-semibold">
                  Triage Active
                </span>
              </div>
              <div className="p-space-md rounded-xl bg-canvas-lavender/60 space-y-3 font-body-sm text-body-sm text-text-primary">
                <div>
                  <span className="font-label-md text-label-md text-text-primary font-bold">Trigger Event:</span>
                  <p className="text-text-secondary mt-0.5">
                    {ticket.rca_trigger || 'Awaiting initial technical investigation and root-cause verification.'}
                  </p>
                </div>
                <div>
                  <span className="font-label-md text-label-md text-text-primary font-bold">Mitigation in Flight:</span>
                  <p className="text-text-secondary mt-0.5">
                    {ticket.rca_mitigation || 'Standard remediation protocol in progress under current sprint.'}
                  </p>
                </div>
                <div>
                  <span className="font-label-md text-label-md text-text-primary font-bold">Action Item Tracking:</span>
                  <p className="text-text-secondary mt-0.5">
                    {ticket.rca_action_items || 'No linked corrective tasks registered yet.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Discussion & Triage Feed */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">forum</span>
                  <h3 className="font-headline-sm text-headline-sm text-text-primary">Discussion &amp; Triage Feed</h3>
                  <span className="px-2 py-0.5 rounded-full bg-canvas-lavender text-text-secondary font-label-sm text-label-sm font-semibold">
                    {ticket.comments?.length || 0} items
                  </span>
                </div>
              </div>

              {/* Feed items */}
              <div className="space-y-space-md">
                {(!ticket.comments || ticket.comments.length === 0) ? (
                  <p className="text-center py-6 text-text-muted font-body-sm">
                    No comments yet. Post the first operational update below.
                  </p>
                ) : (
                  ticket.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-space-md">
                      <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-md text-label-md font-semibold shrink-0 shadow-sm">
                        {comment.author?.full_name ? comment.author.full_name.slice(0, 2).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md text-label-md text-text-primary font-bold">
                              {comment.author?.full_name || 'Team Member'}
                            </span>
                            <span className="text-text-muted text-xs">
                              • {new Date(comment.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                        <div className="p-space-md bg-canvas-lavender/40 rounded-xl space-y-1 font-body-md text-body-md text-text-secondary">
                          <p>{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Composer */}
              <form onSubmit={handleAddComment} className="p-space-md bg-canvas-lavender/60 rounded-xl space-y-space-sm">
                <span className="font-label-md text-label-md text-text-primary">Post Reply or Operational Update</span>
                <div className="bg-surface-card rounded-lg shadow-sm overflow-hidden">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your comment, update steps, or notes..."
                    className="w-full p-3 font-body-md text-body-md text-text-primary placeholder:text-text-muted outline-none resize-y"
                  ></textarea>
                  <div className="px-3 py-2 bg-canvas-lavender/30 flex items-center justify-between border-t border-border-subtle">
                    <span className="text-xs text-text-muted">Press Post Comment to submit</span>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-1.5 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-primary disabled:opacity-50 text-on-primary font-label-sm text-label-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
                      <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: 4 Columns (Metadata, Artifacts, Audit Trail) */}
          <div className="lg:col-span-4 space-y-space-lg">
            {/* Structured Metadata Card */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-md">
              <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
                <h2 className="font-headline-sm text-headline-sm text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">info</span>
                  Ticket Metadata
                </h2>
              </div>
              <div className="space-y-space-md font-body-sm text-body-sm">
                {/* Reported By */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Reported By</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm text-label-sm font-semibold">
                      {ticket.reporter?.full_name ? ticket.reporter.full_name.slice(0, 2).toUpperCase() : 'RP'}
                    </div>
                    <span className="font-label-md text-label-md text-text-primary">
                      {ticket.reporter?.full_name || 'System Reporter'}
                    </span>
                  </div>
                </div>

                {/* Assigned To */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Assigned To</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm text-label-sm font-semibold">
                      {ticket.assignee?.full_name ? ticket.assignee.full_name.slice(0, 2).toUpperCase() : 'UN'}
                    </div>
                    <span className="font-label-md text-label-md text-text-primary">
                      {ticket.assignee?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Project */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Project</span>
                  <span className="font-label-md text-label-md text-primary font-semibold">
                    {ticket.project?.title || ticket.project?.name || 'General Workspace'}
                  </span>
                </div>

                {/* Created Time */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Created Date</span>
                  <span className="font-mono text-text-primary">
                    {new Date(ticket.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* Last Updated */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Last Updated</span>
                  <span className="font-mono text-status-wip font-semibold">
                    {ticket.updated_at ? new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>

                {/* Expected Deadline */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Target Deadline</span>
                  <span className={`font-mono font-bold ${isBreached ? 'text-severity-blocker' : 'text-text-primary'}`}>
                    {ticket.deadline ? new Date(ticket.deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'None'}
                  </span>
                </div>

                {/* Severity */}
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Severity Tier</span>
                  <span className={`px-2 py-0.5 rounded ${severityInfo.bgBadge} ${severityInfo.textBadge} font-label-sm text-label-sm font-bold uppercase`}>
                    {severityInfo.shortLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Attachments & Artifacts */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-md">
              <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">folder_zip</span>
                  <h2 className="font-headline-sm text-headline-sm text-text-primary">Attachments &amp; Artifacts</h2>
                </div>
                <span className="font-label-sm text-label-sm text-text-muted">
                  {ticket.attachments?.length || 0} files
                </span>
              </div>

              <div className="space-y-space-sm">
                {(!ticket.attachments || ticket.attachments.length === 0) ? (
                  <p className="text-xs text-text-muted py-2 text-center">No diagnostic files attached.</p>
                ) : (
                  ticket.attachments.map((file) => (
                    <div
                      key={file.id}
                      className="p-space-sm rounded-xl bg-canvas-lavender/50 hover:bg-canvas-lavender flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-surface-card text-primary flex items-center justify-center shadow-sm shrink-0">
                          <span className="material-symbols-outlined text-xl">file_present</span>
                        </div>
                        <div className="truncate">
                          <p className="font-label-md text-label-md text-text-primary truncate">{file.name}</p>
                          <p className="font-body-sm text-body-sm text-text-secondary">
                            {file.size_bytes ? `${Math.round(file.size_bytes / 1024)} KB` : 'Attached file'}
                          </p>
                        </div>
                      </div>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-text-muted hover:text-text-primary transition-colors"
                        title="Open file"
                      >
                        <span className="material-symbols-outlined text-lg">download</span>
                      </a>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploadingAttachment}
                className="w-full py-2 rounded-lg bg-surface-card hover:bg-canvas-lavender text-primary font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 shadow-sm border border-border-subtle"
              >
                <span className="material-symbols-outlined text-base">cloud_upload</span>
                <span>{uploadingAttachment ? 'Uploading...' : 'Upload Diagnostic File'}</span>
              </button>
            </div>

            {/* Audit Log & Event Trail */}
            <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-space-md">
              <div className="flex items-center justify-between border-b border-border-subtle pb-space-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">history</span>
                  <h2 className="font-headline-sm text-headline-sm text-text-primary">Audit Log &amp; Event Trail</h2>
                </div>
                <span className="font-label-sm text-label-sm text-text-muted">Live Stream</span>
              </div>

              <div className="space-y-space-md relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-canvas-lavender">
                {(!ticket.activities || ticket.activities.length === 0) ? (
                  <p className="text-xs text-text-muted py-2 pl-6">No historical audit logs recorded yet.</p>
                ) : (
                  ticket.activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 relative">
                      <div className="w-6 h-6 rounded-full bg-btn-primary text-on-primary flex items-center justify-center shrink-0 z-10 shadow-sm">
                        <span className="material-symbols-outlined text-xs">sync_alt</span>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="font-body-sm text-body-sm text-text-primary leading-tight">
                          <strong className="font-semibold">{act.action}</strong>: {act.new_value || act.old_value || 'Lifecycle update'}
                        </p>
                        <p className="font-mono text-xs text-text-muted">
                          {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • User Action
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsPage;
