import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { rcaService } from '../../../services/api';
import { RCA_STATUS, RCA_SEVERITY } from '../constants/rcaConstants';
import ApiErrorState from '../../../components/ApiErrorState';

/**
 * RCAListPage
 * Route: /workspace/rca
 * Master table of Root Cause Analysis post-mortem incident reports.
 */
export const RCAListPage = () => {
  const navigate = useNavigate();
  const [rcas, setRcas] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRcas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await rcaService.listRcas(params);
      setRcas(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load RCA incident records.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, severityFilter, searchQuery]);

  useEffect(() => {
    fetchRcas();
  }, [fetchRcas]);

  const severityBadge = (sev) => {
    const s = (sev || 'major').toLowerCase();
    if (s === 'blocker') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-severity-blocker border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
          Blocker
        </span>
      );
    }
    if (s === 'critical') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-severity-critical border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
          Critical
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-text-secondary border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
        Major
      </span>
    );
  };

  const statusBadge = (st) => {
    const s = (st || 'draft').toLowerCase();
    if (s === 'published') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-status-resolved text-[11px] font-semibold">
          Published
        </span>
      );
    }
    if (s === 'approved') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-status-open text-[11px] font-semibold">
          Approved
        </span>
      );
    }
    if (s === 'under_review') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-status-on-hold text-[11px] font-semibold">
          Under Review
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-text-muted text-[11px] font-semibold">
        Draft
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary text-xs font-semibold uppercase tracking-wider">
              Operational Post-Mortems
            </span>
            <span className="text-xs text-text-muted">5-Whys Methodology</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Root Cause Analysis (RCA)
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Structured incident retrospectives, timeline reconstruction, and preventative action tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchRcas}
            disabled={isLoading}
            className="p-2 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary shadow-2xs transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/workspace/rca/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-[#471ac8] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Incident RCA</span>
          </Link>
        </div>
      </div>

      {/* Error State on 503 database_unavailable */}
      {error && (
        <ApiErrorState
          title="RCA Archive Offline"
          message={error}
          onRetry={fetchRcas}
          isRetrying={isLoading}
        />
      )}

      {/* Filter Bar */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-subtle shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incident, service, key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-canvas-main text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-canvas-main p-1 rounded-lg border border-border-subtle text-xs">
            {['all', 'draft', 'under_review', 'approved', 'published'].map((st) => (
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

      {/* RCA Table */}
      {!error && (
        <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
          {rcas.length === 0 && !isLoading ? (
            <div className="py-14 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-text-muted mb-3">
                <FileText className="w-6 h-6 text-btn-primary" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">No Incident Reports Found</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                No RCA reports match your current criteria. Create a post-mortem to analyze outages.
              </p>
              <div className="mt-4">
                <Link
                  to="/workspace/rca/new"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-btn-primary text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Draft First RCA</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-main/70 text-text-secondary border-b border-border-subtle font-semibold">
                  <tr>
                    <th className="py-3 px-4">RCA Identifier</th>
                    <th className="py-3 px-4">Incident Title</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Service Affected</th>
                    <th className="py-3 px-4">Outage Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Lead Investigator</th>
                    <th className="py-3 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60">
                  {rcas.map((rca) => (
                    <tr
                      key={rca.id}
                      onClick={() => navigate(`/workspace/rca/${rca.id}`)}
                      className="hover:bg-canvas-lavender/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-btn-primary">
                        {rca.rca_number}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-text-primary max-w-xs truncate">
                        {rca.title}
                      </td>
                      <td className="py-3.5 px-4">
                        {severityBadge(rca.severity)}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary font-medium">
                        {rca.service_affected}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-text-secondary">
                        {rca.outage_duration_minutes}m
                      </td>
                      <td className="py-3.5 px-4">
                        {statusBadge(rca.status)}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary">
                        {rca.lead_investigator_name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="p-1.5 text-text-muted hover:text-btn-primary inline-flex">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RCAListPage;
