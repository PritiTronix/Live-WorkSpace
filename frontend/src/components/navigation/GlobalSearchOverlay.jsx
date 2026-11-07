import React, { useState, useEffect, useRef } from 'react';
import { searchService } from '../../services/api';

export const GlobalSearchOverlay = ({ isOpen, onClose, onSelectResult }) => {
  const [query, setQuery] = useState('gateway-timeout');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState('TKT-1025');
  const [recentSearches, setRecentSearches] = useState([
    'kafka consumer lag',
    'SRE on-call rotation',
    'TKT-1028',
  ]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      searchService.getRecentSearches().then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setRecentSearches(res);
        }
      });
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (query) {
          setQuery('');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, query]);

  if (!isOpen) return null;

  // Static items faithfully matching Stitch screen
  const tickets = [
    {
      id: 'TKT-1025',
      title: 'Auth proxy latency spike on us-east cluster',
      severity: 'Blocker',
      severityColor: 'bg-[#F55354]/15 text-severity-blocker',
      severityDot: 'bg-severity-blocker',
      status: 'In Progress',
      statusColor: 'bg-[rgba(104,72,232,0.12)] text-status-wip',
      assignee: 'Aarav Mehta',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDq_Szg9g_Swl14ZN5-yH0T_XFJKttjpeIh0UG9KsovQypc997alfUp-CYCutakzmcGsEZLy9X1IHMfBcAo7YYeg8CmSqRYY6wd_p0Yf6KDdnjyC_IatYMkCUbxTbgDuO3TgibpdpZLCpdnYwxYlcdUbLrCgWDDZ5Hgp3iLR-XPC2H4l7gNevcoDQVXvyLPHDGqcXpWa6pFg1SBO2FmS8AE8XLdY04B_R89EuOZZNjv',
      date: 'Reported Nov 26, 10:14 AM',
      slaBadge: 'SLA Breached (-14m)',
      slaColor: 'bg-error-container text-on-error-container',
      slaIcon: 'timer_off',
      squad: 'Core Auth & Gateway',
      cluster: 'us-east-k8s-04',
      warRoom: '#war-room-auth-402',
      log: '504 Gateway Timeout\nupstream response time: 30002ms\nproxy_id: ingress-east-gateway-9b',
    },
    {
      id: 'TKT-1031',
      title: 'Payment Webhook retry queue exhaustion',
      severity: 'Critical',
      severityColor: 'bg-[#F8A040]/15 text-severity-critical',
      severityDot: 'bg-severity-critical',
      status: 'Open',
      statusColor: 'bg-[rgba(56,136,248,0.12)] text-status-open',
      assignee: 'Maya Shah',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD3oAw_3dRv5PdqJlXLL3K8xiHEbFgPsTZ15ywBWmkAsih2YsZacljenP4BlMbo64vZGxj-4du1S1SAYeBzFpIb6FCmYJa-htZKmDiIF2CV2aLN8Aca915NshEzT-gFC0xapHueOO-4h3qf6vYm--eOcaURBQZEZcayx0Dd2T_b_5ybUjUa91J-h0cwQPdcgKh-6szpOBMaFyRhzHXztaxOfkrJ0cGdmfX4JaAimnsz',
      date: 'Reported Today, 09:20 AM',
      slaBadge: '18m SLA remaining',
      slaColor: 'bg-[rgba(248,160,64,0.14)] text-severity-critical',
      slaIcon: 'hourglass_top',
      squad: 'Core Payments & Billing',
      cluster: 'us-east-k8s-02',
      warRoom: '#war-room-payments-1031',
      log: '429 Rate Limit Exceeded\nupstream response: 429 Too Many Requests\nretry_attempt: 5 of 5',
    },
    {
      id: 'TKT-1029',
      title: 'Edge Envoy gateway 504 gateway-timeout in EU-Central edge ingress',
      severity: 'Major',
      severityColor: 'bg-[#F8C048]/15 text-[#B88714]',
      severityDot: 'bg-severity-major',
      status: 'In Progress',
      statusColor: 'bg-[rgba(104,72,232,0.12)] text-status-wip',
      assignee: 'Devon Kim',
      isInitials: true,
      initials: 'DK',
      date: 'Reported Yesterday',
      slaBadge: 'SLA Safe (4h left)',
      slaColor: 'text-text-secondary',
      squad: 'Edge Networking',
      cluster: 'eu-central-ingress-01',
      warRoom: '#war-room-edge-1029',
      log: '504 Gateway Timeout\nupstream connection refused: 10.244.18.52:8443',
    },
  ];

  const projects = [
    {
      id: 'PRJ-101',
      title: 'Platform Revamp 2.0',
      badge: 'On Track',
      badgeColor: 'bg-[rgba(40,192,120,0.14)] text-status-resolved',
      desc: 'Lead: Maya Shah • SRE & Platform Squad • Q4 Milestone',
      progress: 78,
    },
  ];

  const tasks = [
    {
      id: 'TASK-204',
      title: 'Refactor Auth Middleware for Multi-Tenant Support',
      status: 'In Progress',
      sprint: 'Sprint 42',
      due: 'Due: Today',
      assigneeAvatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDMiNEYJLsUmaedzRD07RAWw-kRAAA6GyHG0fCPmeK0W2Fr-ISs_Gq_sxhUdAL6GYY0nF8GKjKzz82JVqpeIC2Rvxs00pjy8iF3FZpDlJbh-B8PYgJhjWrDfXlIC1cB11bvBwxjbpraoSdi_kyHS6yd7wJru7i4EaMCkdizIIVgdCnOBn_dLlkSH4nlCeJk8yMuks7XScXx-4fpmpvSEa0Dtdta_0JzrfQeyFINXfKq',
    },
  ];

  const employees = [
    {
      id: 'EMP-01',
      name: 'Maya Shah',
      title: 'Lead SRE & Triage Lead',
      email: 'maya@acmetech.io',
      statusText: 'In Incident War Room',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAUBdKwOX2YFpkkVGiKnO8v4PE7xlMmYgPOOM6ZcyWhg5G6UTxgyjUpAr6QPa_ZU_YpuawpTnixQCjW8KEvYHQ6PZajTIah3YI6DP66JgJ-PJgKcyMwfQhYHKZSMlWYiN74Wqzj5gpy9v0PMTp0eJyS1WQAMfUxDN0lfJTMMBe6qadNHxrzBtzhtRej7c9w3XxAjjjBod0i8aWxlMUS8l5AstEgAd3Dk0xYTzPANyMk',
    },
  ];

  const selectedTicketData = tickets.find((t) => t.id === selectedTicket) || tickets[0];

  const lowerQuery = query.toLowerCase().trim();
  const filteredTickets = tickets.filter(
    (t) =>
      lowerQuery === '' ||
      t.id.toLowerCase().includes(lowerQuery) ||
      t.title.toLowerCase().includes(lowerQuery) ||
      t.assignee.toLowerCase().includes(lowerQuery)
  );
  const filteredProjects = projects.filter(
    (p) => lowerQuery === '' || p.title.toLowerCase().includes(lowerQuery) || p.desc.toLowerCase().includes(lowerQuery)
  );
  const filteredTasks = tasks.filter(
    (tk) => lowerQuery === '' || tk.id.toLowerCase().includes(lowerQuery) || tk.title.toLowerCase().includes(lowerQuery)
  );
  const filteredEmployees = employees.filter(
    (e) => lowerQuery === '' || e.name.toLowerCase().includes(lowerQuery) || e.title.toLowerCase().includes(lowerQuery)
  );

  const showTickets = (activeCategory === 'all' || activeCategory === 'tickets') && filteredTickets.length > 0;
  const showProjects = (activeCategory === 'all' || activeCategory === 'projects') && filteredProjects.length > 0;
  const showTasks = (activeCategory === 'all' || activeCategory === 'tasks') && filteredTasks.length > 0;
  const showEmployees = (activeCategory === 'all' || activeCategory === 'employees') && filteredEmployees.length > 0;

  const totalResultsCount =
    (activeCategory === 'all' || activeCategory === 'tickets' ? filteredTickets.length : 0) +
    (activeCategory === 'all' || activeCategory === 'projects' ? filteredProjects.length : 0) +
    (activeCategory === 'all' || activeCategory === 'tasks' ? filteredTasks.length : 0) +
    (activeCategory === 'all' || activeCategory === 'employees' ? filteredEmployees.length : 0);

  const hasResults = totalResultsCount > 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#141529]/40 backdrop-blur-sm flex items-start justify-center pt-8 px-space-md overflow-y-auto">
      {/* COMMAND PALETTE CONTAINER */}
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl bg-surface-card rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
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

          {/* RECENT SEARCHES QUICK PILLS */}
          <div className="flex items-center gap-space-xs mt-space-sm pt-space-xs overflow-x-auto text-text-muted font-body-sm text-body-sm">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider pl-1 shrink-0">
              Recent:
            </span>
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(term)}
                className="px-2.5 py-1 rounded-full bg-canvas-lavender hover:bg-surface-container text-text-secondary hover:text-primary font-label-sm text-label-sm flex items-center gap-1 shrink-0 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[13px] text-text-muted">history</span>
                <span>{term}</span>
              </button>
            ))}
          </div>

          {/* CATEGORY FILTER TABS */}
          <div className="flex items-center gap-1.5 mt-space-sm pt-space-xs overflow-x-auto" id="filter-tabs-container">
            {[
              { id: 'all', label: 'All', count: 8 },
              { id: 'tickets', label: 'Tickets', count: 3 },
              { id: 'projects', label: 'Projects', count: 1 },
              { id: 'tasks', label: 'Tasks', count: 2 },
              { id: 'employees', label: 'Employees', count: 1 },
              { id: 'comments', label: 'Comments', count: 1 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`filter-tab px-3 py-1.5 rounded-lg font-label-md text-label-md flex items-center gap-1 transition-all ${
                  activeCategory === tab.id
                    ? 'bg-btn-primary text-on-primary shadow-sm'
                    : 'bg-surface-container text-text-secondary hover:text-text-primary hover:bg-surface-container-high'
                }`}
                type="button"
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-label-sm text-label-sm ${
                    activeCategory === tab.id
                      ? 'bg-white/20 text-on-primary'
                      : tab.id === 'tickets'
                      ? 'bg-primary-fixed text-primary'
                      : 'bg-canvas-main text-text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN RESULTS VIEWPORT (SPLIT LAYOUT WITH RESULTS & LIVE PREVIEW PANEL) */}
        <div className="flex-1 flex overflow-hidden min-h-[380px] bg-canvas-main">
          {/* SEARCH RESULTS SCROLL LIST */}
          <div className="flex-1 overflow-y-auto p-space-md space-y-space-md" id="results-scroll-container">
            {hasResults ? (
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
                        {filteredTickets.length} matches
                      </span>
                    </div>

                    {filteredTickets.map((ticket) => {
                      const isSelected = selectedTicket === ticket.id;
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => {
                            setSelectedTicket(ticket.id);
                            onSelectResult?.(ticket);
                          }}
                          className={`result-item cursor-pointer rounded-xl p-3.5 transition-all flex flex-col gap-2 relative ${
                            isSelected
                              ? 'bg-surface-container-low shadow-sm'
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
                                {ticket.id}
                              </span>
                              <span className="font-headline-sm text-headline-sm text-text-primary hover:text-primary transition-colors">
                                {ticket.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold flex items-center gap-1 ${ticket.severityColor}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-sm ${ticket.severityDot}`}></span>
                                {ticket.severity}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${ticket.statusColor}`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-text-secondary font-body-sm text-body-sm pl-2 pt-1">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {ticket.isInitials ? (
                                  <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center justify-center font-bold">
                                    {ticket.initials}
                                  </span>
                                ) : (
                                  <img
                                    className="w-5 h-5 rounded-full object-cover shadow-xs"
                                    alt={ticket.assignee}
                                    src={ticket.avatar}
                                  />
                                )}
                                <span className="font-label-sm text-label-sm text-text-primary">{ticket.assignee}</span>
                              </div>
                              <span className="text-text-muted">•</span>
                              <span className="text-text-muted flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {ticket.date}
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-label-sm text-label-sm font-bold ${ticket.slaColor}`}
                            >
                              {ticket.slaIcon && (
                                <span className="material-symbols-outlined text-[14px]">{ticket.slaIcon}</span>
                              )}
                              <span>{ticket.slaBadge}</span>
                            </div>
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
                        {filteredProjects.length} match
                      </span>
                    </div>

                    {filteredProjects.map((project) => (
                      <div
                        key={project.id}
                        className="result-item cursor-pointer rounded-xl bg-surface-card hover:bg-canvas-lavender shadow-sm p-3.5 transition-all flex items-center justify-between gap-4"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center font-bold shrink-0">
                            <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-headline-sm text-headline-sm text-text-primary">{project.title}</span>
                              <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${project.badgeColor}`}>
                                {project.badge}
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-text-secondary">{project.desc}</p>
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
                                className="h-full bg-status-resolved rounded-full"
                                style={{ width: `${project.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
                        </div>
                      </div>
                    ))}
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
                      <span className="font-label-sm text-label-sm text-text-muted">{filteredTasks.length} matches</span>
                    </div>

                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="result-item cursor-pointer rounded-xl bg-surface-card hover:bg-canvas-lavender shadow-sm p-3.5 transition-all flex items-center justify-between gap-4"
                        tabIndex={0}
                      >
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            <span className="w-5 h-5 rounded border border-border-subtle bg-surface-card flex items-center justify-center text-primary-container">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-label-md text-label-md text-text-secondary bg-surface-container px-1.5 py-0.5 rounded font-mono font-semibold">
                                {task.id}
                              </span>
                              <span className="font-headline-sm text-headline-sm text-text-primary">{task.title}</span>
                            </div>
                            <div className="flex items-center gap-3 font-body-sm text-body-sm text-text-secondary">
                              <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-[rgba(104,72,232,0.12)] text-status-wip font-semibold">
                                {task.status}
                              </span>
                              <span>{task.sprint}</span>
                              <span className="text-text-muted">•</span>
                              <span className="text-severity-blocker font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">event</span>
                                {task.due}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <img
                            className="w-6 h-6 rounded-full object-cover"
                            alt="Devon Kim"
                            src={task.assigneeAvatar}
                          />
                          <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
                        </div>
                      </div>
                    ))}
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
                        {filteredEmployees.length} match
                      </span>
                    </div>

                    {filteredEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="result-item cursor-pointer rounded-xl bg-surface-card hover:bg-canvas-lavender shadow-sm p-3.5 transition-all flex items-center justify-between gap-4"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              className="w-11 h-11 rounded-full object-cover shadow-sm"
                              alt={emp.name}
                              src={emp.avatar}
                            />
                            <span
                              className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-status-resolved ring-2 ring-surface-card"
                              title="Online"
                            ></span>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-headline-sm text-headline-sm text-text-primary">{emp.name}</span>
                              <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-primary-fixed text-primary font-bold">
                                {emp.title}
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-text-secondary flex items-center gap-2">
                              <span>{emp.email}</span>
                              <span className="text-text-muted">•</span>
                              <span className="text-severity-blocker font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-severity-blocker animate-ping"></span>
                                {emp.statusText}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">chat</span>
                            <span>Ping</span>
                          </button>
                          <button
                            className="h-8 px-3 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-sm text-label-sm flex items-center gap-1 transition-colors"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">assignment_ind</span>
                            <span>Assign</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* EMPTY SEARCH RESULTS FALLBACK */
              <div className="py-space-xl flex flex-col items-center justify-center text-center space-y-space-md">
                <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-text-muted">
                  <span className="material-symbols-outlined text-[28px]">search_off</span>
                </div>
                <div className="space-y-1">
                  <span className="font-headline-md text-headline-md text-text-primary">No matches found for query</span>
                  <p className="font-body-md text-body-md text-text-secondary max-w-sm">
                    We couldn't find anything matching your search. Check for typos or broaden your category filters.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setQuery('');
                    setActiveCategory('all');
                  }}
                  className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  <span>Clear Filters & Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT MINI-PREVIEW DUAL INSPECTOR PANEL (TKT-1025) */}
          <div className="w-80 border-l border-border-subtle bg-surface-card p-space-md flex flex-col justify-between hidden md:flex shrink-0">
            <div className="space-y-space-md overflow-y-auto">
              <div className="flex items-center justify-between pb-space-xs border-b border-border-subtle">
                <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                  Quick Inspector
                </span>
                <span className="font-label-sm text-label-sm text-primary font-mono">{selectedTicketData.id}</span>
              </div>

              {/* TICKET MINI-SUMMARY */}
              <div className="space-y-2">
                <span className="font-headline-sm text-headline-sm text-text-primary leading-tight">
                  {selectedTicketData.title}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold ${selectedTicketData.severityColor}`}
                  >
                    {selectedTicketData.severity}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${selectedTicketData.statusColor}`}
                  >
                    {selectedTicketData.status}
                  </span>
                </div>
              </div>

              {/* DUAL SLA TIMER MODULE */}
              <div className="p-space-sm rounded-lg bg-canvas-lavender space-y-2">
                <div className="flex justify-between items-center text-text-secondary font-label-sm text-label-sm">
                  <span>Dual SLA Tracker</span>
                  <span className="text-severity-blocker font-bold">Breached</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-surface-card p-2 rounded shadow-xs">
                    <span className="font-label-sm text-label-sm text-text-muted block">First Response</span>
                    <span className="font-mono font-headline-sm text-headline-sm text-status-resolved">3m (Met)</span>
                  </div>
                  <div className="bg-surface-card p-2 rounded shadow-xs">
                    <span className="font-label-sm text-label-sm text-text-muted block">Resolution SLA</span>
                    <span className="font-mono font-headline-sm text-headline-sm text-severity-blocker">-14m (Over)</span>
                  </div>
                </div>
              </div>

              {/* INCIDENT CONTEXT METADATA */}
              <div className="space-y-2 text-text-secondary font-body-sm text-body-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted font-label-sm text-label-sm">Squad:</span>
                  <span className="font-label-sm text-label-sm text-text-primary">{selectedTicketData.squad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-label-sm text-label-sm">Cluster:</span>
                  <span className="font-mono font-label-sm text-label-sm text-text-primary">
                    {selectedTicketData.cluster}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-label-sm text-label-sm">Assignee:</span>
                  <span className="font-label-sm text-label-sm text-text-primary">{selectedTicketData.assignee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-label-sm text-label-sm">Incident War Room:</span>
                  <span className="font-label-sm text-label-sm text-primary font-semibold">
                    {selectedTicketData.warRoom}
                  </span>
                </div>
              </div>

              {/* RECENT SYSTEM LOG SNIPPET */}
              <div className="space-y-1">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Latest Gateway Log</span>
                <pre className="bg-inverse-surface text-inverse-on-surface p-2.5 rounded-lg text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {selectedTicketData.log}
                </pre>
              </div>
            </div>

            {/* FOOTER ACTION BUTTONS IN PREVIEW */}
            <div className="pt-space-md border-t border-border-subtle flex gap-2">
              <button
                onClick={() => {
                  onSelectResult?.(selectedTicketData);
                  onClose();
                }}
                className="flex-1 h-9 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-sm text-label-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span>Open Ticket</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.origin + `/tickets/${selectedTicketData.id}`);
                }}
                className="h-9 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-secondary font-label-sm text-label-sm flex items-center justify-center transition-colors"
                title="Copy Ticket Link"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
              </button>
            </div>
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
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-status-resolved animate-pulse"></span>
              Spotlight v4.8
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchOverlay;
