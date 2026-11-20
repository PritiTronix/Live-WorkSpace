import React, { useState, useEffect, useMemo } from 'react';
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
  Monitor,
  Check,
  Layers,
  Send,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Info,
  PauseCircle,
  Trash2,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import { settingsService } from '../../../services/settingsService';
import { authService } from '../../../services/api';

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney'
];

const SEVERITY_CONFIGS = [
  {
    id: 'blocker',
    name: 'Blocker (P0)',
    badgeBg: 'bg-[#F55354]/10',
    badgeText: 'text-[#F55354]',
    dotBg: 'bg-[#F55354]',
    barBg: 'bg-[#F55354]',
    subtitle: 'Critical Impact',
    description: 'Core payment failure, entire data center degraded, zero redundancy state.'
  },
  {
    id: 'critical',
    name: 'Critical (P1)',
    badgeBg: 'bg-[#F8A040]/10',
    badgeText: 'text-[#F8A040]',
    dotBg: 'bg-[#F8A040]',
    barBg: 'bg-[#F8A040]',
    subtitle: 'High Degradation',
    description: 'Degraded throughput, customer API latency spikes, major feature unavailable.'
  },
  {
    id: 'major',
    name: 'Major (P2)',
    badgeBg: 'bg-[#F8C048]/20',
    badgeText: 'text-[#B88700] dark:text-[#F8C048]',
    dotBg: 'bg-[#F8C048]',
    barBg: 'bg-[#F8C048]',
    subtitle: 'Partial Impairment',
    description: 'Non-blocking service issue, dashboard lag, background worker backlog.'
  },
  {
    id: 'minor',
    name: 'Minor (P3)',
    badgeBg: 'bg-[#28C078]/15',
    badgeText: 'text-[#28C078]',
    dotBg: 'bg-[#28C078]',
    barBg: 'bg-[#28C078]',
    subtitle: 'Low Impact',
    description: 'Cosmetic bug, documentation discrepancy, non-critical localized flaw.'
  }
];

const toMinutes = (val, unit) => {
  const n = parseInt(val, 10) || 0;
  if (unit === 'hours') return n * 60;
  if (unit === 'days') return n * 1440;
  return n;
};

const formatTimeInTz = (date, tz) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
};

const createDefaultSlaPolicy = () => ({
  configured: true,
  engine_status: 'standby',
  working_schedule: '24x7 Continuous Tier-1 Operations',
  timezone: 'America/New_York',
  holidays: [
    { id: 'h-1', name: "New Year's Day", date: '2026-01-01' },
    { id: 'h-2', name: 'Independence Day', date: '2026-07-04' },
    { id: 'h-3', name: 'Thanksgiving Day', date: '2026-11-26' },
    { id: 'h-4', name: 'Christmas Day', date: '2026-12-25' }
  ],
  pause_on_hold: true,
  targets: {
    blocker: {
      response_value: 15,
      response_unit: 'minutes',
      resolution_value: 2,
      resolution_unit: 'hours'
    },
    critical: {
      response_value: 30,
      response_unit: 'minutes',
      resolution_value: 4,
      resolution_unit: 'hours'
    },
    major: {
      response_value: 1,
      response_unit: 'hours',
      resolution_value: 8,
      resolution_unit: 'hours'
    },
    minor: {
      response_value: 4,
      response_unit: 'hours',
      resolution_value: 24,
      resolution_unit: 'hours'
    }
  },
  escalation_rules: [
    {
      id: 'rule-1',
      severity: 'blocker',
      after_minutes: 10,
      action_type: 'auto_page',
      target: 'Tier-2 SRE Lead'
    },
    {
      id: 'rule-2',
      severity: 'critical',
      after_minutes: 20,
      action_type: 'escalate_role',
      target: 'Tech Lead'
    },
    {
      id: 'rule-3',
      severity: 'major',
      after_minutes: 60,
      action_type: 'reassign',
      target: 'L2 Support Pool'
    }
  ]
});

