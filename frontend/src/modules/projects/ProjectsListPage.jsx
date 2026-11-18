import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsService } from '../../services/projectsService';
import { authService } from '../../services/api';
import Avatar from '../../components/common/Avatar';
import ProjectOptionsMenu from './ProjectOptionsMenu';
import CreateProjectModal from './CreateProjectModal';
import EditProjectModal from './EditProjectModal';
import ManageMembersModal from './ManageMembersModal';

/** Format ISO string → relative label (e.g. "4m ago", "2h ago", "1d ago") */
const formatRelativeTime = (isoString) => {
  if (!isoString) return 'recently';
  const diff = Date.now() - new Date(isoString).getTime();
  if (isNaN(diff) || diff < 0) return 'recently';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

/**
 * ProjectsListPage (Screen 33 - Stitch ID c70f329e8bcd49babdf3589eacbe34a4)
 * Live Workspace Projects Listing Page at /workspace/projects
 */
export const ProjectsListPage = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [leadFilter, setLeadFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('updated_at');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Active contextual menu & modals
  const [activeMenuProjectId, setActiveMenuProjectId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [managingMembersProject, setManagingMembersProject] = useState(null);

  // Filter dropdown toggle states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Current authenticated user role & permission check
  const currentUser = authService.getCurrentUserSync();
  const userRole = (currentUser?.role || '').toLowerCase();
  const canCreateProject = ['owner', 'admin', 'manager', 'lead'].includes(userRole);

  // Keyboard shortcut '/' to focus project search filter (Ctrl+K is reserved for global search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch initial projects & users from FastAPI backend
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const [projData, userData] = await Promise.all([
        projectsService.getProjects({ include_archived: true }),
        projectsService.getUsers(),
      ]);
      setProjects(Array.isArray(projData) ? projData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (err) {
      console.error('Failed to load projects from backend:', err);
      if (!err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setErrorMessage('Cannot reach the server');
      } else if (err.response?.status >= 500) {
        setErrorMessage('Something went wrong');
      } else {
        setErrorMessage(err.response?.data?.detail || err.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Real status options extracted dynamically from projects
  const availableStatuses = useMemo(() => {
    const statuses = new Set();
    projects.forEach((p) => {
      if (p.status) {
        const s = p.status.charAt(0).toUpperCase() + p.status.slice(1).toLowerCase();
        statuses.add(s);
      }
      if (p.is_archived) statuses.add('Archived');
    });
    return ['ALL', ...Array.from(statuses)];
  }, [projects]);

  // Real lead options extracted from projects
  const availableLeads = useMemo(() => {
    const leadIds = new Set(projects.map((p) => p.lead_id).filter(Boolean));
    const matched = users.filter((u) => leadIds.has(u.id));
    return matched.length > 0 ? matched : users;
  }, [projects, users]);

  // Real scope options extracted from project visibility data
  const availableScopes = useMemo(() => {
    const scopes = new Set(projects.map((p) => (p.visibility || '').toLowerCase()).filter(Boolean));
    const opts = [{ id: 'ALL', label: 'All Scopes' }];
    if (scopes.has('organization') || scopes.has('public')) {
      opts.push({ id: 'organization', label: 'Organization' });
    }
    if (scopes.has('restricted') || scopes.has('private')) {
      opts.push({ id: 'restricted', label: 'Restricted' });
    }
    return opts;
  }, [projects]);

  // Filter & Sort Logic
  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = project.name?.toLowerCase().includes(q);
          const matchesDesc = project.description?.toLowerCase().includes(q);
          const matchesKey = project.key?.toLowerCase().includes(q);
          const matchesLead = project.lead?.full_name?.toLowerCase().includes(q);
          if (!matchesName && !matchesDesc && !matchesKey && !matchesLead) return false;
        }

        // Status filter (case-insensitive & format-agnostic)
        if (statusFilter !== 'ALL') {
          const pStatus = (project.status || '').toLowerCase().replace(/[\s_-]/g, '');
          const fStatus = statusFilter.toLowerCase().replace(/[\s_-]/g, '');
          if (fStatus === 'archived') {
            if (!project.is_archived && pStatus !== 'archived') return false;
          } else if (pStatus !== fStatus) {
            return false;
          }
        } else {
          // By default, ALL view displays active (non-archived) projects
          if (project.is_archived) return false;
        }

        // Lead filter
        if (leadFilter !== 'ALL' && project.lead_id !== leadFilter) {
          return false;
        }

        // Scope filter (supports organization/public and restricted/private)
        if (scopeFilter !== 'ALL') {
          const pVis = (project.visibility || '').toLowerCase();
          const fScope = scopeFilter.toLowerCase();
          if ((fScope === 'public' || fScope === 'organization') && pVis !== 'organization' && pVis !== 'public') return false;
          if ((fScope === 'private' || fScope === 'restricted') && pVis !== 'restricted' && pVis !== 'private') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'progress') {
          return (b.metrics?.sprint_progress || 0) - (a.metrics?.sprint_progress || 0);
        }
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      });
  }, [projects, searchQuery, statusFilter, leadFilter, scopeFilter, sortBy]);

  const activeProjectsCount = projects.filter((p) => (p.status || '').toLowerCase() === 'active' && !p.is_archived).length;

  const handleProjectCreated = (newProject) => {
    setProjects([newProject, ...projects]);
  };

  const handleProjectUpdated = (updatedProject) => {
    setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
    if (editingProject?.id === updatedProject.id) {
      setEditingProject(updatedProject);
    }
  };

  const handleProjectDeleted = (deletedId) => {
    setProjects(projects.filter((p) => p.id !== deletedId));
  };

  return (
    <div className="flex flex-col w-full text-left">
      {/* 1. Page Header & Key Operations */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md mb-space-lg">
        <div>
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">Projects</h1>
            {!isLoading && !errorMessage && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
                {activeProjectsCount} Active
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-text-secondary mt-1">
            View and manage all your workspace projects, track velocity milestones, and align cross-functional initiatives.
          </p>
        </div>

        {/* Primary Action (RBAC Protected: Owner, Admin, Manager, Lead only) */}
        {!errorMessage && canCreateProject && (
          <div className="flex items-center flex-wrap gap-space-sm">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-[0_2px_10px_rgba(96,64,240,0.28)] transition-all transform active:scale-[0.99] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Create Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Real Error State (Shown ONLY on failure with matching message and Retry) */}
      {errorMessage && (
        <div className="flex flex-col items-center justify-center p-space-2xl bg-surface-card rounded-2xl shadow-sm text-center mb-space-lg border border-border-subtle animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-error-container/40 flex items-center justify-center text-error mb-space-md">
            <span className="material-symbols-outlined text-[36px]">error</span>
          </div>
          <h3 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
            {errorMessage}
          </h3>
          <p className="font-body-md text-body-md text-text-secondary max-w-md mt-2 mb-space-lg">
            Please check your connection or try again.
          </p>
          <button
            type="button"
            onClick={fetchProjects}
            className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Operational Filter / Search / Control Bar */}
      {!isLoading && !errorMessage && (
        <div className="bg-surface-card rounded-xl p-space-md shadow-sm mb-space-lg border border-border-subtle">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-space-md">
          {/* Search Input with '/' shortcut hint (global search owns Ctrl+K) */}
          <div className="relative flex-1 min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full h-10 pl-10 pr-10 rounded-lg bg-canvas-main font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-card focus:ring-2 focus:ring-primary/20 transition-all border border-border-subtle"
              placeholder="Filter projects by title, lead, key result... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-medium text-text-muted bg-surface-card rounded shadow-sm border border-border-subtle">
                /
              </kbd>
            </div>
          </div>

          {/* Filter Droplists */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Status Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="h-10 px-3 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors border border-border-subtle cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-text-muted">adjust</span>
                <span>Status:</span>
                <span className="text-text-primary font-medium">
                  {statusFilter === 'ALL' ? `All (${projects.length})` : statusFilter}
                </span>
                <span className="material-symbols-outlined text-[16px] text-text-muted ml-0.5">expand_more</span>
              </button>
              {showStatusDropdown && (
                <div className="absolute right-0 top-11 w-44 bg-surface-card rounded-xl shadow-xl py-1 z-30 border border-border-subtle max-h-56 overflow-y-auto">
                  {availableStatuses.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center justify-between cursor-pointer"
                    >
                      <span>{st === 'ALL' ? 'All Statuses' : st}</span>
                      {statusFilter === st && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manager / Lead Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLeadDropdown(!showLeadDropdown)}
                className="h-10 px-3 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors border border-border-subtle cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-text-muted">person</span>
                <span>Lead:</span>
                <span className="text-text-primary font-medium truncate max-w-[120px]">
                  {leadFilter === 'ALL' ? 'All Managers' : users.find((u) => u.id === leadFilter)?.full_name || 'Selected'}
                </span>
                <span className="material-symbols-outlined text-[16px] text-text-muted ml-0.5">expand_more</span>
              </button>
              {showLeadDropdown && (
                <div className="absolute right-0 top-11 w-56 bg-surface-card rounded-xl shadow-xl py-1 z-30 border border-border-subtle max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setLeadFilter('ALL');
                      setShowLeadDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center justify-between cursor-pointer"
                  >
                    <span>All Managers</span>
                    {leadFilter === 'ALL' && (
                      <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                    )}
                  </button>
                  {availableLeads.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setLeadFilter(u.id);
                        setShowLeadDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{u.full_name || u.email}</span>
                      {leadFilter === u.id && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility / Scope Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScopeDropdown(!showScopeDropdown)}
                className="h-10 px-3 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors border border-border-subtle cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-text-muted">visibility</span>
                <span>Scope:</span>
                <span className="text-text-primary font-medium">
                  {availableScopes.find((s) => s.id === scopeFilter)?.label || (scopeFilter === 'ALL' ? 'All Scopes' : scopeFilter)}
                </span>
                <span className="material-symbols-outlined text-[16px] text-text-muted ml-0.5">expand_more</span>
              </button>
              {showScopeDropdown && (
                <div className="absolute right-0 top-11 w-48 bg-surface-card rounded-xl shadow-xl py-1 z-30 border border-border-subtle">
                  {availableScopes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setScopeFilter(s.id);
                        setShowScopeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center justify-between cursor-pointer"
                    >
                      <span>{s.label}</span>
                      {scopeFilter === s.id && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="h-10 px-3 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors border border-border-subtle cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-text-muted">sort</span>
                <span>Sort:</span>
                <span className="text-text-primary font-medium">
                  {sortBy === 'updated_at' ? 'Last Updated' : sortBy === 'name' ? 'Name' : 'Sprint Progress'}
                </span>
                <span className="material-symbols-outlined text-[16px] text-text-muted ml-0.5">expand_more</span>
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-11 w-48 bg-surface-card rounded-xl shadow-xl py-1 z-30 border border-border-subtle">
                  {[
                    { id: 'updated_at', label: 'Last Updated' },
                    { id: 'name', label: 'Name (A-Z)' },
                    { id: 'progress', label: 'Sprint Progress' },
                  ].map((so) => (
                    <button
                      key={so.id}
                      type="button"
                      onClick={() => {
                        setSortBy(so.id);
                        setShowSortDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-body-sm text-text-primary hover:bg-canvas-lavender flex items-center justify-between cursor-pointer"
                    >
                      <span>{so.label}</span>
                      {sortBy === so.id && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-canvas-main rounded-lg p-1 ml-auto xl:ml-2 border border-border-subtle">
              <button
                type="button"
                aria-label="Grid View"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-surface-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                type="button"
                aria-label="List View"
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-surface-card text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* 3. REAL SKELETON PREVIEW CONTAINER */}
      {isLoading && !errorMessage && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg mb-space-lg animate-pulse">
          {[1, 2, 3].map((sk) => (
            <div
              key={sk}
              className="bg-surface-card rounded-xl p-space-lg shadow-sm flex flex-col justify-between h-96 border border-border-subtle"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high"></div>
                  <div className="w-20 h-6 rounded-full bg-surface-container-high"></div>
                </div>
                <div className="w-3/4 h-6 rounded bg-surface-container-high"></div>
                <div className="w-full h-12 rounded bg-surface-container"></div>
              </div>
              <div className="space-y-4">
                <div className="w-full h-2 rounded-full bg-surface-container-high"></div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-surface-container-high"></div>
                    <div className="w-7 h-7 rounded-full bg-surface-container-high"></div>
                    <div className="w-7 h-7 rounded-full bg-surface-container-high"></div>
                  </div>
                  <div className="w-24 h-8 rounded-lg bg-surface-container-high"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. REAL EMPTY STATE CONTAINER */}
      {!isLoading && !errorMessage && filteredProjects.length === 0 && (
        <div className="flex flex-col items-center justify-center p-space-2xl bg-surface-card rounded-2xl shadow-sm text-center mb-space-lg border border-border-subtle animate-in fade-in">
          <div className="w-24 h-24 rounded-2xl bg-canvas-lavender flex items-center justify-center text-primary mb-space-md">
            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 48 48">
              <rect className="opacity-40" height="28" rx="4" strokeWidth="2.5" width="32" x="8" y="10"></rect>
              <path d="M16 6V10M32 6V10" strokeLinecap="round" strokeWidth="2.5"></path>
              <path className="opacity-60" d="M8 18H40" strokeWidth="2"></path>
              <circle className="text-primary" cx="24" cy="28" r="4" strokeWidth="2"></circle>
              <path d="M24 22V24M24 32V34M18 28H20M28 28H30" strokeLinecap="round" strokeWidth="2"></path>
            </svg>
          </div>
          <h3 className="font-headline-lg text-headline-lg text-text-primary tracking-tight">No Projects Found</h3>
          <p className="font-body-md text-body-md text-text-secondary max-w-md mt-2 mb-space-lg">
            No projects matched your criteria. You can clear applied filters or spin up a new sprint workspace with your
            team.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setLeadFilter('ALL');
                setScopeFilter('ALL');
              }}
              className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary font-label-md text-label-md cursor-pointer transition-colors"
            >
              Reset Search Filters
            </button>
            {canCreateProject && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Create Your First Project</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. MAIN PROJECTS GRID */}
      {!isLoading && !errorMessage && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg">
          {filteredProjects.map((project) => {
            const isMenuOpen = activeMenuProjectId === project.id;
            const progress = project.metrics?.sprint_progress ?? 0;
            const completedTasks = project.metrics?.completed_tasks ?? project.metrics?.tasks_done ?? 0;
            const totalTasks = project.metrics?.total_tasks ?? 0;
            const openTickets = project.metrics?.open_tickets ?? 0;
            const attentionText = project.metrics?.attention_text || 'Healthy';
            const attentionColor =
              project.metrics?.attention_severity === 'blocker'
                ? 'text-severity-blocker'
                : project.metrics?.attention_severity === 'critical'
                ? 'text-severity-critical'
                : 'text-status-resolved';

            const lead = project.lead;
            const projectMembers = project.members || [];
            const displayedMembers = projectMembers.slice(0, 3);
            const overflowMembers = projectMembers.length - displayedMembers.length;

            return (
              <div
                key={project.id}
                className="relative bg-surface-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group overflow-visible border border-border-subtle"
              >
                {/* Ambient Purple Gradient Accent Stripe */}
                <div className="h-2 w-full bg-gradient-to-r from-primary via-primary-light to-secondary-container rounded-t-2xl"></div>

                <div className="p-space-lg flex-1 flex flex-col">
                  {/* Card Top Bar */}
                  <div className="flex items-start justify-between gap-space-sm mb-space-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-canvas-lavender flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[26px]">
                          {project.icon || 'rocket_launch'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${
                              (project.status || '').toLowerCase() === 'active'
                                ? 'text-status-resolved bg-status-resolved/10'
                                : (project.status || '').toLowerCase() === 'planning'
                                ? 'text-status-open bg-status-open/10'
                                : 'text-status-on-hold bg-status-on-hold/10'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                (project.status || '').toLowerCase() === 'active'
                                  ? 'bg-status-resolved animate-pulse'
                                  : (project.status || '').toLowerCase() === 'planning'
                                  ? 'bg-status-open'
                                  : 'bg-status-on-hold'
                              }`}
                            ></span>
                            {project.status || 'Active'}
                          </span>
                          {project.sla_tier && project.sla_tier !== 'Standard SaaS Tier 1' && (
                            <span className="px-2 py-0.5 rounded-full bg-canvas-lavender text-primary font-label-sm text-label-sm">
                              {project.sla_tier}
                            </span>
                          )}
                        </div>
                        <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight mt-1 group-hover:text-primary transition-colors">
                          {project.name}
                        </h2>
                      </div>
                    </div>

                    {/* Options Menu Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Project actions"
                        onClick={() =>
                          setActiveMenuProjectId(isMenuOpen ? null : project.id)
                        }
                        className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer transition-colors select-none"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>

                      {/* Project Options Menu Component (Screen 36) */}
                      <ProjectOptionsMenu
                        project={project}
                        isOpen={isMenuOpen}
                        onClose={() => setActiveMenuProjectId(null)}
                        onEdit={(p) => setEditingProject(p)}
                        onManageMembers={(p) => setManagingMembersProject(p)}
                        onProjectUpdated={handleProjectUpdated}
                        onProjectDeleted={handleProjectDeleted}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="font-body-sm text-body-sm text-text-secondary line-clamp-2 mb-space-md">
                    {project.description || 'No description provided.'}
                  </p>

                  {/* Lead + Team Pill */}
                  <div className="flex items-center justify-between py-2.5 bg-canvas-main rounded-xl px-3 mb-space-md border border-border-subtle/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar
                          src={lead?.avatar_url}
                          name={lead?.full_name || 'Unassigned'}
                          size="sm"
                        />
                        {lead && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-status-resolved"></span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-label-sm text-text-primary leading-tight font-medium truncate">
                          {lead?.full_name || 'Unassigned'}
                        </span>
                        <span className="font-body-sm text-[10px] text-text-muted leading-tight truncate">
                          {lead?.title || (lead ? 'Project Lead' : 'No Lead Assigned')}
                        </span>
                      </div>
                    </div>

                    {/* Overlapping Avatars: Real members only with exact computed overflow */}
                    <div className="flex items-center -space-x-2 shrink-0">
                      {projectMembers.length > 0 ? (
                        <>
                          {displayedMembers.map((m, idx) => (
                            <div key={m.id || idx} className="relative">
                              <Avatar
                                src={m.user?.avatar_url}
                                name={m.user?.full_name || 'Member'}
                                size="xs"
                                ring="ring-2 ring-surface-card"
                              />
                            </div>
                          ))}
                          {overflowMembers > 0 && (
                            <span className="w-6 h-6 rounded-full bg-canvas-lavender text-primary font-label-sm text-[10px] flex items-center justify-center font-bold ring-2 ring-surface-card">
                              +{overflowMembers}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-text-muted font-body-sm text-[11px] italic">No members</span>
                      )}
                    </div>
                  </div>

                  {/* Operational Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 py-space-sm mb-space-md text-center">
                    <div className="bg-canvas-main rounded-lg p-2 border border-border-subtle/40">
                      <span className="font-label-sm text-label-sm text-text-muted block">Tasks</span>
                      <span className="font-label-md text-label-md font-bold text-text-primary block mt-0.5">
                        {completedTasks} of {totalTasks} done
                      </span>
                    </div>
                    <div className="bg-canvas-main rounded-lg p-2 border border-border-subtle/40">
                      <span className="font-label-sm text-label-sm text-text-muted block">Tickets</span>
                      <span className="font-headline-sm text-headline-sm text-text-primary block mt-0.5">
                        {openTickets} Open
                      </span>
                    </div>
                    <div className="bg-canvas-main rounded-lg p-2 flex flex-col items-center justify-center border border-border-subtle/40">
                      <span className="font-label-sm text-label-sm text-text-muted block">Attention</span>
                      <span className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-bold mt-0.5 ${attentionColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {attentionText}
                      </span>
                    </div>
                  </div>

                  {/* Progress Tracking Bar */}
                  <div className="space-y-1.5 mb-space-md mt-auto">
                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                      <span className="text-text-muted">Sprint Progress</span>
                      <span className="text-primary font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-canvas-lavender overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-light to-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Real Updated x ago computed from updated_at / created_at */}
                <div className="px-space-lg py-3 bg-canvas-main/80 rounded-b-2xl flex items-center justify-between border-t border-border-subtle/50">
                  <span className="flex items-center gap-1.5 text-text-muted font-body-sm text-[11px]">
                    <span className="material-symbols-outlined text-[14px]">update</span>
                    Updated {formatRelativeTime(project.updated_at || project.created_at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/workspace/projects/${project.id}`)}
                    className="h-8 px-3 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Open Project</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Bottom Workspace Analytics & Activity Teaser */}
      <div className="mt-space-xl bg-surface-card rounded-2xl p-space-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md border border-border-subtle">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-canvas-lavender text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">speed</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm text-text-primary">Workspace Velocity Metric</h4>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Overall sprint completion and velocity milestones calculated across all active projects.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => navigate('/workspace/analytics')}
            className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary font-label-md text-label-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">insights</span>
            <span>View Velocity Report</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (projects && projects.length > 0) {
                navigate(`/workspace/projects/${projects[0].id}/timeline`);
              } else {
                navigate('/workspace/tasks');
              }
            }}
            className="h-9 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
            <span>Milestones Roadmap</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      <EditProjectModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onProjectUpdated={handleProjectUpdated}
      />

      <ManageMembersModal
        project={managingMembersProject}
        isOpen={!!managingMembersProject}
        onClose={() => setManagingMembersProject(null)}
        onMembersUpdated={fetchProjects}
      />
    </div>
  );
};

export default ProjectsListPage;
