import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Timer,
  AlertTriangle,
  Radio,
  Sliders,
  CheckCircle2,
  ChevronRight,
  History,
  Save,
  SlidersHorizontal,
  ShieldAlert,
  Users,
  Bell,
  Palette,
  CloudLightning,
  Monitor,
  Laptop,
  Check,
  Layers,
  Send,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Info,
  PauseCircle,
  HelpCircle
} from 'lucide-react';
import { settingsService } from '../../../services/settingsService';

export const SlaConfigPage = ({ initialTab = 'sla' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Active tab state
  const [activeTab, setActiveTab] = useState(initialTab);

  // SLA form state
  const [slaForm, setSlaForm] = useState({
    working_schedule: '24x7 Continuous Tier-1 Operations',
    timezone: 'America/New_York (UTC-05:00)',
    holidays_observed: 10,
    pause_on_hold: true,
    p0_response: '15 minutes',
    p0_resolution: '2 hours',
    p0_auto_page: true,
    p1_response: '30 minutes',
    p1_resolution: '4 hours',
    p1_auto_escalate: true,
    p2_response: '1 hour',
    p2_resolution: '8 hours',
    p2_round_robin: true,
  });

  // Notification matrix state
  const [notifForm, setNotifForm] = useState({
    sync_pagerduty: true,
    p0_created: { email: true, in_app: true, slack: true },
    sla_approaching: { email: false, in_app: true, slack: true },
    sla_breached: { email: true, in_app: true, slack: true },
    ticket_assigned: { email: true, in_app: true, slack: false },
    mention_discussion: { email: false, in_app: true, slack: true },
    status_transitioned: { email: true, in_app: true, slack: false },
    rca_submitted: { email: true, in_app: true, slack: true },
    rca_finalized: { email: true, in_app: false, slack: true },
  });

  // Appearance state
  const [appearanceForm, setAppearanceForm] = useState({
    theme: 'dark',
    accent_color: '#6040F0',
    density: 'comfortable',
    sidebar_mode: 'expanded',
    high_contrast: false,
    compact_tables: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    // Sync tab with pathname if matching
    if (location.pathname.includes('/notifications')) {
      setActiveTab('notifications');
    } else if (location.pathname.includes('/appearance')) {
      setActiveTab('appearance');
    } else if (location.pathname.includes('/sla')) {
      setActiveTab('sla');
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [slaData, notifData, appData] = await Promise.allSettled([
          settingsService.getSlaConfig(),
          settingsService.getNotificationPreferences(),
          settingsService.getAppearance(),
        ]);

        if (slaData.status === 'fulfilled' && slaData.value) {
          setSlaForm((prev) => ({ ...prev, ...slaData.value }));
        }
        if (notifData.status === 'fulfilled' && notifData.value) {
          setNotifForm((prev) => ({ ...prev, ...notifData.value }));
        }
        if (appData.status === 'fulfilled' && appData.value) {
          setAppearanceForm((prev) => ({ ...prev, ...appData.value }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await Promise.all([
        settingsService.updateSlaConfig(slaForm),
        settingsService.updateNotificationPreferences(notifForm),
        settingsService.updateAppearance(appearanceForm),
      ]);
      triggerToast('All workspace settings and SLA policies successfully saved.');
    } catch (err) {
      console.error('Error saving settings:', err);
      triggerToast('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSlaForm({
      working_schedule: '24x7 Continuous Tier-1 Operations',
      timezone: 'America/New_York (UTC-05:00)',
      holidays_observed: 10,
      pause_on_hold: true,
      p0_response: '15 minutes',
      p0_resolution: '2 hours',
      p0_auto_page: true,
      p1_response: '30 minutes',
      p1_resolution: '4 hours',
      p1_auto_escalate: true,
      p2_response: '1 hour',
      p2_resolution: '8 hours',
      p2_round_robin: true,
    });
    triggerToast('SLA threshold parameters reset to factory defaults.');
  };

  const toggleNotifCheckbox = (rowKey, channel) => {
    setNotifForm((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [channel]: !(prev[rowKey]?.[channel] ?? false),
      },
    }));
  };

  return (
    <div className="w-full bg-[#F9F9FB] dark:bg-[#141529] min-h-screen py-6 px-6 lg:px-10 font-body text-[#141529] dark:text-[#eeecff]">
      <div className="max-w-7xl mx-auto flex flex-col space-y-8">
        {/* Settings Breadcrumb & Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-[#9C9CA9] uppercase tracking-wider mb-1 font-semibold">
              <span>Settings &amp; Governance</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#6040F0] font-bold">Operational Engine</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#141529] dark:text-white tracking-tight">
              System &amp; Workspace Governance
            </h1>
            <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
              Control operational response horizons, omnichannel broadcast triggers, and sensory display environments.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => navigate('/workspace/audit-logs')}
              className="px-4 py-2 bg-white dark:bg-[#1f2038] hover:bg-[#F5F4FC] dark:hover:bg-[#28294a] text-[#5C5C70] dark:text-[#cabeff] rounded-lg text-sm font-semibold transition-all border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-2 shadow-xs"
            >
              <History className="w-4 h-4 text-[#9C9CA9]" />
              <span>Audit Log</span>
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>

        {/* Settings Horizontal Navigation Tabs */}
        <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-1.5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs overflow-x-auto">
          <nav className="flex items-center gap-1 min-w-max">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'workspace'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Workspace Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'roles'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Roles &amp; Permissions</span>
            </button>
            <button
              onClick={() => navigate('/workspace/members')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]"
            >
              <Users className="w-4 h-4" />
              <span>Member Management</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('sla');
                navigate('/workspace/settings/sla');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'sla'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold shadow-xs'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <Timer className="w-4 h-4 text-[#6040F0]" />
              <span>SLA Configuration</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6040F0]"></span>
            </button>
            <button
              onClick={() => {
                setActiveTab('notifications');
                navigate('/workspace/settings/notifications');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'notifications'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold shadow-xs'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('appearance');
                navigate('/workspace/settings/appearance');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'appearance'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold shadow-xs'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => navigate('/workspace/settings/profile')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]"
            >
              <Users className="w-4 h-4" />
              <span>User Profile</span>
            </button>
          </nav>
        </div>

        {/* SECTION 1: PROMPT 76 - SLA Configuration Settings */}
        <section
          className={`bg-white dark:bg-[#1a1b32] rounded-2xl p-6 lg:p-8 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col space-y-6 ${
            activeTab !== 'sla' && activeTab !== 'all' ? 'hidden' : ''
          }`}
          id="sla-section"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-bold">
                  Prompt 76 Governance Core
                </span>
                <span className="text-xs text-[#9C9CA9]">• Engine v4.2 SLA Compliance</span>
              </div>
              <h2 className="text-xl font-bold text-[#141529] dark:text-white tracking-tight">
                SLA Policy Configuration
              </h2>
              <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] mt-1">
                Define contractual response and resolution milestones, working hour schedules, and pause conditions across customer tiers.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#F5F4FC] dark:bg-[#242542] px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
              <span className="w-2 h-2 rounded-full bg-[#28C078] animate-pulse"></span>
              <span>SLA Engine: Enforcing</span>
            </div>
          </div>

          {/* Working Hours & Schedule Sub-Card */}
          <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#6040F0]" />
                <h3 className="text-base font-bold text-[#141529] dark:text-white">
                  Working Hours &amp; Calendar Schedule
                </h3>
              </div>
              <span className="text-xs text-[#9C9CA9]">Calculates resolution window clocking</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Schedule Mode */}
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-3">
                <div>
                  <label className="text-xs text-[#9C9CA9] uppercase tracking-wider block font-bold mb-1">
                    Working Schedule
                  </label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="working_schedule"
                        className="mt-1 accent-[#6040F0]"
                        checked={slaForm.working_schedule === '24x7 Continuous Tier-1 Operations'}
                        onChange={() =>
                          setSlaForm((prev) => ({
                            ...prev,
                            working_schedule: '24x7 Continuous Tier-1 Operations',
                          }))
                        }
                      />
                      <div>
                        <span className="text-sm font-semibold text-[#141529] dark:text-white block">
                          24x7 Continuous Tier-1 Operations
                        </span>
                        <span className="text-xs text-[#9C9CA9]">No pause on off-hours or weekends</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="working_schedule"
                        className="mt-1 accent-[#6040F0]"
                        checked={slaForm.working_schedule === 'Standard Business Hours'}
                        onChange={() =>
                          setSlaForm((prev) => ({
                            ...prev,
                            working_schedule: 'Standard Business Hours',
                          }))
                        }
                      />
                      <div>
                        <span className="text-sm font-medium text-[#5C5C70] dark:text-[#cabeff] block">
                          Standard Business Hours
                        </span>
                        <span className="text-xs text-[#9C9CA9]">08:00 - 18:00 EST, Mon - Fri</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Timezone Reference */}
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-3">
                <div>
                  <label className="text-xs text-[#9C9CA9] uppercase tracking-wider block font-bold mb-1">
                    Timezone Reference
                  </label>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mb-2">
                    Canonical sync point for all automated breach triggers.
                  </p>
                  <div className="bg-[#F5F4FC] dark:bg-[#242542] rounded-lg px-3 py-2 flex items-center justify-between text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-[#9C9CA9]" />
                      <span>{slaForm.timezone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#9C9CA9] text-xs">
                  <Info className="w-3.5 h-3.5" />
                  <span>Server time offset: 0.00ms</span>
                </div>
              </div>

              {/* Holidays Calendar */}
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[#9C9CA9] uppercase tracking-wider block font-bold">
                      Holidays Calendar
                    </label>
                    <span className="text-xs text-[#6040F0] font-bold">{slaForm.holidays_observed} observed days</span>
                  </div>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mb-2">
                    US Federal &amp; Engineering On-Call Calendar
                  </p>
                  <button
                    type="button"
                    className="w-full py-2 bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#6040F0] text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Manage Holidays (2025)</span>
                  </button>
                </div>
                <p className="text-xs text-[#9C9CA9]">Next upcoming: Memorial Day (May 26)</p>
              </div>
            </div>

            {/* On-Hold SLA Policy Banner / Switch */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0] shrink-0">
                  <PauseCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#141529] dark:text-white">
                      On Hold SLA Policy Countdown Pause
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-[#28C078]/10 text-[#28C078] text-xs font-bold">
                      Active Policy
                    </span>
                  </div>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                    Automatically freezes the operational resolution clock while tickets dwell in "Customer Waiting" or "Vendor Dependency" status states.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={slaForm.pause_on_hold}
                  onChange={(e) =>
                    setSlaForm((prev) => ({ ...prev, pause_on_hold: e.target.checked }))
                  }
                />
                <div className="w-11 h-6 bg-[#E5E5EF] dark:bg-[#383a59] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6040F0]"></div>
              </label>
            </div>
          </div>

          {/* Severity Threshold Mapping Cards */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#141529] dark:text-white">
                  Severity Threshold &amp; Escalation Mapping
                </h3>
                <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                  Direct response targets dictate live countdown clocks in ticket views.
                </p>
              </div>
              <span className="text-xs text-[#9C9CA9]">Target calculations: Strict Real-Time</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* P0 Blocker Card */}
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F55354]"></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F55354]/10 text-[#F55354] text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F55354]"></span>
                      Blocker (P0)
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Critical Impact</span>
                  </div>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                    Core payment failure, entire data center degraded, zero redundancy state.
                  </p>
                  <div className="space-y-2.5 pt-2">
                    <div>
                      <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">Response SLA Target</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={slaForm.p0_response}
                          onChange={(e) => setSlaForm((p) => ({ ...p, p0_response: e.target.value }))}
                          className="w-full bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-3 py-2 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                        />
                        <Clock className="w-4 h-4 text-[#9C9CA9] absolute right-3 top-2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">Resolution SLA Target</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={slaForm.p0_resolution}
                          onChange={(e) => setSlaForm((p) => ({ ...p, p0_resolution: e.target.value }))}
                          className="w-full bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-3 py-2 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                        />
                        <Timer className="w-4 h-4 text-[#9C9CA9] absolute right-3 top-2.5" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#ffdad6]/40 dark:bg-[#93000a]/20 p-2.5 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#F55354]" />
                  <span className="text-xs text-[#93000a] dark:text-[#ffb4ab] font-medium">
                    Auto-page Tier-2 SRE Lead after 10m
                  </span>
                </div>
              </div>

              {/* P1 Critical Card */}
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F8A040]"></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F8A040]/10 text-[#F8A040] text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F8A040]"></span>
                      Critical (P1)
                    </span>
                    <span className="text-xs text-[#9C9CA9]">High Degradation</span>
                  </div>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                    Degraded read throughput, significant customer API latency spikes (&gt;2s).
                  </p>
                  <div className="space-y-2.5 pt-2">
                    <div>
                      <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">Response SLA Target</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={slaForm.p1_response}
                          onChange={(e) => setSlaForm((p) => ({ ...p, p1_response: e.target.value }))}
                          className="w-full bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-3 py-2 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                        />
                        <Clock className="w-4 h-4 text-[#9C9CA9] absolute right-3 top-2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">Resolution SLA Target</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={slaForm.p1_resolution}
                          onChange={(e) => setSlaForm((p) => ({ ...p, p1_resolution: e.target.value }))}
                          className="w-full bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-3 py-2 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                        />
                        <Timer className="w-4 h-4 text-[#9C9CA9] absolute right-3 top-2.5" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F5F4FC] dark:bg-[#242542] p-2.5 rounded-lg flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#F8A040]" />
                  <span className="text-xs text-[#141529] dark:text-white font-medium">
                    Escalate to Tech Lead at 20m untouched
                  </span>
                </div>
              </div>

              {/* P2 Major Card */}
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#F8C048]"></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between pt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F8C048]/20 text-[#B88700] dark:text-[#F8C048] text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#F8C048]"></span>
                      Major (P2)
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Partial Impairment</span>
                  </div>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                    Non-blocking feature failure, analytics dashboard lag, worker queue buildup.
                  </p>
                  <div className="space-y-2.5 pt-2">
                    <div>
                      <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">Response SLA Target</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={slaForm.p2_response}
                          onChange={(e) => setSlaForm((p) => ({ ...p, p2_response: e.target.value }))}
                          className="w-full bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-3 py-2 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                        />
                        <Clock className="w-4 h-4 text-[#9C9CA9] absolute right-3 top-2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">Resolution SLA Target</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={slaForm.p2_resolution}
                          onChange={(e) => setSlaForm((p) => ({ ...p, p2_resolution: e.target.value }))}
                          className="w-full bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-3 py-2 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                        />
                        <Timer className="w-4 h-4 text-[#9C9CA9] absolute right-3 top-2.5" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F5F4FC] dark:bg-[#242542] p-2.5 rounded-lg flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#9C9CA9]" />
                  <span className="text-xs text-[#5C5C70] dark:text-[#cabeff] font-medium">
                    Round-robin assign to available L2 Support
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic SLA Target Preview Matrix Table */}
          <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#6040F0]" />
                <h4 className="text-sm font-bold text-[#141529] dark:text-white">
                  Dynamic SLA Target Preview Matrix
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9C9CA9]">Simulated Ingest Baseline:</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1a1b32] text-[#141529] dark:text-white font-mono text-xs font-semibold border border-[#E5E5EF] dark:border-[#2e2f41]">
                  Today @ 10:00:00 AM EST
                </span>
              </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-[#1a1b32] rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F4FC] dark:bg-[#242542] text-[#9C9CA9] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-4 py-3">Severity Level</th>
                    <th className="px-4 py-3">Contract Response Deadline</th>
                    <th className="px-4 py-3">Contract Resolution Deadline</th>
                    <th className="px-4 py-3">Escalation Threshold (80%)</th>
                    <th className="px-4 py-3">Compliance Guarantee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EF] dark:divide-[#2e2f41] text-[#141529] dark:text-[#eeecff]">
                  <tr className="hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#F55354] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F55354]"></span>
                      Blocker (P0)
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">10:15:00 AM EST (+15m)</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#F55354]">12:00:00 PM EST (+2h)</td>
                    <td className="px-4 py-3 font-mono text-[#5C5C70] dark:text-[#a0a0b8]">10:12:00 AM EST</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#28C078]/15 text-[#28C078] font-bold">
                        99.95% SLA Target
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors bg-[#F9F9FB]/50 dark:bg-[#141529]/30">
                    <td className="px-4 py-3 font-bold text-[#F8A040] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F8A040]"></span>
                      Critical (P1)
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">10:30:00 AM EST (+30m)</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#F8A040]">02:00:00 PM EST (+4h)</td>
                    <td className="px-4 py-3 font-mono text-[#5C5C70] dark:text-[#a0a0b8]">10:24:00 AM EST</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#28C078]/15 text-[#28C078] font-bold">
                        99.50% SLA Target
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#F8C048] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F8C048]"></span>
                      Major (P2)
                    </td>
                    <td className="px-4 py-3 font-mono font-medium">11:00:00 AM EST (+1h)</td>
                    <td className="px-4 py-3 font-mono font-medium text-[#B88700] dark:text-[#F8C048]">06:00:00 PM EST (+8h)</td>
                    <td className="px-4 py-3 font-mono text-[#5C5C70] dark:text-[#a0a0b8]">10:48:00 AM EST</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-[#28C078]/15 text-[#28C078] font-bold">
                        98.00% SLA Target
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SLA Section Footer Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#5C5C70] dark:text-[#cabeff] rounded-lg text-sm font-semibold transition-all"
            >
              Reset Defaults
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#9C9CA9]">All updates apply immediately to newly ingested tickets</span>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-5 py-2 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save SLA Configuration</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: PROMPT 77 - Notification Rules & Routing */}
        <section
          className={`bg-white dark:bg-[#1a1b32] rounded-2xl p-6 lg:p-8 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col space-y-6 ${
            activeTab !== 'notifications' && activeTab !== 'all' ? 'hidden' : ''
          }`}
          id="notifications-section"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-bold">
                  Prompt 77 Dispatch Grid
                </span>
                <span className="text-xs text-[#9C9CA9]">• Real-Time Broadcast Matrix</span>
              </div>
              <h2 className="text-xl font-bold text-[#141529] dark:text-white tracking-tight">
                Notification Rules &amp; Routing
              </h2>
              <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] mt-1">
                Configure automated incident alerts and delivery paths across your personal account and on-call operational rotas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => triggerToast('Synced active routing rules with PagerDuty webhook.')}
                className="px-3.5 py-1.5 rounded-lg bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#141529] dark:text-[#eeecff] text-xs font-semibold transition-all flex items-center gap-1.5 border border-[#E5E5EF] dark:border-[#2e2f41]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#6040F0]" />
                <span>Sync with PagerDuty</span>
              </button>
            </div>
          </div>

          {/* Multi-Column Matrix Table */}
          <div className="overflow-x-auto bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#9C9CA9] uppercase tracking-wider font-bold">
                  <th className="px-4 py-3 w-1/2">Event Trigger &amp; Impact Scope</th>
                  <th className="px-4 py-3 text-center">Email Digest</th>
                  <th className="px-4 py-3 text-center">In-App Bell &amp; Toast</th>
                  <th className="px-4 py-3 text-center">Slack / Webhook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EF] dark:divide-[#2e2f41]">
                {/* GROUP 1 */}
                <tr className="bg-[#eeecff]/40 dark:bg-[#242542]">
                  <td colSpan="4" className="px-4 py-2 text-xs font-bold text-[#6040F0] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Group 1: High-Severity Incidents &amp; SLA Milestones</span>
                  </td>
                </tr>
                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      P0 Blocker Incident Created
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Broadcast within 15 seconds of system registration</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.p0_created?.email ?? false}
                      onChange={() => toggleNotifCheckbox('p0_created', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.p0_created?.in_app ?? false}
                      onChange={() => toggleNotifCheckbox('p0_created', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.p0_created?.slack ?? false}
                      onChange={() => toggleNotifCheckbox('p0_created', 'slack')}
                    />
                  </td>
                </tr>

                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      SLA Approaching Breach (&lt; 15 min remaining)
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Warning pulse dispatched to ticket owner and lead</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.sla_approaching?.email ?? false}
                      onChange={() => toggleNotifCheckbox('sla_approaching', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.sla_approaching?.in_app ?? false}
                      onChange={() => toggleNotifCheckbox('sla_approaching', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.sla_approaching?.slack ?? false}
                      onChange={() => toggleNotifCheckbox('sla_approaching', 'slack')}
                    />
                  </td>
                </tr>

                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      SLA Formally Breached
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Automatic escalation flag logged into RCA Governance</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.sla_breached?.email ?? false}
                      onChange={() => toggleNotifCheckbox('sla_breached', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.sla_breached?.in_app ?? false}
                      onChange={() => toggleNotifCheckbox('sla_breached', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.sla_breached?.slack ?? false}
                      onChange={() => toggleNotifCheckbox('sla_breached', 'slack')}
                    />
                  </td>
                </tr>

                {/* GROUP 2 */}
                <tr className="bg-[#eeecff]/40 dark:bg-[#242542]">
                  <td colSpan="4" className="px-4 py-2 text-xs font-bold text-[#6040F0] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Group 2: Assignment &amp; Routine Workflow</span>
                  </td>
                </tr>
                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      Direct Ticket Assignment
                    </span>
                    <span className="text-xs text-[#9C9CA9]">When an issue or investigation task is assigned to you</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.ticket_assigned?.email ?? false}
                      onChange={() => toggleNotifCheckbox('ticket_assigned', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.ticket_assigned?.in_app ?? false}
                      onChange={() => toggleNotifCheckbox('ticket_assigned', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.ticket_assigned?.slack ?? false}
                      onChange={() => toggleNotifCheckbox('ticket_assigned', 'slack')}
                    />
                  </td>
                </tr>

                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      Mentioned in Discussion / Notes
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Direct @mention in timeline comments or war-room chat</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.mention_discussion?.email ?? false}
                      onChange={() => toggleNotifCheckbox('mention_discussion', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.mention_discussion?.in_app ?? false}
                      onChange={() => toggleNotifCheckbox('mention_discussion', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.mention_discussion?.slack ?? false}
                      onChange={() => toggleNotifCheckbox('mention_discussion', 'slack')}
                    />
                  </td>
                </tr>

                {/* GROUP 3 */}
                <tr className="bg-[#eeecff]/40 dark:bg-[#242542]">
                  <td colSpan="4" className="px-4 py-2 text-xs font-bold text-[#6040F0] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Group 3: RCA &amp; Compliance Sign-Off</span>
                  </td>
                </tr>
                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      Post-Mortem Submitted for Review
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Lead author initiates formal governance sign-off pipeline</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.rca_submitted?.email ?? true}
                      onChange={() => toggleNotifCheckbox('rca_submitted', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.rca_submitted?.in_app ?? true}
                      onChange={() => toggleNotifCheckbox('rca_submitted', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.rca_submitted?.slack ?? true}
                      onChange={() => toggleNotifCheckbox('rca_submitted', 'slack')}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Delivery Targets Preview Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F9F9FB] dark:bg-[#141529] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-[#141529] dark:text-white block truncate">
                  alex.rivera@tronix365.io
                </span>
                <span className="text-xs text-[#9C9CA9]">Primary Mail Delivery</span>
              </div>
            </div>
            <div className="p-4 bg-[#F9F9FB] dark:bg-[#141529] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-[#141529] dark:text-white block truncate">
                  #ops-tier1-war-room
                </span>
                <span className="text-xs text-[#9C9CA9]">Slack Webhook Integrated</span>
              </div>
            </div>
            <div className="p-4 bg-[#F9F9FB] dark:bg-[#141529] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-[#141529] dark:text-white block truncate">
                  Push + SMS (Tier-1)
                </span>
                <span className="text-xs text-[#9C9CA9]">Active On-Call Rotation</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: PROMPT 78 - Appearance Settings */}
        <section
          className={`bg-white dark:bg-[#1a1b32] rounded-2xl p-6 lg:p-8 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col space-y-6 ${
            activeTab !== 'appearance' && activeTab !== 'all' ? 'hidden' : ''
          }`}
          id="appearance-section"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-bold">
                  Prompt 78 UI Canvas
                </span>
                <span className="text-xs text-[#9C9CA9]">• Sensory Display Ergonomics</span>
              </div>
              <h2 className="text-xl font-bold text-[#141529] dark:text-white tracking-tight">
                Appearance &amp; Display Density
              </h2>
              <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] mt-1">
                Fine-tune the interface brightness profile, typographic grid density, and navigation chrome width.
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-bold flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              <span>Local Device Profile</span>
            </div>
          </div>

          {/* Theme Mode Profile Cards */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-[#141529] dark:text-white block">Theme Mode Profile</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Light Mode */}
              <div
                onClick={() => setAppearanceForm((p) => ({ ...p, theme: 'light' }))}
                className={`rounded-xl p-4 cursor-pointer relative transition-all border ${
                  appearanceForm.theme === 'light'
                    ? 'bg-[#F5F4FC] dark:bg-[#242542] border-[#6040F0] shadow-md ring-2 ring-[#6040F0]/20'
                    : 'bg-[#F9F9FB] dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#6040F0]/40'
                }`}
              >
                {appearanceForm.theme === 'light' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#6040F0] flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="h-28 w-full bg-[#FCF8FF] rounded-lg p-2.5 flex flex-col justify-between mb-3 shadow-xs border border-[#E5E5EF]">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2.5 rounded bg-[#6040F0]"></div>
                    <div className="w-4 h-4 rounded-full bg-[#e8e6fe]"></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded bg-[#eeecff]"></div>
                    <div className="w-3/4 h-3 rounded bg-[#e8e6fe]"></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#6040F0]"></span>
                    <div className="w-16 h-2 rounded bg-[#e2e0f8]"></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#141529] dark:text-white block">
                  Light Mode (Default Lavender)
                </span>
                <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5 block">
                  Low-strain lavender canvas, crisp elevated white task surfaces.
                </span>
              </div>

              {/* Dark Mode */}
              <div
                onClick={() => setAppearanceForm((p) => ({ ...p, theme: 'dark' }))}
                className={`rounded-xl p-4 cursor-pointer relative transition-all border ${
                  appearanceForm.theme === 'dark'
                    ? 'bg-[#F5F4FC] dark:bg-[#242542] border-[#6040F0] shadow-md ring-2 ring-[#6040F0]/20'
                    : 'bg-[#F9F9FB] dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#6040F0]/40'
                }`}
              >
                {appearanceForm.theme === 'dark' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#6040F0] flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="h-28 w-full bg-[#191A2B] rounded-lg p-2.5 flex flex-col justify-between mb-3 shadow-xs border border-[#2e2f41]">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2.5 rounded bg-[#6848E8]"></div>
                    <div className="w-4 h-4 rounded-full bg-[#2E2F41]"></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded bg-[#2E2F41]"></div>
                    <div className="w-3/4 h-3 rounded bg-[#3B3C52]"></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#8870F0]"></span>
                    <div className="w-16 h-2 rounded bg-[#2E2F41]"></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#141529] dark:text-white block">
                  Dark Mode (High Contrast)
                </span>
                <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5 block">
                  OLED blacks, vibrant status phosphor, for SOC low-light control rooms.
                </span>
              </div>

              {/* System Preference */}
              <div
                onClick={() => setAppearanceForm((p) => ({ ...p, theme: 'system' }))}
                className={`rounded-xl p-4 cursor-pointer relative transition-all border ${
                  appearanceForm.theme === 'system'
                    ? 'bg-[#F5F4FC] dark:bg-[#242542] border-[#6040F0] shadow-md ring-2 ring-[#6040F0]/20'
                    : 'bg-[#F9F9FB] dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#6040F0]/40'
                }`}
              >
                {appearanceForm.theme === 'system' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#6040F0] flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="h-28 w-full bg-gradient-to-r from-[#FCF8FF] to-[#191A2B] rounded-lg p-2.5 flex flex-col justify-between mb-3 shadow-xs border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2.5 rounded bg-[#6040F0]"></div>
                    <div className="w-4 h-4 rounded-full bg-[#eeecff]"></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="w-full h-3 rounded bg-white/40"></div>
                    <div className="w-3/4 h-3 rounded bg-white/60"></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-white" />
                    <div className="w-16 h-2 rounded bg-white/50"></div>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#141529] dark:text-white block">
                  System Preference
                </span>
                <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5 block">
                  Automatically switches in accordance with your operating system clock.
                </span>
              </div>
            </div>
          </div>

          {/* Density & Layout Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Display Density */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#141529] dark:text-white block">
                Operational Display Density
              </label>
              <div className="space-y-2.5">
                <label className="bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl p-4 flex items-center justify-between cursor-pointer border border-[#E5E5EF] dark:border-[#2e2f41] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#141529] dark:text-white block">
                        Comfortable Density (Default)
                      </span>
                      <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                        48px row heights, relaxed typography, optimized for triage.
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="density"
                    checked={appearanceForm.density === 'comfortable'}
                    onChange={() => setAppearanceForm((p) => ({ ...p, density: 'comfortable' }))}
                    className="accent-[#6040F0]"
                  />
                </label>
                <label className="bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl p-4 flex items-center justify-between cursor-pointer border border-[#E5E5EF] dark:border-[#2e2f41] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#9C9CA9]">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#141529] dark:text-white block">
                        Compact Density (High Volume)
                      </span>
                      <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                        36px row heights, maximized information visible on one screen.
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="density"
                    checked={appearanceForm.density === 'compact'}
                    onChange={() => setAppearanceForm((p) => ({ ...p, density: 'compact' }))}
                    className="accent-[#6040F0]"
                  />
                </label>
              </div>
            </div>

            {/* Sidebar Docking Behavior */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-[#141529] dark:text-white block">
                Sidebar Docking Behavior
              </label>
              <div className="space-y-2.5">
                <label className="bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl p-4 flex items-center justify-between cursor-pointer border border-[#E5E5EF] dark:border-[#2e2f41] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#141529] dark:text-white block">
                        Expanded Sidebar (260px)
                      </span>
                      <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                        Full labels, sub-menus, workspace status indicators visible.
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="sidebar_mode"
                    checked={appearanceForm.sidebar_mode === 'expanded'}
                    onChange={() => setAppearanceForm((p) => ({ ...p, sidebar_mode: 'expanded' }))}
                    className="accent-[#6040F0]"
                  />
                </label>
                <label className="bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl p-4 flex items-center justify-between cursor-pointer border border-[#E5E5EF] dark:border-[#2e2f41] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#9C9CA9]">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#141529] dark:text-white block">
                        Collapsed Mini-Rail (64px)
                      </span>
                      <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                        Icons only, hovering reveals flyout popovers.
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="sidebar_mode"
                    checked={appearanceForm.sidebar_mode === 'collapsed'}
                    onChange={() => setAppearanceForm((p) => ({ ...p, sidebar_mode: 'collapsed' }))}
                    className="accent-[#6040F0]"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Sticky Bottom Quick-Save Utility Footer */}
        <div className="sticky bottom-4 z-30 bg-white/95 dark:bg-[#1a1b32]/95 backdrop-blur-md rounded-2xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#28C078]/15 flex items-center justify-center text-[#28C078]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#141529] dark:text-white block">
                Workspace Configuration Ready
              </span>
              <span className="text-xs text-[#9C9CA9]">Unsaved drafts persist locally across session reloads.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#5C5C70] dark:text-[#cabeff] rounded-lg text-sm font-semibold transition-all"
            >
              Discard All Changes
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'Applying...' : 'Apply Policy & Reload Workspace'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification Pop */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141529] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#2e2f41] animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-[#28C078]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SlaConfigPage;