export const SlaConfigPage = ({ initialTab = 'sla' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Active tab state
  const [activeTab, setActiveTab] = useState(initialTab);

  // Role permissions: Only owner and admin can edit SLA policies
  const [currentUser] = useState(() => authService.getCurrentUserSync());
  const userRole = (currentUser?.role || '').toLowerCase();
  const canEdit = userRole === 'owner' || userRole === 'admin';

  // SLA state
  const [isConfigured, setIsConfigured] = useState(false);
  const [slaForm, setSlaForm] = useState(null);
  const [initialSlaForm, setInitialSlaForm] = useState(null);
  const [slaSaving, setSlaSaving] = useState(false);

  // Holiday draft input
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // Escalation rule draft input
  const [newRuleSeverity, setNewRuleSeverity] = useState('blocker');
  const [newRuleMinutes, setNewRuleMinutes] = useState(15);
  const [newRuleAction, setNewRuleAction] = useState('auto_page');
  const [newRuleTarget, setNewRuleTarget] = useState('Tier-2 SRE Lead');

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
    rca_finalized: { email: true, in_app: false, slack: true }
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Appearance state
  const [appearanceForm, setAppearanceForm] = useState({
    theme: 'dark',
    accent_color: '#6040F0',
    density: 'comfortable',
    sidebar_mode: 'expanded',
    high_contrast: false,
    compact_tables: false
  });
  const [appearanceSaving, setAppearanceSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Dirty state tracking (in-memory component state only, no local storage persistence)
  const isDirty = useMemo(() => {
    if (!isConfigured || !slaForm || !initialSlaForm) return false;
    return JSON.stringify(slaForm) !== JSON.stringify(initialSlaForm);
  }, [isConfigured, slaForm, initialSlaForm]);

  // Unsaved changes window listener
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your SLA configuration.';
        return 'You have unsaved changes in your SLA configuration.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
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
          settingsService.getAppearance()
        ]);

        if (slaData.status === 'fulfilled' && slaData.value) {
          const val = slaData.value;
          // If the backend returns configured: false, or empty object, mark unconfigured
          if (val.configured === false || (!val.targets && !val.working_schedule)) {
            setIsConfigured(false);
            setSlaForm(null);
            setInitialSlaForm(null);
          } else {
            setIsConfigured(true);
            setSlaForm(val);
            setInitialSlaForm(val);
          }
        } else {
          setIsConfigured(false);
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

  // Safe navigation with unsaved changes check
  const handleTabSwitch = (newTab, path) => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved SLA policy changes. Are you sure you want to discard them?'
      );
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
    if (path) navigate(path);
  };

  // Initialize empty policy to draft
  const handleInitializePolicy = () => {
    if (!canEdit) return;
    const defaultDraft = createDefaultSlaPolicy();
    setSlaForm(defaultDraft);
    setIsConfigured(true);
  };

  // Validation
  const validationErrors = useMemo(() => {
    if (!slaForm || !slaForm.targets) return [];
    const errors = [];
    SEVERITY_CONFIGS.forEach((sev) => {
      const target = slaForm.targets[sev.id];
      if (!target) {
        errors.push(`${sev.name}: Targets are missing.`);
        return;
      }
      const respVal = parseInt(target.response_value, 10);
      const resVal = parseInt(target.resolution_value, 10);
      if (isNaN(respVal) || respVal <= 0) {
        errors.push(`${sev.name}: Response target must be a positive integer.`);
      }
      if (isNaN(resVal) || resVal <= 0) {
        errors.push(`${sev.name}: Resolution target must be a positive integer.`);
      }
      const respMins = toMinutes(target.response_value, target.response_unit);
      const resMins = toMinutes(target.resolution_value, target.resolution_unit);
      if (respMins > resMins) {
        errors.push(`${sev.name}: Response target cannot exceed resolution target.`);
      }
    });
    return errors;
  }, [slaForm]);

  // Save SLA Policy
  const handleSaveSla = async () => {
    if (!canEdit) return;
    if (validationErrors.length > 0) {
      triggerToast('Please fix validation errors before saving.');
      return;
    }

    try {
      setSlaSaving(true);
      // Pre-calculate minutes for backend
      const targetsWithMinutes = {};
      Object.entries(slaForm.targets || {}).forEach(([k, v]) => {
        targetsWithMinutes[k] = {
          ...v,
          response_minutes: toMinutes(v.response_value, v.response_unit),
          resolution_minutes: toMinutes(v.resolution_value, v.resolution_unit)
        };
      });

      const payload = {
        ...slaForm,
        configured: true,
        targets: targetsWithMinutes
      };

      const updated = await settingsService.updateSlaConfig(payload);
      const merged = { ...payload, ...(updated || {}) };
      setSlaForm(merged);
      setInitialSlaForm(merged);
      setIsConfigured(true);
      triggerToast('SLA policy configuration successfully saved.');
    } catch (err) {
      console.error('Error saving SLA configuration:', err);
      triggerToast('Failed to save SLA configuration. ' + (err.response?.data?.detail || ''));
    } finally {
      setSlaSaving(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (initialSlaForm) {
      setSlaForm(JSON.parse(JSON.stringify(initialSlaForm)));
    } else {
      setIsConfigured(false);
      setSlaForm(null);
    }
    triggerToast('Unsaved changes discarded.');
  };

  // Delete / Reset SLA policy
  const handleDeleteSla = async () => {
    if (!canEdit) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete and reset the SLA configuration for this organization? All tracking deadlines will be unconfigured.'
    );
    if (!confirmed) return;

    try {
      setSlaSaving(true);
      await settingsService.deleteSlaConfig();
      setIsConfigured(false);
      setSlaForm(null);
      setInitialSlaForm(null);
      triggerToast('SLA configuration deleted. Organization is now unconfigured.');
    } catch (err) {
      console.error('Error deleting SLA policy:', err);
      triggerToast('Failed to reset SLA policy.');
    } finally {
      setSlaSaving(false);
    }
  };

  // Holiday management
  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    const newHoliday = {
      id: `h-${Date.now()}`,
      name: newHolidayName.trim(),
      date: newHolidayDate
    };
    setSlaForm((prev) => ({
      ...prev,
      holidays: [...(prev.holidays || []), newHoliday]
    }));
    setNewHolidayName('');
    setNewHolidayDate('');
  };

  const handleRemoveHoliday = (holidayId) => {
    if (!canEdit) return;
    setSlaForm((prev) => ({
      ...prev,
      holidays: (prev.holidays || []).filter((h) => h.id !== holidayId)
    }));
  };

  // Escalation rule management
  const handleAddEscalationRule = (e) => {
    e.preventDefault();
    if (!newRuleTarget.trim()) return;
    const newRule = {
      id: `rule-${Date.now()}`,
      severity: newRuleSeverity,
      after_minutes: parseInt(newRuleMinutes, 10) || 15,
      action_type: newRuleAction,
      target: newRuleTarget.trim()
    };
    setSlaForm((prev) => ({
      ...prev,
      escalation_rules: [...(prev.escalation_rules || []), newRule]
    }));
    setNewRuleTarget('');
  };

  const handleRemoveEscalationRule = (ruleId) => {
    if (!canEdit) return;
    setSlaForm((prev) => ({
      ...prev,
      escalation_rules: (prev.escalation_rules || []).filter((r) => r.id !== ruleId)
    }));
  };

  // Update target values
  const handleTargetChange = (sev, field, val) => {
    if (!canEdit) return;
    setSlaForm((prev) => ({
      ...prev,
      targets: {
        ...(prev?.targets || {}),
        [sev]: {
          ...(prev?.targets?.[sev] || {}),
          [field]: val
        }
      }
    }));
  };

  // Save Notifications
  const handleSaveNotifications = async () => {
    try {
      setNotifSaving(true);
      await settingsService.updateNotificationPreferences(notifForm);
      triggerToast('Notification preferences successfully saved.');
    } catch (err) {
      console.error('Error saving notifications:', err);
      triggerToast('Failed to save notifications.');
    } finally {
      setNotifSaving(false);
    }
  };

  // Save Appearance
  const handleSaveAppearance = async () => {
    try {
      setAppearanceSaving(true);
      await settingsService.updateAppearance(appearanceForm);
      triggerToast('Appearance settings successfully saved.');
    } catch (err) {
      console.error('Error saving appearance:', err);
      triggerToast('Failed to save appearance.');
    } finally {
      setAppearanceSaving(false);
    }
  };

  const toggleNotifCheckbox = (rowKey, channel) => {
    setNotifForm((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [channel]: !(prev[rowKey]?.[channel] ?? false)
      }
    }));
  };

  return (
    <div className="w-full bg-[#F9F9FB] dark:bg-[#141529] min-h-screen py-4 sm:py-6 px-3 sm:px-6 lg:px-8 font-body text-[#141529] dark:text-[#eeecff]">
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
              className="px-4 py-2 bg-white dark:bg-[#1f2038] hover:bg-[#F5F4FC] dark:hover:bg-[#28294a] text-[#5C5C70] dark:text-[#cabeff] rounded-lg text-sm font-semibold transition-all border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <History className="w-4 h-4 text-[#9C9CA9]" />
              <span>Audit Log</span>
            </button>
          </div>
        </div>

        {/* Settings Horizontal Navigation Tabs */}
        <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-1.5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs overflow-x-auto">
          <nav className="flex items-center gap-1 min-w-max">
            <button
              onClick={() => handleTabSwitch('workspace')}
              className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'workspace'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Workspace Settings</span>
            </button>
            <button
              onClick={() => handleTabSwitch('roles')}
              className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Roles &amp; Permissions</span>
            </button>
            <button
              onClick={() => handleTabSwitch('members', '/workspace/members')}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d] cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Member Management</span>
            </button>
            <button
              onClick={() => handleTabSwitch('sla', '/workspace/settings/sla')}
              className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
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
              onClick={() => handleTabSwitch('notifications', '/workspace/settings/notifications')}
              className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold shadow-xs'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => handleTabSwitch('appearance', '/workspace/settings/appearance')}
              className={`px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold shadow-xs'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d]'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Appearance</span>
            </button>
            <button
              onClick={() => handleTabSwitch('profile', '/workspace/settings/profile')}
              className="px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-[#5C5C70] dark:text-[#a0a0b8] hover:bg-[#F5F4FC] dark:hover:bg-[#23243d] cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>User Profile</span>
            </button>
          </nav>
        </div>

        {/* SECTION 1: SLA Configuration Settings */}
        <section
          className={`bg-white dark:bg-[#1a1b32] rounded-2xl p-6 lg:p-8 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col space-y-6 ${
            activeTab !== 'sla' && activeTab !== 'all' ? 'hidden' : ''
          }`}
          id="sla-section"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-xl font-bold text-[#141529] dark:text-white tracking-tight">
                SLA Policy Configuration
              </h2>
              <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] mt-1">
                Define contractual response and resolution milestones, working hour schedules, and pause conditions across customer tiers.
              </p>
            </div>

            {/* SLA Engine: Enforcing shows only if real engine status is 'enforcing' */}
            {slaForm?.engine_status === 'enforcing' && (
              <div className="flex items-center gap-2 bg-[#F5F4FC] dark:bg-[#242542] px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                <span className="w-2 h-2 rounded-full bg-[#28C078] animate-pulse"></span>
                <span>SLA Engine: Enforcing</span>
              </div>
            )}
          </div>

          {/* Role Permission Banner */}
          {!canEdit && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Read-Only View: Only workspace Owners and Admins can configure organizational SLA policies. Controls are disabled.</span>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isConfigured ? (
            <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-2xl p-10 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col items-center text-center max-w-2xl mx-auto my-6 space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <Timer className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#141529] dark:text-white">
                  No SLA Policy Configured
                </h3>
                <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] max-w-md">
                  This organization does not currently have an active SLA policy. Incident response and resolution deadlines will not be calculated or tracked until a policy is configured.
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={handleInitializePolicy}
                  className="px-6 py-2.5 bg-[#6040F0] hover:bg-[#5639D8] text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Configure SLA Policy</span>
                </button>
              ) : (
                <p className="text-xs text-[#9C9CA9]">
                  Please contact a workspace Owner or Admin to configure organizational SLA policies.
                </p>
              )}
            </div>
          ) : (
            /* CONFIGURED STATE */
            <div className="space-y-6">
              {/* Validation Errors Box */}
              {validationErrors.length > 0 && (
                <div className="bg-[#ffdad6]/40 dark:bg-[#93000a]/20 border border-[#F55354]/40 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#F55354] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#93000a] dark:text-[#ffb4ab] uppercase tracking-wider">
                      Validation Required
                    </h4>
                    <ul className="text-xs text-[#93000a] dark:text-[#ffb4ab] space-y-0.5 list-disc list-inside">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

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
                            disabled={!canEdit}
                            className="mt-1 accent-[#6040F0]"
                            checked={slaForm.working_schedule === '24x7 Continuous Tier-1 Operations'}
                            onChange={() =>
                              setSlaForm((prev) => ({
                                ...prev,
                                working_schedule: '24x7 Continuous Tier-1 Operations'
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
                            disabled={!canEdit}
                            className="mt-1 accent-[#6040F0]"
                            checked={slaForm.working_schedule === 'Standard Business Hours'}
                            onChange={() =>
                              setSlaForm((prev) => ({
                                ...prev,
                                working_schedule: 'Standard Business Hours'
                              }))
                            }
                          />
                          <div>
                            <span className="text-sm font-medium text-[#5C5C70] dark:text-[#cabeff] block">
                              Standard Business Hours
                            </span>
                            <span className="text-xs text-[#9C9CA9]">08:00 - 18:00, Monday through Friday</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Timezone Reference */}
                  <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-3">
                    <div>
                      <label className="text-xs text-[#9C9CA9] uppercase tracking-wider block font-bold mb-1">
                        Organization Timezone
                      </label>
                      <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mb-2">
                        Canonical timezone for operational calculation and breach triggers.
                      </p>
                      <select
                        disabled={!canEdit}
                        value={slaForm.timezone || 'UTC'}
                        onChange={(e) =>
                          setSlaForm((prev) => ({ ...prev, timezone: e.target.value }))
                        }
                        className="w-full bg-[#F5F4FC] dark:bg-[#242542] text-[#141529] dark:text-white rounded-lg px-3 py-2 text-sm font-semibold border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:ring-1 focus:ring-[#6040F0]"
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#9C9CA9] text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Current Time: {formatTimeInTz(new Date(), slaForm.timezone)}</span>
                    </div>
                  </div>

                  {/* Dynamic Holidays Calendar */}
                  <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-[#9C9CA9] uppercase tracking-wider block font-bold">
                          Observed Holidays
                        </label>
                        <span className="text-xs text-[#6040F0] font-bold">
                          {(slaForm.holidays || []).length} registered
                        </span>
                      </div>
                      <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mb-2">
                        SLA countdown pauses on observed dates.
                      </p>

                      {/* Holiday tags list */}
                      <div className="max-h-24 overflow-y-auto space-y-1.5 mb-2 pr-1">
                        {(slaForm.holidays || []).length === 0 ? (
                          <span className="text-xs text-[#9C9CA9] italic">No holidays configured</span>
                        ) : (
                          (slaForm.holidays || []).map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between px-2.5 py-1 rounded bg-[#F5F4FC] dark:bg-[#242542] text-xs font-medium text-[#141529] dark:text-[#eeecff]"
                            >
                              <span className="truncate max-w-[140px]">{h.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#5C5C70] dark:text-[#a0a0b8] text-[11px]">
                                  {h.date}
                                </span>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHoliday(h.id)}
                                    className="text-[#9C9CA9] hover:text-[#F55354] transition-colors cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Holiday Form */}
                      {canEdit && (
                        <form onSubmit={handleAddHoliday} className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="Holiday name"
                            value={newHolidayName}
                            onChange={(e) => setNewHolidayName(e.target.value)}
                            className="flex-1 min-w-0 bg-[#F9F9FB] dark:bg-[#141529] px-2 py-1 text-xs rounded border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white"
                          />
                          <input
                            type="date"
                            value={newHolidayDate}
                            onChange={(e) => setNewHolidayDate(e.target.value)}
                            className="w-28 bg-[#F9F9FB] dark:bg-[#141529] px-1 py-1 text-xs rounded border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white"
                          />
                          <button
                            type="submit"
                            disabled={!newHolidayName.trim() || !newHolidayDate}
                            className="p-1 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-40 text-white rounded transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
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
                          {slaForm.pause_on_hold ? 'Active' : 'Disabled'}
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
                      disabled={!canEdit}
                      className="sr-only peer"
                      checked={Boolean(slaForm.pause_on_hold)}
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
                      Severity Thresholds (Tickets Enum Aligned)
                    </h3>
                    <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                      Response and resolution targets for lowercase severities: blocker, critical, major, minor.
                    </p>
                  </div>
                  <span className="text-xs text-[#9C9CA9]">Calculations: Positive Integers</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SEVERITY_CONFIGS.map((sev) => {
                    const target = slaForm.targets?.[sev.id] || {
                      response_value: 15,
                      response_unit: 'minutes',
                      resolution_value: 2,
                      resolution_unit: 'hours'
                    };
                    const respMins = toMinutes(target.response_value, target.response_unit);
                    const resMins = toMinutes(target.resolution_value, target.resolution_unit);
                    const isInvalid = respMins > resMins || target.response_value <= 0 || target.resolution_value <= 0;

                    return (
                      <div
                        key={sev.id}
                        className={`bg-white dark:bg-[#1a1b32] rounded-xl p-5 border ${
                          isInvalid
                            ? 'border-[#F55354] dark:border-[#F55354]'
                            : 'border-[#E5E5EF] dark:border-[#2e2f41]'
                        } flex flex-col justify-between space-y-4 relative overflow-hidden`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 ${sev.barBg}`}></div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pt-1">
                            <span className={`px-2.5 py-0.5 rounded-md ${sev.badgeBg} ${sev.badgeText} text-xs font-bold flex items-center gap-1.5`}>
                              <span className={`w-2 h-2 rounded-full ${sev.dotBg}`}></span>
                              {sev.name}
                            </span>
                            <span className="text-xs text-[#9C9CA9]">{sev.subtitle}</span>
                          </div>
                          <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                            {sev.description}
                          </p>

                          <div className="space-y-3 pt-2">
                            {/* Response Target */}
                            <div>
                              <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">
                                Response Target
                              </label>
                              <div className="grid grid-cols-5 gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  disabled={!canEdit}
                                  value={target.response_value}
                                  onChange={(e) =>
                                    handleTargetChange(sev.id, 'response_value', Math.max(1, parseInt(e.target.value, 10) || 1))
                                  }
                                  className="col-span-2 bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:ring-1 focus:ring-[#6040F0]"
                                />
                                <select
                                  disabled={!canEdit}
                                  value={target.response_unit}
                                  onChange={(e) =>
                                    handleTargetChange(sev.id, 'response_unit', e.target.value)
                                  }
                                  className="col-span-3 bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                                >
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                            </div>

                            {/* Resolution Target */}
                            <div>
                              <label className="text-xs text-[#9C9CA9] block mb-1 font-medium">
                                Resolution Target
                              </label>
                              <div className="grid grid-cols-5 gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  disabled={!canEdit}
                                  value={target.resolution_value}
                                  onChange={(e) =>
                                    handleTargetChange(sev.id, 'resolution_value', Math.max(1, parseInt(e.target.value, 10) || 1))
                                  }
                                  className="col-span-2 bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:ring-1 focus:ring-[#6040F0]"
                                />
                                <select
                                  disabled={!canEdit}
                                  value={target.resolution_unit}
                                  onChange={(e) =>
                                    handleTargetChange(sev.id, 'resolution_unit', e.target.value)
                                  }
                                  className="col-span-3 bg-[#F9F9FB] dark:bg-[#141529] rounded-lg px-2 py-1.5 text-xs font-semibold text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none"
                                >
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {isInvalid && (
                            <p className="text-[11px] font-medium text-[#F55354]">
                              {respMins > resMins
                                ? 'Response cannot exceed resolution'
                                : 'Values must be > 0'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Escalation Rules Records Section */}
              <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#6040F0]" />
                    <h3 className="text-base font-bold text-[#141529] dark:text-white">
                      Escalation Action Records
                    </h3>
                  </div>
                  <span className="text-xs text-[#9C9CA9]">
                    Rule records: after N minutes, action type, target role or user
                  </span>
                </div>

                {/* List of rules */}
                <div className="space-y-2">
                  {(slaForm.escalation_rules || []).length === 0 ? (
                    <div className="p-4 bg-white dark:bg-[#1a1b32] rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] text-xs text-[#9C9CA9] text-center">
                      No automated escalation rules recorded.
                    </div>
                  ) : (
                    (slaForm.escalation_rules || []).map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3.5 bg-white dark:bg-[#1a1b32] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[#F5F4FC] dark:bg-[#242542] text-[#6040F0]">
                            {rule.severity}
                          </span>
                          <span className="text-xs text-[#141529] dark:text-white font-medium">
                            After <strong className="font-bold text-[#6040F0]">{rule.after_minutes}m</strong>:
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0]">
                            {rule.action_type === 'auto_page'
                              ? 'Auto-Page'
                              : rule.action_type === 'escalate_role'
                              ? 'Escalate to Role'
                              : rule.action_type === 'reassign'
                              ? 'Round-Robin Reassign'
                              : 'Notify Channel'}
                          </span>
                          <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                            Target: <strong className="text-[#141529] dark:text-white">{rule.target}</strong>
                          </span>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEscalationRule(rule.id)}
                            className="p-1.5 text-[#9C9CA9] hover:text-[#F55354] transition-colors self-end sm:self-auto cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add rule form */}
                {canEdit && (
                  <form
                    onSubmit={handleAddEscalationRule}
                    className="p-4 bg-white dark:bg-[#1a1b32] rounded-xl border border-dashed border-[#E5E5EF] dark:border-[#2e2f41] flex flex-wrap items-center gap-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#9C9CA9]">Severity:</span>
                      <select
                        value={newRuleSeverity}
                        onChange={(e) => setNewRuleSeverity(e.target.value)}
                        className="bg-[#F9F9FB] dark:bg-[#141529] text-xs font-semibold text-[#141529] dark:text-white px-2.5 py-1.5 rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41]"
                      >
                        <option value="blocker">Blocker (P0)</option>
                        <option value="critical">Critical (P1)</option>
                        <option value="major">Major (P2)</option>
                        <option value="minor">Minor (P3)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#9C9CA9]">After:</span>
                      <input
                        type="number"
                        min="1"
                        value={newRuleMinutes}
                        onChange={(e) => setNewRuleMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-16 bg-[#F9F9FB] dark:bg-[#141529] text-xs font-semibold text-[#141529] dark:text-white px-2 py-1.5 rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41]"
                      />
                      <span className="text-xs text-[#9C9CA9]">min</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#9C9CA9]">Action:</span>
                      <select
                        value={newRuleAction}
                        onChange={(e) => setNewRuleAction(e.target.value)}
                        className="bg-[#F9F9FB] dark:bg-[#141529] text-xs font-semibold text-[#141529] dark:text-white px-2.5 py-1.5 rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41]"
                      >
                        <option value="auto_page">Auto-page on-call</option>
                        <option value="escalate_role">Escalate to role</option>
                        <option value="reassign">Round-robin reassign</option>
                        <option value="notify_channel">Notify channel</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                      <span className="text-xs font-semibold text-[#9C9CA9]">Target:</span>
                      <input
                        type="text"
                        placeholder="e.g. Tier-2 SRE Lead, Tech Lead"
                        value={newRuleTarget}
                        onChange={(e) => setNewRuleTarget(e.target.value)}
                        className="flex-1 bg-[#F9F9FB] dark:bg-[#141529] text-xs font-semibold text-[#141529] dark:text-white px-2.5 py-1.5 rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!newRuleTarget.trim()}
                      className="px-4 py-1.5 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Escalation Rule</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Dynamic SLA Target Preview Matrix Table */}
              <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#6040F0]" />
                    <div>
                      <h4 className="text-sm font-bold text-[#141529] dark:text-white">
                        SLA Target Preview Matrix (Live Simulation)
                      </h4>
                      <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">
                        Simulated calculation of deadlines and 80% escalation threshold from current time and saved targets in timezone: {slaForm.timezone}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9C9CA9]">Ingest Simulated:</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1a1b32] text-[#141529] dark:text-white font-mono text-xs font-semibold border border-[#E5E5EF] dark:border-[#2e2f41]">
                      {formatTimeInTz(new Date(), slaForm.timezone)}
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EF] dark:divide-[#2e2f41] text-[#141529] dark:text-[#eeecff]">
                      {SEVERITY_CONFIGS.map((sev) => {
                        const target = slaForm.targets?.[sev.id] || {
                          response_value: 15,
                          response_unit: 'minutes',
                          resolution_value: 2,
                          resolution_unit: 'hours'
                        };
                        const respMins = toMinutes(target.response_value, target.response_unit);
                        const resMins = toMinutes(target.resolution_value, target.resolution_unit);
                        const thresholdMins = Math.max(1, Math.round(respMins * 0.8));

                        const now = Date.now();
                        const respDeadline = new Date(now + respMins * 60 * 1000);
                        const resDeadline = new Date(now + resMins * 60 * 1000);
                        const thresholdTime = new Date(now + thresholdMins * 60 * 1000);

                        return (
                          <tr
                            key={sev.id}
                            className="hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-bold flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${sev.dotBg}`}></span>
                              <span className={sev.badgeText}>{sev.name}</span>
                            </td>
                            <td className="px-4 py-3 font-mono font-medium">
                              {formatTimeInTz(respDeadline, slaForm.timezone)} (+{target.response_value}{target.response_unit[0]})
                            </td>
                            <td className="px-4 py-3 font-mono font-medium">
                              {formatTimeInTz(resDeadline, slaForm.timezone)} (+{target.resolution_value}{target.resolution_unit[0]})
                            </td>
                            <td className="px-4 py-3 font-mono text-[#5C5C70] dark:text-[#a0a0b8]">
                              {formatTimeInTz(thresholdTime, slaForm.timezone)} (at {thresholdMins}m)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SLA Section Dedicated Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E5E5EF] dark:border-[#2e2f41]">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleDeleteSla}
                      disabled={slaSaving}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-[#F55354] rounded-lg text-xs font-bold transition-all border border-rose-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset / Delete Policy</span>
                    </button>
                  )}
                  {isDirty && canEdit && (
                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={slaSaving}
                      className="px-4 py-2 bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#5C5C70] dark:text-[#cabeff] rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    >
                      Discard Changes
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {isDirty && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      Unsaved changes in component state
                    </span>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleSaveSla}
                      disabled={slaSaving || validationErrors.length > 0}
                      className="px-6 py-2 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{slaSaving ? 'Saving SLA...' : 'Save SLA Policy'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: Notification Rules & Routing */}
        <section
          className={`bg-white dark:bg-[#1a1b32] rounded-2xl p-6 lg:p-8 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col space-y-6 ${
            activeTab !== 'notifications' && activeTab !== 'all' ? 'hidden' : ''
          }`}
          id="notifications-section"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="max-w-3xl">
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
                className="px-3.5 py-1.5 rounded-lg bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#141529] dark:text-[#eeecff] text-xs font-semibold transition-all flex items-center gap-1.5 border border-[#E5E5EF] dark:border-[#2e2f41] cursor-pointer"
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
                      Contractual SLA Breached
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Immediate escalation broadcast to leadership &amp; incident commander</span>
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
                    <Users className="w-4 h-4" />
                    <span>Group 2: Workflow Lifecycle &amp; Assignment Activity</span>
                  </td>
                </tr>
                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      Ticket Assigned Directly to You
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Alert when responsibility is delegated or transferred</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.ticket_assigned?.email ?? true}
                      onChange={() => toggleNotifCheckbox('ticket_assigned', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.ticket_assigned?.in_app ?? true}
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
                      Mentioned in Discussion / Comment
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Direct @handle mention within internal ticket timeline</span>
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
                      checked={notifForm.mention_discussion?.in_app ?? true}
                      onChange={() => toggleNotifCheckbox('mention_discussion', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.mention_discussion?.slack ?? true}
                      onChange={() => toggleNotifCheckbox('mention_discussion', 'slack')}
                    />
                  </td>
                </tr>

                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      Ticket Status Transition
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Status advances to In Progress, Waiting, Resolved, Closed</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.status_transitioned?.email ?? true}
                      onChange={() => toggleNotifCheckbox('status_transitioned', 'email')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.status_transitioned?.in_app ?? true}
                      onChange={() => toggleNotifCheckbox('status_transitioned', 'in_app')}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-[#6040F0] accent-[#6040F0] cursor-pointer"
                      checked={notifForm.status_transitioned?.slack ?? false}
                      onChange={() => toggleNotifCheckbox('status_transitioned', 'slack')}
                    />
                  </td>
                </tr>

                {/* GROUP 3 */}
                <tr className="bg-[#eeecff]/40 dark:bg-[#242542]">
                  <td colSpan="4" className="px-4 py-2 text-xs font-bold text-[#6040F0] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Group 3: Post-Mortem &amp; RCA Governance</span>
                  </td>
                </tr>
                <tr className="bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm text-[#141529] dark:text-white block">
                      Draft RCA Document Submitted
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Notification sent to Engineering Lead for peer review</span>
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
                  {currentUser?.email || 'admin@workspace.internal'}
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

          {/* Section 2 Dedicated Save */}
          <div className="flex items-center justify-end pt-4 border-t border-[#E5E5EF] dark:border-[#2e2f41]">
            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={notifSaving}
              className="px-6 py-2 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{notifSaving ? 'Saving...' : 'Save Notifications'}</span>
            </button>
          </div>
        </section>

        {/* SECTION 3: Appearance Settings */}
        <section
          className={`bg-white dark:bg-[#1a1b32] rounded-2xl p-6 lg:p-8 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col space-y-6 ${
            activeTab !== 'appearance' && activeTab !== 'all' ? 'hidden' : ''
          }`}
          id="appearance-section"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-xl font-bold text-[#141529] dark:text-white tracking-tight">
                Interface Customization &amp; Visual Theme
              </h2>
              <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] mt-1">
                Customize operational color tones, contrast thresholds, and screen layout density.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Theme Mode */}
            <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#141529] dark:text-white">Color Theme</h3>
                  <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8]">Select UI appearance mode</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setAppearanceForm((p) => ({ ...p, theme: 'dark' }))}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    appearanceForm.theme === 'dark'
                      ? 'bg-[#1a1b32] border-[#6040F0] text-white ring-2 ring-[#6040F0]/20'
                      : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] text-[#5C5C70]'
                  }`}
                >
                  <span className="text-sm font-bold block mb-1">Dark Mode</span>
                  <span className="text-xs text-[#9C9CA9]">High contrast, reduced glare</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppearanceForm((p) => ({ ...p, theme: 'light' }))}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    appearanceForm.theme === 'light'
                      ? 'bg-white border-[#6040F0] text-[#141529] ring-2 ring-[#6040F0]/20'
                      : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] text-[#5C5C70]'
                  }`}
                >
                  <span className="text-sm font-bold block mb-1">Light Mode</span>
                  <span className="text-xs text-[#9C9CA9]">Crisp daytime visibility</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppearanceForm((p) => ({ ...p, theme: 'system' }))}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    appearanceForm.theme === 'system'
                      ? 'bg-[#eeecff] dark:bg-[#2e2f41] border-[#6040F0] text-[#6040F0] ring-2 ring-[#6040F0]/20'
                      : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] text-[#5C5C70]'
                  }`}
                >
                  <span className="text-sm font-bold block mb-1">System Default</span>
                  <span className="text-xs text-[#9C9CA9]">Follow OS settings</span>
                </button>
              </div>
            </div>

            {/* Sidebar & Density Settings */}
            <div className="bg-[#F9F9FB] dark:bg-[#141529] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] space-y-4">
              <h3 className="text-base font-bold text-[#141529] dark:text-white">Layout Density</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 flex items-center justify-between cursor-pointer border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div>
                    <span className="text-sm font-bold text-[#141529] dark:text-white block">
                      Expanded Sidebar
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Full labels, sub-menus visible</span>
                  </div>
                  <input
                    type="radio"
                    name="sidebar_mode"
                    checked={appearanceForm.sidebar_mode === 'expanded'}
                    onChange={() => setAppearanceForm((p) => ({ ...p, sidebar_mode: 'expanded' }))}
                    className="accent-[#6040F0]"
                  />
                </label>

                <label className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 flex items-center justify-between cursor-pointer border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div>
                    <span className="text-sm font-bold text-[#141529] dark:text-white block">
                      Collapsed Sidebar
                    </span>
                    <span className="text-xs text-[#9C9CA9]">Icons only mode</span>
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

          {/* Section 3 Dedicated Save */}
          <div className="flex items-center justify-end pt-4 border-t border-[#E5E5EF] dark:border-[#2e2f41]">
            <button
              type="button"
              onClick={handleSaveAppearance}
              disabled={appearanceSaving}
              className="px-6 py-2 bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{appearanceSaving ? 'Saving...' : 'Save Appearance'}</span>
            </button>
          </div>
        </section>
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
