import React, { useState, useEffect } from 'react';
import { dashboardService, connectDashboardWebSocket } from '../../../services/api';

export const DashboardOverviewPage = () => {
  const [metrics, setMetrics] = useState({
    total_projects: 14,
    total_tasks: 248,
    my_tasks: 12,
    open_tickets: 37,
    work_in_progress: 19,
    on_hold: 5,
    sla_breached: 2,
  });

  const [tasksBreakdown, setTasksBreakdown] = useState({
    total: 248,
    done: 142,
    in_progress: 68,
    in_review: 26,
    to_do: 12,
    completion_rate: 57.2,
  });

  const [ticketsSeverity, setTicketsSeverity] = useState({
    total_active: 37,
    blocker: 3,
    critical: 7,
    major: 12,
    minor: 15,
    violations_24h: 2,
  });

  const [slaPerformance, setSlaPerformance] = useState({
    adherence_rate: 96.4,
    adherence_delta: '+1.8%',
    average_mttr: '14m',
    mttr_delta: '-3m faster',
    resolved_rolling_total: 34,
    rolling_days: [
      { day: 'Thu', count: 4, height: '45%' },
      { day: 'Fri', count: 6, height: '60%' },
      { day: 'Sat', count: 3, height: '35%' },
      { day: 'Sun', count: 2, height: '20%' },
      { day: 'Mon', count: 9, height: '85%' },
      { day: 'Tue', count: 10, height: '100%' },
      { day: 'Today', count: 7, height: '70%' },
    ],
  });

  const [projectProgress, setProjectProgress] = useState([
    { id: 'prj_1', title: 'Platform Revamp 2.0', progress: 78, squads: '4 squads assigned', target: 'Dec 15', status_color: 'bg-btn-primary' },
    { id: 'prj_2', title: 'Auth Proxy Gateway Migration', progress: 92, squads: 'SRE Canary Rollout', target: 'Nov 30', status_color: 'bg-status-resolved' },
    { id: 'prj_3', title: 'Data Pipeline v3', progress: 45, squads: 'Blocked on Kafka sync', target: 'Jan 10', status_color: 'bg-severity-critical' },
  ]);

  const [teamWorkload, setTeamWorkload] = useState([
    { name: 'Platform Squad', capacity: 88, status: '88% Capacity', color: 'bg-primary-container', desc: '6 Engineers • 18 active tasks • Optimal burn-rate' },
    { name: 'SRE Incident Response', capacity: 94, status: '94% Overload Warning', color: 'bg-severity-critical', desc: '4 On-call SREs • 2 Blocker alerts active • High paging rate' },
    { name: 'Core API Squad', capacity: 62, status: '62% Available', color: 'bg-status-resolved', desc: '5 Engineers • Ready for failover sprint allocation' },
  ]);

  const [priorityTickets, setPriorityTickets] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');

  useEffect(() => {
    // Fetch initial state from service
    dashboardService.getMetrics().then(setMetrics);
    dashboardService.getTasksBreakdown().then(setTasksBreakdown);
    dashboardService.getTicketsSeverity().then(setTicketsSeverity);
    dashboardService.getSlaPerformance().then(setSlaPerformance);
    dashboardService.getProjectProgress().then(setProjectProgress);
    dashboardService.getTeamWorkload().then(setTeamWorkload);
    dashboardService.getPriorityTickets().then(setPriorityTickets);
    dashboardService.getActivityTimeline().then(setTimeline);

    // Real-time WebSocket connection
    const ws = connectDashboardWebSocket((event) => {
      if (event.type === 'METRICS_UPDATE' && event.payload) {
        setMetrics((prev) => ({ ...prev, ...event.payload }));
      } else if (event.type === 'PRIORITY_TICKETS_UPDATE' && event.payload) {
        setPriorityTickets(event.payload);
      } else if (event.type === 'TIMELINE_NEW_EVENT' && event.payload) {
        setTimeline((prev) => [event.payload, ...prev]);
      }
    });

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const filteredTickets = priorityTickets.filter((ticket) => {
    if (selectedPriorityFilter === 'ALL') return true;
    if (selectedPriorityFilter === 'BLOCKER') return ticket.severity === 'Blocker';
    if (selectedPriorityFilter === 'CRITICAL') return ticket.severity === 'Critical';
    if (selectedPriorityFilter === 'BREACHED') return ticket.sla_text.includes('BREACHED');
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 font-['Inter']">
      {/* Top Header Content */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex min-w-72 flex-col gap-1.5">
          <h1 className="text-text-primary text-3xl lg:text-4xl font-extrabold leading-tight tracking-[-0.033em] font-['Plus_Jakarta_Sans']">
            Good Morning, Maya
          </h1>
          <p className="text-[#5d4f96] text-sm lg:text-base font-normal leading-normal">
            Wednesday, Nov 26, 2025 • Live sync active • Here's what's happening across your workspace.
          </p>
        </div>
        <button
          onClick={() => alert('Exporting workspace summary PDF/CSV...')}
          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#eae8f3] hover:bg-[#dedbe8] text-[#110e1b] text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
          type="button"
        >
          <span className="truncate">Export Summary</span>
        </button>
      </div>

      {/* Filter Dropdown Pills */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {['All Teams', 'Platform Engineering', 'SRE Incident Response', 'Today', 'This Sprint', 'Q4 2025'].map(
          (pill, index) => (
            <button
              key={index}
              className="flex h-8 shrink-0 items-center justify-center gap-x-1.5 rounded-lg bg-[#eae8f3] hover:bg-[#dedbe8] pl-3.5 pr-2 transition-colors cursor-pointer"
              type="button"
            >
              <span className="text-[#110e1b] text-xs font-medium leading-normal">{pill}</span>
              <span className="material-symbols-outlined text-[16px] text-[#110e1b]">expand_more</span>
            </button>
          )
        )}
      </div>

      {/* Row 1: Primary 4 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">Total Projects</span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.total_projects}
          </span>
          <span className="text-[#078843] text-xs font-semibold leading-normal flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span> +2 this month
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">Total Tasks</span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.total_tasks}
          </span>
          <span className="text-[#5d4f96] text-xs font-medium leading-normal">84% completion</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">My Tasks</span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.my_tasks}
          </span>
          <span className="text-[#5d4f96] text-xs font-medium leading-normal">4 due today</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">Open Tickets</span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.open_tickets}
          </span>
          <span className="text-[#5d4f96] text-xs font-medium leading-normal">8 triage</span>
        </div>
      </div>

      {/* Row 2: Secondary 3 Operational Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">Work in Progress</span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.work_in_progress}
          </span>
          <span className="text-[#5d4f96] text-xs font-medium leading-normal">4 squads active</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">On Hold</span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.on_hold}
          </span>
          <span className="text-[#5d4f96] text-xs font-medium leading-normal">Vendor pending</span>
        </div>

        <div className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm">
          <span className="text-[#110e1b] text-sm font-medium leading-normal">SLA Breached</span>
          <span className="text-severity-blocker tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.sla_breached}
          </span>
          <span className="text-severity-blocker text-xs font-semibold leading-normal">-100% SLA</span>
        </div>
      </div>

      {/* Analytics & Squad Operations Section */}
      <div className="flex flex-col gap-5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-text-primary text-xl font-bold font-['Plus_Jakarta_Sans'] tracking-[-0.015em]">
              Analytics & Squad Operations
            </h2>
            <p className="text-text-secondary text-xs sm:text-sm">
              Real-time throughput, reliability health, and capacity allocation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-status-resolved border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-status-resolved animate-pulse"></span>
              99.98% System Uptime
            </span>
          </div>
        </div>

        {/* 3 Column Performance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Tasks by Status Donut Chart */}
          <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-surface-container text-primary material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                <h3 className="text-text-primary font-bold text-sm font-['Plus_Jakarta_Sans']">Tasks by Status</h3>
              </div>
              <span className="text-xs text-text-secondary font-medium">{tasksBreakdown.total} Total</span>
            </div>

            {/* Donut Chart */}
            <div className="flex items-center justify-center my-3">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Done 57% */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#28C078"
                    strokeDasharray="57 43"
                    strokeDashoffset="0"
                    strokeWidth="4.5"
                  />
                  {/* In Progress 27% */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#6848E8"
                    strokeDasharray="27 73"
                    strokeDashoffset="-57"
                    strokeWidth="4.5"
                  />
                  {/* Review 10% */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#3888F8"
                    strokeDasharray="10 90"
                    strokeDashoffset="-84"
                    strokeWidth="4.5"
                  />
                  {/* To Do 6% */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#c9c4d8"
                    strokeDasharray="6 94"
                    strokeDashoffset="-94"
                    strokeWidth="4.5"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs text-text-muted">Completed</span>
                  <span className="text-lg font-bold text-text-primary font-['Plus_Jakarta_Sans']">
                    {tasksBreakdown.completion_rate}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-subtle text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-resolved"></span>
                <span className="text-text-secondary">Done ({tasksBreakdown.done})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-wip"></span>
                <span className="text-text-secondary">In Prog ({tasksBreakdown.in_progress})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-status-open"></span>
                <span className="text-text-secondary">Review ({tasksBreakdown.in_review})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9c4d8]"></span>
                <span className="text-text-secondary">To Do ({tasksBreakdown.to_do})</span>
              </div>
            </div>
          </div>

          {/* Card 2: Tickets by Severity Stacked Bar */}
          <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-50 text-severity-critical material-symbols-outlined text-[18px]">
                  warning
                </span>
                <h3 className="text-text-primary font-bold text-sm font-['Plus_Jakarta_Sans']">Tickets by Severity</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-severity-blocker">
                {ticketsSeverity.total_active} Active
              </span>
            </div>

            {/* Horizontal Segmented Bar */}
            <div className="space-y-3 my-auto">
              <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden flex">
                <div className="bg-severity-blocker h-full" style={{ width: '8.1%' }}></div>
                <div className="bg-severity-critical h-full" style={{ width: '18.9%' }}></div>
                <div className="bg-severity-major h-full" style={{ width: '32.4%' }}></div>
                <div className="bg-status-open h-full" style={{ width: '40.6%' }}></div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-severity-blocker"></span>
                    <span className="font-medium text-text-primary">Blocker</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.blocker} tickets <span className="text-text-muted font-normal">(8.1%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-severity-critical"></span>
                    <span className="font-medium text-text-primary">Critical</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.critical} tickets <span className="text-text-muted font-normal">(18.9%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-severity-major"></span>
                    <span className="font-medium text-text-primary">Major</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.major} tickets <span className="text-text-muted font-normal">(32.4%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-status-open"></span>
                    <span className="font-medium text-text-primary">Minor</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.minor} tickets <span className="text-text-muted font-normal">(40.6%)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-text-secondary bg-surface-container-low p-2 rounded mt-3 text-center">
              {ticketsSeverity.violations_24h} SLA violations logged in last 24h
            </div>
          </div>

          {/* Card 3: Ticket Resolution & SLA Velocity */}
          <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-green-50 text-status-resolved material-symbols-outlined text-[18px]">
                  verified
                </span>
                <h3 className="text-text-primary font-bold text-sm font-['Plus_Jakarta_Sans']">
                  Resolution & SLA Velocity
                </h3>
              </div>
              <span className="text-xs text-text-secondary">7-day avg</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-2">
              <div className="p-3 bg-surface-container-low rounded-lg border border-border-subtle">
                <div className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
                  SLA Adherence
                </div>
                <div className="text-xl font-extrabold text-status-resolved font-['Plus_Jakarta_Sans'] mt-0.5">
                  {slaPerformance.adherence_rate}%
                </div>
                <div className="text-[11px] text-status-resolved flex items-center gap-0.5 mt-1 font-medium">
                  <span className="material-symbols-outlined text-[13px]">trending_up</span>{' '}
                  {slaPerformance.adherence_delta} vs last week
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-border-subtle">
                <div className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
                  Average MTTR
                </div>
                <div className="text-xl font-extrabold text-text-primary font-['Plus_Jakarta_Sans'] mt-0.5">
                  {slaPerformance.average_mttr}
                </div>
                <div className="text-[11px] text-status-resolved flex items-center gap-0.5 mt-1 font-medium">
                  <span className="material-symbols-outlined text-[13px]">timer</span> {slaPerformance.mttr_delta}
                </div>
              </div>
            </div>

            {/* Mini Bar Sparkline */}
            <div className="pt-2">
              <div className="text-xs text-text-secondary font-medium mb-1.5 flex justify-between">
                <span>Rolling Velocity (Resolved Tickets)</span>
                <span className="font-bold text-text-primary">{slaPerformance.resolved_rolling_total} total</span>
              </div>
              <div className="flex items-end gap-1.5 h-10 w-full pt-1">
                {slaPerformance.rolling_days.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-t transition-all ${
                      item.day === 'Tue'
                        ? 'bg-primary'
                        : 'bg-secondary-container hover:bg-primary'
                    }`}
                    style={{ height: item.height }}
                    title={`${item.day}: ${item.count}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2 Column Section: Project Progress & Team Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Project Progress */}
          <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-surface-container text-primary material-symbols-outlined text-[18px]">
                  rocket_launch
                </span>
                <h3 className="text-text-primary font-bold text-sm font-['Plus_Jakarta_Sans']">
                  Project Progress & Sprint Velocity
                </h3>
              </div>
              <span className="text-xs text-text-secondary">Sprint 42 • Active</span>
            </div>

            <div className="space-y-4">
              {projectProgress.map((proj) => (
                <div key={proj.id}>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-text-primary">{proj.title}</span>
                    <span className="font-bold text-primary">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2">
                    <div
                      className={`${proj.status_color} h-2 rounded-full`}
                      style={{ width: `${proj.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-text-secondary mt-1">
                    <span>{proj.squads}</span>
                    <span>Target: {proj.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Workload & Capacity */}
          <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-surface-container text-primary material-symbols-outlined text-[18px]">
                  groups
                </span>
                <h3 className="text-text-primary font-bold text-sm font-['Plus_Jakarta_Sans']">
                  Team Workload & Capacity
                </h3>
              </div>
              <span className="text-xs text-text-secondary">3 Squads Tracked</span>
            </div>

            <div className="space-y-4">
              {teamWorkload.map((squad, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    squad.name === 'SRE Incident Response'
                      ? 'bg-orange-50/50 border-orange-200'
                      : 'bg-surface-container-low border-border-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-text-primary">{squad.name}</span>
                    <span
                      className={`font-bold ${
                        squad.name === 'SRE Incident Response'
                          ? 'text-severity-critical'
                          : squad.name === 'Platform Squad'
                          ? 'text-primary'
                          : 'text-status-resolved'
                      }`}
                    >
                      {squad.status}
                    </span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div
                      className={`${squad.color} h-2 rounded-full`}
                      style={{ width: `${squad.capacity}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1.5">{squad.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Issues Requiring Attention Table */}
        <div className="bg-surface-card rounded-xl border border-border-subtle shadow-sm overflow-hidden mt-2">
          <div className="p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-text-primary text-base font-bold font-['Plus_Jakarta_Sans']">
                Priority Issues Requiring Attention
              </h3>
              <p className="text-text-secondary text-xs">Sorted by Severity, SLA Breach Risk, and Approaching Deadlines</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedPriorityFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedPriorityFilter === 'ALL'
                    ? 'bg-btn-primary text-white shadow-sm'
                    : 'bg-[#eae8f3] text-text-secondary hover:text-text-primary'
                }`}
                type="button"
              >
                All Priorities (12)
              </button>
              <button
                onClick={() => setSelectedPriorityFilter('BLOCKER')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                  selectedPriorityFilter === 'BLOCKER'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-severity-blocker hover:bg-red-100 border-red-200'
                }`}
                type="button"
              >
                Blocker (3)
              </button>
              <button
                onClick={() => setSelectedPriorityFilter('CRITICAL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                  selectedPriorityFilter === 'CRITICAL'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-severity-critical hover:bg-amber-100 border-amber-200'
                }`}
                type="button"
              >
                Critical (7)
              </button>
              <button
                onClick={() => setSelectedPriorityFilter('BREACHED')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                  selectedPriorityFilter === 'BREACHED'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-100 text-error hover:bg-rose-200 border-rose-300'
                }`}
                type="button"
              >
                Breached SLA (2)
              </button>
            </div>
          </div>

          {/* Interactive Tickets Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-text-secondary uppercase tracking-wider font-semibold border-b border-border-subtle">
                <tr>
                  <th className="py-3 px-4">Ticket ID & Summary</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">SLA Countdown</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`transition-colors ${
                      ticket.severity === 'Blocker'
                        ? 'hover:bg-red-50/30'
                        : ticket.severity === 'Critical'
                        ? 'hover:bg-amber-50/30'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary tracking-tight font-mono">{ticket.id}</span>
                        <span className="text-text-primary font-medium truncate max-w-xs md:max-w-md">
                          {ticket.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${ticket.severity_bg}`}>
                        {ticket.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ticket.status === 'Open'
                              ? 'bg-status-open'
                              : ticket.status === 'On Hold'
                              ? 'bg-status-on-hold'
                              : 'bg-status-wip'
                          }`}
                        ></span>
                        <span
                          className={
                            ticket.status === 'Open'
                              ? 'text-status-open'
                              : ticket.status === 'On Hold'
                              ? 'text-text-secondary'
                              : 'text-status-wip'
                          }
                        >
                          {ticket.status}
                        </span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={ticket.assignee_avatar}
                          alt={ticket.assignee_name}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-border-subtle"
                        />
                        <span className="text-text-primary font-medium">{ticket.assignee_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${ticket.sla_class}`}>
                        {ticket.sla_text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a href={`#ticket-${ticket.id}`} className="inline-flex items-center text-primary font-bold hover:underline">
                        View Ticket →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-surface-card rounded-xl p-5 border border-border-subtle shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-surface-container text-primary material-symbols-outlined text-[18px]">
                history
              </span>
              <h3 className="text-text-primary font-bold text-sm font-['Plus_Jakarta_Sans']">Recent Activity Timeline</h3>
            </div>
            <button className="text-xs text-primary font-semibold hover:underline" type="button">
              View All Logs
            </button>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {timeline.map((item) => (
              <div key={item.id} className="relative flex items-start gap-3">
                <div className={`absolute -left-6 mt-1 w-3 h-3 rounded-full ${item.dot_color} ring-4 ring-white`}></div>
                {item.is_bot ? (
                  <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-severity-critical shrink-0 border border-border-subtle">
                    <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                  </div>
                ) : (
                  <img
                    src={item.avatar}
                    alt={item.actor}
                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-border-subtle"
                  />
                )}
                <div className="flex-1 text-xs">
                  <p className="text-text-primary">
                    <span className="font-bold">{item.actor}</span> {item.action}{' '}
                    {item.status_badge && (
                      <span className={`font-semibold ${item.status_color}`}>{item.status_badge}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewPage;
