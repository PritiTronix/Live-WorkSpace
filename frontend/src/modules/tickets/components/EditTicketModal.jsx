import React, { useState, useEffect } from 'react';
import { ticketsService } from '../../../services/ticketsService';
import { projectsService } from '../../../services/projectsService';

export const EditTicketModal = ({ isOpen, onClose, ticket, onUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    deadline: '',
  });
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setFormData({
        title: ticket.title || '',
        description: ticket.description || '',
        project_id: ticket.project_id || '',
        assignee_id: ticket.assignee_id || '',
        deadline: ticket.deadline ? ticket.deadline.slice(0, 16) : '',
      });
      setAttachments(ticket.attachments || []);
      setError(null);

      // Load projects and project members
      projectsService.getProjects()
        .then((res) => {
          const list = Array.isArray(res) ? res : res.projects || [];
          setProjects(list);
          const currentProj = list.find((p) => p.id === ticket.project_id);
          if (currentProj && currentProj.members) {
            setMembers(currentProj.members.map((m) => m.user).filter(Boolean));
          }
        })
        .catch((e) => console.error('Failed to load projects:', e));
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleProjectChange = (e) => {
    const pId = e.target.value;
    setFormData((prev) => ({ ...prev, project_id: pId }));
    const proj = projects.find((p) => p.id === pId);
    if (proj && proj.members) {
      setMembers(proj.members.map((m) => m.user).filter(Boolean));
    } else {
      setMembers([]);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds 15 MB limit.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await ticketsService.addAttachment(ticket.id, file);
      setAttachments((prev) => [...prev, res]);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Issue Title is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description,
        project_id: formData.project_id || ticket.project_id,
        assignee_id: formData.assignee_id || null,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      };
      const updated = await ticketsService.updateTicket(ticket.id, payload);
      if (onUpdated) onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedLoggedDate = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recently';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl bg-surface-card rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-space-lg bg-surface-card flex items-start justify-between border-b border-border-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-base">edit_note</span>
              </div>
              <h2 className="font-headline-md text-headline-md text-text-primary">Edit Ticket</h2>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Update ticket metadata and assignment. Status and severity require dedicated governance workflows.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-canvas-lavender transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Audit Context Strip */}
        <div className="px-space-lg py-space-sm bg-canvas-lavender flex items-center justify-between">
          <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-base">cloud_sync</span>
            <span>Live Workspace Synchronization</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-card text-primary font-label-sm text-label-sm shadow-sm flex items-center gap-1 font-mono">
            {ticket.ticket_number}
          </span>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-space-lg space-y-space-lg">
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Ticket Metadata Pill Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm p-space-sm bg-canvas-lavender rounded-lg">
            <div className="p-space-sm bg-surface-card rounded-lg shadow-sm flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">Ticket Identifier</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-label-md text-label-md text-text-primary font-mono font-semibold">
                  {ticket.ticket_number}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(ticket.ticket_number)}
                  className="text-text-muted hover:text-primary transition-colors"
                  title="Copy Ticket Reference"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>

            <div className="p-space-sm bg-surface-card rounded-lg shadow-sm flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">Reported By</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-bold">
                  {(ticket.reporter?.full_name || 'US').slice(0, 2).toUpperCase()}
                </div>
                <span className="font-label-md text-label-md text-text-primary truncate">
                  {ticket.reporter?.full_name || 'System'}
                </span>
                <span className="material-symbols-outlined text-xs text-text-muted ml-auto" title="Reporter is locked">
                  lock
                </span>
              </div>
            </div>

            <div className="p-space-sm bg-surface-card rounded-lg shadow-sm flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase">Logged Timestamp</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-body-sm text-body-sm text-text-secondary truncate">
                  {formattedLoggedDate}
                </span>
                <span className="material-symbols-outlined text-xs text-text-muted">schedule</span>
              </div>
            </div>
          </div>

          {/* Audit Integrity Notice */}
          <div className="p-space-md rounded-lg bg-surface-container flex items-start gap-space-sm">
            <span className="material-symbols-outlined text-primary text-xl mt-0.5">policy</span>
            <div className="space-y-0.5">
              <p className="font-label-sm text-label-sm text-text-primary font-semibold">Audit Integrity Requirement</p>
              <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                Status and Severity changes must be performed via dedicated audit workflows to preserve SLA contractual logging.
              </p>
            </div>
          </div>

          {/* Issue Title Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-label-md text-label-md text-text-primary">
              <label htmlFor="edit-ticket-title">
                Issue Title <span className="text-severity-blocker">*</span>
              </label>
              <span className="text-text-muted font-body-sm text-body-sm">
                {formData.title.length}/120
              </span>
            </div>
            <input
              id="edit-ticket-title"
              type="text"
              maxLength={120}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-10 px-space-md bg-canvas-lavender hover:bg-surface-card focus:bg-surface-card rounded-lg font-body-md text-body-md text-text-primary outline-none focus:ring-2 focus:ring-primary-light transition-all shadow-sm"
              placeholder="Enter clear, actionable summary of the issue..."
              required
            />
          </div>

          {/* Description & Technical Trace Textarea */}
          <div className="space-y-1.5">
            <label className="font-label-md text-label-md text-text-primary">Description & Technical Trace</label>
            <div className="rounded-lg bg-surface-card shadow-sm border border-border-subtle overflow-hidden">
              <div className="px-space-md py-1.5 bg-canvas-lavender flex items-center justify-between border-b border-border-subtle">
                <div className="flex items-center gap-1 text-text-secondary">
                  <span className="material-symbols-outlined text-sm">format_bold</span>
                  <span className="material-symbols-outlined text-sm">format_italic</span>
                  <span className="material-symbols-outlined text-sm">code</span>
                  <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                </div>
                <span className="font-label-sm text-label-sm text-text-muted">Markdown Supported</span>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-28 p-space-md bg-surface-card font-body-md text-body-md text-text-primary outline-none resize-none leading-relaxed"
                placeholder="Detailed reproduction steps, observed logs, and architecture impact..."
              />
            </div>
          </div>

          {/* Target Project & Assigned Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-text-primary">Target Project</label>
              <select
                value={formData.project_id}
                onChange={handleProjectChange}
                className="w-full h-10 px-space-md bg-canvas-lavender hover:bg-surface-card rounded-lg font-body-md text-body-md text-text-primary shadow-sm outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-text-primary">Assigned Personnel</label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full h-10 px-space-md bg-canvas-lavender hover:bg-surface-card rounded-lg font-body-md text-body-md text-text-primary shadow-sm outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.title || m.role || 'Member'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resolution Deadline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-text-primary">Expected Resolution Deadline</label>
              <span className="font-label-sm text-label-sm text-severity-critical flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span> Recalibrates SLA targets
              </span>
            </div>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full h-10 px-space-md bg-canvas-lavender rounded-lg font-body-md text-body-md text-text-primary shadow-sm outline-none"
            />
          </div>

          {/* Attachments & Traces Grid */}
          <div className="space-y-2">
            <label className="font-label-md text-label-md text-text-primary">
              Attachments & Traces ({attachments.length} Files)
            </label>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-space-sm rounded-lg bg-canvas-lavender flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded bg-surface-card text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                      </div>
                      <div className="truncate">
                        <p className="font-label-sm text-label-sm text-text-primary truncate">{att.name}</p>
                        <p className="font-body-sm text-body-sm text-text-muted">
                          {(att.size_bytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <a
                      href={ticketsService.getAttachmentDownloadUrl(ticket.id, att.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-text-muted hover:text-primary transition-colors"
                      title="Download Attachment"
                      download={att.name}
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Drop Zone */}
            <label className="h-16 rounded-lg bg-surface-card hover:bg-canvas-lavender transition-colors flex items-center justify-center cursor-pointer shadow-sm border border-dashed border-border-subtle">
              <div className="flex items-center gap-2 text-text-secondary">
                <span className="material-symbols-outlined text-lg text-primary">cloud_upload</span>
                <span className="font-label-sm text-label-sm">
                  {uploading ? 'Uploading...' : 'Drop artifacts here or '}{' '}
                  <span className="text-primary font-semibold">browse files</span> (Max 15MB)
                </span>
              </div>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-space-lg py-space-md bg-canvas-lavender flex items-center justify-between border-t border-border-subtle">
          <span className="font-body-sm text-body-sm text-text-muted">All edits are logged in audit ledger</span>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-space-md bg-surface-card hover:bg-canvas-main text-text-primary font-label-md text-label-md rounded-lg shadow-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-10 px-space-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">check</span>
              <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTicketModal;

