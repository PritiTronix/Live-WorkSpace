import React, { useState, useEffect } from 'react';
import { projectsService } from '../../services/projectsService';

const PRESET_ICONS = [
  'rocket_launch',
  'database',
  'shield',
  'dashboard_customize',
  'terminal',
];

const PRESET_COLORS = [
  { name: 'Purple', class: 'bg-btn-primary', ring: 'ring-primary-light' },
  { name: 'Blue', class: 'bg-status-open', ring: 'ring-blue-300' },
  { name: 'Green', class: 'bg-status-resolved', ring: 'ring-emerald-300' },
  { name: 'Orange', class: 'bg-severity-critical', ring: 'ring-amber-300' },
  { name: 'Red', class: 'bg-severity-blocker', ring: 'ring-red-300' },
];

/**
 * CreateProjectModal (Screen 34 - Stitch ID d5318c34aa3543f797b5f0a0dabbafd0)
 * Pixel-accurate modal dialog for creating a workspace project with real API persistence
 */
export const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [name, setName] = useState('Platform Revamp 2.0');
  const [key, setKey] = useState('PLTFRM');
  const [description, setDescription] = useState(
    'Unified redesign of enterprise ticketing pipeline, real-time SLA monitors, and cross-team incident triage hub.'
  );
  const [selectedIcon, setSelectedIcon] = useState('rocket_launch');
  const [selectedColor, setSelectedColor] = useState('bg-btn-primary');
  const [leadId, setLeadId] = useState('usr_01');
  const [users, setUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [timelinePreset, setTimelinePreset] = useState('1 Quarter');
  const [startDate, setStartDate] = useState('2025-12-01');
  const [targetDate, setTargetDate] = useState('2026-03-15');
  const [visibility, setVisibility] = useState('org');
  const [status, setStatus] = useState('Active');
  const [slaTier, setSlaTier] = useState('Standard SaaS Tier 1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [calendarDay, setCalendarDay] = useState(15);

  // Fetch users on open
  useEffect(() => {
    if (isOpen) {
      projectsService
        .getUsers()
        .then((fetchedUsers) => {
          setUsers(fetchedUsers);
          if (fetchedUsers && fetchedUsers.length > 0) {
            // Default selected members: Maya Shah (usr_01), David Kim (usr_02), Sarah Taylor (usr_03), Priya Nair (usr_04)
            const initialAllocated = fetchedUsers.filter((u) =>
              ['usr_01', 'usr_02', 'usr_03', 'usr_04'].includes(u.id)
            );
            setSelectedMembers(initialAllocated.length > 0 ? initialAllocated : [fetchedUsers[0]]);
            setLeadId(fetchedUsers[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to load users for modal:', err);
        });
    }
  }, [isOpen]);

  // Auto-generate project key from name
  const handleNameChange = (val) => {
    setName(val);
    if (val.trim()) {
      const words = val.trim().split(/\s+/);
      let generatedKey = '';
      if (words.length === 1) {
        generatedKey = words[0].replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
      } else {
        generatedKey = words
          .map((w) => w[0])
          .join('')
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 6)
          .toUpperCase();
      }
      setKey(generatedKey || 'PRJ');
    }
  };

  const handleApplyPreset = (preset) => {
    setTimelinePreset(preset);
    const start = new Date(startDate || Date.now());
    const target = new Date(start);
    if (preset === '2 Weeks') {
      target.setDate(target.getDate() + 14);
    } else if (preset === '1 Month') {
      target.setMonth(target.getMonth() + 1);
    } else if (preset === '1 Quarter') {
      target.setMonth(target.getMonth() + 3);
    }
    setTargetDate(target.toISOString().split('T')[0]);
  };

  const handleAddMember = (user) => {
    if (!selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setMemberSearchQuery('');
    setShowMemberDropdown(false);
  };

  const handleRemoveMember = (userId) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== userId));
  };

  const handleSubmit = async (draft = false) => {
    if (!name.trim()) {
      setErrorMsg('Project name is required.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const projectData = {
        name: name.trim(),
        key: key.trim().toUpperCase() || 'PRJ',
        description: description.trim(),
        icon: selectedIcon,
        color: selectedColor,
        visibility: visibility === 'org' ? 'public' : 'private',
        status: draft ? 'Planning' : status,
        sla_tier: slaTier,
        lead_id: leadId,
        start_date: startDate || null,
        target_date: targetDate || null,
        initial_member_ids: selectedMembers.map((m) => m.id),
      };

      const created = await projectsService.createProject(projectData);
      if (onProjectCreated) {
        onProjectCreated(created);
      }
      onClose();
    } catch (err) {
      console.error('Create project error:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to create project. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const leadUser = users.find((u) => u.id === leadId) || users[0] || {
    id: 'usr_01',
    full_name: 'Aarav Mehta',
    email: 'pm@acmetech.io',
    avatar_url:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCe-SbKuUESsousQ9i3b_RDVm3cYWNiS_l2pHH9E-gMi2pDrgcNYrEgabY5Gh2utxHJJhLf6wR775B6LJX6jdiM3WiWZ612hrA7-tMdMhMSu7fVPxMlFMJL7edR5yqt0gipkePHd18ngCI8mY7_cJ-9lFUaKz294vaz9qzKJtxY43i2QdRojVKcyqqa4YFhQNpew4f1jyKNJ0rytDk4k5BQi2iK4bZrZXtvHhfp7DdL',
  };

  const suggestedUsers = users.filter(
    (u) =>
      !selectedMembers.some((m) => m.id === u.id) &&
      (memberSearchQuery === '' ||
        u.full_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        u.department?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  return (
    <div
      id="modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-space-md overflow-y-auto bg-on-background/40 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-[700px] my-auto bg-surface-card rounded-xl shadow-2xl flex flex-col max-h-[942px] overflow-hidden border border-border-subtle animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-space-xl pt-space-lg pb-space-md flex items-start justify-between bg-surface-card z-10 shrink-0 border-b border-surface-container">
          <div className="space-y-1 pr-space-md text-left">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-btn-primary"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-btn-primary font-bold">
                New Initiative
              </span>
            </div>
            <h2 id="modal-title" className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
              Create Project
            </h2>
            <p className="font-body-md text-body-md text-text-secondary">
              Initiate a collaborative workspace project, set sprint milestones, and allocate engineering team members.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mx-space-xl mt-space-md p-3 rounded-lg bg-red-50 text-severity-blocker font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form
          className="px-space-xl py-space-md overflow-y-auto space-y-space-xl flex-1 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
        >
          {/* SECTION 1: Basic Information */}
          <section className="space-y-space-md">
            <div className="flex items-center gap-space-xs pb-1 border-b border-surface-container">
              <span className="material-symbols-outlined text-btn-primary text-[18px]">info</span>
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-semibold">Basic Information</h3>
            </div>

            <div className="grid grid-cols-12 gap-space-md">
              {/* Project Name */}
              <div className="col-span-12 sm:col-span-8 space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="project-name" className="font-label-md text-label-md text-text-primary font-medium">
                    Project Name <span className="text-error">*</span>
                  </label>
                  <span className="font-label-sm text-label-sm text-text-muted" id="name-counter">
                    {name.length} / 50
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="project-name"
                    type="text"
                    maxLength={50}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all border border-border-subtle"
                    placeholder="e.g., Platform Revamp 2.0"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                  {name.trim().length > 0 && (
                    <span className="material-symbols-outlined absolute right-3 text-status-resolved text-[18px]">
                      check_circle
                    </span>
                  )}
                </div>
              </div>

              {/* Project Key / Prefix */}
              <div className="col-span-12 sm:col-span-4 space-y-1.5">
                <label htmlFor="project-key" className="font-label-md text-label-md text-text-primary font-medium">
                  Project Key
                </label>
                <div className="relative flex items-center">
                  <input
                    id="project-key"
                    type="text"
                    className="w-full h-10 px-3 rounded-lg bg-canvas-lavender font-label-md text-label-md text-btn-primary tracking-wider uppercase font-semibold cursor-default select-none shadow-sm border border-border-subtle"
                    value={key}
                    readOnly
                  />
                  <span className="absolute right-2 px-1.5 py-0.5 rounded bg-primary-fixed text-primary font-label-sm text-label-sm uppercase font-bold">
                    Auto
                  </span>
                </div>
              </div>

              {/* Project Description */}
              <div className="col-span-12 space-y-1.5">
                <label
                  htmlFor="project-description"
                  className="font-label-md text-label-md text-text-primary font-medium"
                >
                  Project Description
                </label>
                <textarea
                  id="project-description"
                  rows={3}
                  className="w-full p-3 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-sm border border-border-subtle"
                  placeholder="Outline core objectives, high-level scope, deliverable milestones, and key stakeholders..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Project Icon & Color Swatch */}
              <div className="col-span-12 space-y-2">
                <label className="font-label-md text-label-md text-text-primary font-medium">Project Visual Badge</label>
                <div className="flex flex-wrap items-center justify-between gap-space-md p-space-sm rounded-lg bg-canvas-lavender/60 border border-border-subtle/50">
                  {/* Preset Icons */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-sm text-label-sm text-text-secondary mr-1">Icon:</span>
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setSelectedIcon(icon)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          selectedIcon === icon
                            ? 'bg-btn-primary text-on-primary shadow-sm scale-105'
                            : 'bg-surface-card text-text-secondary hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      </button>
                    ))}
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-text-secondary mr-1">Accent:</span>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        aria-label={`${c.name} theme`}
                        onClick={() => setSelectedColor(c.class)}
                        className={`w-6 h-6 rounded-full ${c.class} transition-transform flex items-center justify-center ${
                          selectedColor === c.class ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'hover:scale-105'
                        }`}
                      >
                        {selectedColor === c.class && (
                          <span className="material-symbols-outlined text-[14px] text-white">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Ownership & Team Allocation */}
          <section className="space-y-space-md">
            <div className="flex items-center gap-space-xs pb-1 border-b border-surface-container">
              <span className="material-symbols-outlined text-btn-primary text-[18px]">group_add</span>
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-semibold">Ownership & Team</h3>
            </div>

            <div className="grid grid-cols-12 gap-space-md">
              {/* Lead Project Manager */}
              <div className="col-span-12 space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Lead Project Manager <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="w-full h-11 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
                    <div className="flex items-center gap-space-sm">
                      <img
                        className="w-7 h-7 rounded-full object-cover"
                        src={leadUser.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCe-SbKuUESsousQ9i3b_RDVm3cYWNiS_l2pHH9E-gMi2pDrgcNYrEgabY5Gh2utxHJJhLf6wR775B6LJX6jdiM3WiWZ612hrA7-tMdMhMSu7fVPxMlFMJL7edR5yqt0gipkePHd18ngCI8mY7_cJ-9lFUaKz294vaz9qzKJtxY43i2QdRojVKcyqqa4YFhQNpew4f1jyKNJ0rytDk4k5BQi2iK4bZrZXtvHhfp7DdL'}
                        alt={leadUser.full_name}
                      />
                      <div className="flex items-center gap-2">
                        <select
                          className="font-label-md text-label-md text-text-primary font-semibold bg-transparent outline-none cursor-pointer"
                          value={leadId}
                          onChange={(e) => setLeadId(e.target.value)}
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-text-muted">
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-primary-fixed text-primary font-bold">
                        Owner
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Allocated Contributors Multi-Select & Open Typeahead Dropdown */}
              <div className="col-span-12 space-y-1.5 relative">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Allocated Contributors ({selectedMembers.length} Selected)
                </label>
                <div className="min-h-12 p-1.5 bg-canvas-main rounded-lg flex flex-wrap items-center gap-1.5 shadow-sm border border-border-subtle">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-full bg-surface-card shadow-sm text-text-primary border border-border-subtle/50"
                    >
                      {member.avatar_url ? (
                        <img className="w-5 h-5 rounded-full object-cover" src={member.avatar_url} alt={member.full_name} />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-secondary-container text-secondary flex items-center justify-center font-label-sm text-[10px] font-bold">
                          {member.full_name?.slice(0, 2).toUpperCase() || 'TM'}
                        </span>
                      )}
                      <span className="font-label-sm text-label-sm font-medium">{member.full_name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="hover:text-error ml-0.5 text-text-muted flex items-center"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}

                  {/* Typeahead Search Tag */}
                  <div className="flex items-center px-2 py-1 rounded-lg bg-surface-card text-btn-primary font-label-sm text-label-sm font-semibold shadow-xs border border-border-subtle/40">
                    <span className="material-symbols-outlined text-[16px] mr-1">person_search</span>
                    <input
                      type="text"
                      className="bg-transparent border-0 outline-none w-24 text-text-primary font-body-sm text-body-sm placeholder:text-text-muted"
                      placeholder="Add member..."
                      value={memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setShowMemberDropdown(true);
                      }}
                      onFocus={() => setShowMemberDropdown(true)}
                    />
                  </div>
                </div>

                {/* Open Typeahead State Flyout */}
                {showMemberDropdown && suggestedUsers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-surface-card rounded-lg shadow-xl p-space-sm space-y-1 z-30 border border-border-subtle max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between px-space-xs pb-1 font-label-sm text-label-sm text-text-muted">
                      <span>Suggested Teammates</span>
                      <span>Tronix365 Org</span>
                    </div>
                    {suggestedUsers.slice(0, 5).map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleAddMember(user)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-canvas-lavender cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {user.avatar_url ? (
                            <img className="w-7 h-7 rounded-full object-cover" src={user.avatar_url} alt={user.full_name} />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                              {user.full_name?.slice(0, 2).toUpperCase() || 'U'}
                            </span>
                          )}
                          <div className="flex flex-col text-left">
                            <span className="font-label-md text-label-md text-text-primary font-medium">
                              {user.full_name}
                            </span>
                            <span className="font-body-sm text-body-sm text-text-secondary">
                              {user.department || user.title || user.email}
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-btn-primary text-[18px]">add_circle</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 3: Timeline & Milestones */}
          <section className="space-y-space-md">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-btn-primary text-[18px]">calendar_month</span>
                <h3 className="font-headline-sm text-headline-sm text-text-primary font-semibold">
                  Timeline & Milestones
                </h3>
              </div>
              {/* Preset Quick Selectors */}
              <div className="flex items-center gap-1">
                {['2 Weeks', '1 Month', '1 Quarter'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-2 py-0.5 rounded font-label-sm text-label-sm transition-colors ${
                      timelinePreset === preset
                        ? 'bg-primary-fixed text-primary font-bold'
                        : 'text-text-secondary hover:bg-canvas-lavender'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-space-md">
              {/* Start Date */}
              <div className="col-span-12 sm:col-span-5 space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary font-medium">Start Date</label>
                <div className="h-10 px-3 bg-canvas-main rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
                  <div className="flex items-center gap-2 text-text-primary">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">calendar_today</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent font-label-md text-label-md font-medium text-text-primary outline-none"
                    />
                  </div>
                  <span className="font-label-sm text-label-sm text-text-muted">Sprint 1</span>
                </div>
              </div>

              {/* Target Completion Date (Active State with Calendar View) */}
              <div className="col-span-12 sm:col-span-7 space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary font-medium flex justify-between">
                  <span>
                    Target Completion Date <span className="text-error">*</span>
                  </span>
                  <span className="text-btn-primary font-bold font-label-sm text-label-sm">
                    ~105 Days (15 Sprints)
                  </span>
                </label>
                <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm ring-2 ring-btn-primary/30 border border-border-subtle">
                  <div className="flex items-center gap-2 text-btn-primary">
                    <span className="material-symbols-outlined text-[18px]">event_available</span>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="bg-transparent font-label-md text-label-md font-bold text-btn-primary outline-none cursor-pointer"
                    />
                  </div>
                  <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-status-resolved/15 text-status-resolved font-semibold">
                    Q1 Milestone
                  </span>
                </div>

                {/* Calendar View Subpanel */}
                <div className="mt-2 p-3 bg-surface-card rounded-xl shadow-lg space-y-2.5 border border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md font-bold text-text-primary">March 2026</span>
                    <div className="flex items-center gap-1 text-text-secondary">
                      <button
                        type="button"
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-canvas-lavender"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-canvas-lavender"
                      >
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 text-center font-label-sm text-label-sm text-text-muted">
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                    <span>Su</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center font-body-sm text-body-sm">
                    <span className="py-1 text-text-muted/40">23</span>
                    <span className="py-1 text-text-muted/40">24</span>
                    <span className="py-1 text-text-muted/40">25</span>
                    <span className="py-1 text-text-muted/40">26</span>
                    <span className="py-1 text-text-muted/40">27</span>
                    <span className="py-1 text-text-muted/40">28</span>
                    <span className="py-1 text-text-primary font-medium">1</span>
                    <span className="py-1 text-text-primary">2</span>
                    <span className="py-1 text-text-primary">3</span>
                    <span className="py-1 text-text-primary">4</span>
                    <span className="py-1 text-text-primary">5</span>
                    <span className="py-1 text-text-primary">6</span>
                    <span className="py-1 text-text-secondary">7</span>
                    <span className="py-1 text-text-secondary">8</span>
                    <span className="py-1 text-text-primary">9</span>
                    <span className="py-1 text-text-primary">10</span>
                    <span className="py-1 text-text-primary">11</span>
                    <span className="py-1 text-text-primary">12</span>
                    <span className="py-1 text-text-primary">13</span>
                    <span className="py-1 text-text-secondary">14</span>
                    <div className="relative py-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setCalendarDay(15)}
                        className={`w-7 h-7 rounded-full font-bold flex items-center justify-center shadow-xs transition-colors ${
                          calendarDay === 15 ? 'bg-btn-primary text-on-primary' : 'hover:bg-canvas-lavender text-text-primary'
                        }`}
                      >
                        15
                      </button>
                    </div>
                    <span className="py-1 text-text-primary">16</span>
                    <span className="py-1 text-text-primary">17</span>
                    <span className="py-1 text-text-primary">18</span>
                    <span className="py-1 text-text-primary">19</span>
                    <span className="py-1 text-text-primary">20</span>
                    <span className="py-1 text-text-secondary">21</span>
                    <span className="py-1 text-text-secondary">22</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between font-label-sm text-label-sm border-t border-surface-container">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-status-resolved"></span>
                      <span className="text-text-secondary">Final Launch Target</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTargetDate(new Date().toISOString().split('T')[0])}
                      className="text-btn-primary font-semibold hover:underline"
                    >
                      Set Today
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 4: Visibility & Initial Status */}
          <section className="space-y-space-md">
            <div className="flex items-center gap-space-xs pb-1 border-b border-surface-container">
              <span className="material-symbols-outlined text-btn-primary text-[18px]">lock_open</span>
              <h3 className="font-headline-sm text-headline-sm text-text-primary font-semibold">Access & State</h3>
            </div>

            {/* Radio Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
              {/* Organization Wide */}
              <label
                className={`relative flex items-start gap-space-sm p-space-sm rounded-xl cursor-pointer transition-all border ${
                  visibility === 'org'
                    ? 'bg-canvas-lavender ring-2 ring-btn-primary border-btn-primary'
                    : 'bg-canvas-main hover:bg-canvas-lavender/40 border-border-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="project-visibility"
                  value="org"
                  checked={visibility === 'org'}
                  onChange={() => setVisibility('org')}
                  className="mt-1 text-btn-primary focus:ring-btn-primary"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-btn-primary">public</span>
                    <span className="font-label-md text-label-md text-text-primary font-bold">Organization-wide</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    All active members of Acme Technologies can view, comment, and participate in project tasks.
                  </span>
                </div>
              </label>

              {/* Restricted / Private */}
              <label
                className={`relative flex items-start gap-space-sm p-space-sm rounded-xl cursor-pointer transition-all border ${
                  visibility === 'private'
                    ? 'bg-canvas-lavender ring-2 ring-btn-primary border-btn-primary'
                    : 'bg-canvas-main hover:bg-canvas-lavender/40 border-border-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="project-visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="mt-1 text-btn-primary focus:ring-btn-primary"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">lock</span>
                    <span className="font-label-md text-label-md text-text-primary font-bold">
                      Restricted / Private
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                    Only explicitly assigned contributors, reviewers, and organization managers have access.
                  </span>
                </div>
              </label>
            </div>

            {/* Initial Status Dropdown & SLA Template Preview */}
            <div className="grid grid-cols-12 gap-space-md pt-space-xs">
              <div className="col-span-12 sm:col-span-6 space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary font-medium">
                  Initial Project Workflow Status
                </label>
                <div className="h-10 px-3 bg-surface-card rounded-lg flex items-center justify-between shadow-sm border border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-wip"></span>
                    <select
                      className="font-label-md text-label-md text-btn-primary font-bold bg-transparent outline-none cursor-pointer"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Active">Active Phase</option>
                      <option value="Planning">Planning Phase</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="col-span-12 sm:col-span-6 space-y-1.5">
                <label className="font-label-md text-label-md text-text-primary font-medium">Default SLA Matrix</label>
                <div className="h-10 px-3 bg-canvas-lavender/60 rounded-lg flex items-center justify-between border border-border-subtle/50">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">speed</span>
                    <span className="font-label-md text-label-md text-text-primary">{slaTier}</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-status-resolved font-bold">99.8% Goal</span>
                </div>
              </div>
            </div>
          </section>
        </form>

        {/* Sticky Modal Footer */}
        <div className="px-space-xl py-space-md bg-surface-card border-t border-surface-container flex flex-col gap-2 shrink-0 z-10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Draft Action */}
            <button
              type="button"
              className="h-10 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined text-[18px] text-text-secondary">save</span>
              <span>Save as Draft</span>
            </button>

            {/* Primary Confirmation Actions */}
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                className="h-10 px-4 rounded-lg bg-transparent hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md transition-colors"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 px-5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-lg shadow-btn-primary/25 transition-all disabled:opacity-50"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Creating Project...' : 'Create Project'}</span>
                <span className="material-symbols-outlined text-[18px]">
                  {isSubmitting ? 'sync' : 'arrow_forward'}
                </span>
              </button>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-text-muted text-center sm:text-left">
            Projects can be archived, converted, or modified anytime in Workspace Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;

