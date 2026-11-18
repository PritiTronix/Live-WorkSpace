import React, { useState, useEffect } from 'react';
import ticketsService from '../../../services/ticketsService';
import projectsService from '../../../services/projectsService';
import Modal from '../../design-system/components/Modal';

/**
 * Screen 64: Create Ticket Modal (Prompt 40)
 * Visual Reference: Stitch Screen 64 (`b6d37663aec740e191f27f17c52267e0`)
 * Uses shared Modal architecture with sticky header/footer, proper scroll lock, and contained body.
 *
 * MANDATORY RULE 2 COMPLIANCE:
 * All form fields start EMPTY by default.
 * Dropdowns have no selection (empty string/placeholder only).
 * Full state reset on open and close.
 */
export const CreateTicketModal = ({ isOpen, onClose, onTicketCreated, defaultProjectId }) => {
  // Empty default state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
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
    setProjectId(defaultProjectId || '');
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
    }
  }, [isOpen]);

  const hasUnsavedChanges = Boolean(
    title.trim() || description.trim() || severity || projectId || assigneeId || reporterId || deadline || initialComment.trim()
  );

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title.trim() || !projectId || !severity) {
      setError('Title, Project, and Severity are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        project_id: projectId,
        assignee_id: assigneeId || undefined,
        reporter_id: reporterId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      };

      const newTicket = await ticketsService.createTicket(payload);

      // If initial comment provided, post it to ticket discussion
      if (initialComment.trim() && newTicket?.id) {
        try {
          await ticketsService.addComment(newTicket.id, initialComment.trim());
        } catch (commentErr) {
          console.warn('Ticket created but initial comment failed:', commentErr);
        }
      }

      onTicketCreated(newTicket);
      onClose();
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setError(err.response?.data?.detail || 'Failed to file ticket. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-space-sm w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-secondary hover:bg-canvas-lavender font-label-md text-label-md transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="px-5 py-2.5 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        {submitting ? (
          <>
            <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
            <span>Submitting...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create Ticket</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Ticket"
      subtitle="File a new operational incident, bug, or request with automatic SLA assignment."
      size="lg"
      footer={footer}
      hasUnsavedChanges={hasUnsavedChanges}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
            Ticket Title *
          </label>
          <input
            type="text"
            className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g. Memory leak in Kafka event processing loop"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Project & Severity Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          {/* Project */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Project *
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              <option value="">Select Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Severity Level *
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              required
            >
              <option value="">Select Severity...</option>
              <option value="blocker">Blocker (Immediate P0)</option>
              <option value="critical">Critical (P1)</option>
              <option value="major">Major (P2)</option>
              <option value="minor">Minor (P3)</option>
            </select>
          </div>
        </div>

        {/* Assignee & Reporter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          {/* Assignee */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Assignee
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Reporter */}
          <div>
            <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
              Reporter
            </label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={reporterId}
              onChange={(e) => setReporterId(e.target.value)}
            >
              <option value="">Current User / Unspecified</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
            Resolution Target (SLA Deadline)
          </label>
          <input
            type="datetime-local"
            className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
            Description
          </label>
          <textarea
            className="w-full p-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={3}
            placeholder="Detailed description of symptoms, logs, or reproduction steps..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Initial Comment / Note */}
        <div>
          <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
            Initial Investigation Note
          </label>
          <textarea
            className="w-full p-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={2}
            placeholder="Add quick context, links to alerts, or initial triage hypotheses..."
            value={initialComment}
            onChange={(e) => setInitialComment(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};

export default CreateTicketModal;