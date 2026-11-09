import React, { useState, useEffect, useRef } from 'react';
import {
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABEL,
  TASK_STATUS_ICON,
  TASK_STATUS_STYLES,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ICON,
} from '../constants/taskEnums';

/**
 * EditTaskAndStatusPopover (Prompt 34 & Prompt 34 [Alt])
 * Unified component for inline status changes and quick task property editing.
 *
 * @param {boolean} isOpen - Whether popover is shown
 * @param {function} onClose - Dismiss handler
 * @param {object} task - Existing task object
 * @param {function} onStatusChange - Callback when status is changed
 * @param {function} onSave - Callback for multi-field updates (Alt variant)
 * @param {string} variant - 'default' (status menu only) | 'alt' (full quick-edit panel)
 */
export const EditTaskAndStatusPopover = ({
  isOpen,
  onClose,
  task,
  onStatusChange,
  onSave,
  variant = 'default',
}) => {
  const popoverRef = useRef(null);

  // Editable fields for 'alt' quick-edit variant (loaded strictly from existing task)
  const [status, setStatus] = useState(task?.status || '');
  const [priority, setPriority] = useState(task?.priority || '');
  const [storyPoints, setStoryPoints] = useState(task?.story_points ?? '');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.slice(0, 10) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setStatus(task.status || '');
      setPriority(task.priority || '');
      setStoryPoints(task.story_points ?? '');
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
    }
  }, [task]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const handleSelectStatus = async (newStatus) => {
    if (onStatusChange) {
      await onStatusChange(newStatus);
    }
    if (variant === 'default') {
      onClose();
    } else {
      setStatus(newStatus);
    }
  };

  const handleSaveAlt = async (e) => {
    e.preventDefault();
    if (!onSave) return;
    setIsSubmitting(true);
    try {
      await onSave({
        status: status || undefined,
        priority: priority || undefined,
        story_points: storyPoints !== '' ? Number(storyPoints) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs animate-in fade-in duration-100">
      <div
        ref={popoverRef}
        className={`bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-50 ${
          variant === 'alt' ? 'w-full max-w-md' : 'w-72'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-canvas-lavender/50">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-text-primary">
              {variant === 'alt' ? 'Edit Task Attributes' : 'Change Status'}
            </span>
            <span className="font-mono text-label-sm text-text-muted">{task.task_number}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas-lavender flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* DEFAULT VARIANT: Clean Status Selector */}
        {variant === 'default' && (
          <div className="p-2 space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Workflow Status
            </div>
            {TASK_STATUS_OPTIONS.map((st) => {
              const isSelected = task.status === st;
              const label = TASK_STATUS_LABEL[st];
              const icon = TASK_STATUS_ICON[st];
              const styles = TASK_STATUS_STYLES[st];

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleSelectStatus(st)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-canvas-lavender text-primary font-semibold'
                      : 'hover:bg-canvas-main text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                      {icon}
                    </span>
                    <span className="font-label-md text-label-md">{label}</span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-primary">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ALT VARIANT: Expanded quick-edit attributes form */}
        {variant === 'alt' && (
          <form onSubmit={handleSaveAlt} className="p-5 space-y-4">
            {/* Status Select */}
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select status</option>
                {TASK_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {TASK_STATUS_LABEL[st]}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Select */}
            <div>
              <label className="block font-label-md text-label-md text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select priority</option>
                {TASK_PRIORITY_OPTIONS.map((pr) => (
                  <option key={pr} value={pr}>
                    {TASK_PRIORITY_LABEL[pr]}
                  </option>
                ))}
              </select>
            </div>

            {/* Story Points & Due Date in 2 columns */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-label-md text-label-md text-text-secondary hover:bg-canvas-lavender transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditTaskAndStatusPopover;
