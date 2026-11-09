import React, { useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import ManageMembersModal from './ManageMembersModal';
import EditProjectModal from './EditProjectModal';
import ProjectOptionsMenu from './ProjectOptionsMenu';

/**
 * Screen 38 & 39: Project Workspace Header & Tabs
 * Visual Reference: Stitch Screen 38 (`976abc6cdd1148a69c6362009ec04775`) & Screen 39 (`e454a6f68a014fffbd96016044d1863d`)
 * Route: `/workspace/projects/:id/*`
 */
export const ProjectHeaderTabs = ({ project, onProjectUpdated, onOpenNewWorkItem }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isFavorite, setIsFavorite] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  if (!project) return null;

  const lead = project.lead || {};
  const members = project.members || [];
  const metrics = project.metrics || {};

  const sprintProgress = metrics.sprint_progress ?? 78;
  const totalTasks = metrics.total_tasks ?? 42;
  const completedTasks = metrics.completed_tasks ?? 33;
  const blockerTickets = metrics.blocker_tickets ?? 0;
  const openTickets = metrics.open_tickets ?? 0;

  // Tabs defined in Stitch Screen 38
  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'dashboard', path: `/workspace/projects/${id}/overview` },
    { key: 'board', label: 'Board', icon: 'view_kanban', badge: totalTasks, path: `/workspace/projects/${id}/board` },
    { key: 'tickets', label: 'Tickets', icon: 'confirmation_number', badge: openTickets, path: `/workspace/projects/${id}/tickets` },
    { key: 'timeline', label: 'Timeline', icon: 'calendar_month', path: `/workspace/projects/${id}/timeline` },
    { key: 'discussions', label: 'Discussion', icon: 'forum', badge: 12, path: `/workspace/projects/${id}/discussions` },
    { key: 'files', label: 'Files', icon: 'attach_file', badge: 28, path: `/workspace/projects/${id}/files` },
    { key: 'activity', label: 'Activity', icon: 'history', path: `/workspace/projects/${id}/activity` },
  ];

  return (
    <>
      {/* Master Project Workspace Header Banner */}
      <section className="relative bg-surface-card rounded-xl shadow-sm p-space-lg mb-space-lg overflow-hidden border border-border-subtle/50">
        {/* Ambient Lavender Backdrop Subtle Bloom */}
        <div className="absolute -right-20 -top-24 w-96 h-96 bg-primary-fixed/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-32 w-80 h-80 bg-canvas-lavender rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-space-lg">
          {/* Upper Tier: Avatar + Title + Badges + Header Actions */}
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-space-lg">
            {/* Left Wing: Icon, Title, Description */}
            <div className="flex items-start gap-space-md max-w-4xl">
              {/* Project Avatar Badge with glowing purple treatment */}
              <div className="relative flex-shrink-0 group">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-primary to-primary-light p-0.5 shadow-md shadow-primary/20 flex items-center justify-center">
                  <div className="w-full h-full bg-btn-primary rounded-[10px] flex flex-col items-center justify-center text-on-primary">
                    <span className="material-symbols-outlined text-[28px] drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {project.icon || 'rocket_launch'}
                    </span>
                    <span className="text-[9px] font-bold tracking-widest uppercase opacity-90 mt-0.5">
                      {project.key || 'PROJ'}
                    </span>
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-text-primary text-surface-card font-label-sm text-[9px] rounded font-bold shadow-sm">
                  v2.0
                </span>
              </div>

              {/* Title, Pills & Narrative */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex flex-wrap items-center gap-space-sm">
                  <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
                    {project.name}
                  </h1>

                  {/* Favorite Star (Screen 39 reconciliation) */}
                  <button
                    type="button"
                    aria-label="Favorite Project"
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-1 transition-colors ${isFavorite ? 'text-amber-500' : 'text-text-muted hover:text-amber-500'}`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px]"
                      style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      star
                    </span>
                  </button>

                  {/* Status Pill */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-md font-semibold text-status-resolved bg-status-resolved/10">
                    <span className="w-2 h-2 rounded-full bg-status-resolved" />
                    {project.status === 'active' ? 'Active Sprint' : project.status}
                  </span>

                  {/* SLA Tag */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-semibold bg-severity-blocker/10 text-severity-blocker">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    {project.sla_tier || 'Tier 1 Mission-Critical'}
                  </span>

                  {/* Security Tag */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label-sm font-medium bg-canvas-lavender text-secondary">
                    <span className="material-symbols-outlined text-[14px]">shield</span>
                    {project.visibility === 'restricted' ? 'Restricted Access' : 'SOC2 Isolated'}
                  </span>
                </div>

                {/* Narrative Paragraph */}
                <p className="font-body-md text-text-secondary max-w-3xl leading-relaxed mt-1">
                  {project.description || 'Core enterprise workspace architecture and sprint deliverables.'}
                </p>
              </div>
            </div>

            {/* Right Wing: Master Action Group */}
            <div className="flex flex-wrap items-center gap-space-sm xl:self-start">
              {/* Manage Members Button */}
              <button
                type="button"
                onClick={() => setShowMembersModal(true)}
                className="h-10 px-3.5 rounded-lg bg-surface-container-lowest hover:bg-canvas-lavender text-text-primary font-label-md text-label-md flex items-center gap-2 shadow-sm border border-border-subtle transition-all"
              >
                <span className="material-symbols-outlined text-primary text-[18px]">group_add</span>
                <span>Members</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-primary text-[11px] font-bold">
                  {members.length || 1}
                </span>
              </button>

              {/* Project Settings / Edit Button */}
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                aria-label="Project Settings"
                className="h-10 px-3 rounded-lg bg-surface-container-lowest hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm border border-border-subtle transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Primary Dropdown Action (+ New Work Item) */}
              <div className="relative inline-flex shadow-sm rounded-lg">
                <button
                  type="button"
                  onClick={() => onOpenNewWorkItem && onOpenNewWorkItem('task')}
                  className="h-10 px-4 rounded-l-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 transition-all shadow-[0_2px_8px_rgba(96,64,240,0.25)]"
                >
                  <span className="material-symbols-outlined text-[18px]">add_task</span>
                  <span>New Work Item</span>
                </button>
                <button
                  type="button"
                  aria-label="Work item options"
                  onClick={() => setShowNewMenu(!showNewMenu)}
                  className="h-10 px-2 rounded-r-lg bg-primary hover:bg-primary-hover text-on-primary flex items-center justify-center transition-all border-l border-white/20"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
                </button>

                {showNewMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-surface-card rounded-lg shadow-xl border border-border-subtle py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMenu(false);
                        onOpenNewWorkItem && onOpenNewWorkItem('task');
                      }}
                      className="w-full px-3 py-2 text-left font-body-sm text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">task_alt</span>
                      <span>Create Task</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMenu(false);
                        onOpenNewWorkItem && onOpenNewWorkItem('ticket');
                      }}
                      className="w-full px-3 py-2 text-left font-body-sm text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-severity-blocker">confirmation_number</span>
                      <span>File Ticket</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMenu(false);
                        navigate(`/workspace/projects/${id}/discussions`);
                      }}
                      className="w-full px-3 py-2 text-left font-body-sm text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-secondary">forum</span>
                      <span>New Discussion</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Overflow Menu with Options Component from Screen 36 */}
              <ProjectOptionsMenu
                project={project}
                onProjectUpdated={onProjectUpdated}
                onProjectDeleted={() => navigate('/workspace/projects')}
              />
            </div>
          </div>

          {/* Lower Tier: Operational Metadata Metrics Bar */}
          <div className="bg-canvas-main/80 rounded-xl p-space-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg items-center border border-border-subtle/50">
            {/* Metric 1: Project Leadership & Lead Architect */}
            <div className="flex items-center gap-space-md min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-border-subtle"
                  src={lead.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBnY9OXem7tY-WC7GGIxR_JEkjBZZxyuBB-0mDqrUE6lOeiD0P2SWK26K-s-lUh0dGTZQxOlxTGW32Ij8iX-yKRMXgzDt0JPxqs-W4ENCsT_-YF18QAkuRBiF1NWi2xyCndsZyOaB-aGeYQAJAQDzEst5nV9N0oxnz6Rvo0NjCyG9e7INBNDHklHz4AE2P5GSv5kMzjbQLQU9LlePz0mmrDeSZ-Q7RXH6M0-8zNYTNg"}
                  alt={lead.full_name || "Project Lead"}
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-status-resolved shadow-sm ring-2 ring-surface-card" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                  Project Lead
                </span>
                <span className="font-label-lg text-label-lg text-text-primary truncate font-bold">
                  {lead.full_name || 'Aarav Mehta'}
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary truncate">
                  {lead.title || 'Principal Cloud Architect'}
                </span>
              </div>
            </div>

            {/* Metric 2: Contributor Swarm Avatars */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                  Contributors
                </span>
                <span className="font-label-sm text-label-sm text-primary font-bold">
                  {members.length || 11} active
                </span>
              </div>
              <div className="flex items-center -space-x-2.5 overflow-hidden py-0.5">
                {members.slice(0, 5).map((mem, idx) => (
                  <img
                    key={mem.id || idx}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-surface-card object-cover"
                    src={mem.user?.avatar_url || lead.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAmt0YGYVVOxPr4ec8yeLMlH3eFipVV14C1qMrM6ZWl_Q3CsXSe8erXqQl5aoC-hylXdMtlpm7vAxewtZVSavdi540cHwdI20sNUsCMCCuak-zOLUoAcw0tZ70DFuiIx8Gb3wEnQn4Dk5w51h-GTXmS7PCFEawLwniAxRH1k2msgs1oH4D8Wa8mKn_ucl6LFJ6K4rpqwTBjlPjHt5Cq9qIpjIgWgzOnHZ7pEjeLmA8W"}
                    alt={mem.user?.full_name || "Member"}
                    title={mem.user?.full_name || "Contributor"}
                  />
                ))}
                {members.length > 5 && (
                  <span className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-surface-card bg-primary-fixed text-primary font-label-sm text-label-sm font-bold shadow-xs">
                    +{members.length - 5}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 3: Sprint Cadence & Progress Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                  Sprint Cadence
                </span>
                <span className="font-label-md text-label-md font-bold text-text-primary">
                  {sprintProgress}%
                </span>
              </div>
              <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-container h-2 rounded-full transition-all duration-500"
                  style={{ width: `${sprintProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary">
                <span>{completedTasks} / {totalTasks} tasks done</span>
                <span className="font-medium text-text-primary">4 weeks left</span>
              </div>
            </div>

            {/* Metric 4: Health & Dual-SLA Ticket Pulse */}
            <div className="flex flex-col gap-1 pl-0 lg:pl-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                  Sprint Health
                </span>
                <span className={`font-label-sm text-label-sm font-bold ${blockerTickets > 0 ? 'text-severity-blocker' : 'text-status-resolved'}`}>
                  {blockerTickets > 0 ? 'Needs Attention' : 'Healthy Pace'}
                </span>
              </div>
              <div className="flex items-center gap-space-sm mt-0.5">
                {blockerTickets > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-severity-blocker/10 text-severity-blocker font-label-md text-label-md">
                    <span className="w-2 h-2 rounded-full bg-severity-blocker animate-ping" />
                    <span className="font-bold">{blockerTickets} Blocker</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-status-open/10 text-status-open font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[15px]">confirmation_number</span>
                  <span className="font-medium">{openTickets} Open</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tab Bar (Screen 38 Spec) */}
      <div className="border-b border-border-subtle mb-space-lg">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none" role="tablist">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) =>
                `group relative flex items-center gap-2 px-4 py-3 rounded-t-lg font-label-lg text-label-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-canvas-lavender/60 text-primary font-bold shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-canvas-lavender/40'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`material-symbols-outlined text-[20px] transition-colors ${
                      isActive ? 'text-primary' : 'text-text-muted group-hover:text-primary'
                    }`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-label-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary-fixed text-primary'
                          : 'bg-surface-container text-text-secondary group-hover:bg-primary-fixed group-hover:text-primary'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-container rounded-t-full shadow-sm" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Modals from Batch 01 integrated into header actions */}
      {showMembersModal && (
        <ManageMembersModal
          project={project}
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          onMembersUpdated={() => onProjectUpdated && onProjectUpdated()}
        />
      )}

      {showEditModal && (
        <EditProjectModal
          project={project}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onProjectUpdated={(up) => {
            setShowEditModal(false);
            onProjectUpdated && onProjectUpdated(up);
          }}
        />
      )}
    </>
  );
};

export default ProjectHeaderTabs;

