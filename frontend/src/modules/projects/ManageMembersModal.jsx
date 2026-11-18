import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../services/projectsService';
import { authService } from '../../services/api';
import Avatar from '../../components/common/Avatar';
import {
  PROJECT_ROLES,
  ASSIGNABLE_PROJECT_ROLES,
  getRoleLabel,
  getRoleAccessScope,
} from './constants/projectConstants';

/**
 * ManageMembersModal (Screen 37)
 * Multi-tenant RBAC project membership management:
 * - Real member roster, pending invitations, and dynamic role filter chips
 * - Permissions: Only project lead, org admin, or owner can invite, edit roles, or remove members
 * - Owner/lead cannot be demoted or removed
 */
export const ManageMembersModal = ({ project, isOpen, onClose, onMembersUpdated }) => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  const currentUser = authService.getCurrentUserSync();

  // Permission check: Project lead, Org Owner, or Org Admin can manage members
  const canManage = useMemo(() => {
    if (!currentUser) return false;
    const isLead = project && (currentUser.id === project.lead_id || currentUser.id === project.lead?.id);
    const isOrgAdminOrOwner = ['owner', 'admin'].includes((currentUser.role || '').toLowerCase());
    return Boolean(isLead || isOrgAdminOrOwner);
  }, [currentUser, project]);

  useEffect(() => {
    if (project && isOpen) {
      loadMembersData();
      projectsService.getUsers().then(setUsers).catch(console.error);
    }
  }, [project, isOpen]);

  const loadMembersData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsService.getProjectMembers(project.id);
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('Failed to load project members:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load project members');
    } finally {
      setLoading(false);
    }
  };

  // Derive dynamic role filter chips from real members only
  const roleCounts = useMemo(() => {
    const counts = {};
    members.forEach((m) => {
      const roleKey = (m.role || 'developer').toLowerCase();
      counts[roleKey] = (counts[roleKey] || 0) + 1;
    });
    return counts;
  }, [members]);

  const filterChips = useMemo(() => {
    const chips = [{ id: 'all', label: `All Members (${members.length})` }];
    Object.keys(roleCounts).sort().forEach((roleKey) => {
      chips.push({
        id: roleKey,
        label: `${getRoleLabel(roleKey)} (${roleCounts[roleKey]})`,
      });
    });
    return chips;
  }, [members.length, roleCounts]);

  // Filter members by search text and selected role chip
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch =
        !q ||
        m.user?.full_name?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q);

      if (!nameMatch) return false;

      if (selectedRoleFilter !== 'all') {
        if ((m.role || '').toLowerCase() !== selectedRoleFilter) return false;
      }

      return true;
    });
  }, [members, searchQuery, selectedRoleFilter]);

  if (!isOpen || !project) return null;

  const handleSendInvite = async (e) => {
    e?.preventDefault();
    if (!canManage) return;
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      setInviteMessage(null);

      const existingUser = users.find(
        (u) => u.email?.toLowerCase() === inviteEmail.trim().toLowerCase()
      );

      const payload = {
        user_id: existingUser ? existingUser.id : null,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole.toLowerCase(),
        access_scope: getRoleAccessScope(inviteRole),
      };

      const res = await projectsService.addProjectMember(project.id, payload);

      if (res.invitation) {
        setInvitations((prev) => [...prev, res.invitation]);
        setInviteMessage({ text: `Invitation sent to ${inviteEmail}`, type: 'success' });
      } else {
        setMembers((prev) => [...prev, res]);
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
    if (!canManage) return;
    try {
      const updated = await projectsService.updateProjectMember(project.id, memberId, {
        role: newRole.toLowerCase(),
        access_scope: getRoleAccessScope(newRole),
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const handleConfirmRemove = async () => {
    if (!canManage || !memberToRemove) return;
    try {
      await projectsService.removeProjectMember(project.id, memberToRemove.id);
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      setMemberToRemove(null);
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleResendInvite = async (invitationId) => {
    if (!canManage) return;
    try {
      await projectsService.resendInvitation(project.id, invitationId);
      setInviteMessage({ text: 'Invitation resent successfully.', type: 'success' });
    } catch (err) {
      console.error('Resend invite error:', err);
    }
  };

  const handleRevokeInvite = async (invitationId) => {
    if (!canManage) return;
    try {
      await projectsService.revokeInvitation(project.id, invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
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
      }, 500);
    }, 400);
  };

  return (
    <div
      id="modalOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md md:p-space-xl bg-[#141529]/40 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-surface-card shadow-[0_16px_40px_rgba(20,21,41,0.14),0_4px_16px_rgba(104,72,232,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-border-subtle">
        {/* MODAL HEADER */}
        <div className="px-space-xl pt-space-lg pb-space-md bg-surface-card flex items-start justify-between border-b border-surface-container">
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h2 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
                Manage Project Members
              </h2>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-canvas-lavender text-primary font-label-sm text-label-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>
                  {members.length} {members.length === 1 ? 'Member' : 'Members'} • {invitations.length} Pending
                </span>
              </div>
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

        {/* READ-ONLY NOTICE FOR NON-MANAGERS */}
        {!canManage && (
          <div className="px-space-xl py-2.5 bg-canvas-lavender/60 flex items-center gap-2 border-b border-border-subtle/50 text-left">
            <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
            <span className="font-body-sm text-body-sm text-text-secondary">
              Read-only view: Only the project lead and organization administrators can invite collaborators or modify roles.
            </span>
          </div>
        )}

        {/* MODAL SCROLLABLE BODY */}
        <div className="overflow-y-auto flex-1 px-space-xl py-space-md space-y-space-lg text-left">
          {/* FAST INVITE BAR (Only visible to managers) */}
          {canManage && (
            <section
              id="fastInviteSection"
              className="p-space-md rounded-xl bg-canvas-main flex flex-col gap-space-sm border border-border-subtle"
            >
              <label className="font-label-md text-label-md text-text-primary flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-primary text-[18px]">person_add</span>
                <span>Invite New Collaborators</span>
              </label>

              <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    className="w-full h-10 pl-9 pr-4 rounded-lg bg-surface-card text-text-primary placeholder:text-text-muted font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm border border-border-subtle"
                    placeholder="name@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <select
                    className="w-full h-10 px-3 pr-8 rounded-lg bg-surface-card text-text-primary font-label-md text-label-md appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer border border-border-subtle capitalize"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {ASSIGNABLE_PROJECT_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
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
                  className={`text-xs px-2.5 py-1.5 rounded ${
                    inviteMessage.type === 'error' ? 'bg-error-container text-severity-blocker' : 'bg-status-resolved/10 text-status-resolved'
                  }`}
                >
                  {inviteMessage.text}
                </div>
              )}
            </section>
          )}

          {/* SEARCH & DYNAMIC FILTER CHIPS */}
          {members.length > 0 && (
            <div
              id="searchFilterSection"
              className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md"
            >
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
              </div>

              {/* Real derived Role Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                {filterChips.map((rf) => (
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

          {/* LOADING STATE */}
          {loading && (
            <div className="p-space-2xl text-center flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="mt-3 font-body-sm text-text-secondary">Loading members...</span>
            </div>
          )}

          {/* ERROR STATE */}
          {error && !loading && (
            <div className="p-space-lg rounded-xl bg-error-container/20 border border-error/30 text-center">
              <span className="material-symbols-outlined text-[32px] text-error mb-1">error</span>
              <p className="font-body-md text-text-primary">{error}</p>
              <button
                type="button"
                onClick={loadMembersData}
                className="mt-3 px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle font-label-sm text-label-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* REAL ACTIVE MEMBERS TABLE */}
          {!loading && !error && members.length > 0 && (
            <div id="membersContainer" className="flex flex-col gap-space-xs">
              <div className="grid grid-cols-12 px-space-md py-2 text-text-muted font-label-sm text-label-sm uppercase tracking-wider bg-canvas-main rounded-lg border border-border-subtle/40">
                <div className="col-span-5">Member & Details</div>
                <div className="col-span-3">Assigned Role</div>
                <div className="col-span-3">Access Level & Scope</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {filteredMembers.map((member) => {
                const isOwnerOrLead =
                  (member.role || '').toLowerCase() === 'owner' ||
                  member.user_id === project.lead_id ||
                  member.user_id === project.lead?.id;
                const isSelectedForRemoval = memberToRemove?.id === member.id;

                return (
                  <div
                    key={member.id}
                    className={`relative rounded-xl transition-colors border ${
                      isSelectedForRemoval
                        ? 'bg-canvas-main/80 border-error/30'
                        : isOwnerOrLead
                        ? 'bg-canvas-lavender/30 border-border-subtle/50'
                        : 'hover:bg-canvas-main border-transparent'
                    }`}
                  >
                    <div className="grid grid-cols-12 items-center px-space-md py-3">
                      {/* Avatar & Details */}
                      <div className="col-span-5 flex items-center gap-space-sm min-w-0 pr-2">
                        <div className="relative flex-shrink-0">
                          <Avatar
                            src={member.user?.avatar_url}
                            name={member.user?.full_name || 'Member'}
                            size="lg"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-label-lg text-label-lg text-text-primary truncate font-semibold">
                              {member.user?.full_name || member.user?.email || 'Member'}
                            </span>
                            {isOwnerOrLead && (
                              <span className="px-2 py-0.2 rounded-full bg-primary-fixed text-primary font-label-sm text-[10px] flex items-center gap-0.5 font-bold">
                                <span className="material-symbols-outlined text-[11px]">verified</span>
                                {member.user_id === project.lead_id ? 'Project Lead' : 'Owner'}
                              </span>
                            )}
                          </div>
                          <span className="font-body-sm text-body-sm text-text-secondary truncate">
                            {member.user?.email}
                            {member.user?.title ? ` • ${member.user.title}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Role */}
                      <div className="col-span-3">
                        {isOwnerOrLead ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-card text-text-primary font-label-md text-label-md shadow-sm border border-border-subtle/60">
                            <span className="material-symbols-outlined text-primary text-[16px]">shield_person</span>
                            <span className="font-semibold">{getRoleLabel(member.role)}</span>
                          </div>
                        ) : canManage ? (
                          <div className="relative w-44">
                            <select
                              className="w-full h-8 px-2.5 pr-7 rounded-lg bg-canvas-main hover:bg-surface-card text-text-primary font-label-md text-label-md appearance-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all border border-border-subtle capitalize"
                              value={(member.role || 'developer').toLowerCase()}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            >
                              {ASSIGNABLE_PROJECT_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1.5 pointer-events-none text-text-muted text-[16px]">
                              expand_more
                            </span>
                          </div>
                        ) : (
                          <span className="font-label-md text-label-md text-text-primary">
                            {getRoleLabel(member.role)}
                          </span>
                        )}
                      </div>

                      {/* Access Scope */}
                      <div className="col-span-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-status-wip/10 text-status-wip font-label-sm text-label-sm">
                          {member.access_scope || getRoleAccessScope(member.role)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex justify-end">
                        {isOwnerOrLead ? (
                          <div
                            className="w-8 h-8 rounded-lg bg-canvas-main flex items-center justify-center text-text-muted"
                            title="Owner role is immutable — cannot be demoted or removed"
                          >
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                          </div>
                        ) : canManage ? (
                          <button
                            type="button"
                            title="Remove member"
                            onClick={() => setMemberToRemove(isSelectedForRemoval ? null : member)}
                            className="w-8 h-8 rounded-lg bg-error/10 text-severity-blocker hover:bg-error/20 flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                          </button>
                        ) : null}
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
                              Remove {member.user?.full_name || member.user?.email} from {project.name}?
                            </span>
                            <span className="font-body-sm text-body-sm text-text-secondary">
                              Their assigned tasks in this project will be unassigned. They will lose access to
                              project repositories and discussions.
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

              {filteredMembers.length === 0 && (
                <div className="py-8 text-center text-text-muted font-body-sm">
                  No members matched the filter &ldquo;{searchQuery || selectedRoleFilter}&rdquo;
                </div>
              )}
            </div>
          )}

          {/* EMPTY MEMBERS STATE */}
          {!loading && !error && members.length === 0 && (
            <div
              id="emptyMembersState"
              className="p-space-2xl rounded-2xl bg-canvas-main flex flex-col items-center justify-center text-center border border-border-subtle animate-in fade-in"
            >
              <div className="w-16 h-16 rounded-2xl bg-canvas-lavender flex items-center justify-center text-primary mb-space-md shadow-sm">
                <span className="material-symbols-outlined text-[32px]">group_off</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-1">
                No members assigned yet
              </h3>
              <p className="font-body-md text-body-md text-text-secondary max-w-md mb-space-lg">
                There are no members assigned to this project yet. Use the invite form above to invite collaborators.
              </p>
            </div>
          )}

          {/* PENDING INVITATIONS SECTION */}
          {invitations.length > 0 && (
            <div
              id="pendingInvitationsSection"
              className="p-space-md rounded-xl bg-canvas-main flex flex-col gap-space-sm border border-border-subtle"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-text-primary font-bold">
                  Pending Invitations ({invitations.length})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-status-on-hold/15 text-status-on-hold font-label-sm text-label-sm font-semibold capitalize">
                  Pending
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
                            Role: {getRoleLabel(inv.role)}
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-text-muted">
                          {inv.invited_by?.full_name ? `Invited by ${inv.invited_by.full_name}` : 'Invited'}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-space-xs self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleResendInvite(inv.id)}
                          className="h-8 px-2.5 rounded-lg bg-canvas-main hover:bg-canvas-lavender text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors border border-border-subtle"
                        >
                          <span className="material-symbols-outlined text-[16px]">sync</span>
                          <span>Resend</span>
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
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-space-xl py-space-md bg-surface-card shadow-[0_-4px_16px_rgba(20,21,41,0.04)] flex items-center justify-end gap-space-sm border-t border-surface-container">
          <button
            type="button"
            id="footerCancelBtn"
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-canvas-main hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-colors border border-border-subtle"
          >
            {canManage ? 'Cancel' : 'Close'}
          </button>
          {canManage && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageMembersModal;
