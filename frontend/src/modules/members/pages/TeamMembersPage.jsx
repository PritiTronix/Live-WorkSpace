import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Terminal,
  Palette,
  Server,
  Activity,
  Search,
  Filter,
  Grid,
  List,
  Download,
  UserPlus,
  Mail,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Clock,
  Layers,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { membersService } from '../../../services/membersService';
import InviteMemberModal from '../components/InviteMemberModal';
import MemberDetailDrawer from '../components/MemberDetailDrawer';

export const TeamMembersPage = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal / Drawer state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedMemberData, setSelectedMemberData] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await membersService.listMembers();
      const list = res?.data || res || [];
      setMembers(list);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase();
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

      const matchDept =
        deptFilter === 'all' ||
        (m.department && m.department.toLowerCase().includes(deptFilter.toLowerCase()));

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && m.is_active !== false) ||
        (statusFilter === 'pending' && m.is_active === false);

      return matchQuery && matchRole && matchDept && matchStatus;
    });
  }, [members, searchQuery, roleFilter, deptFilter, statusFilter]);

  const handleExportCsv = () => {
    if (members.length === 0) {
      triggerToast('No members to export.');
      return;
    }
    const headers = ['ID', 'Full Name', 'Email', 'Role', 'Title', 'Department', 'Active'];
    const rows = members.map((m) => [
      m.id,
      `"${m.full_name || ''}"`,
      `"${m.email || ''}"`,
      m.role || 'employee',
      `"${m.title || ''}"`,
      `"${m.department || ''}"`,
      m.is_active ? 'Active' : 'Pending',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `team-members-${new Date().toISOString().slice(0, 10)}.csv`);
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
              Manage workspace members, role permissions, project allocations, and workload capacity across your engineering and product squads.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={handleExportCsv}
              className="h-10 px-4 bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] text-[#141529] dark:text-white rounded-lg text-sm font-semibold flex items-center gap-2 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs transition-all"
            >
              <Download className="w-4 h-4 text-[#9C9CA9]" />
              <span>Export Directory</span>
            </button>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="h-10 px-4 bg-[#6040F0] hover:bg-[#5639D8] text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Invite Member</span>
            </button>
          </div>
        </div>

        {/* Top Key Metrics Bento Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Members */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Total Members</span>
              <span className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                  {members.length > 0 ? members.length : 48}
                </span>
                <span className="text-xs font-bold text-[#28C078]">● 44 Active</span>
              </div>
              <p className="text-xs text-[#9C9CA9] mt-0.5">4 Pending invitations</p>
            </div>
            <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden flex">
              <div className="bg-[#6040F0] h-full" style={{ width: '91.6%' }}></div>
              <div className="bg-[#F8A040] h-full" style={{ width: '8.4%' }}></div>
            </div>
          </div>

          {/* Engineering */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Engineering</span>
              <span className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <Terminal className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#141529] dark:text-white">26</span>
                <span className="text-xs text-[#5C5C70] dark:text-[#cabeff]">Engineers</span>
              </div>
              <p className="text-xs text-[#9C9CA9] mt-0.5">54.1% of entire roster</p>
            </div>
            <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#6040F0] h-full" style={{ width: '54%' }}></div>
            </div>
          </div>

          {/* Product & Design */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Product &amp; Design</span>
              <span className="w-8 h-8 rounded-lg bg-[#F5F4FC] dark:bg-[#242542] flex items-center justify-center text-[#3888F8]">
                <Palette className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#141529] dark:text-white">12</span>
                <span className="text-xs text-[#5C5C70] dark:text-[#cabeff]">Members</span>
              </div>
              <p className="text-xs text-[#9C9CA9] mt-0.5">8 Designers, 4 PMs</p>
            </div>
            <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#3888F8] h-full" style={{ width: '25%' }}></div>
            </div>
          </div>

          {/* Operations & SRE */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Operations &amp; SRE</span>
              <span className="w-8 h-8 rounded-lg bg-[#ffdbc8] dark:bg-[#7f3b00]/30 flex items-center justify-center text-[#7f3b00] dark:text-[#ffb689]">
                <Server className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#141529] dark:text-white">10</span>
                <span className="text-xs text-[#5C5C70] dark:text-[#cabeff]">Specialists</span>
              </div>
              <p className="text-xs text-[#9C9CA9] mt-0.5">2 On-call rotation today</p>
            </div>
            <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#7f3b00] dark:bg-[#ffb689] h-full" style={{ width: '21%' }}></div>
            </div>
          </div>

          {/* Avg Workload with Gauge Radial */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">Avg Workload</span>
              <span className="w-8 h-8 rounded-lg bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#141529] dark:text-white">74%</span>
                  <span className="text-xs font-bold text-[#28C078]">Optimal</span>
                </div>
                <p className="text-xs text-[#9C9CA9] mt-0.5">Target &lt; 85% healthy band</p>
              </div>
              {/* Inline SVG Gauge */}
              <svg className="w-10 h-10 -mr-1" viewBox="0 0 36 36">
                <path
                  className="text-[#E5E5EF] dark:text-[#2e2f41]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-[#6040F0]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="74, 100"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
            </div>
            <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-[#6040F0] h-full" style={{ width: '74%' }}></div>
            </div>
          </div>
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-[#F9F9FB] dark:bg-[#141529] rounded-lg text-sm text-[#141529] dark:text-white border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 placeholder:text-[#9C9CA9]"
            />
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
            >
              <option value="all">Role: All Roles</option>
              <option value="admin">Admin</option>
              <option value="project-manager">Project Manager</option>
              <option value="employee">Employee</option>
              <option value="viewer">Viewer</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
            >
              <option value="all">Dept: All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="frontend">Frontend</option>
              <option value="backend">Backend</option>
              <option value="sre">DevOps / SRE</option>
              <option value="product">Product</option>
              <option value="qa">QA</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>

            {/* Segmented View Toggle */}
            <div className="flex items-center bg-[#F9F9FB] dark:bg-[#141529] p-1 rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#1a1b32] text-[#6040F0] shadow-xs'
                    : 'text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#1a1b32] text-[#6040F0] shadow-xs'
                    : 'text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white'
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Indicators & Count */}
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-2 text-[#5C5C70] dark:text-[#cabeff]">
            <span>
              Showing <strong className="text-[#141529] dark:text-white">{filteredMembers.length}</strong> of{' '}
              {members.length} workspace team members
            </span>
            <span className="text-[#9C9CA9]">•</span>
            <span className="px-2 py-0.5 rounded-full bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] font-bold">
              Engineering Squad Focus
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[#9C9CA9]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#28C078]"></span> Active ({members.filter((m) => m.is_active !== false).length})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F8A040]"></span> On Leave (2)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#9C9CA9]"></span> Pending ({members.filter((m) => m.is_active === false).length})
            </span>
          </div>
        </div>

        {/* MAIN MEMBER VIEW: GRID */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredMembers.map((m) => {
              const workload = 65 + (m.id.charCodeAt(0) % 30);
              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-[#1a1b32] rounded-xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar, Status, Role badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shadow-xs bg-[#eeecff] dark:bg-[#2e2f41] border border-[#E5E5EF] dark:border-[#2e2f41]">
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-extrabold text-xl text-[#6040F0]">
                              {m.full_name ? m.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#28C078] rounded-full shadow-xs ring-2 ring-white dark:ring-[#1a1b32]"></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            m.role === 'admin'
                              ? 'bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0]'
                              : m.role === 'project_manager' || m.role === 'project-manager'
                              ? 'bg-[#3888F8]/15 text-[#3888F8]'
                              : 'bg-[#F9F9FB] dark:bg-[#141529] text-[#5C5C70] dark:text-[#cabeff]'
                          }`}
                        >
                          {m.role || 'Employee'}
                        </span>
                        <button
                          onClick={() => openMemberDetail(m)}
                          className="p-1 rounded-lg text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white hover:bg-[#F5F4FC] dark:hover:bg-[#242542] transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Name & Title */}
                    <div className="mb-3">
                      <h2 className="text-base font-bold text-[#141529] dark:text-white tracking-tight truncate">
                        {m.full_name}
                      </h2>
                      <p className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff] truncate">
                        {m.title || 'Software Engineer'}
                      </p>
                      <div className="flex items-center gap-1 text-[#9C9CA9] text-[11px] mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    </div>

                    {/* Department Tag */}
                    <div className="mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F4FC] dark:bg-[#242542] text-[#5C5C70] dark:text-[#cabeff] text-[11px] font-semibold border border-[#E5E5EF] dark:border-[#2e2f41]">
                        <Server className="w-3 h-3 text-[#6040F0]" />
                        <span>{m.department || 'Engineering'}</span>
                      </span>
                    </div>

                    {/* Active Projects */}
                    <div className="mb-4">
                      <span className="text-[10px] text-[#9C9CA9] uppercase font-bold tracking-wider block mb-1">
                        Active Projects
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 rounded bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-[11px] font-semibold border border-[#E5E5EF] dark:border-[#2e2f41]">
                          Cloud Core Infra
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-[11px] font-semibold border border-[#E5E5EF] dark:border-[#2e2f41]">
                          Auth Gateway
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tasks, Tickets & Workload Section */}
                  <div className="pt-3 border-t border-[#E5E5EF] dark:border-[#2e2f41] -mx-5 -mb-5 p-5 bg-[#F9F9FB]/60 dark:bg-[#141529]/60 rounded-b-xl">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1.5 text-[#5C5C70] dark:text-[#cabeff]">
                        <span>Tasks: <strong className="text-[#141529] dark:text-white">6</strong></span>
                        <span className="text-[#9C9CA9]">|</span>
                        <span>Tickets: <strong className="text-[#141529] dark:text-white">2</strong></span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-[#ffdad6]/60 dark:bg-[#93000a]/20 text-[#F55354] text-[10px] font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> 1 Blocker
                      </span>
                    </div>

                    {/* Workload Progress */}
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-[#9C9CA9]">Workload Capacity</span>
                        <span
                          className={`font-bold ${
                            workload > 80 ? 'text-[#F55354]' : 'text-[#28C078]'
                          }`}
                        >
                          {workload}% ({workload > 80 ? 'High' : 'Normal'})
                        </span>
                      </div>
                      <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={workload > 80 ? 'bg-[#F55354] h-full' : 'bg-[#6040F0] h-full'}
                          style={{ width: `${workload}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Bottom Card Action Links */}
                    <div className="flex items-center justify-between pt-3 mt-1">
                      <button
                        onClick={() => openMemberDetail(m)}
                        className="text-xs font-bold text-[#6040F0] hover:text-[#5639D8] transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => openMemberDetail(m)}
                        className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff] hover:text-[#141529] dark:hover:text-white transition-colors"
                      >
                        Reassign Work
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MAIN MEMBER VIEW: TABLE */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto bg-white dark:bg-[#1a1b32] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F4FC] dark:bg-[#242542] text-[#9C9CA9] uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Workload</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EF] dark:divide-[#2e2f41]">
                {filteredMembers.map((m) => {
                  const workload = 65 + (m.id.charCodeAt(0) % 30);
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#F5F4FC]/50 dark:hover:bg-[#242542]/50 transition-colors cursor-pointer"
                      onClick={() => openMemberDetail(m)}
                    >
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center font-bold text-[#6040F0]">
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                          ) : (
                            m.full_name ? m.full_name.charAt(0).toUpperCase() : 'U'
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-[#141529] dark:text-white">{m.full_name}</span>
                          <span className="text-[11px] text-[#9C9CA9]">{m.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="capitalize font-semibold text-[#141529] dark:text-white">
                          {m.role || 'employee'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#5C5C70] dark:text-[#cabeff]">
                        {m.department || 'Engineering'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#28C078]/15 text-[#28C078]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#28C078]"></span>
                          Active
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="w-28 flex items-center gap-2">
                          <div className="flex-1 bg-[#E5E5EF] dark:bg-[#242542] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#6040F0] h-full" style={{ width: `${workload}%` }}></div>
                          </div>
                          <span className="text-[11px] font-bold">{workload}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openMemberDetail(m);
                          }}
                          className="px-3 py-1 bg-[#eeecff] dark:bg-[#2e2f41] hover:bg-[#6040F0] hover:text-white text-[#6040F0] text-xs font-bold rounded-lg transition-all"
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
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onMemberInvited={(result) => {
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

