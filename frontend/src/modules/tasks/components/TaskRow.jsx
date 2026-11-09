import React, { useState } from 'react';
import TaskStatusBadge from './TaskStatusBadge';
import TaskPriorityBadge from './TaskPriorityBadge';
import EditTaskAndStatusPopover from './EditTaskAndStatusPopover';
import { TASK_TYPE_LABEL } from '../constants/taskEnums';

/**
 * TaskRow — Standardized task list/table row
 */
export const TaskRow = ({
  task,
  onSelectTask,
  onStatusChange,
  onUpdateTask,
}) => {
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);

  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formattedDue = formatDueDate(task.due_date);

  return (
    <>
      <div
        onClick={() => onSelectTask?.(task)}
        className="group flex items-center justify-between p-3.5 sm:px-4 sm:py-3 bg-surface-card hover:bg-canvas-lavender/40 border-b border-border-subtle cursor-pointer transition-colors"
      >
        {/* Left Side: Number, Type, Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
          {/* Checkbox indicator */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextStatus = task.status === 'done' ? 'todo' : 'done';
              onStatusChange?.(task.id, nextStatus);
            }}
            title={task.status === 'done' ? 'Mark incomplete' : 'Mark done'}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
              task.status === 'done'
                ? 'bg-status-resolved border-status-resolved text-white'
                : 'border-border-subtle hover:border-primary'
            }`}
          >
            {task.status === 'done' && (
              <span className="material-symbols-outlined text-[14px]">check</span>
            )}
          </button>

          {/* Task Number */}
          <span className="font-mono font-medium text-label-sm text-text-muted flex-shrink-0">
            {task.task_number}
          </span>

          {/* Title & Type */}
          <div className="min-w-0 flex items-center gap-2">
            <span
              className={`font-label-md text-label-md text-text-primary group-hover:text-primary transition-colors truncate ${
                task.status === 'done' ? 'line-through text-text-muted' : ''
              }`}
            >
              {task.title}
            </span>

            {task.task_type && task.task_type !== 'feature' && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-canvas-main text-text-muted uppercase hidden md:inline">
                {TASK_TYPE_LABEL[task.task_type] || task.task_type}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Badges & Metadata */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          {/* Comments count */}
          {task.comment_count > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-text-muted font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
              <span>{task.comment_count}</span>
            </div>
          )}

          {/* Attachments count */}
          {task.attachment_count > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-text-muted font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">attach_file</span>
              <span>{task.attachment_count}</span>
            </div>
          )}

          {/* Story Points */}
          {task.story_points != null && (
            <span className="hidden md:inline px-2 py-0.5 rounded bg-surface-container font-mono text-[11px] font-bold text-text-secondary">
              {task.story_points} pts
            </span>
          )}

          {/* Due date */}
          {formattedDue && (
            <div className="hidden lg:flex items-center gap-1 text-text-secondary font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">event</span>
              <span>{formattedDue}</span>
            </div>
          )}

          {/* Priority */}
          <TaskPriorityBadge priority={task.priority} />

          {/* Status (Clickable to trigger popover) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsStatusPopoverOpen(true);
            }}
          >
            <TaskStatusBadge status={task.status} interactive />
          </div>
        </div>
      </div>

      {/* Status Change Popover */}
      {isStatusPopoverOpen && (
        <EditTaskAndStatusPopover
          isOpen={isStatusPopoverOpen}
          onClose={() => setIsStatusPopoverOpen(false)}
          task={task}
          onStatusChange={(newStatus) => onStatusChange?.(task.id, newStatus)}
          onSave={(updates) => onUpdateTask?.(task.id, updates)}
          variant="default"
        />
      )}
    </>
  );
};

export default TaskRow;
