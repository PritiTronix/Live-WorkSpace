import React, { useState, useEffect, useRef } from 'react';
import {
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABEL,
  TASK_TYPE_OPTIONS,
  TASK_TYPE_LABEL,
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
} from '../constants/taskEnums';

/**
 * CreateTaskModal (Prompt 32)
 * Clean, production modal for creating tasks.
 * STRICT RULE: All form fields start EMPTY. Selects start on placeholder options.
 */
export const CreateTaskModal = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  const modalRef = useRef(null);

  // All fields start strictly EMPTY
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form to empty on open/close
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('');
      setPriority('');
      setTaskType('');
      setStoryPoints('');
      setDueDate('');
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        // Fallback to standard defaults if user leaves them on placeholder
        status: status || TASK_STATUS.TODO,
        priority: priority || TASK_PRIORITY.MEDIUM,
        task_type: taskType || TASK_TYPE.FEATURE,
        story_points: storyPoints !== '' ? Number(storyPoints) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      };

      await onCreateTask(payload);
      onClose();
    } catch (err) {
      console.error('Failed to create task', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-50 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-label="Create Task"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-canvas-lavender/50 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-btn-primary text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">add_task</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">Create Task</h3>
              <p className="font-body-sm text-body-sm text-text-muted">
                Add an operational or feature work item
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-error-container/40 text-error font-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Title <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Kafka telemetry health check"
              className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              autoFocus
            />
          </div>

          {/* Type, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Task Type */}
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select type</option>
                {TASK_TYPE_OPTIONS.map((tp) => (
                  <option key={tp} value={tp}>
                    {TASK_TYPE_LABEL[tp]}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select priority</option>
                {TASK_PRIORITY_OPTIONS.map((pr) => (
                  <option key={pr} value={pr}>
                    {TASK_PRIORITY_LABEL[pr]}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select status</option>
                {TASK_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {TASK_STATUS_LABEL[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Story Points & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Story Points
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, prerequisites, or implementation plan..."
              className="w-full p-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-secondary hover:bg-canvas-lavender font-label-md text-label-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Create Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
