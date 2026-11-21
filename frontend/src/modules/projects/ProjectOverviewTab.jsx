import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import projectsService from '../../services/projectsService';
import { getApiErrorMessage, resolveApiUrl } from '../../services/api';

/** Format error message safely, ensuring timeout errors show friendly text */
const formatErrorMessage = (err) => {
  if (err?.code === 'ECONNABORTED' || (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout'))) {
    return 'The server took too long to respond. Please retry.';
  }
  return getApiErrorMessage(err, 'Failed to load data. Please retry.');
};

/** Reusable Error Component for Individual Overview Sections */
const SectionError = ({ title, message, onRetry }) => (
  <div className="p-space-lg rounded-xl bg-canvas-main border border-error/20 text-center flex flex-col items-center justify-center min-h-[180px]">
    <div className="w-10 h-10 rounded-xl bg-error-container/40 flex items-center justify-center text-error mb-2">
      <span className="material-symbols-outlined text-[20px]">error</span>
    </div>
    <h4 className="font-headline-sm text-[13px] font-semibold text-text-primary mb-1">
      {title || 'Could not load section'}
    </h4>
    <p className="font-body-sm text-[12px] text-text-secondary max-w-xs mb-3">
      {message}
    </p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-sm text-label-sm flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[15px]">refresh</span>
        <span>Retry</span>
      </button>
    )}
  </div>
);

/**
 * Screen 40: Project Overview Tab
 * Visual Reference: Stitch Screen 40 (`2de47248665541a69e3562f9cc200f68`)
 * Route: `/workspace/projects/:id/overview`
 * 
 * Features decoupled, concurrent section loading with localized skeletons,
 * error boundaries, and Retry actions.
 */
