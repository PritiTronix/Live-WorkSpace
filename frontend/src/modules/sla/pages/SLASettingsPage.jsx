import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Layers,
  Bell,
  Palette,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { slaService } from '../../../services/api';
import { useAuth } from '../../auth/hooks/useAuth';
import SLARuleEditorDrawer from '../components/SLARuleEditorDrawer';
import ModuleComingSoonPage from '../../../components/ModuleComingSoonPage';
import ApiErrorState from '../../../components/ApiErrorState';

/**
 * SLASettingsPage
 * Screen 5: SLA Config, Notifications & Appearance (Prompts 76, 77, 78)
 * Route: /workspace/settings/sla & /workspace/settings
 * Renders the settings shell with SLA Policy governance implemented,
 * leaving Notifications & Appearance tabs as ModuleComingSoonPage placeholders per specification.
 */
export const SLASettingsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role && ['owner', 'admin'].includes(user.role.toLowerCase());

  const [activeTab, setActiveTab] = useState('sla');
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await slaService.getPolicies();
      setPolicies(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load SLA policies.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sla') {
      fetchPolicies();
    }
  }, [activeTab, fetchPolicies]);

  const handleCreate = () => {
    setSelectedPolicy(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this SLA policy?')) return;
    try {
      await slaService.deletePolicy(policyId);
      fetchPolicies();
    } catch (err) {
      alert(err.message || 'Failed to delete policy.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Rule Editor Drawer */}
      <SLARuleEditorDrawer
        isOpen={isDrawerOpen}
        policy={selectedPolicy}
        onClose={() => setIsDrawerOpen(false)}
        onSaved={() => fetchPolicies()}
      />

      {/* Settings Navigation Tabs */}
      <div className="border-b border-border-subtle">
        <div className="flex items-center justify-between pb-4">
          <div>
            <h1 className="font-headline text-2xl font-extrabold text-text-primary tracking-tight">
              Workspace Settings & Governance
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Manage operational policies, notification dispatch routes, and appearance presets.
            </p>
          </div>
        </div>

        <nav className="flex space-x-6 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('sla')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-label-md text-xs sm:text-sm transition-all ${
              activeTab === 'sla'
                ? 'border-btn-primary text-btn-primary font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>SLA Policies & Rules</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-label-md text-xs sm:text-sm transition-all ${
              activeTab === 'notifications'
                ? 'border-btn-primary text-btn-primary font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-label-md text-xs sm:text-sm transition-all ${
              activeTab === 'appearance'
                ? 'border-btn-primary text-btn-primary font-bold'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-300'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Appearance</span>
          </button>
        </nav>
      </div>

      {/* Tab 2: Notifications Placeholder */}
      {activeTab === 'notifications' && (
        <ModuleComingSoonPage
          title="Notification Routing & Webhooks (Prompt 77)"
          description="Escalation alerts dispatching to Slack, PagerDuty, and email webhooks are managed by another team."
          icon={Bell}
        />
      )}

      {/* Tab 3: Appearance Placeholder */}
      {activeTab === 'appearance' && (
        <ModuleComingSoonPage
          title="Appearance & Workspace Branding (Prompt 78)"
          description="Custom dark mode palettes, organization logos, and accent themes are managed by another team."
          icon={Palette}
        />
      )}

      {/* Tab 1: SLA Policies & Rules */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card p-4 rounded-xl border border-border-subtle shadow-xs">
            <div>
              <h2 className="font-headline text-base font-bold text-text-primary">
                SLA Policy Matrix
              </h2>
              <p className="text-xs text-text-secondary">
                Define first-response and resolution commitments by ticket priority.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchPolicies}
                disabled={isLoading}
                className="p-2 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary shadow-2xs transition-all disabled:opacity-50"
                title="Reload policies"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-[#471ac8] text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New SLA Policy</span>
                </button>
              )}
            </div>
          </div>

          {/* Error State on 503 */}
          {error && (
            <ApiErrorState
              title="Policies Unavailable"
              message={error}
              onRetry={fetchPolicies}
              isRetrying={isLoading}
            />
          )}

          {/* Policies Table */}
          {!error && (
            <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-xs overflow-hidden">
              {policies.length === 0 && !isLoading ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-text-muted mb-3">
                    <Sliders className="w-6 h-6 text-btn-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">No SLA Policies Configured</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Click "New SLA Policy" to establish response and resolution commitments.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas-main/70 text-text-secondary border-b border-border-subtle font-semibold">
                      <tr>
                        <th className="py-3 px-4">Policy Name</th>
                        <th className="py-3 px-4">Tier</th>
                        <th className="py-3 px-4">Calendar</th>
                        <th className="py-3 px-4">Configured Rules</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/60">
                      {policies.map((p) => (
                        <tr key={p.id} className="hover:bg-canvas-lavender/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-text-primary block">{p.name}</span>
                            {p.description && (
                              <span className="text-[11px] text-text-muted line-clamp-1">{p.description}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono uppercase text-primary font-medium">
                            {p.tier}
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary">
                            {p.business_hours_only ? 'Business Hours (9-6)' : '24x7 Continuous'}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {(p.rules || []).map((r) => (
                                <span
                                  key={r.id || r.priority}
                                  className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono"
                                >
                                  {r.priority}: {r.response_time_minutes}m / {r.resolution_time_minutes}m
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                p.is_active
                                  ? 'bg-emerald-50 text-status-resolved'
                                  : 'bg-slate-100 text-text-muted'
                              }`}
                            >
                              {p.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isAdmin ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(p)}
                                  className="p-1.5 rounded text-text-secondary hover:text-btn-primary hover:bg-canvas-lavender"
                                  title="Edit Policy"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id)}
                                  className="p-1.5 rounded text-text-secondary hover:text-severity-blocker hover:bg-rose-50"
                                  title="Delete Policy"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-text-muted text-[11px]">Read-only</span>
                            )}
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
      )}
    </div>
  );
};

export default SLASettingsPage;
