import React, { useState, useEffect } from 'react';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import EditTaskAndStatusPopover from './EditTaskAndStatusPopover';
import CommentComposerAndAttachmentPicker from './CommentComposerAndAttachmentPicker';
import {
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABEL,
  TASK_TYPE_OPTIONS,
  TASK_TYPE_LABEL,
} from '../constants/taskEnums';

/**
 * TaskDetailDrawer (Prompt 33)
 * Right slide-out contextual drawer displaying comprehensive task details,
 * metadata editing, and integrated discussion / attachments.
 */
export const TaskDetailDrawer = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setIsEditingTitle(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleTitleBlur = async () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== task.title) {
      onUpdateTask?.(task.id, { title: title.trim() });
    } else {
      setTitle(task.title || '');
    }
  };

  const handleDescriptionBlur = async () => {
    if (description !== (task.description || '')) {
      onUpdateTask?.(task.id, { description });
    }
  };

  const handlePriorityChange = (e) => {
    const newPriority = e.target.value;
    if (newPriority && newPriority !== task.priority) {
      onUpdateTask?.(task.id, { priority: newPriority });
    }
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    if (newType && newType !== task.task_type) {
      onUpdateTask?.(task.id, { task_type: newType });
    }
  };

  const handlePointsChange = (e) => {
    const val = e.target.value === '' ? null : Number(e.target.value);
    onUpdateTask?.(task.id, { story_points: val });
  };

  const handleDueDateChange = (e) => {
    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
    onUpdateTask?.(task.id, { due_date: val });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-surface-card shadow-2xl border-l border-border-subtle flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label="Task Details"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-canvas-main/60">
          <div className="flex items-center gap-3">
            <span className="font-mono text-label-md font-bold text-primary bg-primary-fixed px-2.5 py-1 rounded-md">
              {task.task_number}
            </span>
            <div
              onClick={() => setIsStatusPopoverOpen(true)}
              className="cursor-pointer"
            >
              <TaskStatusBadge status={task.status} interactive />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete ${task.task_number}?`)) {
                  onDeleteTask?.(task.id);
                  onClose();
                }
              }}
              title="Delete task"
              className="w-8 h-8 rounded-lg hover:bg-error-container/40 text-text-muted hover:text-error flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close drawer"
              className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Editable Title */}
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleBlur();
                  if (e.key === 'Escape') {
                    setTitle(task.title || '');
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className="w-full font-headline-md text-headline-md text-text-primary px-2 py-1 border border-primary rounded-lg focus:outline-none"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="font-headline-md text-headline-md text-text-primary hover:bg-canvas-lavender/50 px-2 py-1 rounded-lg cursor-text transition-colors"
                title="Click to edit title"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Properties Grid */}
          <div className="bg-canvas-main/80 rounded-2xl p-4 border border-border-subtle grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={task.priority || ''}
                onChange={handlePriorityChange}
                className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-surface-card text-text-primary font-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select priority</option>
                {TASK_PRIORITY_OPTIONS.map((pr) => (
                  <option key={pr} value={pr}>
                    {TASK_PRIORITY_LABEL[pr]}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={task.task_type || ''}
                onChange={handleTypeChange}
                className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-surface-card text-text-primary font-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>Select type</option>
                {TASK_TYPE_OPTIONS.map((tp) => (
                  <option key={tp} value={tp}>
                    {TASK_TYPE_LABEL[tp]}
                  </option>
                ))}
              </select>
            </div>

            {/* Story Points */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                Story Points
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={task.story_points ?? ''}
                onChange={handlePointsChange}
                placeholder="0"
                className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-surface-card text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={task.due_date ? task.due_date.slice(0, 10) : ''}
                onChange={handleDueDateChange}
                className="w-full h-9 px-2.5 rounded-lg border border-border-subtle bg-surface-card text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <label className="block font-label-md text-label-md text-text-secondary">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add detailed task description, acceptance criteria, or technical notes..."
              className="w-full p-3 rounded-xl border border-border-subtle bg-surface-card text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>

          {/* Discussion & Attachments Component (Screen 7) */}
          <div className="pt-4 border-t border-border-subtle">
            <CommentComposerAndAttachmentPicker
              taskId={task.id}
              onCommentAdded={(newComment) => {
                onUpdateTask?.(task.id, {
                  comment_count: (task.comment_count || 0) + 1,
                });
              }}
              onAttachmentAdded={(newAtt) => {
                onUpdateTask?.(task.id, {
                  attachment_count: (task.attachment_count || 0) + 1,
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Status Popover modal */}
      {isStatusPopoverOpen && (
        <EditTaskAndStatusPopover
          isOpen={isStatusPopoverOpen}
          onClose={() => setIsStatusPopoverOpen(false)}
          task={task}
          onStatusChange={(newStatus) => onUpdateTask?.(task.id, { status: newStatus })}
          variant="default"
        />
      )}
    </>
  );
};

export default TaskDetailDrawer;