export const ProjectOverviewTab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();

  // Section States: independent loading, data, and error
  const [burndownState, setBurndownState] = useState({ data: null, loading: true, error: null });
  const [milestonesState, setMilestonesState] = useState({ data: [], loading: true, error: null });
  const [workloadState, setWorkloadState] = useState({ data: [], loading: true, error: null });
  const [urgentTicketsState, setUrgentTicketsState] = useState({ data: [], loading: true, error: null });
  const [activityState, setActivityState] = useState({ data: [], loading: true, error: null });

  // 1. Fetch Sprint Burndown
  const fetchBurndown = useCallback(async () => {
    try {
      setBurndownState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await projectsService.getProjectBurndown(id);
      setBurndownState({ data, loading: false, error: null });
    } catch (err) {
      setBurndownState({ data: null, loading: false, error: formatErrorMessage(err) });
    }
  }, [id]);

  // 2. Fetch Milestones
  const fetchMilestones = useCallback(async () => {
    try {
      setMilestonesState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await projectsService.getProjectMilestones(id);
      setMilestonesState({ data: Array.isArray(data) ? data : [], loading: false, error: null });
    } catch (err) {
      setMilestonesState({ data: [], loading: false, error: formatErrorMessage(err) });
    }
  }, [id]);

  // 3. Fetch Workload
  const fetchWorkload = useCallback(async () => {
    try {
      setWorkloadState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await projectsService.getProjectWorkload(id);
      setWorkloadState({ data: Array.isArray(data) ? data : [], loading: false, error: null });
    } catch (err) {
      setWorkloadState({ data: [], loading: false, error: formatErrorMessage(err) });
    }
  }, [id]);

  // 4. Fetch Urgent Tickets
  const fetchUrgentTickets = useCallback(async () => {
    try {
      setUrgentTicketsState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await projectsService.getProjectUrgentTickets(id);
      setUrgentTicketsState({ data: Array.isArray(data) ? data : [], loading: false, error: null });
    } catch (err) {
      setUrgentTicketsState({ data: [], loading: false, error: formatErrorMessage(err) });
    }
  }, [id]);

  // 5. Fetch Activity
  const fetchActivity = useCallback(async () => {
    try {
      setActivityState((prev) => ({ ...prev, loading: true, error: null }));
      const data = await projectsService.getProjectActivity(id);
      setActivityState({ data: Array.isArray(data) ? data : [], loading: false, error: null });
    } catch (err) {
      setActivityState({ data: [], loading: false, error: formatErrorMessage(err) });
    }
  }, [id]);

  // Concurrently initiate all section requests on mount / id change
  useEffect(() => {
    fetchBurndown();
    fetchMilestones();
    fetchWorkload();
    fetchUrgentTickets();
    fetchActivity();
  }, [fetchBurndown, fetchMilestones, fetchWorkload, fetchUrgentTickets, fetchActivity]);

  const burndown = burndownState.data;
  const milestones = milestonesState.data;
  const team_workload = workloadState.data;
  const urgent_tickets = urgentTicketsState.data;
  const recent_activity = activityState.data;

  return (
    <div className="flex flex-col gap-space-lg text-left">
      {/* 1. Blocker / SLA Urgent Banner (if urgent blocker tickets exist) */}
      {urgent_tickets && urgent_tickets.length > 0 && urgent_tickets[0].severity === 'blocker' && (
        <div className="bg-surface-card rounded-xl shadow-[0_1px_3px_rgba(20,21,41,0.04)] p-space-md bg-gradient-to-r from-severity-blocker/10 via-surface-card to-surface-card flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-severity-blocker/20">
          <div className="flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-lg bg-severity-blocker text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-severity-blocker text-white font-label-sm text-[10px] uppercase font-bold">
                  SLA At Risk
                </span>
                <span className="font-label-sm text-label-sm text-text-muted">{urgent_tickets[0].ticket_number}</span>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-text-primary mt-0.5">
                {urgent_tickets[0].title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/workspace/projects/${id}/board`)}
            className="px-3.5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 self-start md:self-center transition-all shadow-sm cursor-pointer"
          >
            <span>View Remediation</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* 2. Middle Row: Sprint Burndown & Velocity + Key Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Sprint Burndown & Velocity (7 cols) */}
        <div className="lg:col-span-7 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md text-headline-md text-text-primary">Sprint Burndown & Velocity</h2>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                {burndown?.sprint_name ? `${burndown.sprint_name} • Real-time completion rate` : 'Real-time iteration tracking'}
              </p>
            </div>
            {burndown?.progress_pct !== undefined && burndown?.has_data !== false && (
              <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
                {burndown.progress_pct}% Complete
              </span>
            )}
          </div>

          {/* Section State Handling: Skeleton -> Error -> Content */}
          {burndownState.loading ? (
            <div className="h-64 w-full bg-canvas-main rounded-xl p-space-md animate-pulse flex flex-col justify-between">
              <div className="w-1/3 h-5 bg-surface-container rounded" />
              <div className="w-full h-28 bg-surface-container/60 rounded" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-10 bg-surface-container rounded" />
                <div className="h-10 bg-surface-container rounded" />
                <div className="h-10 bg-surface-container rounded" />
              </div>
            </div>
          ) : burndownState.error ? (
            <SectionError
              title="Could not load burndown"
              message={burndownState.error}
              onRetry={fetchBurndown}
            />
          ) : burndown && burndown.has_data !== false && burndown.sprint_name ? (
            <>
              <div className="h-44 w-full bg-canvas-main rounded-xl p-space-md flex flex-col justify-between border border-border-subtle/50">
                <div className="flex items-center justify-between text-text-muted font-label-sm text-label-sm">
                  <span>Start ({burndown.total_story_points || 0} pts)</span>
                  <span>Target: {burndown.target_velocity || 10} pts/day</span>
                  <span>End</span>
                </div>
                <div className="relative h-24 w-full flex items-end">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <line x1="0" y1="5" x2="100" y2="35" stroke="#E5E5EF" strokeWidth="2" strokeDasharray="3 3" />
                    <path
                      d="M0 5 Q 30 18, 55 22 T 100 32"
                      fill="none"
                      stroke="#6040F0"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
                <div className="flex items-center justify-between font-label-sm text-label-sm pt-1 border-t border-border-subtle">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <span className="w-2.5 h-2.5 rounded-full bg-btn-primary" />
                    <span>Actual Burn: {burndown.completed_points || 0} pts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <span className="w-2.5 h-0.5 bg-border-subtle" />
                    <span>Ideal Pace</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {burndown.days_remaining ? `${burndown.days_remaining} days remaining` : 'In Progress'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-space-md pt-space-xs text-center">
                <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
                  <span className="font-label-sm text-label-sm text-text-muted block">Estimated Velocity</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-text-primary mt-1 block">
                    {burndown.velocity || 'N/A'}
                  </span>
                </div>
                <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
                  <span className="font-label-sm text-label-sm text-text-muted block">Story Points Closed</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-status-resolved mt-1 block">
                    {burndown.completed_points || 0} / {burndown.total_story_points || 0} pts
                  </span>
                </div>
                <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
                  <span className="font-label-sm text-label-sm text-text-muted block">Sprint SLA Adherence</span>
                  <span className="font-headline-sm text-headline-sm font-bold text-primary mt-1 block">
                    {burndown.sla_adherence || '100%'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 w-full bg-canvas-main rounded-xl p-space-md flex flex-col items-center justify-center text-center border border-border-subtle/50">
              <div className="w-12 h-12 rounded-xl bg-canvas-lavender flex items-center justify-center text-primary mb-3 shadow-xs">
                <span className="material-symbols-outlined text-[24px]">trending_down</span>
              </div>
              <h3 className="font-headline-sm text-[15px] font-semibold text-text-primary mb-1">No Active Sprint Data</h3>
              <p className="font-body-sm text-body-sm text-text-secondary max-w-sm mb-4">
                There are no active sprint or burndown records configured for this project.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/workspace/projects/${id}/board`)}
                className="px-3.5 py-1.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-sm text-label-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">view_kanban</span>
                <span>Manage Board Tasks</span>
              </button>
            </div>
          )}
        </div>

        {/* Key Milestones & Deliverables (5 cols) */}
        <div className="lg:col-span-5 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Key Milestones</h2>
            <button
              type="button"
              onClick={() => navigate(`/workspace/projects/${id}/timeline`)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Timeline</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>

          <div className="flex flex-col gap-space-sm">
            {milestonesState.loading ? (
              <div className="space-y-3 p-space-md animate-pulse">
                <div className="h-14 bg-surface-container rounded-xl" />
                <div className="h-14 bg-surface-container rounded-xl" />
              </div>
            ) : milestonesState.error ? (
              <SectionError
                title="Could not load milestones"
                message={milestonesState.error}
                onRetry={fetchMilestones}
              />
            ) : milestones && milestones.length > 0 ? (
              milestones.map((m) => {
                const isOverdue = m.due_date && new Date(m.due_date) < new Date() && (m.progress_pct ?? 0) < 100;
                const displayStatus = isOverdue ? 'overdue' : (m.status || 'planned').toLowerCase();
                const statusLabel = isOverdue ? 'Overdue' : displayStatus.replace('_', ' ');
                const statusBadgeClass =
                  displayStatus === 'on_track' && !isOverdue
                    ? 'bg-status-resolved/10 text-status-resolved'
                    : isOverdue || displayStatus === 'at_risk' || displayStatus === 'delayed'
                    ? 'bg-severity-critical/10 text-severity-critical'
                    : displayStatus === 'completed'
                    ? 'bg-status-resolved/15 text-status-resolved'
                    : 'bg-canvas-lavender text-text-secondary';

                return (
                  <div
                    key={m.id}
                    className="p-space-md rounded-xl bg-canvas-main hover:bg-canvas-lavender/50 border border-border-subtle/60 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">flag</span>
                        <h3 className="font-headline-sm text-[14px] text-text-primary font-semibold">{m.title}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          displayStatus === 'on_track' && !isOverdue ? 'bg-status-resolved' : 'bg-severity-critical'
                        }`}
                        style={{ width: `${m.progress_pct ?? 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary pt-0.5">
                      <div className="flex items-center gap-1.5">
                        {m.owner_avatar ? (
                          <img className="w-5 h-5 rounded-full object-cover" src={resolveApiUrl(m.owner_avatar)} alt={m.owner || 'Owner'} />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-text-muted">person</span>
                        )}
                        <span>{m.owner || 'Unassigned'}</span>
                      </div>
                      <span className={`font-medium ${isOverdue ? 'text-severity-critical font-bold' : 'text-text-muted'}`}>
                        {m.due_date || 'No due date'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-space-xl rounded-xl bg-canvas-main border border-border-subtle/60 text-center flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-12 h-12 rounded-xl bg-canvas-lavender flex items-center justify-center text-primary mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">flag</span>
                </div>
                <h3 className="font-headline-sm text-[15px] font-semibold text-text-primary mb-1">No Key Milestones</h3>
                <p className="font-body-sm text-body-sm text-text-secondary max-w-xs mb-3">
                  No milestone checkpoints have been scheduled for this project.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/projects/${id}/timeline`)}
                  className="px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle hover:bg-canvas-lavender text-text-primary font-label-sm text-label-sm transition-colors cursor-pointer"
                >
                  Schedule Milestones
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Team Workload, Urgent Issues, Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Team Workload & Allocation (4 cols) */}
        <div className="lg:col-span-4 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Team Workload</h2>
            <span className="font-label-sm text-label-sm text-text-muted">{team_workload?.length || 0} members</span>
          </div>

          {workloadState.loading ? (
            <div className="space-y-4 p-space-md animate-pulse">
              <div className="h-8 bg-surface-container rounded" />
              <div className="h-8 bg-surface-container rounded" />
            </div>
          ) : workloadState.error ? (
            <SectionError
              title="Could not load workload"
              message={workloadState.error}
              onRetry={fetchWorkload}
            />
          ) : (
            <div className="flex flex-col gap-space-md">
              {team_workload?.map((w) => (
                <div key={w.user_id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {w.avatar_url ? (
                        <img className="w-7 h-7 rounded-full object-cover" src={resolveApiUrl(w.avatar_url)} alt={w.name} />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[11px]">
                          {w.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-label-md text-label-md text-text-primary font-bold block truncate">{w.name}</span>
                        <span className="font-body-sm text-[11px] text-text-muted block truncate">{w.role}</span>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm font-semibold text-text-primary">{w.capacity_pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${w.capacity_pct > 80 ? 'bg-severity-critical' : 'bg-btn-primary'}`}
                      style={{ width: `${w.capacity_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Issues & Tickets (4 cols) */}
        <div className="lg:col-span-4 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Urgent Issues</h2>
            <button
              type="button"
              onClick={() => navigate(`/workspace/projects/${id}/board`)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Board</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>

          {urgentTicketsState.loading ? (
            <div className="space-y-3 p-space-md animate-pulse">
              <div className="h-16 bg-surface-container rounded-xl" />
              <div className="h-16 bg-surface-container rounded-xl" />
            </div>
          ) : urgentTicketsState.error ? (
            <SectionError
              title="Could not load urgent tickets"
              message={urgentTicketsState.error}
              onRetry={fetchUrgentTickets}
            />
          ) : (
            <div className="flex flex-col gap-space-sm">
              {urgent_tickets?.length === 0 ? (
                <div className="p-space-lg text-center text-text-muted font-body-sm">
                  No open urgent tickets.
                </div>
              ) : (
                urgent_tickets?.map((t) => (
                  <div
                    key={t.id}
                    className="p-space-md rounded-xl bg-canvas-main hover:bg-canvas-lavender/50 border border-border-subtle/60 transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm font-bold text-text-muted">{t.ticket_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.severity === 'blocker'
                            ? 'bg-severity-blocker/15 text-severity-blocker'
                            : t.severity === 'critical'
                            ? 'bg-severity-critical/15 text-severity-critical'
                            : 'bg-severity-major/15 text-severity-major'
                        }`}
                      >
                        {t.severity}
                      </span>
                    </div>
                    <h4 className="font-headline-sm text-[13px] text-text-primary font-semibold line-clamp-1">{t.title}</h4>
                    <div className="flex items-center justify-between text-text-muted font-body-sm text-[11px] pt-1">
                      <span className="capitalize">Status: {t.status}</span>
                      <span>SLA Active</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Project Activity Stream (4 cols) */}
        <div className="lg:col-span-4 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Activity Stream</h2>
            <button
              type="button"
              onClick={() => navigate(`/workspace/projects/${id}/activity`)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Full Log</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>

          {activityState.loading ? (
            <div className="space-y-3 p-space-md animate-pulse">
              <div className="h-10 bg-surface-container rounded" />
              <div className="h-10 bg-surface-container rounded" />
            </div>
          ) : activityState.error ? (
            <SectionError
              title="Could not load activity"
              message={activityState.error}
              onRetry={fetchActivity}
            />
          ) : (
            <div className="flex flex-col gap-space-md">
              {recent_activity?.length === 0 ? (
                <div className="p-space-lg text-center text-text-muted font-body-sm">
                  No recent activity recorded.
                </div>
              ) : (
                recent_activity?.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-space-sm pb-space-sm border-b border-border-subtle/50 last:border-0 last:pb-0">
                    <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      {act.actor?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-body-sm text-[12px] text-text-primary">
                        <strong className="font-bold">{act.actor?.full_name || 'User'}</strong>{' '}
                        <span className="text-text-secondary">{act.details || act.action}</span>
                      </p>
                      <span className="font-body-sm text-[10px] text-text-muted block mt-0.5 truncate">
                        {act.target_title}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewTab;
