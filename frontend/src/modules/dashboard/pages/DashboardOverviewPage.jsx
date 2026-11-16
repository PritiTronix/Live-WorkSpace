import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardService, connectDashboardWebSocket, authService } from '../../../services/api';
import { useClock } from '../../../utils/greeting';
import WelcomeModal from '../components/WelcomeModal';

export const DashboardOverviewPage = () => {
  const navigate = useNavigate();

  // State
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUserSync());
  const [wsStatus, setWsStatus] = useState('reconnecting'); // 'connected' | 'reconnecting' | 'offline'

  // Filter chips
  const [selectedPill, setSelectedPill] = useState({ id: 'all', type: 'all', label: 'All Teams' });
  const [filterOptions, setFilterOptions] = useState({ teams: [], projects: [], date_ranges: [] });

  // Real-time clock and dynamic greeting (per-user, accurate time bands, localized date)
  const { greeting, formattedDate } = useClock(currentUser);

  // Metrics states (defaults with no fake numbers)
  const [metrics, setMetrics] = useState({
    total_projects: 0,
    projects_this_month: null,
    total_tasks: 0,
    tasks_completion_rate: null,
    my_tasks: 0,
    my_tasks_due_today: null,
    open_tickets: 0,
    triage_count: null,
    work_in_progress: 0,
    active_squads_count: null,
    on_hold: 0,
    on_hold_subtext: null,
    sla_breached: 0,
    sla_compliance_rate: null,
  });

  const [tasksBreakdown, setTasksBreakdown] = useState({
    total: 0,
    done: 0,
    in_progress: 0,
    in_review: 0,
    to_do: 0,
    completion_rate: 0.0,
  });

  const [ticketsSeverity, setTicketsSeverity] = useState({
    total_active: 0,
    blocker: 0,
    critical: 0,
    major: 0,
    minor: 0,
    violations_24h: 0,
  });

  const [slaPerformance, setSlaPerformance] = useState({
    adherence_rate: null,
    adherence_delta: null,
    average_mttr: '—',
    mttr_delta: null,
    resolved_rolling_total: 0,
    rolling_days: [],
  });

  const [projectProgress, setProjectProgress] = useState([]);
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [priorityTickets, setPriorityTickets] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Export summary state
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportToast, setExportToast] = useState(null);
  const exportMenuRef = React.useRef(null);

  // Close export menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isExportMenuOpen]);

  // Handle Export Summary
  const handleExport = async (format) => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    setExportToast(null);

    const params = {};
    if (selectedPill.type === 'project') {
      params.project_id = selectedPill.value;
    } else if (selectedPill.type === 'department') {
      params.department = selectedPill.value;
    } else if (selectedPill.type === 'period') {
      params.period = selectedPill.value;
    }

    try {
      await dashboardService.exportSummary(params, format);
      setExportToast({
        type: 'success',
        message: `Workspace summary (${format.toUpperCase()}) downloaded successfully.`,
      });
      setTimeout(() => setExportToast(null), 5000);
    } catch (err) {
      console.error('Export failed:', err);
      const isRetryable = !err.response || [401, 503, 504].includes(err.response.status);
      setExportToast({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to export workspace summary.',
        canRetry: isRetryable,
        retryFormat: format,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper to fetch data with current filter
  const fetchDashboardData = useCallback(async (filterObj = selectedPill) => {
    const params = {};
    if (filterObj.type === 'project') {
      params.project_id = filterObj.value;
    } else if (filterObj.type === 'department') {
      params.department = filterObj.value;
    } else if (filterObj.type === 'period') {
      params.period = filterObj.value;
    }

    try {
      const [
        mRes,
        tbRes,
        tsRes,
        slaRes,
        ppRes,
        twRes,
        ptRes,
        actRes,
      ] = await Promise.all([
        dashboardService.getMetrics(params),
        dashboardService.getTasksBreakdown(params),
        dashboardService.getTicketsSeverity(params),
        dashboardService.getSlaPerformance(params),
        dashboardService.getProjectProgress(params),
        dashboardService.getTeamWorkload(),
        dashboardService.getPriorityTickets(params),
        dashboardService.getActivityTimeline(params),
      ]);

      if (mRes) setMetrics(mRes);
      if (tbRes) setTasksBreakdown(tbRes);
      if (tsRes) setTicketsSeverity(tsRes);
      if (slaRes) setSlaPerformance(slaRes);
      if (ppRes) setProjectProgress(ppRes);
      if (twRes) setTeamWorkload(twRes);
      if (ptRes) setPriorityTickets(ptRes);
      if (actRes) setTimeline(actRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [selectedPill]);

  useEffect(() => {
    // Current user profile
    authService.getCurrentUser().then((userData) => {
      if (userData) {
        setCurrentUser(userData);
        if (userData.onboarding_completed === false) {
          setShowWelcomeModal(true);
        }
      }
    });

    // Dynamic filters
    dashboardService.getFilters().then((f) => {
      if (f) setFilterOptions(f);
    });

    // Initial load
    fetchDashboardData(selectedPill);

    // WebSocket connection with live sync status
    const ws = connectDashboardWebSocket(
      (event) => {
        if (event.type === 'METRICS_UPDATE' && event.payload) {
          setMetrics((prev) => ({ ...prev, ...event.payload }));
        } else if (event.type === 'PRIORITY_TICKETS_UPDATE' && event.payload) {
          setPriorityTickets(event.payload);
        } else if (event.type === 'TIMELINE_NEW_EVENT' && event.payload) {
          setTimeline((prev) => [event.payload, ...prev]);
        }
      },
      (err) => {
        console.warn('Dashboard WS error:', err);
      },
      (status) => {
        setWsStatus(status);
      }
    );

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handlePillClick = (pill) => {
    setSelectedPill(pill);
    fetchDashboardData(pill);
  };

  const handleDismissWelcomeModal = async () => {
    setShowWelcomeModal(false);
    try {
      await authService.completeOnboarding();
      const refreshedUser = await authService.getCurrentUser();
      if (refreshedUser) {
        setCurrentUser(refreshedUser);
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
  };

  const filteredTickets = priorityTickets.filter((ticket) => {
    if (selectedPriorityFilter === 'ALL') return true;
    if (selectedPriorityFilter === 'BLOCKER') return ticket.severity === 'Blocker';
    if (selectedPriorityFilter === 'CRITICAL') return ticket.severity === 'Critical';
    if (selectedPriorityFilter === 'BREACHED') return (ticket.sla_text || '').includes('BREACHED');
    return true;
  });

  // Compose dynamic filter chips: All Teams, DB teams, DB projects, Dynamic Date Ranges
  const filterPills = [
    { id: 'all', type: 'all', label: 'All Teams' },
    ...(filterOptions?.teams?.length
      ? filterOptions.teams.map((t) => ({ id: `dept_${t}`, type: 'department', value: t, label: t }))
      : []),
    ...(filterOptions?.projects?.length
      ? filterOptions.projects.map((p) => ({ id: `proj_${p.id}`, type: 'project', value: p.id, label: p.name }))
      : []),
    ...(filterOptions?.date_ranges?.length
      ? filterOptions.date_ranges.map((d) => ({ id: `period_${d.id}`, type: 'period', value: d.id, label: d.label }))
      : []),
  ];

  // Dynamic ticket severity percentages
  const totalActiveTickets = ticketsSeverity.total_active || 0;
  const blockerPct = totalActiveTickets > 0 ? ((ticketsSeverity.blocker / totalActiveTickets) * 100).toFixed(1) : 0;
  const criticalPct = totalActiveTickets > 0 ? ((ticketsSeverity.critical / totalActiveTickets) * 100).toFixed(1) : 0;
  const majorPct = totalActiveTickets > 0 ? ((ticketsSeverity.major / totalActiveTickets) * 100).toFixed(1) : 0;
  const minorPct = totalActiveTickets > 0 ? ((ticketsSeverity.minor / totalActiveTickets) * 100).toFixed(1) : 0;

  // Donut chart calculations
  const totalBreakdown = tasksBreakdown.total || 0;
  const donePct = totalBreakdown > 0 ? Math.round((tasksBreakdown.done / totalBreakdown) * 100) : 0;
  const inProgPct = totalBreakdown > 0 ? Math.round((tasksBreakdown.in_progress / totalBreakdown) * 100) : 0;
  const inRevPct = totalBreakdown > 0 ? Math.round((tasksBreakdown.in_review / totalBreakdown) * 100) : 0;
  const todoPct = totalBreakdown > 0 ? Math.max(0, 100 - (donePct + inProgPct + inRevPct)) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12 font-['Inter']">
      {/* Top Header Content */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex min-w-72 flex-col gap-1.5">
          <h1 className="text-text-primary text-3xl lg:text-4xl font-extrabold leading-tight tracking-[-0.033em] font-['Plus_Jakarta_Sans']">
            {greeting}
          </h1>
          <p className="text-[#5d4f96] text-sm lg:text-base font-normal leading-normal flex items-center gap-2 flex-wrap">
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected'
                    ? 'bg-status-resolved animate-pulse'
                    : wsStatus === 'reconnecting'
                    ? 'bg-severity-major animate-ping'
                    : 'bg-text-muted'
                }`}
              ></span>
              {wsStatus === 'connected'
                ? 'Live sync connected'
                : wsStatus === 'reconnecting'
                ? 'Live sync reconnecting'
                : 'Live sync offline'}
            </span>
            <span>•</span>
            <span>Here's what's happening across your workspace.</span>
          </p>
        </div>
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            disabled={isExporting}
            className={`flex min-w-[84px] cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-lg h-10 px-4 bg-[#eae8f3] hover:bg-[#dedbe8] text-[#110e1b] text-sm font-bold leading-normal tracking-[0.015em] transition-colors ${
              isExporting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            type="button"
            aria-haspopup="true"
            aria-expanded={isExportMenuOpen}
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                <span className="truncate">Generating...</span>
              </>
            ) : (
              <>
                <span className="truncate">Export Summary</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </>
            )}
          </button>
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-surface-card border border-[#d5d0e6] shadow-xl py-1.5 z-40">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2.5 text-xs text-[#110e1b] hover:bg-[#eae8f3] flex items-center gap-2 font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-[#5d4f96]">table_view</span>
                <span>Download CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2.5 text-xs text-[#110e1b] hover:bg-[#eae8f3] flex items-center gap-2 font-semibold transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-[#5d4f96]">picture_as_pdf</span>
                <span>Download PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Dropdown Pills */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {filterPills.map((pill) => (
          <button
            key={pill.id}
            onClick={() => handlePillClick(pill)}
            className={`flex h-8 shrink-0 items-center justify-center gap-x-1.5 rounded-lg pl-3.5 pr-2.5 transition-colors cursor-pointer ${
              selectedPill.id === pill.id
                ? 'bg-btn-primary text-white shadow-sm font-semibold'
                : 'bg-[#eae8f3] hover:bg-[#dedbe8] text-[#110e1b] font-medium'
            }`}
            type="button"
          >
            <span className="text-xs leading-normal">{pill.label}</span>
          </button>
        ))}
      </div>

      {/* Row 1: Primary 4 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Projects */}
        <div
          onClick={() => navigate('/workspace/projects')}
          className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <span className="text-[#110e1b] text-sm font-medium leading-normal group-hover:text-primary transition-colors flex items-center justify-between">
            <span>Total Projects</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.total_projects}
          </span>
          {metrics.projects_this_month ? (
            <span className="text-[#078843] text-xs font-semibold leading-normal flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_up</span> +{metrics.projects_this_month} this month
            </span>
          ) : (
            <span className="text-xs text-transparent select-none">•</span>
          )}
        </div>

        {/* Total Tasks */}
        <div
          onClick={() => navigate('/workspace/tasks')}
          className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <span className="text-[#110e1b] text-sm font-medium leading-normal group-hover:text-primary transition-colors flex items-center justify-between">
            <span>Total Tasks</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.total_tasks}
          </span>
          {metrics.tasks_completion_rate !== null && metrics.tasks_completion_rate !== undefined ? (
            <span className="text-[#5d4f96] text-xs font-medium leading-normal">
              {metrics.tasks_completion_rate}% completion
            </span>
          ) : (
            <span className="text-xs text-transparent select-none">•</span>
          )}
        </div>

        {/* My Tasks */}
        <div
          onClick={() => navigate('/workspace/tasks/my-tasks')}
          className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <span className="text-[#110e1b] text-sm font-medium leading-normal group-hover:text-primary transition-colors flex items-center justify-between">
            <span>My Tasks</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.my_tasks}
          </span>
          {metrics.my_tasks_due_today !== null && metrics.my_tasks_due_today !== undefined ? (
            <span className="text-[#5d4f96] text-xs font-medium leading-normal">
              {metrics.my_tasks_due_today} due today
            </span>
          ) : (
            <span className="text-xs text-transparent select-none">•</span>
          )}
        </div>

        {/* Open Tickets */}
        <div
          onClick={() => navigate('/workspace/tickets')}
          className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <span className="text-[#110e1b] text-sm font-medium leading-normal group-hover:text-primary transition-colors flex items-center justify-between">
            <span>Open Tickets</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.open_tickets}
          </span>
          {metrics.triage_count !== null && metrics.triage_count !== undefined ? (
            <span className="text-[#5d4f96] text-xs font-medium leading-normal">
              {metrics.triage_count} triage
            </span>
          ) : (
            <span className="text-xs text-transparent select-none">•</span>
          )}
        </div>
      </div>

      {/* Row 2: Secondary 3 Operational Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Work in Progress */}
        <div
          onClick={() => navigate('/workspace/tasks')}
          className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <span className="text-[#110e1b] text-sm font-medium leading-normal group-hover:text-primary transition-colors flex items-center justify-between">
            <span>Work in Progress</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.work_in_progress}
          </span>
          {metrics.active_squads_count ? (
            <span className="text-[#5d4f96] text-xs font-medium leading-normal">
              {metrics.active_squads_count} {metrics.active_squads_count === 1 ? 'squad active' : 'squads active'}
            </span>
          ) : (
            <span className="text-xs text-transparent select-none">•</span>
          )}
        </div>

        {/* On Hold */}
        <div
          onClick={() => navigate('/workspace/tickets')}
          className="flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
          role="button"
          tabIndex={0}
        >
          <span className="text-[#110e1b] text-sm font-medium leading-normal group-hover:text-primary transition-colors flex items-center justify-between">
            <span>On Hold</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span className="text-[#110e1b] tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans']">
            {metrics.on_hold}
          </span>
          {metrics.on_hold_subtext ? (
            <span className="text-[#5d4f96] text-xs font-medium leading-normal">{metrics.on_hold_subtext}</span>
          ) : (
            <span className="text-xs text-transparent select-none">•</span>
          )}
        </div>

        {/* SLA Breached */}
        <div
          onClick={() => navigate('/workspace/tickets/critical')}
          className={`flex flex-col gap-2 rounded-xl p-5 bg-surface-card border border-[#d5d0e6] shadow-sm transition-all cursor-pointer group ${
            metrics.sla_breached > 0 ? 'hover:border-severity-blocker/50 hover:shadow-md' : 'hover:border-primary/50 hover:shadow-md'
          }`}
          role="button"
          tabIndex={0}
        >
          <span
            className={`text-sm font-semibold leading-normal flex items-center justify-between ${
              metrics.sla_breached > 0 ? 'text-severity-blocker' : 'text-[#110e1b] group-hover:text-primary transition-colors'
            }`}
          >
            <span>SLA Breached</span>
            <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
          </span>
          <span
            className={`tracking-tight text-3xl font-extrabold leading-tight font-['Plus_Jakarta_Sans'] ${
              metrics.sla_breached > 0 ? 'text-severity-blocker' : 'text-[#110e1b]'
            }`}
          >
            {metrics.sla_breached}
          </span>
          {metrics.sla_breached > 0 ? (
            <span className="text-severity-blocker text-xs font-semibold leading-normal">
              {metrics.sla_compliance_rate !== null && metrics.sla_compliance_rate !== undefined
                ? `${metrics.sla_compliance_rate}% SLA`
                : 'breached'}
            </span>
          ) : metrics.sla_compliance_rate !== null && metrics.sla_compliance_rate !== undefined ? (
            <span className="text-status-resolved text-xs font-semibold leading-normal flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{metrics.sla_compliance_rate}% SLA</span>
            </span>
          ) : (
            <span className="text-[#5d4f96] text-xs font-medium leading-normal">—</span>
          )}
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
                  {/* Done */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#28C078"
                    strokeDasharray={`${donePct} ${100 - donePct}`}
                    strokeDashoffset="0"
                    strokeWidth="4.5"
                  />
                  {/* In Progress */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#6848E8"
                    strokeDasharray={`${inProgPct} ${100 - inProgPct}`}
                    strokeDashoffset={`-${donePct}`}
                    strokeWidth="4.5"
                  />
                  {/* Review */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#3888F8"
                    strokeDasharray={`${inRevPct} ${100 - inRevPct}`}
                    strokeDashoffset={`-${donePct + inProgPct}`}
                    strokeWidth="4.5"
                  />
                  {/* To Do */}
                  <circle
                    cx="18"
                    cy="18"
                    fill="transparent"
                    r="14"
                    stroke="#c9c4d8"
                    strokeDasharray={`${todoPct} ${100 - todoPct}`}
                    strokeDashoffset={`-${donePct + inProgPct + inRevPct}`}
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
                <div className="bg-severity-blocker h-full transition-all" style={{ width: `${blockerPct}%` }}></div>
                <div className="bg-severity-critical h-full transition-all" style={{ width: `${criticalPct}%` }}></div>
                <div className="bg-severity-major h-full transition-all" style={{ width: `${majorPct}%` }}></div>
                <div className="bg-status-open h-full transition-all" style={{ width: `${minorPct}%` }}></div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-severity-blocker"></span>
                    <span className="font-medium text-text-primary">Blocker</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.blocker} tickets{' '}
                    <span className="text-text-muted font-normal">({blockerPct}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-severity-critical"></span>
                    <span className="font-medium text-text-primary">Critical</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.critical} tickets{' '}
                    <span className="text-text-muted font-normal">({criticalPct}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-severity-major"></span>
                    <span className="font-medium text-text-primary">Major</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.major} tickets{' '}
                    <span className="text-text-muted font-normal">({majorPct}%)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-status-open"></span>
                    <span className="font-medium text-text-primary">Minor</span>
                  </div>
                  <span className="font-bold text-text-primary">
                    {ticketsSeverity.minor} tickets{' '}
                    <span className="text-text-muted font-normal">({minorPct}%)</span>
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
                  {slaPerformance.adherence_rate !== null ? `${slaPerformance.adherence_rate}%` : '—'}
                </div>
                {slaPerformance.adherence_delta && (
                  <div className="text-[11px] text-status-resolved flex items-center gap-0.5 mt-1 font-medium">
                    <span className="material-symbols-outlined text-[13px]">trending_up</span>{' '}
                    {slaPerformance.adherence_delta} vs last week
                  </div>
                )}
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg border border-border-subtle">
                <div className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold">
                  Average MTTR
                </div>
                <div className="text-xl font-extrabold text-text-primary font-['Plus_Jakarta_Sans'] mt-0.5">
                  {slaPerformance.average_mttr}
                </div>
                {slaPerformance.mttr_delta && (
                  <div className="text-[11px] text-status-resolved flex items-center gap-0.5 mt-1 font-medium">
                    <span className="material-symbols-outlined text-[13px]">timer</span> {slaPerformance.mttr_delta}
                  </div>
                )}
              </div>
            </div>

            {/* Mini Bar Sparkline */}
            <div className="pt-2">
              <div className="text-xs text-text-secondary font-medium mb-1.5 flex justify-between">
                <span>Rolling Velocity (Resolved Tickets)</span>
                <span className="font-bold text-text-primary">{slaPerformance.resolved_rolling_total} total</span>
              </div>
              <div className="flex items-end gap-1.5 h-10 w-full pt-1">
                {slaPerformance.rolling_days && slaPerformance.rolling_days.length > 0 ? (
                  slaPerformance.rolling_days.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t transition-all bg-secondary-container hover:bg-primary"
                      style={{ height: item.height }}
                      title={`${item.day}: ${item.count}`}
                    ></div>
                  ))
                ) : (
                  <div className="w-full text-center text-text-muted text-[11px]">No rolling tickets</div>
                )}
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
                  Project Progress & Status
                </h3>
              </div>
              <span className="text-xs text-text-secondary">{projectProgress.length} Active</span>
            </div>

            <div className="space-y-4">
              {projectProgress.length > 0 ? (
                projectProgress.map((proj) => (
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
                ))
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No active projects found.</p>
              )}
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
              <span className="text-xs text-text-secondary">{teamWorkload.length} Squads Tracked</span>
            </div>

            <div className="space-y-4">
              {teamWorkload.length > 0 ? (
                teamWorkload.map((squad, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-surface-container-low border-border-subtle">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-text-primary">{squad.name}</span>
                      <span className="font-bold text-primary">{squad.status}</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div
                        className={`${squad.color} h-2 rounded-full`}
                        style={{ width: `${squad.capacity}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-1.5">{squad.desc}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No squad workloads recorded.</p>
              )}
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
                All Priorities ({priorityTickets.length})
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
                Blocker ({priorityTickets.filter((t) => t.severity.toLowerCase() === 'blocker').length})
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
                Critical ({priorityTickets.filter((t) => t.severity.toLowerCase() === 'critical').length})
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
                Breached SLA ({priorityTickets.filter((t) => (t.sla_text || '').includes('BREACHED')).length})
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
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
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
                          {ticket.assignee_avatar ? (
                            <img
                              src={ticket.assignee_avatar}
                              alt={ticket.assignee_name}
                              className="w-6 h-6 rounded-full object-cover ring-1 ring-border-subtle"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-container text-primary font-bold text-[10px] flex items-center justify-center">
                              {ticket.assignee_name ? ticket.assignee_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <span className="text-text-primary font-medium">{ticket.assignee_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${ticket.sla_class}`}>
                          {ticket.sla_text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link to={`/workspace/tickets/${ticket.id}`} className="inline-flex items-center text-primary font-bold hover:underline">
                          View Ticket →
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-muted">
                      No priority issues requiring attention.
                    </td>
                  </tr>
                )}
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
            <button
              onClick={() => navigate('/workspace/audit-logs')}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              type="button"
            >
              View All Logs
            </button>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
            {timeline.length > 0 ? (
              timeline.map((item) => (
                <div key={item.id} className="relative flex items-start gap-3">
                  <div className={`absolute -left-6 mt-1 w-3 h-3 rounded-full ${item.dot_color} ring-4 ring-white`}></div>
                  {item.is_bot ? (
                    <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-severity-critical shrink-0 border border-border-subtle">
                      <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                    </div>
                  ) : item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.actor}
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-border-subtle"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-container text-primary flex items-center justify-center text-[10px] font-bold shrink-0 border border-border-subtle">
                      {item.actor ? item.actor.charAt(0).toUpperCase() : 'S'}
                    </div>
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
              ))
            ) : (
              <p className="text-xs text-text-muted py-4">No recent activity recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Screen: First Login Welcome Tour Dialog */}
      {showWelcomeModal && (
        <WelcomeModal
          isOpen={showWelcomeModal}
          onClose={handleDismissWelcomeModal}
          userName={currentUser?.full_name || 'Team Member'}
        />
      )}

      {/* Export Toast Notification */}
      {exportToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium ${
            exportToast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {exportToast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{exportToast.message}</span>
          {exportToast.canRetry && (
            <button
              type="button"
              onClick={() => handleExport(exportToast.retryFormat)}
              className="ml-2 underline font-bold hover:opacity-80 cursor-pointer"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => setExportToast(null)}
            className="ml-1 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardOverviewPage;
