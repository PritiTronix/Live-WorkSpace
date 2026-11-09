import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import projectsService from '../../services/projectsService';

/**
 * Screen 45: Project Activity Tab
 * Visual Reference: Stitch Screen 45 (`b45736ddfdd241b8ab74f386e51f44dc`)
 * Route: `/workspace/projects/:id/activity`
 */
export const ProjectActivityTab = () => {
  const { id } = useParams();
  const context = useOutletContext();
  const project = context?.project;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedActor, setSelectedActor] = useState('all');

  const categories = [
    { key: 'all', label: 'All Events', count: activities.length },
    { key: 'tasks', label: 'Tasks & Board', count: activities.filter(a => a.category === 'tasks').length },
    { key: 'tickets', label: 'Tickets & SLA', count: activities.filter(a => a.category === 'tickets').length },
    { key: 'members', label: 'Members & Access', count: activities.filter(a => a.category === 'members').length },
    { key: 'files', label: 'Files & Specs', count: activities.filter(a => a.category === 'files').length },
    { key: 'discussions', label: 'Discussions', count: activities.filter(a => a.category === 'discussions').length },
  ];

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await projectsService.getProjectActivity(id, {
        category: activeCategory !== 'all' ? activeCategory : undefined,
        actor_id: selectedActor !== 'all' ? selectedActor : undefined,
        search: search.trim() || undefined,
      });
      setActivities(data);
    } catch (err) {
      console.error('Failed to load project activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [id, activeCategory, selectedActor]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'status_change':
        return { label: 'Blocker Escalate', bg: 'bg-severity-blocker/10 text-severity-blocker border-severity-blocker/30', icon: 'report' };
      case 'pr_merged':
        return { label: 'PR Merged', bg: 'bg-status-resolved/10 text-status-resolved border-status-resolved/30', icon: 'call_merge' };
      case 'milestone_updated':
        return { label: 'Milestone Updated', bg: 'bg-primary-fixed text-primary border-primary/20', icon: 'flag' };
      case 'file_uploaded':
        return { label: 'Asset Uploaded', bg: 'bg-canvas-main text-text-secondary border-border-subtle', icon: 'cloud_upload' };
      default:
        return { label: 'System Audit', bg: 'bg-surface-container text-text-primary border-border-subtle', icon: 'verified_user' };
    }
  };

  return (
    <div className="flex flex-col gap-space-lg">
      {/* 1. Header Compliance & Audit Status Bar (Screen 45) */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle/50 flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-lg bg-status-resolved/15 text-status-resolved flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Audit Log Integrity</span>
              <span className="px-2 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved text-[10px] font-bold">
                SOC-2 Verified
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-text-primary mt-0.5">
              Immutable Project Activity Ledger
            </h2>
          </div>
        </div>

        {/* Live sync badge & export button */}
        <div className="flex items-center gap-space-sm">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canvas-main border border-border-subtle text-text-secondary font-label-sm text-label-sm">
            <span className="w-2 h-2 rounded-full bg-status-resolved animate-pulse" />
            <span>Streaming live audit sync</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canvas-main hover:bg-canvas-lavender border border-border-subtle text-text-primary font-label-md text-label-md transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Audit Log</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Category Pills & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle/50">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                activeCategory === cat.key
                  ? 'bg-btn-primary text-on-primary font-bold shadow-xs'
                  : 'bg-canvas-main hover:bg-canvas-lavender text-text-secondary border border-border-subtle'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-surface-container text-text-secondary'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="relative flex-1 sm:w-60">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchActivities()}
              placeholder="Filter by target or ID..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* 3. Master Activity Stream Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left: Events Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-space-md">
          {loading ? (
            <div className="flex items-center justify-center p-12 bg-surface-card rounded-xl border border-border-subtle">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 font-body-md text-text-secondary">Loading audit events...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-surface-card rounded-xl p-space-2xl text-center border border-border-subtle">
              <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">history</span>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">No activity logs match your filter</h3>
              <p className="font-body-sm text-text-secondary mt-1">Actions performed on tasks, tickets, and files will appear here in real time.</p>
            </div>
          ) : (
            activities.map((act) => {
              const badge = getActionBadge(act.action);

              return (
                <div
                  key={act.id}
                  className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/60 flex flex-col gap-space-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-space-md">
                    <div className="flex items-center gap-space-sm">
                      <img
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-border-subtle"
                        src={act.actor?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAmt0YGYVVOxPr4ec8yeLMlH3eFipVV14C1qMrM6ZWl_Q3CsXSe8erXqQl5aoC-hylXdMtlpm7vAxewtZVSavdi540cHwdI20sNUsCMCCuak-zOLUoAcw0tZ70DFuiIx8Gb3wEnQn4Dk5w51h-GTXmS7PCFEawLwniAxRH1k2msgs1oH4D8Wa8mKn_ucl6LFJ6K4rpqwTBjlPjHt5Cq9qIpjIgWgzOnHZ7pEjeLmA8W"}
                        alt={act.actor?.full_name || 'Actor'}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline-sm text-[14px] font-bold text-text-primary">
                            {act.actor?.full_name || 'System Operator'}
                          </span>
                          <span className="font-body-sm text-[11px] text-text-muted">
                            {act.actor?.title || 'DevOps Lead'}
                          </span>
                        </div>
                        <span className="font-body-sm text-[11px] text-text-muted">
                          {act.details || act.action}
                        </span>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold border ${badge.bg}`}>
                      <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Target Card Highlight */}
                  {act.target_title && (
                    <div className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/50 flex items-center justify-between font-body-sm text-body-sm mt-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          {act.target_type === 'ticket' ? 'confirmation_number' : act.target_type === 'file' ? 'attach_file' : 'task_alt'}
                        </span>
                        <span className="font-bold text-text-primary truncate">{act.target_title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-text-muted uppercase">AUD-{act.id.slice(0, 6)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: Actor Filtering & Integrity Summary (4 cols) */}
        <aside className="lg:col-span-4 space-y-space-md">
          <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/60 flex flex-col gap-space-md">
            <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
              Filter by Actor
            </h3>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedActor('all')}
                className={`w-full p-2.5 rounded-lg text-left font-label-md text-label-md flex items-center justify-between transition-colors ${
                  selectedActor === 'all' ? 'bg-primary-fixed text-primary font-bold' : 'hover:bg-canvas-lavender text-text-secondary'
                }`}
              >
                <span>All Team Members</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>

              {project?.members?.map((mem) => (
                <button
                  key={mem.user_id}
                  type="button"
                  onClick={() => setSelectedActor(mem.user_id)}
                  className={`w-full p-2.5 rounded-lg text-left font-label-md text-label-md flex items-center justify-between transition-colors ${
                    selectedActor === mem.user_id ? 'bg-primary-fixed text-primary font-bold' : 'hover:bg-canvas-lavender text-text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img className="w-6 h-6 rounded-full object-cover" src={mem.user?.avatar_url} alt="" />
                    <span className="truncate">{mem.user?.full_name || 'Member'}</span>
                  </div>
                  <span className="font-body-sm text-[11px] text-text-muted">{mem.role}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProjectActivityTab;

