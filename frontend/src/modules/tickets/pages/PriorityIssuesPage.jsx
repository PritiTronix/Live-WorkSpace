import React, { useState, useEffect } from 'react';
import { ticketsService, createTicketsWebSocket } from '../../../services/ticketsService';
import { projectsService } from '../../../services/projectsService';
import { authService } from '../../../services/api';
import EditTicketModal from '../components/EditTicketModal';
import StatusChangeModal from '../components/StatusChangeModal';
import SeverityChangeModal from '../components/SeverityChangeModal';
import ReassignTicketModal from '../components/ReassignTicketModal';
import ChangeDeadlineModal from '../components/ChangeDeadlineModal';
import ReopenTicketModal from '../components/ReopenTicketModal';
import CloseTicketModal from '../components/CloseTicketModal';

export const PriorityIssuesPage = () => {
  const [data, setData] = useState({
    kpi: {
      blockers_active: 0,
      critical_incidents: 0,
      major_issues: 0,
      sla_breached: 0,
    },
    blockers: [],
    critical: [],
    major: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [selectedSlaStatus, setSelectedSlaStatus] = useState('all');
  const [sortBy, setSortBy] = useState('severity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [autoPriority, setAutoPriority] = useState(true);
  const [showAllCritical, setShowAllCritical] = useState(false);

  // Active contextual modal states
  const [activeModal, setActiveModal] = useState(null);
  const [modalTicket, setModalTicket] = useState(null);

  const fetchIssues = async () => {
    try {
      const params = {};
      if (selectedProjectId !== 'all') params.project_id = selectedProjectId;
      if (selectedAssigneeId !== 'all') params.assignee_id = selectedAssigneeId;
      if (selectedSlaStatus !== 'all') params.sla_status = selectedSlaStatus;
      if (sortBy) params.sort_by = sortBy;
      if (sortOrder) params.sort_order = sortOrder;
      if (search.trim()) params.search = search.trim();

      const res = await ticketsService.getCritical(params);
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Failed to load priority issues:', err);
      setError('Unable to load priority issues. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedProjectId, selectedAssigneeId, selectedSlaStatus, sortBy, sortOrder]);

  useEffect(() => {
    projectsService.getProjects()
      .then(async (res) => {
        const list = Array.isArray(res) ? res : res.projects || [];
        setProjects(list);
        // Collect members across projects
        const membersMap = new Map();
        for (const p of list) {
          if (p.members && Array.isArray(p.members)) {
            p.members.forEach((m) => {
              const u = m.user || m;
              if (u && u.id && !membersMap.has(u.id)) {
                membersMap.set(u.id, u);
              }
            });
          }
        }
        setMembers(Array.from(membersMap.values()));
      })
      .catch((e) => console.error('Failed to load projects:', e));

    // Connect WebSocket dynamically scoped to authenticated workspace
    let cleanupWs = null;
    authService.getCurrentUser()
      .then((user) => {
        const workspaceId = user?.organization_id || localStorage.getItem('organization_id') || 'org_01';
        cleanupWs = createTicketsWebSocket(workspaceId, () => {
          fetchIssues();
        });
      })
      .catch(() => {
        cleanupWs = createTicketsWebSocket('org_01', () => {
          fetchIssues();
        });
      });

    return () => {
      if (cleanupWs) cleanupWs();
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchIssues();
  };

  const openModal = (type, ticket) => {
    setActiveModal(type);
    setModalTicket(ticket);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalTicket(null);
  };

  const onTicketUpdated = () => {
    fetchIssues();
  };

  const visibleCritical = showAllCritical ? data.critical : data.critical.slice(0, 3);

  return (
    <div className="flex flex-col w-full space-y-space-lg p-space-md max-w-7xl mx-auto">
      {/* Header & Live Context Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm">
            <span className="px-2 py-0.5 rounded-full bg-severity-blocker/15 text-severity-blocker font-label-sm text-label-sm tracking-wide font-semibold uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-severity-blocker animate-ping" />
              Live Incident Queue
            </span>
            <span className="text-text-muted text-body-sm font-body-sm">Sync interval: 5s</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
            Priority Issues
          </h1>
          <p className="font-body-md text-body-md text-text-secondary max-w-3xl">
            Triage active blockers, SLA breach exposure, and escalating high-severity incidents across mission-critical services.
          </p>
        </div>

        {/* Live Auto-Priority View Switch */}
        <div className="flex items-center gap-space-sm bg-surface-card p-2 px-3 rounded-xl shadow-sm self-start lg:self-center border border-border-subtle">
          <div className="flex flex-col text-right">
            <span className="font-label-sm text-label-sm text-text-primary font-semibold">
              Auto-Priority Triage
            </span>
            <span className="font-body-sm text-body-sm text-text-muted">Dynamic escalation algorithm</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoPriority(!autoPriority)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
              autoPriority ? 'bg-btn-primary' : 'bg-surface-container-high'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-card shadow transition duration-200 ease-in-out ${
                autoPriority ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1 pl-1">
            <span className="w-2 h-2 rounded-full bg-status-resolved animate-pulse" />
            <span className="font-label-sm text-label-sm text-status-resolved font-medium">LIVE</span>
          </div>
        </div>
      </div>

      {/* KPI / Impact Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Blocker Metric */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
              Blockers Active
            </span>
            <span className="px-2 py-0.5 rounded-full bg-severity-blocker/15 text-severity-blocker font-label-sm text-label-sm font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">crisis_alert</span> High Impact
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl text-text-primary font-bold">
              {data.kpi.blockers_active}
            </span>
            <span className="font-body-sm text-body-sm text-severity-blocker font-medium">Active queue</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-body-sm text-text-muted">
            <span>Production status</span>
            <span className="font-label-sm text-label-sm text-severity-blocker font-semibold">Immediate Action</span>
          </div>
        </div>

        {/* Critical Metric */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
              Critical Incidents
            </span>
            <span className="px-2 py-0.5 rounded-full bg-severity-critical/15 text-severity-critical font-label-sm text-label-sm font-bold">
              P1 / Tier-0
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl text-text-primary font-bold">
              {data.kpi.critical_incidents}
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary font-medium">Across active services</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-body-sm text-text-muted">
            <span>SLA target: 4h</span>
            <span className="font-label-sm text-label-sm text-text-secondary font-medium">Triage queue</span>
          </div>
        </div>

        {/* Major Metric */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
              Major Issues
            </span>
            <span className="px-2 py-0.5 rounded-full bg-severity-major/20 text-text-primary font-label-sm text-label-sm font-bold">
              P2 Fleet
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl text-text-primary font-bold">
              {data.kpi.major_issues}
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary font-medium">Monitored</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-body-sm text-text-muted">
            <span>Resolution ongoing</span>
            <span className="font-label-sm text-label-sm text-status-resolved font-medium">Stable</span>
          </div>
        </div>

        {/* SLA Breached Metric */}
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
              SLA Breached
            </span>
            <span className="px-2 py-0.5 rounded-full bg-severity-blocker text-on-error font-label-sm text-label-sm font-semibold tracking-wide">
              BREACHED
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-space-xs">
            <span className="font-headline-xl text-headline-xl text-severity-blocker font-bold">
              {data.kpi.sla_breached}
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary font-medium">Target: 0 breached</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-body-sm text-text-muted">
            <span className="flex items-center gap-1 text-severity-blocker font-medium">
              <span className="material-symbols-outlined text-[14px]">warning</span> Escalate to VP Ops
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle space-y-space-md">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-text-muted">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search priority issues by title, ID, service, team..."
              className="w-full h-10 pl-10 pr-space-md bg-canvas-main rounded-lg text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:bg-surface-card border border-border-subtle"
            />
          </div>

          <div className="flex flex-wrap items-center gap-space-xs">
            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-10 px-3 bg-canvas-main rounded-lg text-text-primary font-label-sm text-label-sm outline-none cursor-pointer border border-border-subtle"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Assignee Filter */}
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="h-10 px-3 bg-canvas-main rounded-lg text-text-primary font-label-sm text-label-sm outline-none cursor-pointer border border-border-subtle"
            >
              <option value="all">All Assignees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>

            {/* SLA Status Filter */}
            <select
              value={selectedSlaStatus}
              onChange={(e) => setSelectedSlaStatus(e.target.value)}
              className="h-10 px-3 bg-canvas-main rounded-lg text-text-primary font-label-sm text-label-sm outline-none cursor-pointer border border-border-subtle"
            >
              <option value="all">All SLA Statuses</option>
              <option value="breached">SLA Breached</option>
              <option value="approaching">Approaching Breach (&lt;2h)</option>
              <option value="stable">Within SLA</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 bg-canvas-main rounded-lg text-text-primary font-label-sm text-label-sm outline-none cursor-pointer border border-border-subtle"
            >
              <option value="severity">Sort: Severity</option>
              <option value="deadline">Sort: Deadline</option>
              <option value="updated">Sort: Last Updated</option>
            </select>

            {/* Sort Order Direction Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sorting: ${sortOrder.toUpperCase()}`}
              className="h-10 px-2.5 bg-canvas-main hover:bg-surface-container-high rounded-lg text-text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-border-subtle"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted">
                {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span className="uppercase text-xs font-semibold">{sortOrder}</span>
            </button>

            <button
              type="button"
              onClick={fetchIssues}
              className="h-10 px-3 bg-canvas-main hover:bg-surface-container-high rounded-lg text-text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-border-subtle"
            >
              <span className="material-symbols-outlined text-[18px] text-text-muted">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 1: BLOCKER ISSUES */}
      <div className="space-y-space-sm">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-space-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-severity-blocker" />
            <h2 className="font-headline-sm text-headline-sm text-text-primary font-bold tracking-tight">
              Blocker Incidents
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-severity-blocker/15 text-severity-blocker font-label-sm text-label-sm font-semibold">
              {data.blockers.length} Active
            </span>
          </div>
        </div>

        <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden divide-y divide-border-subtle">
          {data.blockers.length === 0 ? (
            <div className="p-8 text-center text-text-muted font-body-md">
              No active blocker incidents.
            </div>
          ) : (
            data.blockers.map((ticket) => (
              <div
                key={ticket.id}
                className="p-space-md hover:bg-canvas-lavender/50 transition-colors flex flex-col xl:flex-row xl:items-center justify-between gap-space-md"
              >
                <div className="flex items-start gap-space-md min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-severity-blocker/15 text-severity-blocker flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-[20px]">block</span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <span className="font-mono font-label-md text-label-md text-text-primary font-bold">
                        {ticket.ticket_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-severity-blocker/15 text-severity-blocker font-label-sm text-label-sm font-semibold">
                        BLOCKER
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-label-sm font-semibold capitalize">
                        {ticket.status}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary truncate">
                      {ticket.title}
                    </h3>
                  </div>
                </div>

                {/* Actions & Context */}
                <div className="flex flex-wrap items-center justify-between xl:justify-end gap-space-md flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold flex items-center justify-center">
                      {(ticket.assignee?.full_name || 'UA').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-label-md text-label-md text-text-primary font-medium">
                        {ticket.assignee?.full_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() => openModal('edit', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('status', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Status
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('severity', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Severity
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('reassign', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Reassign
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('deadline', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Deadline
                    </button>
                    {ticket.status === 'closed' || ticket.status === 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => openModal('reopen', ticket)}
                        className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-primary"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openModal('close', ticket)}
                        className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-muted hover:text-severity-blocker"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: CRITICAL ISSUES (P1) */}
      <div className="space-y-space-sm pt-space-xs">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-space-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-severity-critical" />
            <h2 className="font-headline-sm text-headline-sm text-text-primary font-bold tracking-tight">
              Critical Incidents (P1)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-severity-critical/15 text-severity-critical font-label-sm text-label-sm font-semibold">
              {data.critical.length} Active
            </span>
          </div>
          {data.critical.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllCritical(!showAllCritical)}
              className="text-primary hover:text-primary-hover font-label-sm text-label-sm font-semibold flex items-center gap-1"
            >
              <span>{showAllCritical ? 'Show less' : `Showing 3 of ${data.critical.length} · View all`}</span>
              <span className="material-symbols-outlined text-[16px]">
                {showAllCritical ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}
        </div>

        <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden divide-y divide-border-subtle">
          {data.critical.length === 0 ? (
            <div className="p-8 text-center text-text-muted font-body-md">
              No active critical incidents.
            </div>
          ) : (
            visibleCritical.map((ticket) => (
              <div
                key={ticket.id}
                className="p-space-md hover:bg-canvas-lavender/50 transition-colors flex flex-col xl:flex-row xl:items-center justify-between gap-space-md"
              >
                <div className="flex items-start gap-space-md min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-severity-critical/15 text-severity-critical flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <span className="font-mono font-label-md text-label-md text-text-primary font-bold">
                        {ticket.ticket_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-severity-critical/15 text-severity-critical font-label-sm text-label-sm font-semibold">
                        CRITICAL
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-label-sm font-semibold capitalize">
                        {ticket.status}
                      </span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-text-primary truncate">
                      {ticket.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between xl:justify-end gap-space-md flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center justify-center">
                      {(ticket.assignee?.full_name || 'UA').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-label-md text-label-md text-text-primary font-medium">
                        {ticket.assignee?.full_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={() => openModal('edit', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('status', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Status
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('severity', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Severity
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('reassign', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Reassign
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal('deadline', ticket)}
                      className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-secondary"
                    >
                      Deadline
                    </button>
                    {ticket.status === 'closed' || ticket.status === 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => openModal('reopen', ticket)}
                        className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-primary"
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openModal('close', ticket)}
                        className="h-8 px-2.5 bg-canvas-main hover:bg-surface-container rounded font-label-sm text-label-sm text-text-muted hover:text-severity-blocker"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Render Contextual Modals */}
      <EditTicketModal
        isOpen={activeModal === 'edit'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
      <StatusChangeModal
        isOpen={activeModal === 'status'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
      <SeverityChangeModal
        isOpen={activeModal === 'severity'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
      <ReassignTicketModal
        isOpen={activeModal === 'reassign'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
      <ChangeDeadlineModal
        isOpen={activeModal === 'deadline'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
      <ReopenTicketModal
        isOpen={activeModal === 'reopen'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
      <CloseTicketModal
        isOpen={activeModal === 'close'}
        onClose={closeModal}
        ticket={modalTicket}
        onUpdated={onTicketUpdated}
      />
    </div>
  );
};

export default PriorityIssuesPage;

