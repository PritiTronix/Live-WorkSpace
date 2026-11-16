import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { searchService } from '../../services/api';

/**
 * Builds the canonical path for an entity within the workspace.
 * Reuses existing routes defined in routes/index.jsx.
 */
export const buildEntityPath = (item) => {
  if (!item) return null;
  const type = item.entityType || item.type;
  switch (type) {
    case 'project':
    case 'projects':
      return item.id ? `/workspace/projects/${item.id}` : '/workspace/projects';
    case 'ticket':
    case 'tickets':
      return item.id ? `/workspace/tickets/${item.id}` : '/workspace/tickets';
    case 'task':
    case 'tasks':
      return '/workspace/tasks';
    case 'employee':
    case 'employees':
    case 'user':
    case 'users':
      return '/workspace/members';
    case 'comment':
    case 'comments':
      if (item.target_type === 'ticket' && item.target_id) {
        return `/workspace/tickets/${item.target_id}`;
      }
      if (item.target_type === 'discussion' && item.target_id) {
        return `/workspace/discussions/${item.target_id}`;
      }
      if (item.target_type === 'task') {
        return '/workspace/tasks';
      }
      return null;
    default:
      return null;
  }
};

/**
 * Safely highlights matching text without using dangerouslySetInnerHTML.
 */
export const HighlightText = ({ text = '', query = '' }) => {
  if (!text) return null;
  const str = String(text);
  const q = (query || '').trim();
  if (!q || q.length < 2) return <>{str}</>;

  const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = str.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={index} className="bg-primary-container/30 text-primary font-semibold rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'projects', label: 'Projects' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'employees', label: 'Employees' },
  { id: 'comments', label: 'Comments' },
];

const getSeverityConfig = (severity) => {
  const s = (severity || 'major').toLowerCase();
  switch (s) {
    case 'blocker':
      return {
        badge: 'bg-[#F55354]/15 text-severity-blocker',
        dot: 'bg-severity-blocker',
        label: 'Blocker',
      };
    case 'critical':
      return {
        badge: 'bg-[#F8A040]/15 text-severity-critical',
        dot: 'bg-severity-critical',
        label: 'Critical',
      };
    case 'minor':
      return {
        badge: 'bg-surface-container text-text-secondary',
        dot: 'bg-text-muted',
        label: 'Minor',
      };
    default:
      return {
        badge: 'bg-[#F8C048]/15 text-[#B88714]',
        dot: 'bg-severity-major',
        label: 'Major',
      };
  }
};

const getStatusConfig = (status) => {
  const st = (status || '').toLowerCase().replace(/\s+/g, '_');
  switch (st) {
    case 'open':
      return { badge: 'bg-[rgba(56,136,248,0.12)] text-status-open', label: 'Open' };
    case 'wip':
    case 'in_progress':
      return { badge: 'bg-[rgba(104,72,232,0.12)] text-status-wip', label: 'In Progress' };
    case 'resolved':
    case 'done':
    case 'completed':
      return { badge: 'bg-[rgba(40,192,120,0.14)] text-status-resolved', label: 'Resolved' };
    case 'on_hold':
      return { badge: 'bg-status-on-hold/15 text-status-on-hold', label: 'On Hold' };
    case 'closed':
    case 'cancelled':
      return { badge: 'bg-surface-container text-text-muted', label: 'Closed' };
    default:
      return { badge: 'bg-surface-container text-text-secondary', label: status || 'Active' };
  }
};

