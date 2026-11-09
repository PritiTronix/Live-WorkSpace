import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import projectsService from '../../services/projectsService';

/**
 * Screen 40: Project Overview Tab
 * Visual Reference: Stitch Screen 40 (`2de47248665541a69e3562f9cc200f68`)
 * Route: `/workspace/projects/:id/overview`
 */
export const ProjectOverviewTab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const project = context?.project;

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await projectsService.getProjectOverview(id);
        if (isMounted) setOverview(data);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load project overview');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchOverview();
    return () => { isMounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 font-body-md text-text-secondary">Loading project overview...</span>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="bg-surface-card rounded-xl p-space-xl border border-error/20 text-center">
        <span className="material-symbols-outlined text-[40px] text-error mb-2">error</span>
        <h3 className="font-headline-sm text-headline-sm text-text-primary mb-1">Could not load overview</h3>
        <p className="font-body-md text-text-secondary">{error || 'Project data unavailable'}</p>
      </div>
    );
  }

  const { burndown, milestones, team_workload, urgent_tickets, recent_activity } = overview;

  return (
    <div className="flex flex-col gap-space-lg">
      {/* 1. Blocker / SLA Urgent Banner (if urgent tickets exist) */}
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
            className="px-3.5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 self-start md:self-center transition-all shadow-sm"
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
                {burndown?.sprint_name || 'Active Cycle'} • Real-time completion rate
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
              {burndown?.progress_pct ?? 78}% Complete
            </span>
          </div>

          {/* Graphical Burn visualization container */}
          <div className="h-44 w-full bg-canvas-main rounded-xl p-space-md flex flex-col justify-between border border-border-subtle/50">
            <div className="flex items-center justify-between text-text-muted font-label-sm text-label-sm">
              <span>Sprint Day 1 (180 pts)</span>
              <span>Target Velocity: 12 pts/day</span>
              <span>Day 14 (Done)</span>
            </div>
            {/* SVG Wave Burndown representation */}
            <div className="relative h-24 w-full flex items-end">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                {/* Ideal guide line */}
                <line x1="0" y1="5" x2="100" y2="35" stroke="#E5E5EF" strokeWidth="2" strokeDasharray="3 3" />
                {/* Actual completed slope */}
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
                <span>Actual Burn: {burndown?.completed_points || 33} pts</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted">
                <span className="w-2.5 h-0.5 bg-border-subtle" />
                <span>Ideal Pace</span>
              </div>
              <span className="font-bold text-text-primary">{burndown?.days_remaining || 14} days remaining</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-space-md pt-space-xs text-center">
            <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
              <span className="font-label-sm text-label-sm text-text-muted block">Estimated Velocity</span>
              <span className="font-headline-sm text-headline-sm font-bold text-text-primary mt-1 block">42 pts / wk</span>
            </div>
            <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
              <span className="font-label-sm text-label-sm text-text-muted block">Story Points Closed</span>
              <span className="font-headline-sm text-headline-sm font-bold text-status-resolved mt-1 block">99 / 128 pts</span>
            </div>
            <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
              <span className="font-label-sm text-label-sm text-text-muted block">Sprint SLA Adherence</span>
              <span className="font-headline-sm text-headline-sm font-bold text-primary mt-1 block">94.8%</span>
            </div>
          </div>
        </div>

        {/* Key Milestones & Deliverables (5 cols) */}
        <div className="lg:col-span-5 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Key Milestones</h2>
            <button
              type="button"
              onClick={() => navigate(`/workspace/projects/${id}/timeline`)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-bold flex items-center gap-1"
            >
              <span>Timeline</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>

          <div className="flex flex-col gap-space-sm">
            {milestones?.map((m) => (
              <div
                key={m.id}
                className="p-space-md rounded-xl bg-canvas-main hover:bg-canvas-lavender/50 border border-border-subtle/60 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">flag</span>
                    <h3 className="font-headline-sm text-[14px] text-text-primary font-semibold">{m.title}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      m.status === 'on_track'
                        ? 'bg-status-resolved/10 text-status-resolved'
                        : m.status === 'at_risk'
                        ? 'bg-severity-critical/10 text-severity-critical'
                        : 'bg-severity-blocker/10 text-severity-blocker'
                    }`}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      m.status === 'on_track' ? 'bg-status-resolved' : 'bg-severity-critical'
                    }`}
                    style={{ width: `${m.progress_pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between font-body-sm text-body-sm text-text-secondary pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <img className="w-5 h-5 rounded-full object-cover" src={m.owner_avatar} alt={m.owner} />
                    <span>{m.owner}</span>
                  </div>
                  <span className="font-medium text-text-muted">{m.due_date}</span>
                </div>
              </div>
            ))}
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

          <div className="flex flex-col gap-space-md">
            {team_workload?.map((w) => (
              <div key={w.user_id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img className="w-7 h-7 rounded-full object-cover" src={w.avatar_url} alt={w.name} />
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
        </div>

        {/* Urgent Issues & Tickets (4 cols) */}
        <div className="lg:col-span-4 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Urgent Issues</h2>
            <button
              type="button"
              onClick={() => navigate(`/workspace/projects/${id}/board`)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-bold flex items-center gap-1"
            >
              <span>Board</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>

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
        </div>

        {/* Project Activity Stream (4 cols) */}
        <div className="lg:col-span-4 bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Activity Stream</h2>
            <button
              type="button"
              onClick={() => navigate(`/workspace/projects/${id}/activity`)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-bold flex items-center gap-1"
            >
              <span>Full Log</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewTab;

