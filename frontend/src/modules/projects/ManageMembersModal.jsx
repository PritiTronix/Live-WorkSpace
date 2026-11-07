import React, { useState, useEffect } from 'react';
import { projectsService } from '../../services/projectsService';

/**
 * ManageMembersModal (Screen 37 - Stitch ID f7b8ef9f48874480a0e4fb420af08ba3)
 * Full RBAC project membership management with active roster, pending invitations, inline removal safeguard popover, and UI mode toggles
 */
export const ManageMembersModal = ({ project, isOpen, onClose, onMembersUpdated }) => {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [uiMode, setUiMode] = useState('active'); // 'active' | 'empty' | 'restricted'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  // Load project members, invitations, and users list
  useEffect(() => {
    if (project && isOpen) {
      loadMembersData();
      projectsService.getUsers().then(setUsers).catch(console.error);
    }
  }, [project, isOpen]);

  const loadMembersData = async () => {
    try {
      const data = await projectsService.getProjectMembers(project.id);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('Failed to load project members:', err);
    }
  };

  if (!isOpen || !project) return null;

  const handleSendInvite = async (e) => {
    e?.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      setInviteMessage(null);

      // Check if user exists in org
      const existingUser = users.find(
        (u) => u.email.toLowerCase() === inviteEmail.trim().toLowerCase()
      );

      const payload = {
        user_id: existingUser ? existingUser.id : null,
        email: inviteEmail.trim(),
        role: inviteRole === 'editor' ? 'Editor / Maintainer' : inviteRole === 'developer' ? 'Developer' : inviteRole === 'admin' ? 'Admin' : 'Viewer',
        access_scope:
          inviteRole === 'editor'
            ? 'Full Repository Write Access'
            : inviteRole === 'admin'
            ? 'Admin / Governance Access'
            : 'Read-only Access',
      };

      const res = await projectsService.addProjectMember(project.id, payload);

      if (res.invitation) {
        setInvitations([...invitations, res.invitation]);
        setInviteMessage({ text: `Invitation sent to ${inviteEmail}`, type: 'success' });
      } else {
        setMembers([...members, res]);
        setInviteMessage({ text: `${res.user?.full_name || inviteEmail} added to project`, type: 'success' });
      }

      setInviteEmail('');
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      console.error('Invite error:', err);
      setInviteMessage({ text: err.response?.data?.detail || 'Failed to send invite.', type: 'error' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const updated = await projectsService.updateProjectMember(project.id, memberId, { role: newRole });
      setMembers(members.map((m) => (m.id === memberId ? updated : m)));
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      await projectsService.removeProjectMember(project.id, memberToRemove.id);
      setMembers(members.filter((m) => m.id !== memberToRemove.id));
      setMemberToRemove(null);
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleResendInvite = async (invitationId) => {
    try {
      await projectsService.resendInvitation(project.id, invitationId);
      setInviteMessage({ text: 'Invitation resent successfully.', type: 'success' });
    } catch (err) {
      console.error('Resend invite error:', err);
    }
  };

  const handleRevokeInvite = async (invitationId) => {
    try {
      await projectsService.revokeInvitation(project.id, invitationId);
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      setInviteMessage({ text: 'Invitation revoked.', type: 'success' });
    } catch (err) {
      console.error('Revoke invite error:', err);
    }
  };

  const handleSavePermissions = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    }, 600);
  };

  // Lead owner from project
  const leadOwner = project.lead || {
    id: project.lead_id || 'usr_01',
    full_name: 'Aarav Mehta',
    email: 'aarav@acmetech.io',
    department: 'Platform Architecture',
    title: 'Lead Architect',
    avatar_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBloEsAf5NhYOU1kRM2mEtiNVQH6kXs8zEhgNAK6HpW-wKwCWoMqoAPDbGC-IkRYeyEZJXj9klWquwN_nLWchABF-1rWr_5OC98wdw1q0so2l7DHKVnK_GEkLcdIW8kRsgmcHR6LTPnc-8WwP-YJcBX1A-EZcXa2sxO_M4VlJOuyZ9IyULI_7hevsLVoHXE_ESX4SA_PTTGj0UbpHI7Jrl2msHUrBTvBCszkGhe2-Ib',
  };

  // Filter members by search & role tab
  const filteredMembers = members.filter((m) => {
    const nameMatch =
      m.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;

    if (selectedRoleFilter === 'All') return true;
    if (selectedRoleFilter === 'Engineers') {
      return (
        m.role?.toLowerCase().includes('engineer') ||
        m.role?.toLowerCase().includes('dev') ||
        m.role?.toLowerCase().includes('maintainer')
      );
    }
    if (selectedRoleFilter === 'Design') {
      return m.role?.toLowerCase().includes('design') || m.user?.title?.toLowerCase().includes('design');
    }
    if (selectedRoleFilter === 'QA') {
      return m.role?.toLowerCase().includes('qa') || m.user?.title?.toLowerCase().includes('qa');
    }
    if (selectedRoleFilter === 'Observers') {
      return m.role?.toLowerCase().includes('view') || m.role?.toLowerCase().includes('audit');
    }
    return true;
  });

  const totalMembersCount = members.length + 1; // including lead

  return (
    <div
      id="modalOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md md:p-space-xl bg-[#141529]/40 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
    >
      {/* MODAL DIALOG CONTAINER (Level 3 Elevation) */}
      <div className="relative w-full max-w-5xl max-h-[942px] flex flex-col rounded-2xl bg-surface-card shadow-[0_16px_40px_rgba(20,21,41,0.14),0_4px_16px_rgba(104,72,232,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-border-subtle">
        {/* 1. MODAL HEADER */}
        <div className="px-space-xl pt-space-lg pb-space-md bg-surface-card flex items-start justify-between border-b border-surface-container">
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h2 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
                Manage Project Members
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-canvas-lavender text-primary font-label-sm text-label-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span>
                  {uiMode === 'empty' ? '1 Member • 0 Pending' : `${totalMembersCount} Members • ${invitations.length} Pending`}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-text-muted">Tronix365 Cloud Security Zone</span>
            </div>
            <p className="font-body-md text-body-md text-text-secondary">
              Assign roles, manage access scopes, and invite collaborators to{' '}
              <span className="font-label-md text-label-md text-text-primary font-semibold">{project.name}</span>
            </p>
          </div>
          <button
            type="button"
            id="closeModalBtn"
            aria-label="Close dialog"
            className="w-9 h-9 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* INTERACTIVE STATE SWITCHER BAR (Specimen Demonstrator) */}
        <div className="px-space-xl py-2 bg-canvas-lavender/60 flex items-center justify-between flex-wrap gap-2 text-xs border-b border-border-subtle/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
            <span className="font-label-sm text-label-sm text-text-secondary">UI Preview Mode:</span>
            <button
              type="button"
              id="btnStateActive"
              onClick={() => setUiMode('active')}
              className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm transition-all ${
                uiMode === 'active'
                  ? 'bg-btn-primary text-on-primary shadow-sm'
                  : 'bg-surface-card hover:bg-surface-card/90 text-text-secondary'
              }`}
            >
              Active Roster ({totalMembersCount})
            </button>
            <button
              type="button"
              id="btnStateEmpty"
              onClick={() => setUiMode('empty')}
              className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm transition-all ${
                uiMode === 'empty'
                  ? 'bg-btn-primary text-on-primary shadow-sm'
                  : 'bg-surface-card hover:bg-surface-card/90 text-text-secondary'
              }`}
            >
              Empty Roster
            </button>
            <button
              type="button"
              id="btnStateRestricted"
              onClick={() => setUiMode('restricted')}
              className={`px-2.5 py-1 rounded-md font-label-sm text-label-sm transition-all ${
                uiMode === 'restricted'
                  ? 'bg-btn-primary text-on-primary shadow-sm'
                  : 'bg-surface-card hover:bg-surface-card/90 text-text-secondary'
              }`}
            >
              Restricted Viewer
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span>RBAC Policy: Enterprise V3</span>
          </div>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="overflow-y-auto flex-1 px-space-xl py-space-md space-y-space-lg text-left">
          {/* 2. FAST INVITE BAR (Hidden in restricted view) */}
          {uiMode !== 'restricted' && (
            <section
              id="fastInviteSection"
              className="p-space-md rounded-xl bg-canvas-main flex flex-col gap-space-sm border border-border-subtle"
            >
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-text-primary flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-primary text-[18px]">person_add</span>
                  <span>Invite New Collaborators</span>
                </label>
                <span className="font-label-sm text-label-sm text-text-muted">
                  Domain verified for @acmetech.io & partner portals
                </span>
              </div>
              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-card text-text-primary placeholder:text-text-muted font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm border border-border-subtle"
                    placeholder="Add colleague by email or username (e.g. colleague@acmetech.io)..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <select
                    className="w-full h-10 px-3 pr-8 rounded-lg bg-surface-card text-text-primary font-label-md text-label-md appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer border border-border-subtle"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="developer">Developer</option>
                    <option value="editor">Editor / Maintainer</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 pointer-events-none text-text-muted text-[18px]">
                    expand_more
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="h-10 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isInviting ? 'sync' : 'add'}
                  </span>
                  <span>{isInviting ? 'Inviting...' : '+ Send Invite'}</span>
                </button>
              </form>
              {inviteMessage && (
                <div
                  className={`text-xs px-2 py-1 rounded ${
                    inviteMessage.type === 'error' ? 'bg-red-50 text-severity-blocker' : 'bg-green-50 text-status-resolved'
                  }`}
                >
                  {inviteMessage.text}
                </div>
              )}
            </section>
          )}

          {/* RESTRICTED VIEW BANNER (Only visible in restricted view) */}
          {uiMode === 'restricted' && (
            <div
              id="restrictedViewNotice"
              className="p-space-md rounded-xl bg-canvas-lavender flex items-center gap-space-md border border-primary/20 animate-in fade-in"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md text-text-primary font-semibold">
                  Read-Only Administrative Overview
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary">
                  You are previewing this project as an external Auditor. Member assignments and privilege elevation are
                  managed by Enterprise Project Leads.
                </span>
              </div>
            </div>
          )}

          {/* 3. SEARCH & FILTER CONTROLS */}
          {uiMode !== 'empty' && (
            <div
              id="searchFilterSection"
              className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md"
            >
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  className="w-full h-10 pl-9 pr-14 rounded-lg bg-canvas-main text-text-primary placeholder:text-text-muted font-body-sm text-body-sm focus:outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 shadow-sm border border-border-subtle"
                  placeholder="Search members by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute right-2.5 top-2.5 px-1.5 py-0.5 rounded bg-surface-card text-text-muted font-label-sm text-label-sm shadow-sm flex items-center gap-0.5 border border-border-subtle/50">
                  ⌘K
                </span>
              </div>

              {/* Role Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                {[
                  { id: 'All', label: `All Members (${totalMembersCount})` },
                  { id: 'Engineers', label: 'Engineers (5)' },
                  { id: 'Design', label: 'Design (2)' },
                  { id: 'QA', label: 'QA (2)' },
                  { id: 'Observers', label: 'Observers / Viewers (2)' },
                ].map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setSelectedRoleFilter(rf.id)}
                    className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors ${
                      selectedRoleFilter === rf.id
                        ? 'bg-btn-primary text-on-primary shadow-sm font-semibold'
                        : 'bg-canvas-main hover:bg-canvas-lavender text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. ACTIVE MEMBERS TABLE / LIST */}
          {uiMode !== 'empty' && (
            <div id="membersContainer" className="flex flex-col gap-space-xs">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-space-md py-2 text-text-muted font-label-sm text-label-sm uppercase tracking-wider bg-canvas-main rounded-lg border border-border-subtle/40">
                <div className="col-span-5">Member & Details</div>
                <div className="col-span-3">Assigned Role</div>
                <div className="col-span-3">Access Level & Scope</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* MEMBER 1: Owner / Lead Architect (Immutable) */}
              <div className="grid grid-cols-12 items-center px-space-md py-3.5 rounded-xl bg-canvas-lavender/40 hover:bg-canvas-lavender/70 transition-colors border border-border-subtle/50">
                <div className="col-span-5 flex items-center gap-space-sm min-w-0 pr-2">
                  <div className="relative flex-shrink-0">
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      src={leadOwner.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBloEsAf5NhYOU1kRM2mEtiNVQH6kXs8zEhgNAK6HpW-wKwCWoMqoAPDbGC-IkRYeyEZJXj9klWquwN_nLWchABF-1rWr_5OC98wdw1q0so2l7DHKVnK_GEkLcdIW8kRsgmcHR6LTPnc-8WwP-YJcBX1A-EZcXa2sxO_M4VlJOuyZ9IyULI_7hevsLVoHXE_ESX4SA_PTTGj0UbpHI7Jrl2msHUrBTvBCszkGhe2-Ib'}
                      alt={leadOwner.full_name}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-resolved ring-2 ring-surface-card"></span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-label-lg text-label-lg text-text-primary truncate font-bold">
                        {leadOwner.full_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Owner
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      {leadOwner.email} • {leadOwner.title || 'Lead Architect'}
                    </span>
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-card text-text-primary font-label-md text-label-md shadow-sm border border-border-subtle/60">
                    <span className="material-symbols-outlined text-primary text-[16px]">shield_person</span>
                    <span className="font-semibold">Project Lead</span>
                  </div>
                </div>

                <div className="col-span-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-label-sm text-label-sm text-text-primary font-medium">Full Control</span>
                    <span className="font-body-sm text-body-sm text-text-muted">(Governance, Keys, Budget)</span>
                  </div>
                </div>

                <div className="col-span-1 flex justify-end">
                  <div
                    className="w-8 h-8 rounded-lg bg-canvas-main flex items-center justify-center text-text-muted"
                    title="Immutable Role — Cannot be removed or modified directly"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                </div>
              </div>

              {/* MEMBER ROWS */}
              {filteredMembers.map((member) => {
                const isSelectedForRemoval = memberToRemove?.id === member.id;
                return (
                  <div
                    key={member.id}
                    className={`relative rounded-xl transition-colors border ${
                      isSelectedForRemoval ? 'bg-canvas-main/80 border-error/30' : 'hover:bg-canvas-main border-transparent'
                    }`}
                  >
                    <div className="grid grid-cols-12 items-center px-space-md py-3.5">
                      <div className="col-span-5 flex items-center gap-space-sm min-w-0 pr-2">
                        <div className="relative flex-shrink-0">
                          {member.user?.avatar_url ? (
                            <img
                              className="w-10 h-10 rounded-full object-cover"
                              src={member.user.avatar_url}
                              alt={member.user.full_name}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-canvas-lavender text-primary flex items-center justify-center font-bold">
                              {member.user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-resolved ring-2 ring-surface-card"></span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-lg text-label-lg text-text-primary truncate font-semibold">
                            {member.user?.full_name}
                          </span>
                          <span className="font-body-sm text-body-sm text-text-secondary truncate">
                            {member.user?.email} • {member.user?.title || member.role}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-3">
                        <div className="relative w-44">
                          <select
                            disabled={uiMode === 'restricted'}
                            className="w-full h-8 px-2.5 pr-7 rounded-lg bg-canvas-main hover:bg-surface-card text-text-primary font-label-md text-label-md appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all border border-border-subtle"
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          >
                            <option value="Editor / Maintainer">Editor / Maintainer</option>
                            <option value="Developer">Developer</option>
                            <option value="Admin">Admin</option>
                            <option value="Viewer">Viewer</option>
                            <option value="QA Reviewer / Comment">QA Reviewer / Comment</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-2 top-1.5 pointer-events-none text-text-muted text-[16px]">
                            expand_more
                          </span>
                        </div>
                      </div>

                      <div className="col-span-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-status-wip/10 text-status-wip font-label-sm text-label-sm">
                          {member.access_scope || 'Full Repository Write Access'}
                        </span>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        {uiMode !== 'restricted' && (
                          <button
                            type="button"
                            title="Remove member"
                            onClick={() =>
                              setMemberToRemove(isSelectedForRemoval ? null : member)
                            }
                            className="w-8 h-8 rounded-lg bg-error/10 text-severity-blocker hover:bg-error/20 flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contextual Removal Safeguard Inline Popover */}
                    {isSelectedForRemoval && (
                      <div className="mx-space-md mb-space-md p-space-md rounded-xl bg-surface-card shadow-[0_8px_24px_rgba(20,21,41,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border border-error/20 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex items-start gap-space-sm max-w-xl">
                          <div className="w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[18px]">warning</span>
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="font-label-md text-label-md text-text-primary font-bold">
                              Remove {member.user?.full_name} from {project.name}?
                            </span>
                            <span className="font-body-sm text-body-sm text-text-secondary">
                              Their <strong>assigned tasks</strong> and unmerged prototype reviews in this project will
                              be unassigned automatically. {member.user?.full_name} will lose immediate access to
                              project files.
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-space-sm self-end sm:self-center">
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg bg-canvas-main hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md transition-colors border border-border-subtle"
                            onClick={() => setMemberToRemove(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="h-8 px-3 rounded-lg bg-severity-blocker hover:bg-error text-white font-label-md text-label-md flex items-center gap-1 shadow-sm transition-all"
                            onClick={handleConfirmRemove}
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                            <span>Confirm Remove</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. SPECIMEN B: EMPTY MEMBERS STATE */}
          {uiMode === 'empty' && (
            <div
              id="emptyMembersState"
              className="p-space-2xl rounded-2xl bg-canvas-main flex flex-col items-center justify-center text-center border border-border-subtle animate-in fade-in"
            >
              <div className="w-16 h-16 rounded-2xl bg-canvas-lavender flex items-center justify-center text-primary mb-space-md shadow-sm">
                <span className="material-symbols-outlined text-[32px]">group_off</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-1">
                No additional members assigned yet
              </h3>
              <p className="font-body-md text-body-md text-text-secondary max-w-md mb-space-lg">
                This repository is currently private to Project Lead {leadOwner.full_name}. Invite your engineering,
                product, or QA colleagues using the invite bar above.
              </p>
              <button
                type="button"
                onClick={() => setUiMode('active')}
                className="h-10 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>Invite First Collaborator</span>
              </button>
            </div>
          )}

          {/* 6. PENDING INVITATIONS SECTION */}
          {uiMode !== 'empty' && (
            <div
              id="pendingInvitationsSection"
              className="p-space-md rounded-xl bg-canvas-main flex flex-col gap-space-sm border border-border-subtle"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="font-label-md text-label-md text-text-primary font-bold">
                    Pending Invitations ({invitations.length})
                  </span>
                  <span className="font-body-sm text-body-sm text-text-muted">— Links expire in 7 days</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-status-on-hold/15 text-status-on-hold font-label-sm text-label-sm font-semibold">
                  Awaiting Verification
                </span>
              </div>
              <div className="space-y-space-xs pt-1">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-space-sm rounded-lg bg-surface-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-border-subtle/50"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="w-9 h-9 rounded-full bg-canvas-lavender text-primary flex items-center justify-center font-label-md text-label-md font-bold flex-shrink-0">
                        {inv.email?.slice(0, 2).toUpperCase() || 'IN'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-label-md text-label-md text-text-primary truncate font-medium">
                            {inv.email}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-canvas-lavender text-text-secondary font-label-sm text-label-sm">
                            Role: {inv.role}
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-text-muted">
                          Invited 2 days ago by {leadOwner.full_name}
                        </span>
                      </div>
                    </div>
                    {uiMode !== 'restricted' && (
                      <div className="flex items-center gap-space-xs self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleResendInvite(inv.id)}
                          className="h-8 px-2.5 rounded-lg bg-canvas-main hover:bg-canvas-lavender text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-border-subtle"
                        >
                          <span className="material-symbols-outlined text-[16px]">sync</span>
                          <span>Resend Invite</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="h-8 px-2.5 rounded-lg bg-canvas-main hover:bg-error-container text-text-secondary hover:text-error font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-border-subtle"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          <span>Revoke</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {invitations.length === 0 && (
                  <p className="text-xs text-text-muted py-2">No pending invitations for this project.</p>
                )}
              </div>
            </div>
          )}

          {/* 7. PERMISSION-DENIED / RESTRICTED WARNING NOTICE */}
          <div className="p-space-sm rounded-xl bg-canvas-lavender/60 flex items-center justify-between gap-space-sm border border-border-subtle/40">
            <div className="flex items-center gap-2 text-text-secondary">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              <span className="font-body-sm text-body-sm">
                Project ownership transfer requires <strong>Enterprise Organization Admin</strong> privileges in
                Tronix365 Cloud Console.
              </span>
            </div>
            <a href="#learn-more" className="font-label-sm text-label-sm text-primary hover:underline whitespace-nowrap">
              Learn More
            </a>
          </div>
        </div>

        {/* 8. STICKY MODAL FOOTER */}
        <div className="px-space-xl py-space-md bg-surface-card shadow-[0_-4px_16px_rgba(20,21,41,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-t border-surface-container">
          <div className="flex items-center gap-2">
            <a
              href="#audit-log"
              className="font-label-sm text-label-sm text-text-muted hover:text-primary flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Audit Log • 3 changes today</span>
            </a>
          </div>
          <div className="flex items-center gap-space-sm justify-end">
            <button
              type="button"
              id="footerCancelBtn"
              onClick={onClose}
              className="h-10 px-4 rounded-lg bg-canvas-main hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-colors border border-border-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              id="savePermissionsBtn"
              onClick={handleSavePermissions}
              disabled={isSaving}
              className="h-10 px-5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSaving ? 'progress_activity' : saveSuccess ? 'done_all' : 'check'}
              </span>
              <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Permissions'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageMembersModal;

