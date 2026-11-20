import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Terminal,
  Palette,
  Server,
  Activity,
  Search,
  Grid,
  List,
  Download,
  UserPlus,
  Mail,
  MoreVertical,
  CheckCircle2,
  KeyRound,
  Wifi,
  Clock,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { membersService } from '../../../services/membersService';
import { authService, connectNotificationsWebSocket } from '../../../services/api';
import InviteMemberModal from '../components/InviteMemberModal';
import MemberDetailDrawer from '../components/MemberDetailDrawer';
import JoinCodeCard from '../components/JoinCodeCard';
import JoinRequestsTable from '../components/JoinRequestsTable';
import Avatar from '../../../components/common/Avatar';
import {
  PRESENCE_STATUS,
  PRESENCE_CONFIG,
  DEPARTMENT_DISPLAY_LABELS,
  normalizeDepartmentName,
  formatLastActive,
} from '../../../constants/presence';

export const TeamMembersPage = () => {
  const [members, setMembers] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameters
  const urlTeam = searchParams.get('team') || searchParams.get('department') || 'all';
  const urlStatus = searchParams.get('status') || 'all';
  const urlPresence = searchParams.get('presence') || 'all';
  const urlRole = searchParams.get('role') || 'all';
  const urlQuery = searchParams.get('q') || '';
  const urlTab = searchParams.get('tab');

  // Authenticated User Context & Join Requests Count (Owner/Admin only)
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const isAdminOrOwner = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const activeTab = (isAdminOrOwner && (urlTab === 'join-requests' || urlTab === 'requests')) ? 'join-requests' : 'members';

  // Filters state (synchronized strictly with URL params)
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [roleFilter, setRoleFilter] = useState(urlRole);
  const [deptFilter, setDeptFilter] = useState(urlTeam.toLowerCase());
  const [statusFilter, setStatusFilter] = useState(urlStatus.toLowerCase());
  const [presenceFilter, setPresenceFilter] = useState(urlPresence.toLowerCase());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal / Drawer state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMemberData, setSelectedMemberData] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to update URL search parameters while keeping navigation clean
  const updateUrlParams = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (!val || val === 'all') {
          next.delete(key);
          if (key === 'team') next.delete('department');
        } else {
          next.set(key, val);
        }
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Sync state when URL params change (e.g. back/forward navigation or deep links)
  useEffect(() => {
    const t = (searchParams.get('team') || searchParams.get('department') || 'all').toLowerCase();
    const s = (searchParams.get('status') || 'all').toLowerCase();
    const p = (searchParams.get('presence') || 'all').toLowerCase();
    const r = (searchParams.get('role') || 'all').toLowerCase();
    const q = searchParams.get('q') || '';

    setDeptFilter(t);
    setStatusFilter(s);
    setPresenceFilter(p);
    setRoleFilter(r);
    setSearchQuery(q);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'join-requests') {
        next.set('tab', 'join-requests');
      } else {
        next.delete('tab');
      }
      return next;
    }, { replace: true });
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const u = await authService.getMe();
      setCurrentUser(u);
      if (u?.organization_id && (u.role === 'owner' || u.role === 'admin')) {
        try {
          const reqRes = await membersService.listJoinRequests(u.organization_id, 'pending', 1, 100);
          setPendingRequestsCount(reqRes?.total ?? reqRes?.items?.length ?? 0);
        } catch {
          // handled gracefully
        }
      }
    } catch {
      // not authenticated
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [mRes, sRes, invRes] = await Promise.all([
        membersService.listMembers(),
        membersService.getSummary(),
        membersService.listInvitations(),
      ]);
      const list = Array.isArray(mRes) ? mRes : (mRes?.data || []);
      setMembers(list);
      setSummaryData(sRes);
      setInvitations(invRes || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
      setError('Unable to load team workforce matrix. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    fetchCurrentUser();

    const handleProfileUpdated = (e) => {
      if (e.detail?.id) {
        setMembers((prev) =>
          prev.map((m) => (m.id === e.detail.id ? { ...m, ...e.detail } : m))
        );
      }
    };

    const handlePresenceUpdated = (e) => {
      if (e.detail?.presence && currentUser?.id) {
        setMembers((prev) =>
          prev.map((m) => (m.id === currentUser.id ? { ...m, presence: e.detail.presence } : m))
        );
        membersService.getSummary().then((s) => s && setSummaryData(s)).catch(() => {});
      }
    };

    window.addEventListener('user-profile-updated', handleProfileUpdated);
    window.addEventListener('presence-updated', handlePresenceUpdated);

    // WebSocket real-time subscription for live presence and roster updates
    let ws = null;
    let heartbeatTimer = null;
    try {
      ws = connectNotificationsWebSocket(
        (event) => {
          if ((event.event === 'presence_updated' || event.type === 'presence_updated') && event.data) {
            const { user_id, presence, last_active_at } = event.data;
            setMembers((prev) =>
              prev.map((m) =>
                m.id === user_id
                  ? { ...m, presence: presence?.toLowerCase(), last_active_at: last_active_at || m.last_active_at }
                  : m
              )
            );
            membersService.getSummary().then((s) => s && setSummaryData(s)).catch(() => {});
          } else if (event.event === 'roster_updated' || event.event === 'init') {
            membersService.getSummary().then((s) => s && setSummaryData(s)).catch(() => {});
          }
        },
        (err) => console.warn('Notifications WS error:', err)
      );

      // Throttled heartbeat to maintain session activity
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ event: 'heartbeat' }));
          } catch {}
        }
      }, 45000);
    } catch (wsErr) {
      console.warn('WS initialization error:', wsErr);
    }

    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdated);
      window.removeEventListener('presence-updated', handlePresenceUpdated);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (ws) {
        try { ws.close(); } catch {}
      }
    };
  }, [currentUser?.id, fetchCurrentUser, fetchMembers]);

  // Authoritative Workforce Numbers from Single Backend Function
  // Total = Active + Inactive + Pending strictly enforced
  const activeCount = summaryData?.active_count ?? members.filter((m) => m.account_state === 'active' || m.is_active !== false).length;
  const inactiveCount = summaryData?.inactive_count ?? members.filter((m) => m.account_state === 'inactive' || m.is_active === false).length;
  const pendingCount = summaryData?.pending_invitations_count ?? summaryData?.pending_count ?? invitations.length;
  const onlineCount = summaryData?.online_count ?? members.filter((m) => (m.presence || '').toLowerCase() === PRESENCE_STATUS.ONLINE).length;
  const totalCount = summaryData?.total_members ?? (activeCount + inactiveCount + pendingCount);

  // Real department statistics with normalization (Engineering and engineering grouped)
  const deptStats = useMemo(() => {
    // If backend provided normalized department workload list, use it directly
    if (summaryData?.departments && Array.isArray(summaryData.departments) && summaryData.departments.length > 0) {
      return summaryData.departments.map((d) => ({
        key: d.key,
        name: d.name,
        count: d.member_count,
        available: d.available_members,
        active_items: d.active_items,
        capacity: d.capacity,
        status: d.status,
        color: d.color,
        pct: totalCount > 0 ? Math.round((d.member_count / totalCount) * 100) : 0,
      }));
    }

    // Fallback: group from loaded members strictly omitting departments with 0 records
    const map = {};
    members.forEach((m) => {
      const { key, label } = normalizeDepartmentName(m.department);
      if (!map[key]) {
        map[key] = { key, name: label, count: 0, available: 0, active_items: 0 };
      }
      map[key].count += 1;
      if (m.is_available) map[key].available += 1;
      map[key].active_items += (m.active_items_count || 0);
    });

    return Object.values(map)
      .filter((d) => d.count > 0)
      .map((d) => ({
        ...d,
        pct: totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [summaryData?.departments, members, totalCount]);

  // Filter application handlers (clicking card toggles filter on/off)
  const handleCardFilterClick = (type, value) => {
    if (type === 'total') {
      // Clear all active filters
      updateUrlParams({ team: 'all', status: 'all', presence: 'all' });
      return;
    }

    if (type === 'status') {
      const nextVal = statusFilter === value ? 'all' : value;
      updateUrlParams({ status: nextVal });
      return;
    }

    if (type === 'presence') {
      const nextVal = presenceFilter === value ? 'all' : value;
      updateUrlParams({ presence: nextVal });
      return;
    }

    if (type === 'team') {
      const nextVal = deptFilter === value.toLowerCase() ? 'all' : value.toLowerCase();
      updateUrlParams({ team: nextVal });
    }
  };

  // Dropdown filter change handlers (stay in two-way sync with URL & cards)
  const handleDeptSelectChange = (val) => {
    updateUrlParams({ team: val });
  };

  const handleStatusSelectChange = (val) => {
    updateUrlParams({ status: val });
  };

  const handlePresenceSelectChange = (val) => {
    updateUrlParams({ presence: val });
  };

  const handleRoleSelectChange = (val) => {
    updateUrlParams({ role: val });
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    updateUrlParams({ q: val });
  };

  const handleClearAllFilters = () => {
    updateUrlParams({ team: 'all', status: 'all', presence: 'all', role: 'all', q: '' });
  };

  // Filtered members list honoring query, role, department, status, and presence
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.title?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q);

      const matchRole =
        roleFilter === 'all' ||
        m.role?.toLowerCase() === roleFilter.toLowerCase() ||
        (roleFilter === 'project-manager' && m.role?.toLowerCase() === 'project_manager');

      const { key: memberDeptKey } = normalizeDepartmentName(m.department);
      const matchDept =
        deptFilter === 'all' ||
        memberDeptKey === deptFilter ||
        (m.department && m.department.toLowerCase().includes(deptFilter));

      // Account state matching
      const memberAccountState = m.account_state || (m.is_active !== false ? 'active' : 'inactive');
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && memberAccountState === 'active') ||
        (statusFilter === 'inactive' && memberAccountState === 'inactive') ||
        (statusFilter === 'pending' && memberAccountState === 'pending');

      // Presence matching
      const memberPresence = (m.presence || PRESENCE_STATUS.OFFLINE).toLowerCase();
      const matchPresence =
        presenceFilter === 'all' ||
        memberPresence === presenceFilter.toLowerCase();

      return matchQuery && matchRole && matchDept && matchStatus && matchPresence;
    });
  }, [members, searchQuery, roleFilter, deptFilter, statusFilter, presenceFilter]);

  // Export CSV honoring authoritative domain definitions
  const handleExportCsv = () => {
    if (members.length === 0) {
      triggerToast('No members to export.');
      return;
    }
    const headers = ['ID', 'Full Name', 'Email', 'Role', 'Title', 'Department', 'Account State', 'Presence', 'Last Active'];
    const rows = members.map((m) => {
      const { label: deptLabel } = normalizeDepartmentName(m.department);
      const accountState = m.account_state || (m.is_active !== false ? 'Active' : 'Inactive');
      const presenceLabel = (PRESENCE_CONFIG[m.presence?.toLowerCase()] || PRESENCE_CONFIG.offline).label;
      const lastActiveText = formatLastActive(m.last_active_at || m.last_active);

      return [
        m.id,
        `"${m.full_name || ''}"`,
        `"${m.email || ''}"`,
        m.role || 'member',
        `"${m.title || ''}"`,
        `"${deptLabel}"`,
        accountState,
        presenceLabel,
        `"${lastActiveText}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workspace-team-workforce-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Team member directory exported to CSV.');
  };

  const openMemberDetail = (m) => {
    setSelectedMemberId(m.id);
    setSelectedMemberData(m);
    setIsDrawerOpen(true);
  };

  // Department icon mapper
  const getDeptIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('eng') || lower.includes('dev') || lower.includes('tech')) {
      return <Terminal className="w-4 h-4" />;
    }
    if (lower.includes('prod') || lower.includes('design') || lower.includes('ui')) {
      return <Palette className="w-4 h-4" />;
    }
    if (lower.includes('sre') || lower.includes('ops') || lower.includes('infra')) {
      return <Server className="w-4 h-4" />;
    }
    return <Users className="w-4 h-4" />;
  };

  const hasActiveFilters = deptFilter !== 'all' || statusFilter !== 'all' || presenceFilter !== 'all' || roleFilter !== 'all' || Boolean(searchQuery);

  return (
    <div className="w-full bg-[#F9F9FB] dark:bg-[#141529] min-h-screen py-6 px-6 lg:px-10 font-body text-[#141529] dark:text-[#eeecff]">
      <div className="max-w-7xl mx-auto flex flex-col space-y-6 pb-16">
        {/* Page Header & Action Tier */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#6040F0] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#6040F0] animate-pulse"></span>
              <span>Workspace Workforce Matrix</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#141529] dark:text-white tracking-tight">
              Team Members
            </h1>
            <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] max-w-3xl">
              Manage workspace members, role permissions, real-time presence, and workload capacity across your engineering and product squads.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {activeTab === 'members' && (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="h-10 px-4 bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] text-[#141529] dark:text-white rounded-lg text-sm font-semibold flex items-center gap-2 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0]"
                  aria-label="Export team member directory as CSV"
                >
                  <Download className="w-4 h-4 text-[#9C9CA9]" />
                  <span>Export Directory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="h-10 px-4 bg-[#6040F0] hover:bg-[#5639D8] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0]"
                  aria-label="Invite new team member"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Invite Member</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin / Owner Navigation Tabs */}
        {isAdminOrOwner && (
          <div className="flex items-center gap-2 border-b border-[#E5E5EF] dark:border-[#2e2f41] pb-0">
            <button
              type="button"
              onClick={() => handleTabChange('members')}
              className={`pb-3 px-3.5 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                activeTab === 'members'
                  ? 'text-[#6040F0] border-b-2 border-[#6040F0] font-bold'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:text-[#141529] dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Team Roster ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('join-requests')}
              className={`pb-3 px-3.5 text-sm font-semibold transition-all relative cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                activeTab === 'join-requests'
                  ? 'text-[#6040F0] border-b-2 border-[#6040F0] font-bold'
                  : 'text-[#5C5C70] dark:text-[#a0a0b8] hover:text-[#141529] dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Join Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#6040F0] text-white">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Join Requests & Join Code (Admin / Owner Only) */}
        {activeTab === 'join-requests' && isAdminOrOwner ? (
          <div className="space-y-6">
            <JoinCodeCard
              organizationId={currentUser?.organization_id}
              onNotify={(msg) => triggerToast(msg)}
            />
            <JoinRequestsTable
              organizationId={currentUser?.organization_id}
              onDecisionSuccess={() => {
                fetchMembers();
                fetchCurrentUser();
              }}
              onNotify={(msg) => triggerToast(msg)}
            />
          </div>
        ) : (
          <>
            {/* Error Notification Banner */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={fetchMembers}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {/* Top Key Metrics Bento Bar: All Clickable Filter Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Card 1: Total Members */}
              <button
                type="button"
                onClick={() => handleCardFilterClick('total', 'all')}
                aria-pressed={!hasActiveFilters}
                aria-label={`Total workforce: ${totalCount} members. Click to clear all filters.`}
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                  !hasActiveFilters
                    ? 'bg-[#eeecff]/40 dark:bg-[#6040F0]/15 border-[#6040F0] shadow-sm'
                    : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#6040F0]/50 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Total Members</span>
                  <span className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                    <Users className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      {totalCount}
                    </span>
                    <span className="text-xs font-bold text-[#6040F0]">
                      {!hasActiveFilters ? 'All showing' : 'Click to show all'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9C9CA9] mt-0.5">
                    {activeCount} active • {pendingCount} pending
                  </p>
                </div>
                <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden flex">
                  <div
                    className="bg-[#6040F0] h-full transition-all"
                    style={{ width: `${totalCount > 0 ? (activeCount / totalCount) * 100 : 0}%` }}
                  ></div>
                  <div
                    className="bg-[#F8A040] h-full transition-all"
                    style={{ width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </button>

              {/* Card 2: Active Accounts (Account Enabled) */}
              <button
                type="button"
                onClick={() => handleCardFilterClick('status', 'active')}
                aria-pressed={statusFilter === 'active'}
                aria-label={`Active accounts: ${activeCount} members. Tooltip: Account enabled. Click to filter.`}
                title="Account enabled — User is active and has an active membership in the organization"
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                  statusFilter === 'active'
                    ? 'bg-[#28C078]/10 border-[#28C078] shadow-sm ring-1 ring-[#28C078]'
                    : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#28C078]/50 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider flex items-center gap-1">
                    <span>Active Accounts</span>
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-[#28C078]/15 flex items-center justify-center text-[#28C078]">
                    <UserCheck className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      {activeCount}
                    </span>
                    <span className="text-xs font-bold text-[#28C078]">Enabled</span>
                  </div>
                  <p className="text-xs text-[#9C9CA9] mt-0.5">
                    {inactiveCount} deactivated / suspended
                  </p>
                </div>
                <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-[#28C078] h-full transition-all"
                    style={{ width: `${totalCount > 0 ? (activeCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </button>

              {/* Card 3: Online Now (Real-time live WebSocket / active within 2m) */}
              <button
                type="button"
                onClick={() => handleCardFilterClick('presence', 'online')}
                aria-pressed={presenceFilter === 'online'}
                aria-label={`Online now: ${onlineCount} connected members. Click to filter.`}
                title="Online presence — Live authenticated connection or activity within the last 2 minutes"
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                  presenceFilter === 'online'
                    ? 'bg-[#6040F0]/15 border-[#6040F0] shadow-sm ring-1 ring-[#6040F0]'
                    : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#6040F0]/50 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Online Now</span>
                  <span className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                    <Wifi className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      {onlineCount}
                    </span>
                    <span className="text-xs font-bold text-[#28C078] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#28C078] animate-pulse"></span> Live
                    </span>
                  </div>
                  <p className="text-xs text-[#9C9CA9] mt-0.5">
                    {onlineCount === 1 ? '1 active session' : `${onlineCount} active sessions`}
                  </p>
                </div>
                <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-[#6040F0] h-full transition-all"
                    style={{ width: `${totalCount > 0 ? (onlineCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </button>

              {/* Card 4: Pending Invitations */}
              <button
                type="button"
                onClick={() => handleCardFilterClick('status', 'pending')}
                aria-pressed={statusFilter === 'pending'}
                aria-label={`Pending invitations: ${pendingCount}. Click to filter.`}
                className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                  statusFilter === 'pending'
                    ? 'bg-[#F8A040]/15 border-[#F8A040] shadow-sm ring-1 ring-[#F8A040]'
                    : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#F8A040]/50 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider truncate">
                    Pending Invites
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-[#F8A040]/15 flex items-center justify-center text-[#F8A040]">
                    <Mail className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      {pendingCount}
                    </span>
                    <span className="text-xs font-bold text-[#F8A040]">Awaiting</span>
                  </div>
                  <p className="text-xs text-[#9C9CA9] mt-0.5">
                    Invited team members
                  </p>
                </div>
                <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-[#F8A040] h-full transition-all"
                    style={{ width: `${totalCount > 0 ? (pendingCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </button>

              {/* Card 5+: Dynamic Real Department Cards (Filtered to only departments with real data) */}
              {deptStats.map((dept) => {
                const isSelectedDept = deptFilter === dept.key;
                return (
                  <button
                    key={dept.key}
                    type="button"
                    onClick={() => handleCardFilterClick('team', dept.key)}
                    aria-pressed={isSelectedDept}
                    aria-label={`Department ${dept.name}: ${dept.count} members, ${dept.available ?? dept.count} available. Click to filter.`}
                    className={`text-left rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6040F0] ${
                      isSelectedDept
                        ? 'bg-[#6040F0]/15 border-[#6040F0] shadow-sm ring-1 ring-[#6040F0]'
                        : 'bg-white dark:bg-[#1a1b32] border-[#E5E5EF] dark:border-[#2e2f41] hover:border-[#6040F0]/50 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider truncate">
                        {dept.name}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                        {getDeptIcon(dept.name)}
                      </span>
                    </div>
                    <div className="mt-2 w-full">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                          {dept.count}
                        </span>
                        <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                          {dept.available !== undefined ? `${dept.available} avail` : 'Members'}
                        </span>
                      </div>
                      <p className="text-xs text-[#9C9CA9] mt-0.5 truncate">
                        {dept.status || `${dept.pct}% of roster`}
                      </p>
                    </div>
                    <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-[#6040F0] h-full transition-all"
                        style={{ width: `${dept.pct}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filter & Controls Toolbar */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-3 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#9C9CA9] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search members by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 bg-[#F9F9FB] dark:bg-[#141529] rounded-lg text-sm text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 placeholder:text-[#9C9CA9]"
                />
              </div>

              {/* Select Filters: Synchronized with Cards and URL */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={deptFilter}
                  onChange={(e) => handleDeptSelectChange(e.target.value)}
                  className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
                  aria-label="Filter by department"
                >
                  <option value="all">Dept: All Departments</option>
                  {deptStats.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name} ({d.count})
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusSelectChange(e.target.value)}
                  className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
                  aria-label="Filter by account status"
                >
                  <option value="all">Status: All Accounts</option>
                  <option value="active">Active Accounts ({activeCount})</option>
                  <option value="inactive">Inactive Accounts ({inactiveCount})</option>
                  <option value="pending">Pending Invitations ({pendingCount})</option>
                </select>

                <select
                  value={presenceFilter}
                  onChange={(e) => handlePresenceSelectChange(e.target.value)}
                  className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
                  aria-label="Filter by presence"
                >
                  <option value="all">Presence: All</option>
                  <option value="online">Online ({onlineCount})</option>
                  <option value="away">Away</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => handleRoleSelectChange(e.target.value)}
                  className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
                  aria-label="Filter by member role"
                >
                  <option value="all">Role: All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="h-10 px-3 bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] text-[#6040F0] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}

                {/* Segmented View Toggle */}
                <div className="flex items-center bg-[#F9F9FB] dark:bg-[#141529] p-1 rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] ml-auto">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-[#1a1b32] text-[#6040F0] shadow-xs'
                        : 'text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white'
                    }`}
                    title="Grid view"
                    aria-label="Switch to grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white dark:bg-[#1a1b32] text-[#6040F0] shadow-xs'
                        : 'text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white'
                    }`}
                    title="Table view"
                    aria-label="Switch to table view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Indicators & Count (Strictly consistent with DB) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-2 text-[#5C5C70] dark:text-[#cabeff]">
                <span>
                  Showing <strong className="text-[#141529] dark:text-white">{filteredMembers.length}</strong> of{' '}
                  {totalCount} workspace team members
                </span>
                {hasActiveFilters && (
                  <span className="text-[#6040F0] font-semibold">
                    (Filtered from {members.length} roster accounts)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[#9C9CA9]">
                <span className="flex items-center gap-1.5" title="Account enabled">
                  <span className="w-2 h-2 rounded-full bg-[#28C078]"></span> Active ({activeCount})
                </span>
                <span className="flex items-center gap-1.5" title="Live WebSocket connection">
                  <span className="w-2 h-2 rounded-full bg-[#6040F0]"></span> Online ({onlineCount})
                </span>
                <span className="flex items-center gap-1.5" title="Pending invitations">
                  <span className="w-2 h-2 rounded-full bg-[#F8A040]"></span> Pending ({pendingCount})
                </span>
              </div>
            </div>

            {/* Empty State when filters yield 0 results */}
            {filteredMembers.length === 0 && !loading && (
              <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-12 border border-[#E5E5EF] dark:border-[#2e2f41] text-center flex flex-col items-center justify-center space-y-3">
                <Users className="w-10 h-10 text-[#9C9CA9]" />
                <h3 className="text-base font-bold text-[#141529] dark:text-white">
                  No matching team members found
                </h3>
                <p className="text-xs text-[#5C5C70] dark:text-[#cabeff] max-w-sm">
                  No members matched your currently active filters. Try adjusting your department, status, presence, or search criteria.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="mt-2 px-4 py-2 bg-[#6040F0] hover:bg-[#5639D8] text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* MAIN MEMBER VIEW: GRID */}
            {viewMode === 'grid' && filteredMembers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filteredMembers.map((m) => {
                  const isActiveAccount = m.account_state === 'active' || m.is_active !== false;
                  const presCfg = PRESENCE_CONFIG[m.presence?.toLowerCase()] || PRESENCE_CONFIG.offline;
                  const { label: deptLabel } = normalizeDepartmentName(m.department);
                  const lastActiveText = formatLastActive(m.last_active_at || m.last_active);

                  return (
                    <div
                      key={m.id}
                      className="bg-white dark:bg-[#1a1b32] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header: Avatar, Presence Dot, Role Badge */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="relative">
                            <Avatar
                              src={m.avatar_url}
                              name={m.full_name}
                              size="xl"
                              shape="rounded-xl"
                              ring="border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs"
                              className="w-14 h-14 text-xl"
                            />
                            {/* Presence Dot: Token colored with tooltip */}
                            <span
                              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full shadow-xs ring-2 ring-white dark:ring-[#1a1b32] ${presCfg.dotClass}`}
                              title={`Presence: ${presCfg.label} • ${lastActiveText}`}
                            ></span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Real presence label tag */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${presCfg.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${presCfg.dotClass}`}></span>
                              <span>{presCfg.label}</span>
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                m.role === 'owner' || m.role === 'admin'
                                  ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0]'
                                  : 'bg-[#F9F9FB] dark:bg-[#141529] text-[#5C5C70] dark:text-[#cabeff]'
                              }`}
                            >
                              {m.role || 'Member'}
                            </span>
                            <button
                              type="button"
                              onClick={() => openMemberDetail(m)}
                              className="p-1 rounded-lg text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white hover:bg-[#F5F4FC] dark:hover:bg-[#242542] transition-colors cursor-pointer"
                              aria-label={`Open details for ${m.full_name || 'member'}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Name & Title */}
                        <div className="mb-3">
                          <h2 className="text-base font-bold text-[#141529] dark:text-white tracking-tight truncate">
                            {m.full_name || 'Team Member'}
                          </h2>
                          {m.title && (
                            <p className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff] truncate">
                              {m.title}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-[#9C9CA9] text-[11px] mt-0.5">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{m.email}</span>
                          </div>
                        </div>

                        {/* Department Tag & Last Active */}
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                          {m.department && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F4FC] dark:bg-[#242542] text-[#5C5C70] dark:text-[#cabeff] text-[11px] font-semibold border border-[#E5E5EF] dark:border-[#2e2f41]">
                              <Server className="w-3 h-3 text-[#6040F0]" />
                              <span>{deptLabel}</span>
                            </span>
                          )}
                          <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{lastActiveText}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status footer: Account state (Active/Inactive) & Details */}
                      <div className="pt-3 border-t border-[#E5E5EF] dark:border-[#2e2f41] -mx-5 -mb-5 p-4 bg-[#F9F9FB]/60 dark:bg-[#141529]/60 rounded-b-xl flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActiveAccount
                              ? 'bg-[#28C078]/15 text-[#28C078]'
                              : 'bg-[#9C9CA9]/15 text-[#9C9CA9]'
                          }`}
                          title={isActiveAccount ? 'Account enabled' : 'Account deactivated or suspended'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isActiveAccount ? 'bg-[#28C078]' : 'bg-[#9C9CA9]'}`}
                          ></span>
                          <span>{isActiveAccount ? 'Active account' : 'Inactive'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openMemberDetail(m)}
                          className="text-xs text-[#6040F0] font-bold hover:underline cursor-pointer"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MAIN MEMBER VIEW: TABLE */}
            {viewMode === 'table' && filteredMembers.length > 0 && (
              <div className="overflow-x-auto bg-white dark:bg-[#1a1b32] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-[#F5F4FC] dark:bg-[#242542] text-[#9C9CA9] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Member</th>
                      <th className="px-5 py-3.5">Presence</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Account State</th>
                      <th className="px-5 py-3.5">Last Active</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EF] dark:divide-[#2e2f41]">
                    {filteredMembers.map((m) => {
                      const isActiveAccount = m.account_state === 'active' || m.is_active !== false;
                      const presCfg = PRESENCE_CONFIG[m.presence?.toLowerCase()] || PRESENCE_CONFIG.offline;
                      const { label: deptLabel } = normalizeDepartmentName(m.department);
                      const lastActiveText = formatLastActive(m.last_active_at || m.last_active);

                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors cursor-pointer"
                          onClick={() => openMemberDetail(m)}
                        >
                          <td className="px-5 py-3.5 flex items-center gap-3">
                            <div className="relative">
                              <Avatar
                                src={m.avatar_url}
                                name={m.full_name}
                                size="md"
                                shape="rounded-lg"
                              />
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-[#1a1b32] ${presCfg.dotClass}`}
                              ></span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[#141529] dark:text-white">{m.full_name || 'Team Member'}</span>
                              <span className="text-[11px] text-[#9C9CA9]">{m.email}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${presCfg.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${presCfg.dotClass}`}></span>
                              <span>{presCfg.label}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="capitalize font-semibold text-[#141529] dark:text-white">
                              {m.role || 'member'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#5C5C70] dark:text-[#cabeff]">
                            {deptLabel || '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isActiveAccount
                                  ? 'bg-[#28C078]/15 text-[#28C078]'
                                  : 'bg-[#9C9CA9]/15 text-[#9C9CA9]'
                              }`}
                              title={isActiveAccount ? 'Account enabled' : 'Account deactivated or suspended'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActiveAccount ? 'bg-[#28C078]' : 'bg-[#9C9CA9]'}`}></span>
                              <span>{isActiveAccount ? 'Active account' : 'Inactive'}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#9C9CA9]">
                            {lastActiveText}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMemberDetail(m);
                              }}
                              className="px-3 py-1 bg-[#eeecff] dark:bg-[#2e2f41] hover:bg-[#6040F0] hover:text-white text-[#6040F0] text-xs font-bold rounded-lg transition-all cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onMemberInvited={() => {
          fetchMembers();
          triggerToast('Member invitation successfully sent.');
        }}
      />

      {/* Member Details Drawer */}
      <MemberDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userId={selectedMemberId}
        memberData={selectedMemberData}
        onMemberUpdated={() => {
          fetchMembers();
          triggerToast('Member role successfully updated.');
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141529] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#2e2f41] animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-[#28C078]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default TeamMembersPage;
