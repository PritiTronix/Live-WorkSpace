import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Trash2, User, AlertCircle } from 'lucide-react';
import { ACTION_ITEM_STATUS, ACTION_ITEM_PRIORITY } from '../constants/rcaConstants';

/**
 * RCAActionItemsTracker
 * Shared preventative action items tracker component used in BOTH
 * RCA Form (Prompt 52) and RCA Submitted View (Prompt 53).
 */
export const RCAActionItemsTracker = ({
  items = [],
  onChange, // For Form mode: callback with updated array of items
  onItemStatusChange, // For View mode: callback (itemId, newStatus) to update API
  isReadOnly = false,
  isFormMode = false,
}) => {
  // Form add-item state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState(ACTION_ITEM_PRIORITY.MEDIUM);
  const [newDueDate, setNewDueDate] = useState('');

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem = {
      id: `temp_${Date.now()}`,
      title: newTitle.trim(),
      priority: newPriority,
      status: ACTION_ITEM_STATUS.TODO,
      due_date: newDueDate || null,
    };

    if (onChange) {
      onChange([...items, newItem]);
    }

    setNewTitle('');
    setNewPriority(ACTION_ITEM_PRIORITY.MEDIUM);
    setNewDueDate('');
  };

  const handleRemoveItem = (index) => {
    if (onChange) {
      const updated = items.filter((_, i) => i !== index);
      onChange(updated);
    }
  };

  const toggleStatus = (item) => {
    if (isReadOnly && !onItemStatusChange) return;

    const nextStatus =
      item.status === ACTION_ITEM_STATUS.DONE
        ? ACTION_ITEM_STATUS.TODO
        : item.status === ACTION_ITEM_STATUS.TODO
        ? ACTION_ITEM_STATUS.IN_PROGRESS
        : ACTION_ITEM_STATUS.DONE;

    if (onItemStatusChange) {
      onItemStatusChange(item.id, nextStatus);
    } else if (onChange) {
      const updated = items.map((it) =>
        it.id === item.id ? { ...it, status: nextStatus } : it
      );
      onChange(updated);
    }
  };

  const priorityStyles = {
    [ACTION_ITEM_PRIORITY.HIGH]: 'bg-rose-50 text-severity-blocker border-rose-200',
    [ACTION_ITEM_PRIORITY.MEDIUM]: 'bg-amber-50 text-status-on-hold border-amber-200',
    [ACTION_ITEM_PRIORITY.LOW]: 'bg-slate-100 text-text-secondary border-slate-200',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-sm font-bold text-text-primary">
          Preventative Action Items
        </h3>
        <span className="text-xs text-text-muted">
          {items.filter((i) => i.status === ACTION_ITEM_STATUS.DONE).length} of {items.length} completed
        </span>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="py-6 px-4 rounded-xl border border-dashed border-border-subtle text-center text-xs text-text-muted">
          No preventative action items logged yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl bg-canvas-main/60 border border-border-subtle flex items-center justify-between gap-3 text-xs hover:bg-canvas-lavender/40 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => toggleStatus(item)}
                  className="text-text-muted hover:text-status-resolved transition-colors flex-shrink-0"
                >
                  {item.status === ACTION_ITEM_STATUS.DONE ? (
                    <CheckCircle2 className="w-4 h-4 text-status-resolved" />
                  ) : item.status === ACTION_ITEM_STATUS.IN_PROGRESS ? (
                    <Clock className="w-4 h-4 text-status-on-hold" />
                  ) : (
                    <Circle className="w-4 h-4 text-text-muted" />
                  )}
                </button>

                <span
                  className={`font-medium truncate ${
                    item.status === ACTION_ITEM_STATUS.DONE
                      ? 'line-through text-text-muted'
                      : 'text-text-primary'
                  }`}
                >
                  {item.title}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Priority */}
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${
                    priorityStyles[item.priority] || priorityStyles[ACTION_ITEM_PRIORITY.MEDIUM]
                  }`}
                >
                  {item.priority}
                </span>

                {/* Due Date */}
                {item.due_date && (
                  <span className="text-[11px] text-text-secondary flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-text-muted" />
                    {new Date(item.due_date).toLocaleDateString()}
                  </span>
                )}

                {/* Status Pill */}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${
                    item.status === ACTION_ITEM_STATUS.DONE
                      ? 'bg-emerald-50 text-status-resolved'
                      : item.status === ACTION_ITEM_STATUS.IN_PROGRESS
                      ? 'bg-amber-50 text-status-on-hold'
                      : 'bg-slate-100 text-text-secondary'
                  }`}
                >
                  {item.status.replace('_', ' ')}
                </span>

                {/* Delete button in Form mode */}
                {isFormMode && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-text-muted hover:text-severity-blocker rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Add Row (in Form mode) */}
      {isFormMode && (
        <form onSubmit={handleAddItem} className="pt-2 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Add preventative task or architectural fix..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20"
          />

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary"
          >
            <option value={ACTION_ITEM_PRIORITY.HIGH}>High Priority</option>
            <option value={ACTION_ITEM_PRIORITY.MEDIUM}>Medium Priority</option>
            <option value={ACTION_ITEM_PRIORITY.LOW}>Low Priority</option>
          </select>

          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="px-2 py-2 text-xs rounded-lg border border-border-subtle bg-surface-card text-text-primary"
          />

          <button
            type="submit"
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-btn-primary hover:bg-primary-hover text-white flex items-center justify-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </form>
      )}
    </div>
  );
};

export default RCAActionItemsTracker;
