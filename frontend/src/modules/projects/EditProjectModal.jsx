import React, { useState, useEffect } from 'react';
import { projectsService } from '../../services/projectsService';

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
 * Contextual modal for updating existing project configuration, metadata, lead, and access policies
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
      setStartDate(project.start_date || '2025-11-12');
      setTargetDate(project.target_date || '2025-12-15');
      setIsRestricted(project.visibility === 'private');
      setMembers(project.members || []);

      // Fetch users for lead and member options
      projectsService
        .getUsers()
        .then((uList) => setUsers(uList))
        .catch((err) => console.error('Failed to fetch users:', err));
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const leadUser =
    users.find((u) => u.id === leadId) ||
    project.lead || {
      id: 'usr_01',
      full_name: 'Aarav Mehta',
      email: 'aarav@acmetech.io',
      avatar_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDCSsSO9O-YlZhdXyu3ox-84Q3IQ9BUkJ9USRIbzc4orOhRA2PPmOpMekrDAKmWioHsw3P3-FaGTZIche2D8yP6RefNhs0aeyRF88_R9GEnc7F1il3ODSOEqk4narimxEbAoKFnkibIdtPgOutK8IAjuf3hW07t5WWU5awieyWE95Jd_mN288k7kEEK0JWVXB9wMk7TO2JPUboBXmllk5t3ct9y-aAlPo37MLCGkB7g',
    };

  const handleResetForm = () => {
    setName(project.name || '');
    setDescription(project.description || '');
    setStatus(project.status || 'Active');
    setIsRestricted(project.visibility === 'private');
    setIcon(project.icon || 'rocket_launch');
    setColor(project.color || 'bg-primary-container');
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Project name is required.');
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
        lead_id: leadId,
        start_date: startDate || null,
        target_date: targetDate || null,
        visibility: isRestricted ? 'private' : 'public',
      };

      const updated = await projectsService.updateProject(project.id, updatePayload);

      setShowSuccessToast(true);
      if (onProjectUpdated) {
        onProjectUpdated(updated);
      }

      setTimeout(() => {
        setShowSuccessToast(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Save project changes error:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update project.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await projectsService.removeProjectMember(project.id, memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  return (
    <div
      id="modal-scrim"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-inverse-surface/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-4xl max-h-[942px] flex flex-col bg-surface-card rounded-2xl shadow-2xl overflow-hidden transition-transform animate-in fade-in zoom-in-95 duration-200 border border-border-subtle">
        {/* Interactive Top Toast Notification Preview */}
        {showSuccessToast && (
          <div className="absolute top-3 inset-x-8 z-30 transition-all duration-300 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-card shadow-xl border border-border-subtle">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-status-resolved/15 text-status-resolved">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </span>
                <div className="flex flex-col text-left">
                  <span className="font-label-md text-label-md text-text-primary">
                    Project settings updated successfully
                  </span>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    All active sprint boards, access permissions, and roadmap timelines are in sync.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center"
                onClick={() => setShowSuccessToast(false)}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-space-xl pt-space-lg pb-space-md bg-surface-card flex items-start justify-between flex-shrink-0 border-b border-surface-container">
          <div className="flex items-start gap-space-md text-left">
            <div className="relative group">
              <div
                id="project-icon-badge"
                className={`w-12 h-12 rounded-xl text-on-primary flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105 ${color}`}
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                <span className="material-symbols-outlined text-[26px]" id="current-project-icon">
                  {icon}
                </span>
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-card shadow text-primary flex items-center justify-center hover:bg-canvas-lavender"
                title="Change icon and color"
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                <span className="material-symbols-outlined text-[12px]">palette</span>
              </button>
            </div>
            <div className="flex flex-col">
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
          <button
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
            title="Close modal"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Collapsible Color & Icon Customizer Drawer */}
        {showColorPicker && (
          <div className="px-space-xl py-space-sm bg-canvas-lavender flex items-center justify-between text-body-sm border-b border-border-subtle animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-space-md flex-wrap">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">Icon:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
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
                    className={`w-5 h-5 rounded-full ${c} transition-transform ${
                      color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                    }`}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              className="font-label-sm text-label-sm text-primary hover:underline font-semibold"
              onClick={() => setShowColorPicker(false)}
            >
              Done
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mx-space-xl mt-space-md p-3 rounded-lg bg-red-50 text-severity-blocker font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="px-space-xl py-space-md space-y-space-lg overflow-y-auto flex-1 text-left">
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
                  className="w-full h-10 px-3.5 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all border border-border-subtle"
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
              className="w-full p-3 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all resize-none leading-relaxed border border-border-subtle"
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
                    onClick={() => setStatus(st)}
                    className={`py-1.5 px-2 rounded-lg font-label-sm text-label-sm text-center transition-all ${
                      status === st
                        ? 'bg-surface-card shadow-sm text-status-wip font-bold'
                        : 'hover:bg-surface-card/60 text-text-secondary'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Manager Selector Dropdown */}
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-text-primary font-medium">
                Lead Architect / Project Manager
              </label>
              <div className="h-10 px-3 bg-canvas-main hover:bg-canvas-lavender rounded-lg flex items-center justify-between shadow-sm transition-colors border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <img
                    className="w-6 h-6 rounded-full object-cover shadow-sm"
                    src={leadUser.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCSsSO9O-YlZhdXyu3ox-84Q3IQ9BUkJ9USRIbzc4orOhRA2PPmOpMekrDAKmWioHsw3P3-FaGTZIche2D8yP6RefNhs0aeyRF88_R9GEnc7F1il3ODSOEqk4narimxEbAoKFnkibIdtPgOutK8IAjuf3hW07t5WWU5awieyWE95Jd_mN288k7kEEK0JWVXB9wMk7TO2JPUboBXmllk5t3ct9y-aAlPo37MLCGkB7g'}
                    alt={leadUser.full_name}
                  />
                  <select
                    className="font-label-md text-label-md text-text-primary font-semibold bg-transparent outline-none cursor-pointer"
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} {u.id === leadId ? '(Owner)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 text-text-muted">
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
                {members.length > 0 ? members.length : 4} active contributors
              </span>
            </div>
            <div className="p-2.5 bg-canvas-main rounded-xl flex flex-wrap items-center gap-2 border border-border-subtle">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-surface-card rounded-lg shadow-sm border border-border-subtle/50"
                >
                  {member.user?.avatar_url ? (
                    <img
                      className="w-5 h-5 rounded-full object-cover"
                      src={member.user.avatar_url}
                      alt={member.user.full_name}
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-status-open/20 text-status-open flex items-center justify-center font-label-sm text-[10px] font-bold">
                      {member.user?.full_name?.slice(0, 2).toUpperCase() || 'TM'}
                    </span>
                  )}
                  <span className="font-label-md text-label-md text-text-primary">{member.user?.full_name}</span>
                  <span className="font-label-sm text-label-sm text-primary font-medium">
                    {member.role === 'Lead' ? 'Lead' : member.role?.slice(0, 4) || 'Dev'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-text-muted hover:text-text-primary ml-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}

              {/* Add Member Button */}
              <button
                type="button"
                onClick={() => {
                  if (users.length > 0) {
                    const nonMember = users.find((u) => !members.some((m) => m.user_id === u.id));
                    if (nonMember) {
                      projectsService
                        .addProjectMember(project.id, {
                          user_id: nonMember.id,
                          role: 'Developer',
                          access_scope: 'Write Access',
                        })
                        .then((added) => setMembers([...members, added]))
                        .catch(console.error);
                    }
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-card hover:bg-canvas-lavender text-primary font-label-md text-label-md shadow-sm transition-colors border border-border-subtle"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {/* Section 5: Timeline, Dates & Milestone Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md p-space-md bg-canvas-main rounded-xl border border-border-subtle">
            {/* Start Date */}
            <div className="space-y-1">
              <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
                Start Date
              </label>
              <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
                <input
                  type="date"
                  className="font-body-md text-body-md text-text-primary font-medium bg-transparent outline-none w-full"
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
                  className="font-body-md text-body-md text-text-primary font-medium bg-transparent outline-none w-full"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
                <span className="material-symbols-outlined text-text-muted text-[18px]">event</span>
              </div>
            </div>

            {/* Sprint Velocity & Milestone Health Status */}
            <div className="space-y-1 flex flex-col justify-end">
              <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-resolved animate-pulse"></span>
                  <span className="font-label-md text-label-md text-text-primary">Sprint 4/6</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-label-sm text-label-sm font-semibold">
                  4 weeks left
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Access Policies & Visibility Warning Banner */}
          <div className="space-y-space-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="font-label-md text-label-md text-text-primary block font-medium">
                  Project Visibility & Boundary
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary">
                  Determine who can discover and log issues in this project.
                </span>
              </div>
              {/* Segmented Pill Switch */}
              <div className="flex items-center p-1 bg-canvas-main rounded-xl border border-border-subtle">
                <button
                  type="button"
                  id="btn-org-wide"
                  onClick={() => setIsRestricted(false)}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${
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
                  onClick={() => setIsRestricted(true)}
                  className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${
                    isRestricted
                      ? 'bg-surface-card text-primary font-semibold shadow-sm'
                      : 'text-text-secondary'
                  }`}
                >
                  Restricted to selected
                </button>
              </div>
            </div>

            {/* Dynamic Contextual Warning Banner */}
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
                    Changing visibility to <strong>Restricted</strong> will revoke access for{' '}
                    <strong className="text-text-primary">14 workspace contributors</strong> currently following this
                    project and unsubscribe their automated digest triggers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="px-space-xl py-space-md bg-canvas-main flex items-center justify-between flex-shrink-0 border-t border-border-subtle">
          {/* Destructive / Reset Action */}
          <button
            type="button"
            onClick={handleResetForm}
            className="font-label-md text-label-md text-severity-blocker hover:text-severity-blocker/80 flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Discard Changes</span>
          </button>

          {/* Primary Action Group */}
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 px-4 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-md text-label-md shadow-sm transition-colors border border-border-subtle"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 px-5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSaving ? 'sync' : 'check'}
              </span>
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;

