import React, { useState, useEffect, useMemo } from 'react';
import { projectsService } from '../../services/projectsService';
import { authService, resolveApiUrl } from '../../services/api';
import Avatar from '../../components/common/Avatar';
import Modal from '../design-system/components/Modal';

const PRESET_ICONS = ['rocket_launch', 'hub', 'speed', 'terminal', 'database', 'shield'];

const PRESET_COLORS = [
  'bg-primary-container',
  'bg-btn-primary',
  'bg-status-open',
  'bg-status-resolved',
  'bg-severity-critical',
];

const STATUS_OPTIONS = ['Active', 'Planning', 'On Hold', 'Completed', 'Archived'];

/**
 * EditProjectModal (Screen 35 - Stitch ID 941819631ca442bf8a06f4a38272f654)
 * Uses the shared Modal architecture with sticky header/footer and scroll-locked contained body.
 */
export const EditProjectModal = ({ project, isOpen, onClose, onProjectUpdated }) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('rocket_launch');
  const [color, setColor] = useState('bg-primary-container');
  const [status, setStatus] = useState('Active');
  const [leadId, setLeadId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [isRestricted, setIsRestricted] = useState(true);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check RBAC permissions: Only project lead, organization admin, or owner can edit
  const currentUser = authService.getCurrentUserSync();
  const userRole = (currentUser?.role || '').toLowerCase();
  const canEdit = useMemo(() => {
    if (!currentUser || !project) return false;
    const isOrgAdmin = ['owner', 'admin'].includes(userRole);
    const isProjectLead = project.lead_id === currentUser.id;
    return isOrgAdmin || isProjectLead;
  }, [currentUser, userRole, project]);

  // Synchronize modal state with project prop
  useEffect(() => {
    if (project && isOpen) {
      setName(project.name || '');
      setKey(project.key || '');
      setDescription(project.description || '');
      setIcon(project.icon || 'rocket_launch');
      setColor(project.color || 'bg-primary-container');
      setStatus(project.status || 'Active');
      setLeadId(project.lead_id || '');
      setStartDate(project.start_date ? project.start_date.slice(0, 10) : '');
      setTargetDate(project.target_date ? project.target_date.slice(0, 10) : '');
      setIsRestricted(project.visibility === 'private' || project.visibility === 'restricted');
      setMembers(project.members || []);
      setErrorMsg('');

      // Fetch users for lead and member options
      projectsService
        .getUsers()
        .then((uList) => setUsers(Array.isArray(uList) ? uList : []))
        .catch((err) => console.error('Failed to fetch users:', err));
    }
  }, [project, isOpen]);

  // Detect unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!project) return false;
    const initialStart = project.start_date ? project.start_date.slice(0, 10) : '';
    const initialTarget = project.target_date ? project.target_date.slice(0, 10) : '';
    const initialRestricted = project.visibility === 'private' || project.visibility === 'restricted';

    return (
      name !== (project.name || '') ||
      description !== (project.description || '') ||
      icon !== (project.icon || 'rocket_launch') ||
      color !== (project.color || 'bg-primary-container') ||
      status !== (project.status || 'Active') ||
      leadId !== (project.lead_id || '') ||
      startDate !== initialStart ||
      targetDate !== initialTarget ||
      isRestricted !== initialRestricted
    );
  }, [project, name, description, icon, color, status, leadId, startDate, targetDate, isRestricted]);

  // Real duration and remaining time calculations
  const { durationLabel, remainingLabel, remainingBadgeStyle, isInvalidRange } = useMemo(() => {
    if (!startDate && !targetDate) {
      return { durationLabel: 'No timeline set', remainingLabel: '', remainingBadgeStyle: '', isInvalidRange: false };
    }

    let isInvalid = false;
    let dur = '';
    let rem = '';
    let badgeStyle = 'bg-status-resolved/15 text-status-resolved font-semibold';

    if (startDate && targetDate) {
      const start = new Date(startDate);
      const end = new Date(targetDate);
      if (end < start) {
        isInvalid = true;
      } else {
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        dur = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
      }
    }

    if (targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const diffRemaining = Math.round((target - today) / (1000 * 60 * 60 * 24));

      if (diffRemaining < 0) {
        rem = 'Overdue';
        badgeStyle = 'bg-severity-blocker/15 text-severity-blocker font-bold';
      } else if (diffRemaining === 0) {
        rem = 'Ends today';
        badgeStyle = 'bg-status-on-hold/15 text-status-on-hold font-semibold';
      } else if (diffRemaining === 1) {
        rem = 'Ends in 1 day';
        badgeStyle = 'bg-status-resolved/15 text-status-resolved font-semibold';
      } else {
        rem = `Ends in ${diffRemaining} days`;
        badgeStyle = 'bg-status-resolved/15 text-status-resolved font-semibold';
      }
    }

    return {
      durationLabel: dur || (startDate ? 'Start scheduled' : 'Timeline active'),
      remainingLabel: rem,
      remainingBadgeStyle: badgeStyle,
      isInvalidRange: isInvalid,
    };
  }, [startDate, targetDate]);

  if (!isOpen || !project) return null;

  const leadUser = users.find((u) => u.id === leadId) || project.lead || null;

  const handleResetForm = () => {
    setName(project.name || '');
    setDescription(project.description || '');
    setStatus(project.status || 'Active');
    setLeadId(project.lead_id || '');
    setStartDate(project.start_date ? project.start_date.slice(0, 10) : '');
    setTargetDate(project.target_date ? project.target_date.slice(0, 10) : '');
    setIsRestricted(project.visibility === 'private' || project.visibility === 'restricted');
    setIcon(project.icon || 'rocket_launch');
    setColor(project.color || 'bg-primary-container');
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!canEdit) {
      setErrorMsg('You do not have permission to edit this project.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Project name is required.');
      return;
    }

    if (startDate && targetDate && new Date(targetDate) < new Date(startDate)) {
      setErrorMsg('Expected end date cannot be before start date.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');

      const updatePayload = {
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        status,
        lead_id: leadId || null,
        start_date: startDate || null,
        target_date: targetDate || null,
        visibility: isRestricted ? 'restricted' : 'organization',
      };

      const updated = await projectsService.updateProject(project.id, updatePayload);

      setShowSuccessToast(true);
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }

      setTimeout(() => {
        setShowSuccessToast(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Save project changes error:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!canEdit) return;
    try {
      await projectsService.removeProjectMember(project.id, memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // Sticky Modal Footer Component
  const modalFooter = (
    <div className="w-full flex items-center justify-between">
      <button
        type="button"
        onClick={handleResetForm}
        disabled={!hasUnsavedChanges || isSaving || !canEdit}
        className="font-label-md text-label-md text-severity-blocker hover:text-severity-blocker/80 flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
        <span>Discard Changes</span>
      </button>

      <div className="flex items-center gap-space-sm">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="h-10 px-4 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-md text-label-md shadow-sm transition-colors border border-border-subtle cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !canEdit || isInvalidRange}
          className="h-10 px-5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isSaving ? 'sync' : 'check'}
          </span>
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      hasUnsavedChanges={hasUnsavedChanges}
      footer={modalFooter}
    >
      <div className="flex flex-col gap-space-lg text-left">
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="p-3 rounded-xl bg-status-resolved/10 border border-status-resolved/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <span className="material-symbols-outlined text-status-resolved text-[20px]">verified</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-text-primary font-bold">
                Project settings updated successfully
              </span>
              <span className="font-body-sm text-body-sm text-text-secondary">
                Configuration and timelines have been synchronized.
              </span>
            </div>
          </div>
        )}

        {/* Read-Only Banner for Unauthorized Users */}
        {!canEdit && (
          <div className="p-3.5 rounded-xl bg-status-on-hold/10 flex items-center gap-3 border border-status-on-hold/20 text-status-on-hold">
            <span className="material-symbols-outlined text-[20px]">lock</span>
            <span className="font-body-sm text-body-sm text-text-primary">
              Only the <strong>Project Lead</strong>, <strong>Organization Admin</strong>, or <strong>Owner</strong> can modify these settings.
            </span>
          </div>
        )}

        {/* Header Preview & Icon Selector */}
        <div className="flex items-start justify-between gap-space-md pb-space-sm border-b border-border-subtle">
          <div className="flex items-start gap-space-md">
            <div className="relative group">
              <div
                id="project-icon-badge"
                className={`w-12 h-12 rounded-xl text-on-primary flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105 ${color}`}
                onClick={() => canEdit && setShowColorPicker(!showColorPicker)}
              >
                <span className="material-symbols-outlined text-[26px]" id="current-project-icon">
                  {icon}
                </span>
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-card shadow text-primary flex items-center justify-center hover:bg-canvas-lavender cursor-pointer"
                  title="Change icon and color"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                >
                  <span className="material-symbols-outlined text-[12px]">palette</span>
                </button>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-lg text-headline-lg text-text-primary">
                  Edit Project — {name || project.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-status-wip/10 text-status-wip font-label-sm text-label-sm">
                  Active Sprint
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Update project configuration, assignees, access policies, and sprint dates.
              </p>
            </div>
          </div>
        </div>

        {/* Collapsible Color & Icon Customizer */}
        {showColorPicker && canEdit && (
          <div className="p-space-md bg-canvas-lavender rounded-xl flex items-center justify-between text-body-sm border border-border-subtle animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-space-md flex-wrap">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">Icon:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-colors cursor-pointer ${
                      icon === i ? 'bg-primary text-white' : 'bg-surface-card hover:bg-primary-fixed text-text-secondary'
                    }`}
                    onClick={() => setIcon(i)}
                  >
                    <span className="material-symbols-outlined text-[16px]">{i}</span>
                  </button>
                ))}
              </div>
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider ml-space-sm">
                Palette:
              </span>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-5 h-5 rounded-full ${c} transition-transform cursor-pointer ${
                      color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                    }`}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="font-label-sm text-label-sm text-primary hover:underline font-semibold cursor-pointer"
              onClick={() => setShowColorPicker(false)}
            >
              Done
            </button>
          </div>
        )}

        {/* Error Message */}
        {(errorMsg || isInvalidRange) && (
          <div className="p-3 rounded-lg bg-red-50 text-severity-blocker font-body-sm text-body-sm flex items-center gap-2 border border-red-200">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{isInvalidRange ? 'Expected end date cannot be before start date.' : errorMsg}</span>
          </div>
        )}

        {/* Section 1: Identification & Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Project Name (2 Cols) */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="project-name"
                className="font-label-md text-label-md text-text-primary flex items-center gap-1"
              >
                Project Name <span className="text-severity-blocker">*</span>
              </label>
              <span className="font-label-sm text-label-sm text-text-muted">{name.length} / 50 characters</span>
            </div>
            <div className="relative flex items-center">
              <input
                id="project-name"
                type="text"
                maxLength={50}
                disabled={!canEdit}
                className="w-full h-10 px-3.5 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all border border-border-subtle disabled:opacity-60 disabled:cursor-not-allowed"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {name.trim().length > 0 && (
                <span className="material-symbols-outlined absolute right-3 text-status-resolved text-[18px]">
                  check_circle
                </span>
              )}
            </div>
          </div>

          {/* Project Key (Locked / Read-Only 1 Col) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-text-primary flex items-center gap-1">
                Project Key
                <span
                  className="material-symbols-outlined text-[14px] text-text-muted"
                  title="Key cannot be modified after project creation to prevent broken permalinks."
                >
                  info
                </span>
              </label>
              <span className="font-label-sm text-label-sm text-text-muted">Immutable</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                className="w-full h-10 pl-3.5 pr-9 rounded-lg bg-canvas-lavender font-mono text-body-md text-text-secondary cursor-not-allowed select-none focus:outline-none shadow-sm border border-border-subtle"
                value={key}
              />
              <span className="material-symbols-outlined absolute right-3 text-text-muted text-[18px]">lock</span>
            </div>
          </div>
        </div>

        {/* Section 2: Project Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="project-desc" className="font-label-md text-label-md text-text-primary">
              Project Description & Objectives
            </label>
            <span className="font-label-sm text-label-sm text-text-muted">Markdown supported</span>
          </div>
          <textarea
            id="project-desc"
            rows={3}
            disabled={!canEdit}
            className="w-full p-3 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all resize-none leading-relaxed border border-border-subtle disabled:opacity-60 disabled:cursor-not-allowed"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Section 3: Status & Management Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {/* Project Status Pill Selector */}
          <div className="space-y-2">
            <label className="font-label-md text-label-md text-text-primary font-medium">Lifecycle Status</label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-canvas-main rounded-xl border border-border-subtle">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setStatus(st)}
                  className={`py-1.5 px-2 rounded-lg font-label-sm text-label-sm text-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                    status.toLowerCase() === st.toLowerCase()
                      ? 'bg-surface-card shadow-sm text-status-wip font-bold'
                      : 'hover:bg-surface-card/60 text-text-secondary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Project Manager Selector Dropdown (Stitch Prompt 20 label: Lead Architect / Project Manager) */}
          <div className="space-y-2">
            <label className="font-label-md text-label-md text-text-primary font-medium">
              Lead Architect / Project Manager
            </label>
            <div className="h-10 px-3 bg-canvas-main hover:bg-canvas-lavender rounded-lg flex items-center justify-between shadow-sm transition-colors border border-border-subtle">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={leadUser?.avatar_url}
                  name={leadUser?.full_name || 'Project Lead'}
                  size="xs"
                />
                <select
                  disabled={!canEdit}
                  className="font-label-md text-label-md text-text-primary font-semibold bg-transparent outline-none cursor-pointer disabled:cursor-not-allowed"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                >
                  <option value="">Select Project Lead</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} {u.id === leadId ? '(Lead)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1 text-text-muted pointer-events-none">
                <span className="font-label-sm text-label-sm">Change</span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Team Allocation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-label-md text-label-md text-text-primary font-medium">
              Team Members & Collaborators
            </label>
            <span className="font-label-sm text-label-sm text-text-secondary">
              {members.length} active contributor{members.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="p-2.5 bg-canvas-main rounded-xl flex flex-wrap items-center gap-2 border border-border-subtle">
            {members.map((member) => {
              // Full role name without truncating (e.g. 'Owner', 'Developer', 'Lead')
              const rawRole = member.role || 'Member';
              const fullRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-surface-card rounded-lg shadow-sm border border-border-subtle/50"
                >
                  {member.user?.avatar_url ? (
                    <img
                      className="w-5 h-5 rounded-full object-cover"
                      src={resolveApiUrl(member.user.avatar_url)}
                      alt={member.user.full_name || 'Member'}
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-status-open/20 text-status-open flex items-center justify-center font-label-sm text-[10px] font-bold">
                      {member.user?.full_name?.slice(0, 2).toUpperCase() || 'TM'}
                    </span>
                  )}
                  <span className="font-label-md text-label-md text-text-primary">{member.user?.full_name || 'User'}</span>
                  <span className="font-label-sm text-label-sm text-primary font-medium px-1 py-0.5 rounded bg-primary-fixed/40">
                    {fullRole}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-text-muted hover:text-text-primary ml-0.5 cursor-pointer"
                      title="Remove member"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Member Button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (users.length > 0) {
                    const nonMember = users.find((u) => !members.some((m) => m.user_id === u.id));
                    if (nonMember) {
                      projectsService
                        .addProjectMember(project.id, {
                          user_id: nonMember.id,
                          role: 'developer',
                          access_scope: 'Write Access',
                        })
                        .then((added) => setMembers([...members, added]))
                        .catch(console.error);
                    }
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card hover:bg-canvas-lavender text-primary font-label-md text-label-md shadow-sm transition-colors border border-border-subtle cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 5: Timeline, Dates & Real Computed Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md p-space-md bg-canvas-main rounded-xl border border-border-subtle">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Start Date
            </label>
            <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
              <input
                type="date"
                disabled={!canEdit}
                className="font-body-md text-body-md text-text-primary font-medium bg-transparent outline-none w-full cursor-pointer disabled:cursor-not-allowed"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="material-symbols-outlined text-text-muted text-[18px]">calendar_today</span>
            </div>
          </div>

          {/* Expected End Date */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Expected End Date
            </label>
            <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
              <input
                type="date"
                disabled={!canEdit}
                className="font-body-md text-body-md text-text-primary font-medium bg-transparent outline-none w-full cursor-pointer disabled:cursor-not-allowed"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <span className="material-symbols-outlined text-text-muted text-[18px]">event</span>
            </div>
          </div>

          {/* Real Computed Duration & Remaining Time */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Timeline Status
            </label>
            <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isInvalidRange ? 'bg-severity-blocker' : 'bg-status-resolved'}`}></span>
                <span className="font-label-md text-label-md text-text-primary font-medium">
                  {durationLabel}
                </span>
              </div>
              {remainingLabel && (
                <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm ${remainingBadgeStyle}`}>
                  {remainingLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 6: Access Policies & Visibility Boundary */}
        <div className="space-y-space-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-label-md text-label-md text-text-primary block font-medium">
                Project Visibility & Boundary
              </span>
              <span className="font-body-sm text-body-sm text-text-secondary">
                Determine who can discover and collaborate on this project.
              </span>
            </div>
            {/* Segmented Pill Switch */}
            <div className="flex items-center p-1 bg-canvas-main rounded-xl border border-border-subtle">
              <button
                type="button"
                id="btn-org-wide"
                disabled={!canEdit}
                onClick={() => setIsRestricted(false)}
                className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all cursor-pointer disabled:cursor-not-allowed ${
                  !isRestricted
                    ? 'bg-surface-card text-primary font-semibold shadow-sm'
                    : 'text-text-secondary'
                }`}
              >
                Organization-wide
              </button>
              <button
                type="button"
                id="btn-restricted"
                disabled={!canEdit}
                onClick={() => setIsRestricted(true)}
                className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all cursor-pointer disabled:cursor-not-allowed ${
                  isRestricted
                    ? 'bg-surface-card text-primary font-semibold shadow-sm'
                    : 'text-text-secondary'
                }`}
              >
                Restricted to selected
              </button>
            </div>
          </div>

          {/* Contextual Warning Banner */}
          {isRestricted && (
            <div
              id="visibility-warning"
              className="p-3.5 rounded-xl bg-status-on-hold/10 flex items-start gap-3 border border-status-on-hold/20 animate-in fade-in duration-150"
            >
              <span className="material-symbols-outlined text-status-on-hold text-[20px] flex-shrink-0 mt-0.5">
                warning
              </span>
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md text-text-primary font-bold">
                  Access Impact Warning
                </span>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  Restricting project visibility will limit access to assigned members only. Other organization members will not be able to discover or view tasks.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditProjectModal;
