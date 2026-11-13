import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../../services/analyticsService';
import { projectsService } from '../../../services/projectsService';
import AnalyticsExportModal from '../components/AnalyticsExportModal';

export const ReportsAnalyticsPage = () => {
  // Filters state (Misleading squad filter removed F-08)
  const [timeHorizon, setTimeHorizon] = useState('30d');
  const [projectId, setProjectId] = useState('all');
  const [severity, setSeverity] = useState('all');

  // Data state
  const [dashboardData, setDashboardData] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTooltipIndex, setActiveTooltipIndex] = useState(null);

  // Load projects for filter dropdown
  useEffect(() => {
    projectsService.getProjects({ page_size: 50 }).then((res) => {
      const items = res?.items || (Array.isArray(res) ? res : []);
      setProjectsList(items);
    }).catch(() => {
      setProjectsList([]);
    });
  }, []);

  // Fetch telemetry dashboard data
  const fetchDashboard = () => {
    setIsLoading(true);
    analyticsService
      .getDashboard({
        time_horizon: timeHorizon,
        project_id: projectId,
        severity: severity,
      })
      .then((data) => {
        setDashboardData(data);
        setLastFetchedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load analytics telemetry:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeHorizon, projectId, severity]);

  const handleResetFilters = () => {
    setTimeHorizon('30d');
    setProjectId('all');
    setSeverity('all');
  };

  // Real database metrics with zero hardcoded fake fallbacks (F-02, F-04)
  const kpis = dashboardData?.kpis || {
    total_tickets: 0,
    total_tickets_delta_pct: null,
    resolved_tickets: 0,
    completion_rate: 0.0,
    open_backlog: 0,
    high_priority_backlog: 0,
    sla_adherence_pct: null,
    sla_target_pct: null,
    avg_response_time: null,
    avg_response_delta: null,
    avg_mttr: null,
    avg_mttr_delta: null,
  };

  const velocityTrend = dashboardData?.velocity_trend || {
    items: [],
    baseline_threshold: null,
    net_velocity_ratio: null,
    sprint_velocity_pct: null,
  };

  const severityItems = dashboardData?.severity_distribution || [];
  const statusItems = dashboardData?.status_distribution || [];
  const squadSla = dashboardData?.squad_sla || [];
  const employees = dashboardData?.employees || [];

  // SVG Chart Dimensions & Computations for Velocity Trend
  const chartWidth = 560;
  const chartHeight = 180;
  const trendItems = velocityTrend.items || [];
  const hasResolvedTrend = trendItems.some(
    (d) => d.resolved_count !== null && d.resolved_count !== undefined
  );
  const maxVal = Math.max(
    10,
    ...trendItems.map((d) => Math.max(d.created_count || 0, d.resolved_count || 0, 1))
  );

  const pointsCreated = trendItems.map((item, idx) => {
    const x = 30 + (idx / Math.max(1, trendItems.length - 1)) * (chartWidth - 60);
    const y = chartHeight - 25 - ((item.created_count || 0) / maxVal) * (chartHeight - 50);
    return { x, y, ...item };
  });

  const pointsResolved = hasResolvedTrend
    ? trendItems.map((item, idx) => {
        const x = 30 + (idx / Math.max(1, trendItems.length - 1)) * (chartWidth - 60);
        const y = chartHeight - 25 - ((item.resolved_count || 0) / maxVal) * (chartHeight - 50);
        return { x, y, ...item };
      })
    : [];

  const createdPathD = pointsCreated.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const resolvedPathD = hasResolvedTrend
    ? pointsResolved.reduce(
        (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
        ''
      )
    : '';

  const createdAreaD = pointsCreated.length
    ? `${createdPathD} L ${pointsCreated[pointsCreated.length - 1].x} ${chartHeight - 25} L ${pointsCreated[0].x} ${chartHeight - 25} Z`
    : '';

  const resolvedAreaD = hasResolvedTrend && pointsResolved.length
    ? `${resolvedPathD} L ${pointsResolved[pointsResolved.length - 1].x} ${chartHeight - 25} L ${pointsResolved[0].x} ${chartHeight - 25} Z`
    : '';

  // Severity Donut Chart SVG angles
  const totalSevCount = severityItems.reduce((acc, it) => acc + it.count, 0);
  const donutCircumference = 2 * Math.PI * 45;

  let accumulatedPercent = 0;
  const donutSegments = severityItems.map((item) => {
    const strokeDasharray = totalSevCount > 0
      ? `${(item.count / totalSevCount) * donutCircumference} ${donutCircumference}`
      : `0 ${donutCircumference}`;
    const strokeDashoffset = -accumulatedPercent * donutCircumference;
    if (totalSevCount > 0) accumulatedPercent += item.count / totalSevCount;

    const colorMap = {
      blocker: '#F55354',
      critical: '#F8A040',
      major: '#F8C048',
      minor: '#8870F0',
    };

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      color: colorMap[item.key] || '#8870F0',
    };
  });

  const highPriorityCount =
    (severityItems.find((s) => s.key === 'blocker')?.count || 0) +
    (severityItems.find((s) => s.key === 'critical')?.count || 0);
  const highPriorityPct = totalSevCount > 0 ? ((highPriorityCount / totalSevCount) * 100).toFixed(0) : '0';

  return (
    <div className="min-h-screen bg-canvas-default text-text-primary p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── 1. Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm text-text-muted">Live Workspace</span>
            <span className="text-text-muted text-[12px]">•</span>
            <span className="font-label-sm text-label-sm text-text-muted">Analytics</span>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
              Telemetry v4.2
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary">
            Reports & Analytics
          </h1>
          <p className="font-body-md text-body-md text-text-secondary mt-0.5">
            Verified team performance, SLA metrics, and incident resolution velocity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Neutral status indicator (Removed fake live-sync ping F-11) */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle text-body-sm text-text-secondary shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-label-sm text-label-sm">
              {lastFetchedAt ? `Updated ${lastFetchedAt}` : 'Telemetry Aggregated'}
            </span>
          </div>

          {/* Schedule Digest (Disabled state rather than fake alert) */}
          <button
            type="button"
            disabled
            title="Automated digest scheduling is currently in roadmap"
            className="px-3.5 py-2 rounded-lg border border-border-subtle text-text-muted font-label-md text-label-md flex items-center gap-2 opacity-50 cursor-not-allowed shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            <span>Schedule Digest</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all transform active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filter Toolbar ── */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Horizon */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-text-muted">schedule</span>
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-1.5 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
              <option value="today">Today (24h)</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Project Scope */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-text-muted">folder_open</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-1.5 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px] truncate"
            >
              <option value="all">All Projects</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Impact */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-text-muted">warning</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="bg-canvas-default border border-border-subtle rounded-lg px-3 py-1.5 font-label-sm text-label-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Severities</option>
              <option value="blocker">Blocker (P0)</option>
              <option value="critical">Critical (P1)</option>
              <option value="major">Major (P2)</option>
              <option value="minor">Minor (P3)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-md bg-canvas-lavender text-primary font-label-sm text-label-sm font-semibold border border-primary/20">
            Window: {dashboardData?.window_label || 'Current Period'}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="p-1.5 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary transition-colors"
            title="Reset Filters"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>
        </div>
      </div>

      {/* ── 3. Six KPI Cards (Handling null/unavailable values gracefully F-02) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Tickets */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1.5">
            <span className="font-label-sm text-label-sm">Total Tickets</span>
            <span className="material-symbols-outlined text-[18px] text-primary">confirmation_number</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-text-primary">
            {kpis.total_tickets.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-1 font-medium">
            {kpis.total_tickets_delta_pct !== null ? (
              <span className={`flex items-center gap-1 ${kpis.total_tickets_delta_pct >= 0 ? 'text-status-resolved font-semibold' : 'text-text-secondary'}`}>
                <span className="material-symbols-outlined text-[14px]">
                  {kpis.total_tickets_delta_pct >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                <span>{kpis.total_tickets_delta_pct > 0 ? `+${kpis.total_tickets_delta_pct}%` : `${kpis.total_tickets_delta_pct}%`} vs prev period</span>
              </span>
            ) : (
              <span className="text-text-muted">No comparison data</span>
            )}
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1.5">
            <span className="font-label-sm text-label-sm">Resolved</span>
            <span className="material-symbols-outlined text-[18px] text-status-resolved">task_alt</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-text-primary">
            {kpis.resolved_tickets.toLocaleString()}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            <strong className="text-text-primary">{kpis.completion_rate}%</strong> completion rate
          </div>
        </div>

        {/* Open Backlog */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1.5">
            <span className="font-label-sm text-label-sm">Open Backlog</span>
            <span className="material-symbols-outlined text-[18px] text-status-warning">pending_actions</span>
          </div>
          <div className="font-headline-md text-headline-md font-bold text-text-primary">
            {kpis.open_backlog}
          </div>
          <div className="text-[11px] mt-1 font-medium">
            {kpis.high_priority_backlog > 0 ? (
              <span className="flex items-center gap-1 text-status-danger font-semibold">
                <span className="material-symbols-outlined text-[13px]">warning</span>
                <span>{kpis.high_priority_backlog} P0/P1 needs action</span>
              </span>
            ) : (
              <span className="text-text-muted">No high priority open</span>
            )}
          </div>
        </div>

        {/* SLA Adherence */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1.5">
            <span className="font-label-sm text-label-sm">SLA Adherence</span>
            <span className="material-symbols-outlined text-[18px] text-text-muted">verified_user</span>
          </div>
          <div className={`font-headline-md text-headline-md font-bold ${kpis.sla_adherence_pct !== null ? 'text-status-resolved' : 'text-text-muted'}`}>
            {kpis.sla_adherence_pct !== null ? `${kpis.sla_adherence_pct}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {kpis.sla_adherence_pct !== null ? 'From tracked deadlines' : 'Not available — resolution timestamps are not recorded'}
          </div>
        </div>

        {/* Avg First Reply */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1.5">
            <span className="font-label-sm text-label-sm">Avg First Reply</span>
            <span className="material-symbols-outlined text-[18px] text-primary">forum</span>
          </div>
          <div className={`font-headline-md text-headline-md font-bold ${kpis.avg_response_time ? 'text-text-primary' : 'text-text-muted'}`}>
            {kpis.avg_response_time || 'N/A'}
          </div>
          <div className="text-[11px] text-text-muted mt-1 font-medium">
            {kpis.avg_response_delta ? (
              <span>{kpis.avg_response_delta} vs prev period</span>
            ) : (
              <span>{kpis.avg_response_time ? 'Current average' : 'No reply logs'}</span>
            )}
          </div>
        </div>

        {/* Avg MTTR */}
        <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-text-secondary mb-1.5">
            <span className="font-label-sm text-label-sm">Avg MTTR</span>
            <span className="material-symbols-outlined text-[18px] text-text-muted">timer</span>
          </div>
          <div className={`font-headline-md text-headline-md font-bold ${kpis.avg_mttr ? 'text-text-primary' : 'text-text-muted'}`}>
            {kpis.avg_mttr || 'N/A'}
          </div>
          <div className="text-[11px] text-text-muted mt-1 font-medium">
            {kpis.avg_mttr_delta ? (
              <span>{kpis.avg_mttr_delta} vs prev period</span>
            ) : (
              <span>Not available — resolution timestamps are not recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Primary Grid: Velocity Trend & Severity Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Velocity Trend SVG Chart */}
        <div className="lg:col-span-8 bg-surface-card p-6 rounded-2xl border border-border-subtle shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Velocity Trend
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Created ticket intake across selected horizon (historical resolution timestamps are unrecorded)
              </p>
            </div>
            {/* Legend pills */}
            <div className="flex items-center gap-4 text-label-sm font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6848E8]" />
                <span className="text-text-secondary">Created</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-70">
                <span className="w-2.5 h-2.5 rounded-full bg-border-strong border border-text-muted" />
                <span className="text-text-muted">Resolved (Unrecorded)</span>
              </div>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="relative w-full overflow-hidden pt-2">
            {trendItems.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-body-sm text-text-muted">
                No ticket activity in the selected window.
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-52 overflow-visible"
              >
                <defs>
                  <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6848E8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6848E8" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#28C078" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#28C078" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Guidelines */}
                {[30, 75, 120].map((yVal, i) => (
                  <line
                    key={i}
                    x1="20"
                    y1={yVal}
                    x2={chartWidth - 20}
                    y2={yVal}
                    stroke="#E8E8EE"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Area Fills */}
                <path d={createdAreaD} fill="url(#createdGrad)" />
                <path d={resolvedAreaD} fill="url(#resolvedGrad)" />

                {/* Lines */}
                <path d={createdPathD} fill="none" stroke="#6848E8" strokeWidth="2.5" strokeLinecap="round" />
                <path d={resolvedPathD} fill="none" stroke="#28C078" strokeWidth="2.5" strokeLinecap="round" />

                {/* Circles on data points */}
                {pointsCreated.map((pt, idx) => (
                  <g key={`c-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={activeTooltipIndex === idx ? 6 : 4}
                      fill="#6848E8"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setActiveTooltipIndex(idx)}
                      onMouseLeave={() => setActiveTooltipIndex(null)}
                    />
                  </g>
                ))}

                {pointsResolved.map((pt, idx) => (
                  <g key={`r-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={activeTooltipIndex === idx ? 6 : 4}
                      fill="#28C078"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setActiveTooltipIndex(idx)}
                      onMouseLeave={() => setActiveTooltipIndex(null)}
                    />
                    {/* X Axis Label */}
                    <text
                      x={pt.x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fill="#757582"
                      fontSize="11"
                      fontFamily="Inter, sans-serif"
                    >
                      {pt.period_label}
                    </text>
                  </g>
                ))}
              </svg>
            )}

            {/* Interactive Tooltip Card overlay */}
            {activeTooltipIndex !== null && pointsCreated[activeTooltipIndex] && (
              <div
                className="absolute top-2 bg-inverse-surface text-inverse-on-surface px-3 py-2 rounded-lg text-xs shadow-lg pointer-events-none transition-all border border-border-subtle"
                style={{
                  left: `${Math.min(chartWidth - 120, Math.max(10, pointsCreated[activeTooltipIndex].x - 40))}px`,
                }}
              >
                <div className="font-bold text-white mb-1">
                  {pointsCreated[activeTooltipIndex].period_label}
                </div>
                <div className="flex items-center gap-2 text-[#6848E8]">
                  <span>Created:</span>
                  <span className="font-bold text-white">{pointsCreated[activeTooltipIndex].created_count}</span>
                </div>
                <div className="flex items-center gap-2 text-text-muted">
                  <span>Resolved:</span>
                  <span className="font-medium text-text-muted">
                    {pointsResolved[activeTooltipIndex]?.resolved_count !== undefined && pointsResolved[activeTooltipIndex]?.resolved_count !== null
                      ? pointsResolved[activeTooltipIndex].resolved_count
                      : 'Unrecorded'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Summary Strip (Handling null values F-02) */}
          <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${velocityTrend.net_velocity_ratio !== null ? 'bg-status-resolved/10 text-status-resolved' : 'bg-canvas-default text-text-muted border border-border-subtle'}`}>
                {velocityTrend.net_velocity_ratio !== null ? `${velocityTrend.net_velocity_ratio}x` : 'N/A'}
              </div>
              <div>
                <span className="font-label-md text-label-md font-semibold text-text-primary block">
                  Net Velocity Ratio
                </span>
                <span className="font-body-sm text-body-sm text-text-muted">
                  {velocityTrend.net_velocity_ratio !== null ? 'Resolved tickets vs created tickets' : 'Not available — resolution timestamps are not recorded'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${velocityTrend.sprint_velocity_pct !== null ? 'bg-primary/10 text-primary' : 'bg-canvas-default text-text-muted border border-border-subtle'}`}>
                {velocityTrend.sprint_velocity_pct !== null
                  ? `${velocityTrend.sprint_velocity_pct > 0 ? '+' : ''}${velocityTrend.sprint_velocity_pct}%`
                  : 'N/A'}
              </div>
              <div>
                <span className="font-label-md text-label-md font-semibold text-text-primary block">
                  Velocity Change
                </span>
                <span className="font-body-sm text-body-sm text-text-muted">
                  {velocityTrend.sprint_velocity_pct !== null ? 'Compared to previous window' : 'Not available — resolution timestamps are not recorded'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Severity Distribution SVG Donut */}
        <div className="lg:col-span-4 bg-surface-card p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Severity Distribution
            </h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Breakdown of active incidents by severity tier
            </p>
          </div>

          {/* SVG Donut */}
          <div className="relative my-4 flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-44 h-44 transform -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#EFEFF6"
                strokeWidth="14"
              />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.key}
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-500"
                />
              ))}
            </svg>

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-headline-sm text-headline-sm font-bold text-text-primary leading-tight">
                {highPriorityPct}%
              </span>
              <span className="font-label-sm text-label-sm text-text-muted">High Priority</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            {donutSegments.map((seg) => (
              <div key={seg.key} className="flex items-center justify-between text-body-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-text-secondary">{seg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary">{seg.count}</span>
                  <span className="text-text-muted text-[11px] w-10 text-right">({seg.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Secondary Grid: Status Breakdown & Squad SLA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Breakdown */}
        <div className="lg:col-span-7 bg-surface-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Status Distribution
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Workflow funnel and ticket lifecycle status
              </p>
            </div>
            <span className="font-label-sm text-label-sm text-text-muted">100% Total Funnel</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-3.5 rounded-full bg-border-subtle overflow-hidden flex shadow-inner">
            {statusItems.map((st) => {
              const colorMap = {
                open: 'bg-[#3888F8]',
                wip: 'bg-[#6848E8]',
                on_hold: 'bg-[#F8A040]',
                resolved: 'bg-[#28C078]',
                closed: 'bg-[#9C9CA9]',
              };
              return (
                <div
                  key={st.key}
                  style={{ width: `${st.percentage}%` }}
                  title={`${st.label}: ${st.count} (${st.percentage}%)`}
                  className={`${colorMap[st.key] || 'bg-primary'} h-full transition-all`}
                />
              );
            })}
          </div>

          {/* Mini Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {statusItems.map((st) => {
              const borderColors = {
                open: 'border-l-[#3888F8]',
                wip: 'border-l-[#6848E8]',
                on_hold: 'border-l-[#F8A040]',
                resolved: 'border-l-[#28C078]',
                closed: 'border-l-[#9C9CA9]',
              };
              return (
                <div
                  key={st.key}
                  className={`bg-canvas-default p-2.5 rounded-lg border border-border-subtle border-l-4 ${borderColors[st.key] || 'border-l-primary'}`}
                >
                  <span className="text-[11px] text-text-muted block truncate">{st.label}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-bold text-text-primary text-sm">{st.count}</span>
                    <span className="text-[11px] text-text-muted">{st.percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Squad SLA Compliance (F-01: Displays explicit unavailable state if no squads exist) */}
        <div className="lg:col-span-5 bg-surface-card p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Contractual SLA by Squad
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Squad-level SLA targets
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-canvas-lavender text-text-muted font-label-sm text-label-sm font-medium">
              Organizational Scope
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {squadSla.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-body-sm">
                <span className="material-symbols-outlined text-[28px] text-text-muted/60 block mb-1">
                  group_off
                </span>
                Squad-level SLA targets are not configured for this organization.
              </div>
            ) : (
              squadSla.map((sq) => (
                <div key={sq.squad_name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-semibold text-text-primary">{sq.squad_name}</span>
                    <span className="font-bold text-text-secondary">{sq.adherence_rate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border-subtle overflow-hidden">
                    <div
                      style={{ width: `${sq.adherence_rate}%` }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 6. Employee Workload Table (Deriving real assignments F-03) ── */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
              Engineering Workload & Resolution Metrics
            </h2>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Ticket assignment volume and MTTR resolution metrics derived from verified records
            </p>
          </div>
          <div className="text-label-sm font-semibold text-text-muted">
            {employees.length} organization members
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas-default border-b border-border-subtle text-text-muted font-label-sm text-label-sm uppercase tracking-wider">
                <th className="py-3 px-6">Member</th>
                <th className="py-3 px-6">Department</th>
                <th className="py-3 px-6">Resolved Tickets</th>
                <th className="py-3 px-6">Active Tickets</th>
                <th className="py-3 px-6">Mean MTTR</th>
                <th className="py-3 px-6">SLA Adherence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-body-sm">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    No active engineer records available for this filter horizon.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.user_id} className="hover:bg-canvas-lavender/40 transition-colors">
                    {/* Member */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-canvas-lavender flex items-center justify-center font-bold text-primary text-xs">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt={emp.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            emp.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-text-primary block">{emp.name}</span>
                          <span className="text-[11px] text-text-muted">{emp.role}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-canvas-lavender text-primary font-label-sm text-label-sm font-medium">
                        {emp.squad}
                      </span>
                    </td>

                    {/* Resolved */}
                    <td className="py-3.5 px-6 font-semibold text-text-primary">
                      {emp.resolved_count} {emp.resolved_count === 1 ? 'ticket' : 'tickets'}
                    </td>

                    {/* Active Tickets */}
                    <td className="py-3.5 px-6 text-text-secondary">
                      <span className="px-2 py-0.5 rounded font-mono text-xs bg-canvas-default border border-border-subtle font-semibold">
                        {emp.active_tickets} active
                      </span>
                    </td>

                    {/* Mean MTTR */}
                    <td className="py-3.5 px-6 text-text-secondary">
                      {emp.mean_mttr || <span className="text-text-muted text-xs" title="Not available — resolution timestamps are not recorded">N/A</span>}
                    </td>

                    {/* SLA Adherence */}
                    <td className="py-3.5 px-6">
                      {emp.sla_adherence !== null ? (
                        <span className="px-2 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved font-bold text-xs">
                          {emp.sla_adherence}%
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs" title="Not available — resolution timestamps are not recorded">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. Export Modal Component ── */}
      <AnalyticsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        timeHorizon={timeHorizon}
        projectId={projectId}
        severity={severity}
      />
    </div>
  );
};

export default ReportsAnalyticsPage;
