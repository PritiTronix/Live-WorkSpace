import React, { useState, useEffect } from 'react';
import ticketsService from '../../../services/ticketsService';
import projectsService from '../../../services/projectsService';

/**
 * Screen 64: Create Ticket Modal (Prompt 40)
 * Visual Reference: Stitch Screen 64 (`b6d37663aec740e191f27f17c52267e0`)
 *
 * MANDATORY RULE 2 COMPLIANCE:
 * All form fields start EMPTY by default.
 * Dropdowns have no selection (empty string/placeholder only).
 * Full state reset on open and close.
 */
export const CreateTicketModal = ({ isOpen, onClose, onTicketCreated }) => {
  // Empty default state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [reporterId, setReporterId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [initialComment, setInitialComment] = useState('');

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSeverity('');
    setProjectId('');
    setAssigneeId('');
    setReporterId('');
    setDeadline('');
    setInitialComment('');
    setError(null);
    setSubmitting(false);
  };

  // Reset form whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      resetForm();

      // Load real dropdown data
      const loadOptions = async () => {
        try {
          const [projList, userList] = await Promise.all([
            projectsService.getProjects(),
            projectsService.getUsers(),
          ]);
          setProjects(projList || []);
          setUsers(userList || []);
        } catch (err) {
          console.error('Failed to load project/user options:', err);
        }
      };
      loadOptions();
    } else {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !severity) {
      setError('Title, Project, and Severity are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await ticketsService.createTicket({
        title: title.trim(),
        description: description.trim() || null,
        severity: severity.toLowerCase(),
        project_id: projectId,
        assignee_id: assigneeId || null,
        reporter_id: reporterId || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        initial_comment: initialComment.trim() || null,
      });

      if (onTicketCreated) onTicketCreated(created);
      handleClose();
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface-card rounded-2xl shadow-2xl border border-border-subtle p-space-xl flex flex-col gap-space-lg animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-space-sm border-b border-border-subtle/60">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">Create Ticket</h2>
            <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
              File a new operational incident, bug, or request with automatic SLA assignment.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Title */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Ticket Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Production payment gateway returned unexpected payload"
              className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-md text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Project & Severity (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div>
              <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                Project *
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                Severity Level *
              </label>
              <select
                required
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select severity...</option>
                <option value="blocker">Blocker (P0 - Immediate)</option>
                <option value="critical">Critical (P1 - 2h SLA)</option>
                <option value="major">Major (P2 - 8h SLA)</option>
                <option value="minor">Minor (P3 - Standard)</option>
              </select>
            </div>
          </div>

          {/* Assignee & Reporter (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div>
              <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                Reported By
              </label>
              <select
                value={reporterId}
                onChange={(e) => setReporterId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select reporter...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expected Deadline */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Expected Deadline (Optional)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Issue Description */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Issue Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed steps, expected outcome vs actual outcome, error logs or stack traces..."
              className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Initial Comment / Note */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Initial Comment / Triage Note (Optional)
            </label>
            <textarea
              rows={2}
              value={initialComment}
              onChange={(e) => setInitialComment(e.target.value)}
              placeholder="Add any triage observation, reproduction note, or handover comment here..."
              className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-border-subtle mt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-canvas-lavender text-text-secondary font-label-md text-label-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !projectId || !severity}
              className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
