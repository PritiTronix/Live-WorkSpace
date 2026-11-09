import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import projectsService from '../../services/projectsService';

/**
 * Screen 42: Project Timeline Tab
 * Visual Reference: Stitch Screen 42 (`1a5e5014c3e54ac29d41a048e03f7a17`)
 * Route: `/workspace/projects/:id/timeline`
 */
export const ProjectTimelineTab = () => {
  const { id } = useParams();
  const context = useOutletContext();
  const project = context?.project;

  const [viewMode, setViewMode] = useState('gantt'); // 'gantt' or 'list'
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await projectsService.getTasks(id);
        if (isMounted) setTasks(data);
      } catch (err) {
        console.error('Failed to load timeline tasks:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTasks();
    return () => { isMounted = false; };
  }, [id]);

  // Grouped Epics based on Screen 42
  const epics = [
    {
      id: 'epic_01',
      title: 'Auth & Token Refactor',
      progress: '100%',
      tasks: tasks.slice(0, 3).map((t, idx) => ({
        ...t,
        duration: '3d',
        colStart: 1 + idx * 2,
        colSpan: 2,
        isMilestone: idx === 2,
      })),
    },
    {
      id: 'epic_02',
      title: 'Multi-Tenant Arch & Storage',
      progress: '65%',
      tasks: tasks.slice(3, 7).map((t, idx) => ({
        ...t,
        duration: '4d',
        colStart: 2 + idx,
        colSpan: 2,
        isMilestone: idx === 1,
      })),
    },
    {
      id: 'epic_03',
      title: 'Edge Caching & Pipeline',
      progress: '20%',
      tasks: tasks.slice(7, 11).map((t, idx) => ({
        ...t,
        duration: '5d',
        colStart: 4 + idx,
        colSpan: 2,
        isMilestone: idx === 2,
      })),
    },
  ];

  const weeks = [
    { label: 'Nov 10', week: 'W46' },
    { label: 'Nov 17', week: 'W47' },
    { label: 'Nov 24', week: 'W48', isToday: true },
    { label: 'Dec 01', week: 'W49' },
    { label: 'Dec 08', week: 'W50' },
    { label: 'Dec 15', week: 'W51' },
    { label: 'Dec 22', week: 'W52' },
  ];

  return (
    <div className="flex flex-col gap-space-md">
      {/* 1. Timeline Toolbar (Screen 42) */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle/50 flex flex-wrap items-center justify-between gap-space-md">
        {/* Left Controls: View Switcher, Date Range, Zoom */}
        <div className="flex flex-wrap items-center gap-space-md">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-canvas-main rounded-lg border border-border-subtle">
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-md text-label-md transition-all ${
                viewMode === 'gantt'
                  ? 'bg-surface-card text-primary shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">waterfall_chart</span>
              <span>Gantt View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-md text-label-md transition-all ${
                viewMode === 'list'
                  ? 'bg-surface-card text-primary shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">view_list</span>
              <span>List View</span>
            </button>
          </div>

          {/* Date Range Display */}
          <div className="flex items-center gap-2 text-text-secondary font-label-md text-label-md bg-canvas-main px-3 py-1.5 rounded-lg border border-border-subtle">
            <span className="material-symbols-outlined text-[16px] text-text-muted">calendar_month</span>
            <span>Nov 10, 2025 - Dec 28, 2025</span>
            <span className="px-1.5 py-0.2 rounded bg-primary-fixed text-primary font-bold text-[10px]">Sprint 4-6</span>
          </div>

          {/* Granularity Pill */}
          <div className="hidden sm:flex items-center p-1 bg-canvas-main rounded-lg border border-border-subtle text-text-muted text-label-sm">
            <span className="px-2 py-1 rounded bg-surface-card text-text-primary font-bold shadow-xs">Week</span>
            <span className="px-2 py-1">Month</span>
            <span className="px-2 py-1">Quarter</span>
          </div>
        </div>

        {/* Right Controls: Filters & Actions */}
        <div className="flex items-center gap-space-sm">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-canvas-main rounded-lg border border-border-subtle text-text-secondary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            <span>Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-text-primary focus:outline-none ml-1"
            >
              <option value="all">Status: All</option>
              <option value="done">Done</option>
              <option value="in_progress">In Progress</option>
              <option value="to_do">To Do</option>
            </select>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Milestone</span>
          </button>
        </div>
      </div>

      {/* 2. Master Gantt / Timeline Matrix */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle/50 overflow-hidden flex flex-col">
        <div className="flex w-full overflow-x-auto min-h-[580px] relative">
          {/* LEFT PANE: Task & Milestone Hierarchy (~380px) */}
          <div className="w-[380px] flex-shrink-0 bg-surface-sidebar z-20 border-r border-border-subtle flex flex-col">
            {/* Table Column Headers */}
            <div className="h-12 px-space-md bg-canvas-lavender/70 flex items-center justify-between text-text-muted font-label-sm text-label-sm tracking-wider uppercase select-none border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                <span>Task & Milestone Name</span>
              </div>
              <div className="flex items-center gap-6 pr-2">
                <span>Duration</span>
                <span>Assignee</span>
              </div>
            </div>

            {/* Task Tree Rows */}
            <div className="flex flex-col font-body-md text-body-md">
              {epics.map((epic) => (
                <div key={epic.id} className="flex flex-col">
                  {/* Epic Row */}
                  <div className="h-11 px-space-md bg-surface-card flex items-center justify-between hover:bg-canvas-lavender/40 transition-colors border-b border-border-subtle/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px] text-text-muted">keyboard_arrow_down</span>
                      <span className="material-symbols-outlined text-[18px] text-primary">folder_open</span>
                      <span className="font-headline-sm text-[13px] font-bold text-text-primary truncate">
                        {epic.title}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved font-label-sm text-label-sm font-semibold">
                      {epic.progress}
                    </span>
                  </div>

                  {/* Tasks in Epic */}
                  {epic.tasks.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className="h-12 pl-10 pr-space-md bg-surface-sidebar hover:bg-canvas-lavender/60 flex items-center justify-between border-b border-border-subtle/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {t.isMilestone ? (
                          <span className="material-symbols-outlined text-[16px] text-amber-500">diamond</span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-text-muted">
                            {t.status === 'done' ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-text-muted">{t.task_number || `TASK-${198 + idx}`}</span>
                        <span className="font-body-sm text-[13px] text-text-primary truncate">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <span className="font-body-sm text-[11px] text-text-muted">{t.duration}</span>
                        <div className="w-5 h-5 rounded-full bg-primary-fixed text-primary font-bold text-[10px] flex items-center justify-center">
                          {t.assignee?.full_name ? t.assignee.full_name[0] : 'U'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANE: Timeline Gantt Bars Grid */}
          <div className="flex-1 min-w-[700px] relative bg-surface-card overflow-hidden">
            {/* Weekly Header */}
            <div className="h-12 bg-canvas-lavender/70 grid grid-cols-7 text-center font-label-sm text-label-sm text-text-secondary select-none border-b border-border-subtle">
              {weeks.map((w, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col justify-center py-1 border-r border-border-subtle/40 ${
                    w.isToday ? 'bg-primary-fixed/20 relative' : ''
                  }`}
                >
                  <span className={w.isToday ? 'text-primary font-bold' : 'text-text-muted'}>{w.label}</span>
                  <span className={w.isToday ? 'font-bold text-primary' : 'font-bold text-text-primary'}>{w.week}</span>
                </div>
              ))}
            </div>

            {/* Vertical grid lines and gantt rows */}
            <div className="relative flex flex-col">
              {/* Today indicator vertical line */}
              <div className="absolute top-0 bottom-0 left-[35.7%] w-0.5 bg-btn-primary z-10 pointer-events-none shadow-sm">
                <span className="absolute -top-6 -left-8 px-2 py-0.5 rounded bg-btn-primary text-white font-label-sm text-[10px] font-bold">
                  Today
                </span>
              </div>

              {/* Epic spacing spacers matching left pane */}
              {epics.map((epic) => (
                <div key={epic.id} className="flex flex-col">
                  {/* Epic header bar */}
                  <div className="h-11 bg-surface-card/50 border-b border-border-subtle/40" />

                  {/* Task Timeline Bars */}
                  {epic.tasks.map((t, idx) => {
                    const isDone = t.status === 'done';
                    const isBlocker = (t.priority || '').toLowerCase() === 'blocker';

                    return (
                      <div
                        key={t.id || idx}
                        className="h-12 border-b border-border-subtle/30 flex items-center px-4 relative"
                      >
                        {t.isMilestone ? (
                          <div
                            className="absolute flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 text-label-sm font-bold shadow-xs"
                            style={{ left: `${25 + idx * 20}%` }}
                          >
                            <span className="material-symbols-outlined text-[14px]">diamond</span>
                            <span>Milestone: Signoff</span>
                          </div>
                        ) : (
                          <div
                            className={`absolute h-7 rounded-lg px-2.5 flex items-center gap-1.5 text-label-sm font-semibold shadow-xs ${
                              isDone
                                ? 'bg-status-resolved/20 text-status-resolved border border-status-resolved/30'
                                : isBlocker
                                ? 'bg-severity-blocker/20 text-severity-blocker border border-severity-blocker/40'
                                : 'bg-primary-fixed text-primary border border-primary/20'
                            }`}
                            style={{ left: `${10 + (idx % 4) * 18}%`, width: '160px' }}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isDone ? 'check' : isBlocker ? 'bolt' : 'schedule'}
                            </span>
                            <span className="truncate">{t.task_number || `TASK-${198 + idx}`}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTimelineTab;

