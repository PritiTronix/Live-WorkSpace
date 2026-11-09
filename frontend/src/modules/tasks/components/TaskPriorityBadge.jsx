import React from 'react';
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_STYLES,
  TASK_PRIORITY_ICON,
} from '../constants/taskEnums';

export const TaskPriorityBadge = ({
  priority,
  onClick,
  interactive = false,
  className = '',
}) => {
  if (!priority) return null;

  const label = TASK_PRIORITY_LABEL[priority] || priority;
  const styles = TASK_PRIORITY_STYLES[priority] || 'bg-surface-container text-text-secondary';
  const icon = TASK_PRIORITY_ICON[priority] || 'remove';

  const baseClasses = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold transition-all select-none ${styles} ${className}`;

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} hover:brightness-95 cursor-pointer active:scale-95`}
      >
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        <span>{label}</span>
        <span className="material-symbols-outlined text-[12px] opacity-70">expand_more</span>
      </button>
    );
  }

  return (
    <span className={baseClasses}>
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      <span>{label}</span>
    </span>
  );
};

export default TaskPriorityBadge;
