import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  History,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { slaService, connectSlaWebSocket } from '../../../services/api';
import { SLA_STATUS } from '../constants/slaConstants';
import SLATimer from '../components/SLATimer';
import SLABreachModal from '../components/SLABreachModal';
import ApiErrorState from '../../../components/ApiErrorState';

/**
 * SLAOverviewPage
 * Screen 3: SLA Overview Page (Prompt 50)
 * Route: /workspace/sla
 * Live operational compliance metrics, active timer monitoring table, and escalation history.
 */
export const SLAOverviewPage = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active breach popup state
  const [activeBreach, setActiveBreach] = useState(null);
  const [isBreachModalOpen, setIsBreachModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const overview = await slaService.getOverview();
      setData(overview);
    } catch (err) {
      setError(err.message || 'Failed to fetch SLA metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time WebSocket connection for emergent SLA breach alarms
  useEffect(() => {
    const ws = connectSlaWebSocket((event) => {
      if (event.event === 'sla.breach') {
        setActiveBreach(event.data);
        setIsBreachModalOpen(true);
        fetchData();
      } else if (event.event === 'sla.timer_update' || event.event === 'sla.breach_acknowledged') {
        fetchData();
      }
    });

    return () => {
      if (ws) ws.close();
    };
  }, [fetchData]);

  // Filtered timers
  const filteredTimers = (data?.timers || []).filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchKey = (t.ticket_number || t.ticket_id || '').toLowerCase().includes(q);
      const matchTitle = (t.ticket_title || '').toLowerCase().includes(q);
      const matchPolicy = (t.policy_name || '').toLowerCase().includes(q);
      return matchKey || matchTitle || matchPolicy;
    }
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* SLA Breach Popup Modal */}
      <SLABreachModal
        isOpen={isBreachModalOpen}
        breachData={activeBreach}
        onClose={() => setIsBreachModalOpen(false)}
        onAcknowledged={() => fetchData()}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-semibold uppercase tracking-wider">
              Real-Time Telemetry
            </span>
            <span className="flex items-center gap-1 text-xs text-status-resolved font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-status-resolved animate-pulse" /> Live WebSocket
            </span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            SLA Performance & Escalations
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Enterprise service level monitoring, breach threshold prediction, and tier escalation logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-primary text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error state on 503 database_unavailable */}
      {error && (
        <ApiErrorState
          title="SLA Engine Offline"
          message={error}
          onRetry={fetchData}
          isRetrying={isLoading}
        />
      )}

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Compliance</span>
            <ShieldCheck className="w-5 h-5 text-status-resolved" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-extrabold text-text-primary">
              {data ? `${data.compliance_rate}%` : '---%'}
            </span>
            <span className="text-xs text-status-resolved font-medium flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Target: 98.5%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-status-resolved h-full transition-all duration-500"
              style={{ width: `${data?.compliance_rate || 100}%` }}
            />
          </div>
        </div>

        {/* Active SLA Timers */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Timers</span>
            <Clock className="w-5 h-5 text-status-open" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-extrabold text-text-primary">
              {data ? data.active_timers : '---'}
            </span>
            <span className="text-xs text-text-muted">monitored tickets</span>
          </div>
          <div className="mt-3 text-xs text-text-secondary">
            Syncing across production pods
          </div>
        </div>

        {/* At-Risk Warnings */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">At-Risk Warnings</span>
            <AlertTriangle className="w-5 h-5 text-status-on-hold" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-extrabold text-status-on-hold">
              {data ? data.at_risk_count : '---'}
            </span>
            <span className="text-xs text-status-on-hold font-medium">&lt; 30m to breach</span>
          </div>
          <div className="mt-3 text-xs text-text-secondary">
            Proactive triage required
          </div>
        </div>

        {/* Breached Incidents */}
        <div className="p-5 rounded-2xl bg-surface-card border border-border-subtle shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Breached Incidents</span>
            <AlertOctagon className="w-5 h-5 text-severity-blocker" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-extrabold text-severity-blocker">
              {data ? data.breached_count : '---'}
            </span>
            <span className="text-xs text-severity-blocker font-medium">Escalated</span>
          </div>
          <div className="mt-3 text-xs text-text-secondary">
            Active on-call escalation alerts
          </div>
        </div>
      </div>

      {/* Main Section: Real-Time SLA Monitor Table */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-btn-primary" />
            <h2 className="font-headline text-base font-bold text-text-primary">
              Active Incident SLA Window
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket, policy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-canvas-main text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-canvas-main p-1 rounded-lg border border-border-subtle text-xs">
              {['all', 'on_track', 'at_risk', 'breached'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-surface-card shadow-xs text-btn-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Body */}
        {filteredTimers.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-text-muted mb-3">
              <ShieldCheck className="w-6 h-6 text-status-resolved" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">All SLA Targets Met</h3>
            <p className="text-xs text-text-secondary mt-1">
              No active SLA breach alarms or at-risk timers match your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-main/70 text-text-secondary border-b border-border-subtle font-semibold">
                <tr>
                  <th className="py-3 px-4">Ticket / Incident</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Policy Tier</th>
                  <th className="py-3 px-4">Timer Type</th>
                  <th className="py-3 px-4">SLA Countdown</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {filteredTimers.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-canvas-lavender/30 transition-colors cursor-pointer"
                    onClick={() => {
                      if (t.status === 'breached') {
                        setActiveBreach(t);
                        setIsBreachModalOpen(true);
                      }
                    }}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-btn-primary">
                      {t.ticket_number || t.ticket_id || 'TKT-1028'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text-primary max-w-xs truncate">
                      {t.ticket_title || 'Platform Service SLA Monitor'}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary font-medium">
                      {t.policy_name || 'Standard Tier 1'}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-text-secondary">
                      {t.timer_type?.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <SLATimer
                        targetAt={t.target_at}
                        startedAt={t.started_at}
                        status={t.status}
                        variant="badge"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {t.status === 'breached' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBreach(t);
                            setIsBreachModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-severity-blocker/10 text-severity-blocker hover:bg-severity-blocker hover:text-white transition-colors"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-text-muted text-[11px] font-medium">Monitoring</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: SLA Escalation History (Prompt 50 part 2) */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-text-secondary" />
            <h2 className="font-headline text-base font-bold text-text-primary">
              SLA Escalation Audit Log
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            {data?.escalations?.length || 0} logged escalations
          </span>
        </div>

        {(!data?.escalations || data.escalations.length === 0) ? (
          <div className="py-8 px-4 text-center text-xs text-text-secondary">
            No escalation incidents recorded in this organization's history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas-main/70 text-text-secondary border-b border-border-subtle font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Incident</th>
                  <th className="py-3 px-4">Escalation Tier</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Acknowledged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {data.escalations.map((e) => (
                  <tr key={e.id} className="hover:bg-canvas-lavender/30">
                    <td className="py-3 px-4 text-text-muted font-mono">
                      {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-text-primary">
                      {e.ticket_number || e.ticket_id || 'TKT-992'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-primary capitalize">
                      {e.escalation_tier?.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-text-secondary max-w-sm truncate">
                      {e.reason}
                    </td>
                    <td className="py-3 px-4">
                      {e.acknowledged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-status-resolved text-[11px] font-semibold">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-severity-blocker text-[11px] font-semibold animate-pulse">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {e.acknowledged_by_name || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SLAOverviewPage;
