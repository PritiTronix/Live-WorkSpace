import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import projectsService from '../../services/projectsService';

/**
 * Screen 41: Project Kanban Board
 * Visual Reference: Stitch Screen 41 (`9c73b43a9dcb41dc891f0cad0310e666`)
 * Route: `/workspace/projects/:id/board`
 */
export const ProjectKanbanTab = () => {
  const { id } = useParams();
  const context = useOutletContext();
  const project = context?.project;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // New task creation modal states
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState('to_do');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('all');

  const columns = [
    { key: 'to_do', label: 'To Do', color: 'border-text-muted', badgeBg: 'bg-surface-container' },
    { key: 'in_progress', label: 'In Progress', color: 'border-btn-primary', badgeBg: 'bg-primary-fixed' },
    { key: 'in_review', label: 'In Review', color: 'border-severity-major', badgeBg: 'bg-severity-major/15' },
    { key: 'done', label: 'Done', color: 'border-status-resolved', badgeBg: 'bg-status-resolved/15' },
  ];

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsService.getTasks(id);
      setTasks(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [id]);

  // Drag and Drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    setDraggedTaskId(null);

    try {
      await projectsService.updateTask(taskId, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Rollback on failure
      fetchTasks();
    }
  };

  // Create Task form submission
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setSubmitting(true);
      const created = await projectsService.createTask({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        status: newTaskColumn,
        priority: newPriority,
        project_id: id,
      });
      setTasks((prev) => [...prev, created]);
      // Reset Rule 2: empty form
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setShowCreateTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.task_number.toLowerCase().includes(search.toLowerCase());
    const matchesAssignee = selectedAssignee === 'all' || t.assigned_to_id === selectedAssignee;
    return matchesSearch && matchesAssignee;
  });

  return (
    <div className="flex flex-col gap-space-md">
      {/* Kanban Board Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle/50">
        <div className="flex items-center gap-space-md flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedAssignee('all')}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-colors ${
                selectedAssignee === 'all' ? 'bg-primary text-white' : 'bg-canvas-main text-text-secondary hover:text-text-primary'
              }`}
            >
              All Assignees
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewTaskColumn('to_do');
            setShowCreateTask(true);
          }}
          className="h-9 px-3.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>New Task</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 font-body-md text-text-secondary">Loading tasks...</span>
        </div>
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => (t.status || 'to_do').toLowerCase() === col.key);

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className="bg-canvas-main/80 rounded-xl p-space-md flex flex-col gap-space-sm min-h-[600px] border border-border-subtle/50 transition-colors hover:bg-canvas-lavender/30"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle/60">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.key === 'done' ? 'bg-status-resolved' : col.key === 'in_progress' ? 'bg-btn-primary' : col.key === 'in_review' ? 'bg-severity-major' : 'bg-text-muted'}`} />
                    <h2 className="font-headline-sm text-[15px] font-bold text-text-primary">{col.label}</h2>
                    <span className="px-2 py-0.5 rounded-full bg-surface-card text-text-secondary font-label-sm text-label-sm font-semibold shadow-xs">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskColumn(col.key);
                      setShowCreateTask(true);
                    }}
                    className="w-7 h-7 rounded-lg hover:bg-surface-card text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>

                {/* Task Cards Stack */}
                <div className="flex flex-col gap-space-sm pt-space-xs">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-border-subtle/80 rounded-xl">
                      <span className="font-body-sm text-[12px] text-text-muted">No tasks in {col.label}</span>
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const isBlocker = (t.priority || '').toLowerCase() === 'blocker';
                      const isHigh = (t.priority || '').toLowerCase() === 'high';

                      return (
                        <article
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          className="group bg-surface-card p-space-md rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-space-sm border border-border-subtle/40 hover:border-primary-light"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-label-sm text-label-sm text-text-muted tracking-wide font-mono">
                              {t.task_number}
                            </span>
                            {/* Priority Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-label-sm text-label-sm font-semibold ${
                                isBlocker
                                  ? 'bg-severity-blocker/15 text-severity-blocker'
                                  : isHigh
                                  ? 'bg-severity-major/15 text-severity-major'
                                  : 'bg-surface-container text-text-secondary'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {isBlocker ? 'bolt' : isHigh ? 'arrow_upward' : 'remove'}
                              </span>
                              {t.priority ? t.priority.toUpperCase() : 'MEDIUM'}
                            </span>
                          </div>

                          <h3 className="font-headline-sm text-[14px] text-text-primary group-hover:text-primary transition-colors leading-snug font-semibold">
                            {t.title}
                          </h3>

                          {t.description && (
                            <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2">
                              {t.description}
                            </p>
                          )}

                          <div className="pt-space-xs flex items-center justify-between mt-auto border-t border-border-subtle/30">
                            <div className="flex items-center gap-space-sm text-text-muted font-label-sm text-label-sm">
                              <span className="flex items-center gap-1 text-text-secondary">
                                <span className="material-symbols-outlined text-[15px]">schedule</span>
                                3d left
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {t.assignee ? (
                                <img
                                  className="w-6 h-6 rounded-full object-cover"
                                  src={t.assignee.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBnY9OXem7tY-WC7GGIxR_JEkjBZZxyuBB-0mDqrUE6lOeiD0P2SWK26K-s-lUh0dGTZQxOlxTGW32Ij8iX-yKRMXgzDt0JPxqs-W4ENCsT_-YF18QAkuRBiF1NWi2xyCndsZyOaB-aGeYQAJAQDzEst5nV9N0oxnz6Rvo0NjCyG9e7INBNDHklHz4AE2P5GSv5kMzjbQLQU9LlePz0mmrDeSZ-Q7RXH6M0-8zNYTNg"}
                                  alt={t.assignee.full_name}
                                  title={t.assignee.full_name}
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                                  DK
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating Task (Rule 2: empty by default) */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl border border-border-subtle p-space-xl flex flex-col gap-space-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-lg text-headline-lg text-text-primary">Create Task</h2>
              <button
                type="button"
                onClick={() => setShowCreateTask(false)}
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-space-md">
              <div>
                <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Implement schema migration test"
                  className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-md text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add details, acceptance criteria or runbook links..."
                  className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newTaskColumn}
                    onChange={(e) => setNewTaskColumn(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="to_do">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="blocker">Blocker</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-border-subtle mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-canvas-lavender text-text-secondary font-label-md text-label-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTitle.trim()}
                  className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectKanbanTab;

