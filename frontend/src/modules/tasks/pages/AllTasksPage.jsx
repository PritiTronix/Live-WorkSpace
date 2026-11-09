import React, { useState } from 'react';
import useTasks from '../hooks/useTasks';
import TaskRow from '../components/TaskRow';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import CreateTaskModal from '../components/CreateTaskModal';
import {
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABEL,
  TASK_TYPE_OPTIONS,
  TASK_TYPE_LABEL,
} from '../constants/taskEnums';

/**
 * AllTasksPage (Prompt 30)
 * Central workspace task repository with filtering, search, pagination,
 * creation modal, and contextual task detail drawer.
 */
export const AllTasksPage = () => {
  const {
    tasks,
    total,
    loading,
    filters,
    selectedTask,
    setSelectedTask,
    createTask,
    updateTask,
    changeStatus,
    deleteTask,
    updateFilter,
    resetFilters,
  } = useTasks();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const hasActiveFilters = Boolean(
    filters.status || filters.priority || filters.task_type || filters.search
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg text-text-primary">All Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-bold font-mono text-label-sm">
              {total}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Track, filter, and prioritize operational engineering deliverables
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Create Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface-card p-4 rounded-2xl border border-border-subtle shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">
              search
            </span>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search by title or TASK-#..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="h-10 px-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Statuses</option>
              {TASK_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {TASK_STATUS_LABEL[st]}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={filters.priority || ''}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="h-10 px-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Priorities</option>
              {TASK_PRIORITY_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>
                  {TASK_PRIORITY_LABEL[pr]}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={filters.task_type || ''}
              onChange={(e) => updateFilter('task_type', e.target.value)}
              className="h-10 px-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/20 hidden sm:inline-block"
            >
              <option value="">All Types</option>
              {TASK_TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>
                  {TASK_TYPE_LABEL[tp]}
                </option>
              ))}
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 px-3 rounded-xl border border-border-subtle hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center gap-1 transition-colors"
                title="Clear all filters"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Task List / Table Card */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-canvas-main border-b border-border-subtle text-text-muted font-label-sm text-label-sm uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <span>Work Item</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="hidden sm:inline">Priority</span>
            <span>Status</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
            <span className="material-symbols-outlined text-[36px] animate-spin text-primary">
              refresh
            </span>
            <p className="font-body-sm text-body-sm">Loading workspace tasks...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-canvas-lavender text-primary flex items-center justify-center mb-4 shadow-xs">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary">
              {hasActiveFilters ? 'No matching tasks' : 'No tasks created yet'}
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary max-w-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters or search keywords to find what you are looking for.'
                : 'Get started by creating your first task to track work items across your team.'}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 h-10 px-4 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create First Task</span>
            </button>
          </div>
        )}

        {/* Tasks List */}
        {!loading && tasks.length > 0 && (
          <div className="divide-y divide-border-subtle">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onSelectTask={(t) => setSelectedTask(t)}
                onStatusChange={(taskId, newStatus) => changeStatus(taskId, newStatus)}
                onUpdateTask={(taskId, updates) => updateTask(taskId, updates)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onUpdateTask={(taskId, updates) => updateTask(taskId, updates)}
        onDeleteTask={(taskId) => deleteTask(taskId)}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTask={createTask}
      />
    </div>
  );
};

export default AllTasksPage;