export const GlobalSearchOverlay = ({ isOpen, onClose, onSelectResult }) => {
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);

  const [results, setResults] = useState({
    tickets: [],
    projects: [],
    tasks: [],
    employees: [],
    comments: [],
  });

  const [counts, setCounts] = useState({
    all: 0,
    tickets: 0,
    projects: 0,
    tasks: 0,
    employees: 0,
    comments: 0,
  });

  const [recentSearches, setRecentSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load recent searches on overlay open
  const loadRecentSearches = useCallback(async () => {
    const list = await searchService.getRecentSearches();
    if (Array.isArray(list)) {
      setRecentSearches(list);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      loadRecentSearches();

      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);

      return () => {
        document.body.style.overflow = originalOverflow;
        if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen, loadRecentSearches]);

  // Execute live search with cancellation of stale requests
  const performSearch = useCallback(
    async (searchTerm, category) => {
      const trimmed = searchTerm.trim();
      if (trimmed.length < 2) {
        setResults({ tickets: [], projects: [], tasks: [], employees: [], comments: [] });
        setCounts({ all: 0, tickets: 0, projects: 0, tasks: 0, employees: 0, comments: 0 });
        setSelectedItem(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const data = await searchService.search(trimmed, category, {
          signal: abortControllerRef.current.signal,
          limit: 20,
        });

        if (data) {
          setResults({
            tickets: data.tickets || [],
            projects: data.projects || [],
            tasks: data.tasks || [],
            employees: data.employees || [],
            comments: data.comments || [],
          });
          if (data.counts) {
            setCounts(data.counts);
          }
          setHighlightedIndex(0);
        }
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') {
          return;
        }
        console.error('Spotlight search request failed:', err);
        setError(err.response?.data?.error?.message || 'Search service unavailable. Please retry.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounced search query trigger (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, activeCategory);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, activeCategory, performSearch]);

  // Visible items based on activeCategory
  const visibleItems = useMemo(() => {
    const items = [];
    if (activeCategory === 'all' || activeCategory === 'tickets') {
      (results.tickets || []).forEach((t) => items.push({ ...t, entityType: 'ticket' }));
    }
    if (activeCategory === 'all' || activeCategory === 'projects') {
      (results.projects || []).forEach((p) => items.push({ ...p, entityType: 'project' }));
    }
    if (activeCategory === 'all' || activeCategory === 'tasks') {
      (results.tasks || []).forEach((tk) => items.push({ ...tk, entityType: 'task' }));
    }
    if (activeCategory === 'all' || activeCategory === 'employees') {
      (results.employees || []).forEach((e) => items.push({ ...e, entityType: 'employee' }));
    }
    if (activeCategory === 'all' || activeCategory === 'comments') {
      (results.comments || []).forEach((c) => items.push({ ...c, entityType: 'comment' }));
    }
    return items;
  }, [results, activeCategory]);

  // Update selectedItem to match highlighted item or manual selection
  useEffect(() => {
    if (visibleItems.length > 0) {
      const current = visibleItems[highlightedIndex] || visibleItems[0];
      setSelectedItem(current);
    } else {
      setSelectedItem(null);
    }
  }, [visibleItems, highlightedIndex]);

  const handleOpenItem = useCallback(
    (item) => {
      if (!item) return;
      if (query.trim().length >= 2) {
        searchService.saveRecentSearch(query.trim());
      }
      const path = buildEntityPath(item);
      onSelectResult?.({ ...item, route: path });
      onClose?.();
      if (path) {
        navigate(path);
      }
    },
    [query, navigate, onClose, onSelectResult]
  );

  const handleCopyLink = useCallback((item) => {
    if (!item) return;
    const path = buildEntityPath(item);
    if (path) {
      const fullUrl = `${window.location.origin}${path}`;
      navigator.clipboard?.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }, []);

  const handleClearRecent = useCallback(
    async (termToRemove) => {
      await searchService.clearRecentSearches(termToRemove);
      if (termToRemove) {
        setRecentSearches((prev) => prev.filter((t) => t !== termToRemove));
      } else {
        setRecentSearches([]);
      }
    },
    []
  );

  // Keyboard navigation: arrows, Enter, Tab (cycle categories), Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = CATEGORY_TABS.findIndex((tab) => tab.id === activeCategory);
        const direction = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + direction + CATEGORY_TABS.length) % CATEGORY_TABS.length;
        setActiveCategory(CATEGORY_TABS[nextIndex].id);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (visibleItems.length > 0 ? (prev + 1) % visibleItems.length : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (visibleItems.length > 0 ? (prev - 1 + visibleItems.length) % visibleItems.length : 0));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (visibleItems.length > 0 && highlightedIndex >= 0) {
          handleOpenItem(visibleItems[highlightedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeCategory, visibleItems, highlightedIndex, handleOpenItem, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const totalResultsCount = visibleItems.length;
  const hasResults = totalResultsCount > 0;
  const showTickets = (activeCategory === 'all' || activeCategory === 'tickets') && results.tickets?.length > 0;
  const showProjects = (activeCategory === 'all' || activeCategory === 'projects') && results.projects?.length > 0;
  const showTasks = (activeCategory === 'all' || activeCategory === 'tasks') && results.tasks?.length > 0;
  const showEmployees = (activeCategory === 'all' || activeCategory === 'employees') && results.employees?.length > 0;
  const showComments = (activeCategory === 'all' || activeCategory === 'comments') && results.comments?.length > 0;

  const inspectorPath = buildEntityPath(selectedItem);

  const overlayContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 z-50 bg-[#141529]/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 md:pt-8 overflow-y-auto"
    >
      {/* COMMAND PALETTE CONTAINER */}
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl bg-surface-card rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* TOP AMBIENT HIGHLIGHT */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-primary to-primary-light"></div>

        {/* SEARCH BAR HEADER */}
        <div className="p-space-md bg-surface-card shadow-sm border-b border-border-subtle">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-primary-container">
              <span className="material-symbols-outlined text-[24px]">travel_explore</span>
            </div>
            <input
              ref={inputRef}
              className="w-full h-12 pl-12 pr-28 rounded-lg bg-canvas-main font-headline-sm text-headline-sm text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:bg-surface-card focus:shadow-[0_0_0_3px_rgba(104,72,232,0.2)] transition-all"
              id="global-search-input"
              placeholder="Type a command, query, or ticket ID..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {isLoading && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1"></div>
              )}
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="h-6 px-2 rounded bg-surface-container text-text-secondary hover:text-text-primary hover:bg-surface-container-high font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                  id="clear-search-btn"
                  title="Clear query"
                  type="button"
                >
                  <span>ESC</span>
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="h-6 px-2 rounded bg-surface-container text-text-secondary hover:text-text-primary hover:bg-surface-container-high font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                  type="button"
                >
                  <span>ESC</span>
                </button>
              )}
            </div>
          </div>

          {/* RECENT SEARCHES QUICK PILLS (REAL DATA ONLY) */}
          {recentSearches && recentSearches.length > 0 && (
            <div className="flex items-center gap-space-xs mt-space-sm pt-space-xs overflow-x-auto text-text-muted font-body-sm text-body-sm">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider pl-1 shrink-0">
                Recent:
              </span>
              {recentSearches.map((term, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center rounded-full bg-canvas-lavender hover:bg-surface-container text-text-secondary hover:text-primary font-label-sm text-label-sm shrink-0 transition-colors pl-2.5 pr-1.5 py-0.5 group"
                >
                  <button
                    onClick={() => setQuery(term)}
                    className="flex items-center gap-1 cursor-pointer focus:outline-none"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px] text-text-muted">history</span>
                    <span>{term}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearRecent(term);
                    }}
                    className="ml-1 p-0.5 text-text-muted hover:text-severity-blocker rounded-full transition-colors cursor-pointer"
                    title="Remove search"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleClearRecent(null)}
                className="text-[11px] text-text-muted hover:text-severity-blocker underline ml-2 shrink-0 cursor-pointer"
                type="button"
              >
                Clear all
              </button>
            </div>
          )}

          {/* CATEGORY FILTER TABS WITH REAL COMPUTED COUNTS */}
          <div className="flex items-center gap-1.5 mt-space-sm pt-space-xs overflow-x-auto" id="filter-tabs-container">
            {CATEGORY_TABS.map((tab) => {
              const count = counts[tab.id] ?? 0;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`filter-tab px-3 py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-btn-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-text-secondary hover:text-text-primary hover:bg-surface-container-high'
                  }`}
                  type="button"
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
                      isActive
                        ? 'bg-white/20 text-on-primary'
                        : tab.id === 'tickets' && count > 0
                        ? 'bg-primary-fixed text-primary'
                        : 'bg-canvas-main text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN RESULTS VIEWPORT (SPLIT LAYOUT WITH RESULTS & LIVE PREVIEW PANEL) */}
        <div className="flex-1 flex overflow-hidden min-h-[380px] bg-canvas-main">
          {/* SEARCH RESULTS SCROLL LIST */}
          <div className="flex-1 overflow-y-auto p-space-md space-y-space-md" id="results-scroll-container">
            {/* ERROR STATE WITH RETRY */}
            {error && (
              <div className="p-4 rounded-xl bg-error-container/20 border border-error-container text-on-error-container flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-severity-blocker">error</span>
                  <span className="font-body-sm text-body-sm">{error}</span>
                </div>
                <button
                  onClick={() => performSearch(query, activeCategory)}
                  className="px-3 py-1 rounded bg-surface-card hover:bg-surface-container-high text-primary font-label-sm text-label-sm border border-border-subtle transition-colors shrink-0 cursor-pointer"
                  type="button"
                >
                  Retry
                </button>
              </div>
            )}

            {/* QUERY TOO SHORT PROMPT */}
            {query.trim().length > 0 && query.trim().length < 2 && !error && (
              <div className="py-space-xl flex flex-col items-center justify-center text-center space-y-space-sm text-text-muted">
                <span className="material-symbols-outlined text-[32px] text-text-muted">keyboard</span>
                <span className="font-headline-sm text-headline-sm text-text-primary">
                  Type at least 2 characters to search
                </span>
                <p className="font-body-sm text-body-sm text-text-secondary max-w-sm">
                  Search live across tickets, projects, engineering tasks, team members, and comments.
                </p>
              </div>
            )}

            {/* EMPTY INITIAL STATE */}
            {query.trim().length === 0 && !error && (
              <div className="py-space-xl flex flex-col items-center justify-center text-center space-y-space-sm text-text-muted">
                <span className="material-symbols-outlined text-[36px] text-primary">search</span>
                <span className="font-headline-sm text-headline-sm text-text-primary">Global Search</span>
                <p className="font-body-sm text-body-sm text-text-secondary max-w-sm">
                  Type ticket IDs, project names, task titles, or team member emails to search in real time.
                </p>
              </div>
            )}

            {/* RESULTS VIEW */}
            {query.trim().length >= 2 && !error && hasResults && (
              <>
                {/* GROUP: TICKETS */}
                {showTickets && (
                  <div className="result-group space-y-space-xs">
                    <div className="flex items-center justify-between px-space-xs">
                      <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">confirmation_number</span>
                        Tickets
                      </span>
                      <span className="font-label-sm text-label-sm text-text-muted">
                        {results.tickets.length} {results.tickets.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>

                    {results.tickets.map((ticket) => {
                      const isSelected = selectedItem?.id === ticket.id && selectedItem?.entityType === 'ticket';
                      const sevConf = getSeverityConfig(ticket.severity);
                      const stConf = getStatusConfig(ticket.status);

                      return (
                        <div
                          key={`ticket-${ticket.id}`}
                          onClick={() => {
                            setSelectedItem({ ...ticket, entityType: 'ticket' });
                            setHighlightedIndex(
                              visibleItems.findIndex((vi) => vi.id === ticket.id && vi.entityType === 'ticket')
                            );
                          }}
                          onDoubleClick={() => handleOpenItem({ ...ticket, entityType: 'ticket' })}
                          className={`result-item cursor-pointer rounded-xl p-3.5 transition-all flex flex-col gap-2 relative ${
                            isSelected
                              ? 'bg-surface-container-low shadow-sm ring-1 ring-primary/30'
                              : 'bg-surface-card hover:bg-canvas-lavender shadow-sm'
                          }`}
                          tabIndex={0}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary-container rounded-r-full"></div>
                          )}
                          <div className="flex items-start justify-between gap-3 pl-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-label-md text-label-md px-2 py-0.5 rounded font-mono font-bold ${
                                  isSelected ? 'text-primary bg-primary-fixed' : 'text-text-secondary bg-surface-container'
                                }`}
                              >
                                <HighlightText text={ticket.ticket_number || ticket.id} query={query} />
                              </span>
                              <span className="font-headline-sm text-headline-sm text-text-primary hover:text-primary transition-colors">
                                <HighlightText text={ticket.title} query={query} />
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold flex items-center gap-1 ${sevConf.badge}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-sm ${sevConf.dot}`}></span>
                                {sevConf.label}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${stConf.badge}`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-text-secondary font-body-sm text-body-sm pl-2 pt-1">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-text-muted">person</span>
                                <span className="font-label-sm text-label-sm text-text-primary">
                                  <HighlightText text={ticket.assignee} query={query} />
                                </span>
                              </div>
                              {ticket.project_name && (
                                <>
                                  <span className="text-text-muted">•</span>
                                  <span className="text-text-muted flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">folder</span>
                                    <span>{ticket.project_name}</span>
                                  </span>
                                </>
                              )}
                            </div>
                            {ticket.sla_badge && (
                              <div
                                className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-label-sm text-label-sm font-bold ${
                                  ticket.sla_status === 'breached'
                                    ? 'bg-error-container text-on-error-container'
                                    : ticket.sla_status === 'warning'
                                    ? 'bg-[#F8A040]/15 text-severity-critical'
                                    : 'text-text-secondary'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {ticket.sla_status === 'breached' ? 'timer_off' : 'hourglass_top'}
                                </span>
                                <span>{ticket.sla_badge}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* GROUP: PROJECTS */}
                {showProjects && (
                  <div className="result-group space-y-space-xs pt-space-xs">
                    <div className="flex items-center justify-between px-space-xs">
                      <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">folder_open</span>
                        Projects
                      </span>
                      <span className="font-label-sm text-label-sm text-text-muted">
                        {results.projects.length} {results.projects.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>

                    {results.projects.map((project) => {
                      const isSelected = selectedItem?.id === project.id && selectedItem?.entityType === 'project';
                      const stConf = getStatusConfig(project.status);

                      return (
                        <div
                          key={`project-${project.id}`}
                          onClick={() => {
                            setSelectedItem({ ...project, entityType: 'project' });
                            setHighlightedIndex(
                              visibleItems.findIndex((vi) => vi.id === project.id && vi.entityType === 'project')
                            );
                          }}
                          onDoubleClick={() => handleOpenItem({ ...project, entityType: 'project' })}
                          className={`result-item cursor-pointer rounded-xl p-3.5 transition-all flex items-center justify-between gap-4 relative ${
                            isSelected
                              ? 'bg-surface-container-low shadow-sm ring-1 ring-primary/30'
                              : 'bg-surface-card hover:bg-canvas-lavender shadow-sm'
                          }`}
                          tabIndex={0}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary-container rounded-r-full"></div>
                          )}
                          <div className="flex items-center gap-3 pl-2">
                            <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center font-bold shrink-0">
                              <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-headline-sm text-headline-sm text-text-primary">
                                  <HighlightText text={project.title || project.name} query={query} />
                                </span>
                                <span className="font-mono text-label-sm px-1.5 py-0.2 rounded bg-surface-container text-text-secondary font-bold">
                                  {project.key}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${stConf.badge}`}>
                                  {project.status}
                                </span>
                              </div>
                              <p className="font-body-sm text-body-sm text-text-secondary flex items-center gap-2">
                                <span>Lead: {project.lead}</span>
                                {project.members_count > 0 && (
                                  <>
                                    <span className="text-text-muted">•</span>
                                    <span>{project.members_count} members</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="w-32 flex flex-col items-end gap-1">
                              <div className="flex justify-between w-full font-label-sm text-label-sm text-text-secondary">
                                <span>Progress</span>
                                <span className="font-bold text-text-primary">{project.progress}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                                <div
                                  className="h-full bg-status-resolved rounded-full transition-all"
                                  style={{ width: `${project.progress}%` }}
                                ></div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenItem({ ...project, entityType: 'project' });
                              }}
                              className="p-1 hover:text-primary transition-colors cursor-pointer"
                              title="Open project details"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* GROUP: TASKS */}
                {showTasks && (
                  <div className="result-group space-y-space-xs pt-space-xs">
                    <div className="flex items-center justify-between px-space-xs">
                      <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">task_alt</span>
                        Tasks
                      </span>
                      <span className="font-label-sm text-label-sm text-text-muted">
                        {results.tasks.length} {results.tasks.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>

                    {results.tasks.map((task) => {
                      const isSelected = selectedItem?.id === task.id && selectedItem?.entityType === 'task';
                      const stConf = getStatusConfig(task.status);

                      return (
                        <div
                          key={`task-${task.id}`}
                          onClick={() => {
                            setSelectedItem({ ...task, entityType: 'task' });
                            setHighlightedIndex(
                              visibleItems.findIndex((vi) => vi.id === task.id && vi.entityType === 'task')
                            );
                          }}
                          onDoubleClick={() => handleOpenItem({ ...task, entityType: 'task' })}
                          className={`result-item cursor-pointer rounded-xl p-3.5 transition-all flex items-center justify-between gap-4 relative ${
                            isSelected
                              ? 'bg-surface-container-low shadow-sm ring-1 ring-primary/30'
                              : 'bg-surface-card hover:bg-canvas-lavender shadow-sm'
                          }`}
                          tabIndex={0}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary-container rounded-r-full"></div>
                          )}
                          <div className="flex items-start gap-3 pl-2">
                            <div className="pt-0.5">
                              <span className="w-5 h-5 rounded border border-border-subtle bg-surface-card flex items-center justify-center text-primary-container">
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-label-md text-label-md text-text-secondary bg-surface-container px-1.5 py-0.5 rounded font-mono font-semibold">
                                  <HighlightText text={task.task_number || task.id} query={query} />
                                </span>
                                <span className="font-headline-sm text-headline-sm text-text-primary">
                                  <HighlightText text={task.title} query={query} />
                                </span>
                              </div>
                              <div className="flex items-center gap-3 font-body-sm text-body-sm text-text-secondary">
                                <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${stConf.badge}`}>
                                  {task.status}
                                </span>
                                <span>{task.project_name}</span>
                                <span className="text-text-muted">•</span>
                                <span className="text-text-secondary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">event</span>
                                  <span>{task.due}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-label-sm text-label-sm text-text-muted">{task.assignee}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenItem({ ...task, entityType: 'task' });
                              }}
                              className="p-1 hover:text-primary transition-colors cursor-pointer"
                              title="Open task"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* GROUP: EMPLOYEES & TEAM */}
                {showEmployees && (
                  <div className="result-group space-y-space-xs pt-space-xs">
                    <div className="flex items-center justify-between px-space-xs">
                      <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">badge</span>
                        Employees & Team
                      </span>
                      <span className="font-label-sm text-label-sm text-text-muted">
                        {results.employees.length} {results.employees.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>

                    {results.employees.map((emp) => {
                      const isSelected = selectedItem?.id === emp.id && selectedItem?.entityType === 'employee';

                      return (
                        <div
                          key={`emp-${emp.id}`}
                          onClick={() => {
                            setSelectedItem({ ...emp, entityType: 'employee' });
                            setHighlightedIndex(
                              visibleItems.findIndex((vi) => vi.id === emp.id && vi.entityType === 'employee')
                            );
                          }}
                          onDoubleClick={() => handleOpenItem({ ...emp, entityType: 'employee' })}
                          className={`result-item cursor-pointer rounded-xl p-3.5 transition-all flex items-center justify-between gap-4 relative ${
                            isSelected
                              ? 'bg-surface-container-low shadow-sm ring-1 ring-primary/30'
                              : 'bg-surface-card hover:bg-canvas-lavender shadow-sm'
                          }`}
                          tabIndex={0}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary-container rounded-r-full"></div>
                          )}
                          <div className="flex items-center gap-3 pl-2">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-headline-sm shrink-0">
                              {emp.name ? emp.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-headline-sm text-headline-sm text-text-primary">
                                  <HighlightText text={emp.name} query={query} />
                                </span>
                                <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-primary-fixed text-primary font-bold">
                                  {emp.title}
                                </span>
                              </div>
                              <p className="font-body-sm text-body-sm text-text-secondary flex items-center gap-2">
                                <span>
                                  <HighlightText text={emp.email} query={query} />
                                </span>
                                {emp.department && (
                                  <>
                                    <span className="text-text-muted">•</span>
                                    <span>{emp.department}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenItem({ ...emp, entityType: 'employee' });
                              }}
                              className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors cursor-pointer"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[16px]">account_circle</span>
                              <span>Profile</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* GROUP: COMMENTS */}
                {showComments && (
                  <div className="result-group space-y-space-xs pt-space-xs">
                    <div className="flex items-center justify-between px-space-xs">
                      <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">chat</span>
                        Comments
                      </span>
                      <span className="font-label-sm text-label-sm text-text-muted">
                        {results.comments.length} {results.comments.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>

                    {results.comments.map((comment) => {
                      const isSelected = selectedItem?.id === comment.id && selectedItem?.entityType === 'comment';

                      return (
                        <div
                          key={`comment-${comment.id}`}
                          onClick={() => {
                            setSelectedItem({ ...comment, entityType: 'comment' });
                            setHighlightedIndex(
                              visibleItems.findIndex((vi) => vi.id === comment.id && vi.entityType === 'comment')
                            );
                          }}
                          onDoubleClick={() => handleOpenItem({ ...comment, entityType: 'comment' })}
                          className={`result-item cursor-pointer rounded-xl p-3.5 transition-all flex flex-col gap-1.5 relative ${
                            isSelected
                              ? 'bg-surface-container-low shadow-sm ring-1 ring-primary/30'
                              : 'bg-surface-card hover:bg-canvas-lavender shadow-sm'
                          }`}
                          tabIndex={0}
                        >
                          {isSelected && (
                            <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary-container rounded-r-full"></div>
                          )}
                          <div className="flex items-center justify-between text-text-muted font-label-sm text-label-sm pl-2">
                            <span className="text-primary font-semibold">{comment.target_label}</span>
                            <span>By {comment.author}</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-text-primary pl-2 line-clamp-2">
                            <HighlightText text={comment.content} query={query} />
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* EMPTY SEARCH RESULTS FALLBACK */}
            {query.trim().length >= 2 && !error && !isLoading && !hasResults && (
              <div className="py-space-xl flex flex-col items-center justify-center text-center space-y-space-md">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-muted">
                  <span className="material-symbols-outlined text-[28px]">search_off</span>
                </div>
                <div className="space-y-1">
                  <span className="font-headline-md text-headline-md text-text-primary">
                    No matches found for "{query}"
                  </span>
                  <p className="font-body-md text-body-md text-text-secondary max-w-sm">
                    We couldn't find anything matching your search in {activeCategory === 'all' ? 'the workspace' : activeCategory}. Check for typos or reset filters.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setQuery('');
                    setActiveCategory('all');
                  }}
                  className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Clear Filters & Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT QUICK INSPECTOR PANEL (REAL DATA ONLY) */}
          <div className="w-80 border-l border-border-subtle bg-surface-card p-space-md flex flex-col justify-between hidden md:flex shrink-0">
            {selectedItem ? (
              <div className="space-y-space-md overflow-y-auto">
                <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                    Quick Inspector
                  </span>
                  <span className="font-label-sm text-label-sm text-primary font-mono font-bold">
                    {selectedItem.ticket_number || selectedItem.key || selectedItem.task_number || selectedItem.id}
                  </span>
                </div>

                {/* TICKET DETAILS */}
                {selectedItem.entityType === 'ticket' && (
                  <>
                    <div className="space-y-2">
                      <span className="font-headline-sm text-headline-sm text-text-primary leading-tight block">
                        {selectedItem.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold ${
                            getSeverityConfig(selectedItem.severity).badge
                          }`}
                        >
                          {getSeverityConfig(selectedItem.severity).label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                            getStatusConfig(selectedItem.status).badge
                          }`}
                        >
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>

                    {/* REAL SLA STATUS & TIMERS (IF AVAILABLE) */}
                    {(selectedItem.sla_badge || selectedItem.first_response_str) && (
                      <div className="p-space-sm rounded-lg bg-canvas-lavender space-y-2">
                        <div className="flex justify-between items-center text-text-secondary font-label-sm text-label-sm">
                          <span>SLA Tracker</span>
                          <span
                            className={`font-bold ${
                              selectedItem.sla_status === 'breached'
                                ? 'text-severity-blocker'
                                : 'text-status-resolved'
                            }`}
                          >
                            {selectedItem.sla_badge}
                          </span>
                        </div>
                        {selectedItem.first_response_str && (
                          <div className="bg-surface-card p-2 rounded shadow-xs text-center">
                            <span className="font-label-sm text-label-sm text-text-muted block">First Response</span>
                            <span className="font-mono font-headline-sm text-headline-sm text-status-resolved">
                              {selectedItem.first_response_str}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* REAL CONTEXT METADATA */}
                    <div className="space-y-2 text-text-secondary font-body-sm text-body-sm">
                      {selectedItem.project_name && (
                        <div className="flex justify-between">
                          <span className="text-text-muted font-label-sm text-label-sm">Project:</span>
                          <span className="font-label-sm text-label-sm text-text-primary font-medium">
                            {selectedItem.project_name}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Assignee:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">
                          {selectedItem.assignee}
                        </span>
                      </div>
                      {selectedItem.sla_tier && (
                        <div className="flex justify-between">
                          <span className="text-text-muted font-label-sm text-label-sm">SLA Tier:</span>
                          <span className="font-label-sm text-label-sm text-text-primary">
                            {selectedItem.sla_tier}
                          </span>
                        </div>
                      )}
                      {selectedItem.description && (
                        <div className="pt-2 border-t border-border-subtle">
                          <span className="text-text-muted font-label-sm text-label-sm block mb-1">Description:</span>
                          <p className="font-body-sm text-body-sm text-text-secondary line-clamp-4">
                            {selectedItem.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* PROJECT DETAILS */}
                {selectedItem.entityType === 'project' && (
                  <>
                    <div className="space-y-2">
                      <span className="font-headline-sm text-headline-sm text-text-primary leading-tight block">
                        {selectedItem.name || selectedItem.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                            getStatusConfig(selectedItem.status).badge
                          }`}
                        >
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="p-space-sm rounded-lg bg-canvas-lavender space-y-1.5">
                      <div className="flex justify-between text-label-sm text-label-sm font-semibold text-text-secondary">
                        <span>Project Progress</span>
                        <span className="text-text-primary font-bold">{selectedItem.progress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden">
                        <div
                          className="h-full bg-status-resolved rounded-full transition-all"
                          style={{ width: `${selectedItem.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* CONTEXT METADATA */}
                    <div className="space-y-2 text-text-secondary font-body-sm text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Project Lead:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">{selectedItem.lead}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Members:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">
                          {selectedItem.members_count} members
                        </span>
                      </div>
                      {selectedItem.sla_tier && (
                        <div className="flex justify-between">
                          <span className="text-text-muted font-label-sm text-label-sm">SLA Tier:</span>
                          <span className="font-label-sm text-label-sm text-text-primary">
                            {selectedItem.sla_tier}
                          </span>
                        </div>
                      )}
                      {selectedItem.description && (
                        <div className="pt-2 border-t border-border-subtle">
                          <span className="text-text-muted font-label-sm text-label-sm block mb-1">Description:</span>
                          <p className="font-body-sm text-body-sm text-text-secondary line-clamp-4">
                            {selectedItem.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* TASK DETAILS */}
                {selectedItem.entityType === 'task' && (
                  <div className="space-y-3">
                    <span className="font-headline-sm text-headline-sm text-text-primary leading-tight block">
                      {selectedItem.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                          getStatusConfig(selectedItem.status).badge
                        }`}
                      >
                        {selectedItem.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-text-secondary font-body-sm text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Project:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">
                          {selectedItem.project_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Assignee:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">{selectedItem.assignee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Due Date:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">{selectedItem.due}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* EMPLOYEE DETAILS */}
                {selectedItem.entityType === 'employee' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-headline-md">
                        {selectedItem.name ? selectedItem.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="font-headline-sm text-headline-sm text-text-primary block">
                          {selectedItem.name}
                        </span>
                        <span className="font-label-sm text-label-sm text-text-secondary">
                          {selectedItem.title}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-text-secondary font-body-sm text-body-sm pt-2 border-t border-border-subtle">
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Email:</span>
                        <span className="font-label-sm text-label-sm text-text-primary">{selectedItem.email}</span>
                      </div>
                      {selectedItem.department && (
                        <div className="flex justify-between">
                          <span className="text-text-muted font-label-sm text-label-sm">Department:</span>
                          <span className="font-label-sm text-label-sm text-text-primary">
                            {selectedItem.department}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-text-muted font-label-sm text-label-sm">Status:</span>
                        <span className="font-label-sm text-label-sm text-status-resolved font-medium">
                          {selectedItem.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* COMMENT DETAILS */}
                {selectedItem.entityType === 'comment' && (
                  <div className="space-y-3">
                    <span className="font-label-sm text-label-sm text-primary font-bold block">
                      {selectedItem.target_label}
                    </span>
                    <p className="font-body-sm text-body-sm text-text-primary bg-canvas-lavender p-3 rounded-lg leading-relaxed">
                      "{selectedItem.content}"
                    </p>
                    <div className="text-text-muted font-label-sm text-label-sm">
                      Author: <span className="text-text-primary font-medium">{selectedItem.author}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-text-muted">
                <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">visibility</span>
                <span className="font-body-sm text-body-sm">Select an item to view its details</span>
              </div>
            )}

            {/* FOOTER ACTION BUTTONS IN PREVIEW (ONLY WHEN A REAL PATH EXISTS) */}
            {selectedItem && inspectorPath && (
              <div className="pt-space-md border-t border-border-subtle flex gap-2">
                <button
                  onClick={() => handleOpenItem(selectedItem)}
                  className="flex-1 h-9 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-sm text-label-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>
                    {selectedItem.entityType === 'ticket'
                      ? 'Open Ticket'
                      : selectedItem.entityType === 'project'
                      ? 'Open Project'
                      : selectedItem.entityType === 'task'
                      ? 'Open Tasks'
                      : selectedItem.entityType === 'employee'
                      ? 'View Profile'
                      : 'Open'}
                  </span>
                </button>
                <button
                  onClick={() => handleCopyLink(selectedItem)}
                  className="h-9 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary font-label-sm text-label-sm flex items-center justify-center transition-colors cursor-pointer"
                  title="Copy Link"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedLink ? 'check' : 'link'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KEYBOARD NAVIGATION FOOTER TOOLBAR */}
        <div className="px-space-md py-2.5 bg-surface-container-low border-t border-border-subtle flex items-center justify-between text-text-muted font-label-sm text-label-sm">
          <div className="flex items-center gap-space-md flex-wrap">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-text-primary font-mono text-[11px] shadow-xs">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-text-primary font-mono text-[11px] shadow-xs">
                ↓
              </kbd>
              <span className="text-text-secondary">to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-text-primary font-mono text-[11px] shadow-xs">
                ↵
              </kbd>
              <span className="text-text-secondary">to open</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle text-text-primary font-mono text-[11px] shadow-xs">
                Tab
              </kbd>
              <span className="text-text-secondary">to filter category</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-text-primary font-mono text-[11px] shadow-xs">
                ESC
              </kbd>
              <span className="text-text-secondary">to dismiss</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            {hasResults && (
              <span className="font-label-sm text-label-sm text-text-muted">
                {totalResultsCount} {totalResultsCount === 1 ? 'result' : 'results'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
};

export default GlobalSearchOverlay;
