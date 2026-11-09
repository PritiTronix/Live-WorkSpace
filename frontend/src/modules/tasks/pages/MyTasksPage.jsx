import React, { useState, useMemo } from 'react';
import useTasks from '../hooks/useTasks';
import TaskRow from '../components/TaskRow';
import TaskDetailDrawer from '../components/TaskDetailDrawer';
import CreateTaskModal from '../components/CreateTaskModal';
import { TASK_STATUS } from '../constants/taskEnums';

/**
 * MyTasksPage (Prompt 31)
 * Personal task view showing tasks assigned to the current user,
 * with status workflow tabs, progress statistics, and drawer details.
 */
export const MyTasksPage = () => {
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
  } = useTasks({ isMyTasks: true });

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'todo' | 'in_progress' | 'done'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Dynamic statistics calculated strictly from loaded tasks
  const stats = useMemo(() => {
    const todoCount = tasks.filter((t) => t.status === TASK_STATUS.TODO).length;
    const wipCount = tasks.filter((t) => t.status === TASK_STATUS.IN_PROGRESS).length;
    const doneCount = tasks.filter((t) => t.status === TASK_STATUS.DONE).length;
    return {
      total: tasks.length,
      todo: todoCount,
      in_progress: wipCount,
      done: doneCount,
    };
  }, [tasks]);

  // Client filter based on tab
  const displayedTasks = useMemo(() => {
    if (activeTab === 'all') return tasks;
    return tasks.filter((t) => t.status === activeTab);
  }, [tasks, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-headline-lg text-headline-lg text-text-primary">My Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-bold font-mono text-label-sm">
              {stats.total}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Focus on deliverables and sprint action items assigned directly to you
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Task</span>
        </button>
      </div>

      {/* Summary Stat Cards (Strictly dynamic from API data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assigned */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              Assigned
            </p>
            <p className="font-headline-md text-headline-md text-text-primary font-bold mt-1">
              {stats.total}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-canvas-lavender text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">assignment</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              In Progress
            </p>
            <p className="font-headline-md text-headline-md text-status-wip font-bold mt-1">
              {stats.in_progress}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-status-wip/10 text-status-wip flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">motion_photos_on</span>
          </div>
        </div>

        {/* To Do */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              To Do
            </p>
            <p className="font-headline-md text-headline-md text-text-secondary font-bold mt-1">
              {stats.todo}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-surface-container text-text-secondary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">radio_button_unchecked</span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
              Completed
            </p>
            <p className="font-headline-md text-headline-md text-status-resolved font-bold mt-1">
              {stats.done}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-status-resolved/10 text-status-resolved flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-surface-card rounded-xl border border-border-subtle shadow-xs w-fit">
        {[
          { id: 'all', label: 'All Tasks', count: stats.total },
          { id: TASK_STATUS.IN_PROGRESS, label: 'In Progress', count: stats.in_progress },
          { id: TASK_STATUS.TODO, label: 'To Do', count: stats.todo },
          { id: TASK_STATUS.DONE, label: 'Done', count: stats.done },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-canvas-lavender'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-surface-container text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List Card */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
            <span className="material-symbols-outlined text-[36px] animate-spin text-primary">
              refresh
            </span>
            <p className="font-body-sm text-body-sm">Loading your tasks...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && displayedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-canvas-lavender text-primary flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">task</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-text-primary">
              {activeTab === 'all' ? 'No tasks assigned to you' : 'No tasks in this state'}
            </h3>
            <p className="font-body-sm text-body-sm text-text-secondary max-w-sm mt-1">
              {activeTab === 'all'
                ? 'Tasks assigned to you will appear here. Create one to organize your daily priorities.'
                : 'There are currently no tasks with this status.'}
            </p>
            {activeTab === 'all' && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-5 h-10 px-4 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Create Task</span>
              </button>
            )}
          </div>
        )}

        {/* Task Rows */}
        {!loading && displayedTasks.length > 0 && (
          <div className="divide-y divide-border-subtle">
            {displayedTasks.map((task) => (
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

      {/* Task Details Drawer */}
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

export default MyTasksPage;
