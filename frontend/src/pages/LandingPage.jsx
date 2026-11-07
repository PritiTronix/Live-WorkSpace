import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_USER } from '../services/api';

export const LandingPage = () => {
  const [countdown, setCountdown] = useState(42 * 60 + 18); // 42m 18s

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="bg-canvas-main font-body-md text-text-primary antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-surface-card/90 backdrop-blur-xl border-b border-border-subtle shadow-[0_1px_8px_rgba(20,21,41,0.03)]">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-btn-primary flex items-center justify-center text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-xl">grid_view</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight">
                Live Workspace
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-btn-primary font-label-lg transition-colors">
              Features
            </a>
            <a href="#workflow" className="font-body-md text-body-md text-text-secondary hover:text-text-primary transition-colors">
              Workflow
            </a>
            <a href="#solutions" className="font-body-md text-body-md text-text-secondary hover:text-text-primary transition-colors">
              Solutions
            </a>
            <a href="#pricing" className="font-body-md text-body-md text-text-secondary hover:text-text-primary transition-colors">
              Pricing
            </a>
            <a href="#about" className="font-body-md text-body-md text-text-secondary hover:text-text-primary transition-colors">
              About
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/auth/login"
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-subtle bg-surface-card font-label-lg text-label-lg text-text-primary hover:bg-canvas-lavender hover:text-text-primary transition-all"
            >
              Login
            </Link>
            <Link
              to="/workspace/dashboard"
              className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-btn-primary font-label-lg text-label-lg text-on-primary hover:bg-primary-hover shadow-sm transition-all"
            >
              Get Started
            </Link>
            <img
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-border-subtle"
              src={DEFAULT_USER.avatar_url}
            />
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="w-full pt-16 bg-canvas-main min-h-screen">
        <div className="flex flex-col w-full">
          {/* HERO SECTION */}
          <section className="relative w-full overflow-hidden px-6 lg:px-12 pt-10 pb-20 max-w-7xl mx-auto">
            {/* Ambient subtle background glow */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-primary-fixed/40 via-surface-container-low/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-6 flex flex-col items-start space-y-6">
                {/* Release Pill */}
                <a
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-canvas-lavender hover:bg-surface-container-high transition-all shadow-sm"
                  href="#features"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-btn-primary text-on-primary">
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                  </span>
                  <span className="font-label-md text-label-md text-btn-primary tracking-tight font-semibold">
                    Live Workspace 2.0
                  </span>
                  <span className="text-text-muted">•</span>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    Unified SLA & Incident Tracking is now live
                  </span>
                  <span className="material-symbols-outlined text-sm text-text-secondary">arrow_forward</span>
                </a>

                {/* Main Heading */}
                <h1 className="font-headline-xl text-headline-xl lg:text-[46px] lg:leading-[54px] text-text-primary tracking-tight font-extrabold max-w-xl">
                  One Workspace. <br className="hidden sm:inline" />
                  <span className="text-btn-primary">Complete Project</span> Visibility.
                </h1>

                {/* Supporting Body */}
                <p className="font-body-lg text-body-lg text-text-secondary max-w-lg leading-relaxed">
                  Manage complex roadmaps, high-severity tickets, strict contractual SLAs, and cross-team dependencies from a single unified operational command center.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
                  <Link
                    to="/workspace/dashboard"
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm transition-all group"
                  >
                    <span>Get Started Free</span>
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/workspace/dashboard"
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-lg text-label-lg shadow-sm transition-all border border-border-subtle"
                  >
                    <span className="material-symbols-outlined text-lg text-text-secondary">lock_open</span>
                    <span>Log In to Workspace</span>
                  </Link>
                </div>

                {/* Trust Badges Micro-note */}
                <div className="flex items-center gap-2 pt-2 text-text-muted font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-status-resolved text-base">verified</span>
                  <span>No credit card required</span>
                  <span className="text-border-subtle mx-1">•</span>
                  <span>14-day full enterprise trial</span>
                  <span className="text-border-subtle mx-1">•</span>
                  <span>SOC2 Type II Certified</span>
                </div>
              </div>

              {/* Right Column: Interactive Framed Browser Product Preview */}
              <div className="lg:col-span-6 relative">
                {/* Floating decorative tag */}
                <div className="absolute -top-4 -right-2 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card shadow-md text-text-primary border border-border-subtle">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-resolved opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-resolved"></span>
                  </span>
                  <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
                    WebSocket: Live Stream Connected
                  </span>
                </div>

                {/* Mac Browser Frame */}
                <div className="w-full rounded-xl bg-surface-card shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl border border-border-subtle">
                  {/* Window Header Chrome */}
                  <div className="h-10 bg-canvas-lavender px-4 flex items-center justify-between border-b border-border-subtle">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                    </div>
                    {/* Address Bar */}
                    <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-surface-card text-text-secondary font-label-sm text-label-sm max-w-xs w-full justify-center shadow-sm border border-border-subtle">
                      <span className="material-symbols-outlined text-xs text-status-resolved">lock</span>
                      <span className="truncate">app.liveworkspace.io/acme-technologies/overview</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted">
                      <span className="material-symbols-outlined text-sm">tune</span>
                      <span className="material-symbols-outlined text-sm">fullscreen</span>
                    </div>
                  </div>

                  {/* Interior Mockup UI (Interactive Micro-Dashboard) */}
                  <div className="grid grid-cols-12 bg-canvas-main min-h-[380px]">
                    {/* Micro Sidebar */}
                    <aside className="col-span-3 bg-surface-sidebar p-3 flex flex-col justify-between hidden sm:flex border-r border-border-subtle">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <div className="w-6 h-6 rounded bg-btn-primary flex items-center justify-center text-on-primary">
                            <span className="material-symbols-outlined text-xs">grid_view</span>
                          </div>
                          <span className="font-label-sm text-label-sm text-text-primary truncate font-bold">
                            Acme Corp
                          </span>
                        </div>
                        <nav className="space-y-1">
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface-container-high text-btn-primary font-label-sm text-label-sm font-semibold">
                            <span className="material-symbols-outlined text-sm">dashboard</span>
                            <span className="truncate">Overview</span>
                          </div>
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span className="truncate">My Tasks</span>
                            <span className="ml-auto text-[10px] px-1 rounded bg-canvas-lavender text-text-muted">14</span>
                          </div>
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-sm">confirmation_number</span>
                            <span className="truncate">Tickets</span>
                            <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-severity-blocker/15 text-severity-blocker font-bold">
                              1
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-text-secondary font-body-sm text-body-sm">
                            <span className="material-symbols-outlined text-sm">timer</span>
                            <span className="truncate">SLA Board</span>
                          </div>
                        </nav>
                      </div>

                      <div className="p-2 bg-surface-card rounded-md shadow-sm border border-border-subtle">
                        <p className="font-label-sm text-[10px] text-text-muted uppercase">Global Health</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-label-sm text-label-sm text-status-resolved flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-resolved"></span> Operational
                          </span>
                          <span className="font-body-sm text-body-sm text-text-secondary">99.98%</span>
                        </div>
                      </div>
                    </aside>

                    {/* Main Workspace Canvas Preview */}
                    <div className="col-span-12 sm:col-span-9 p-4 space-y-3.5 bg-canvas-main">
                      {/* Top bar in mockup */}
                      <div className="flex items-center justify-between pb-1">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-text-primary">Sprint 42 Operations</h3>
                          <p className="font-body-sm text-body-sm text-text-muted">3 active incident bridges</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                            Live Mode
                          </span>
                          <div className="w-7 h-7 rounded-full bg-btn-primary text-on-primary flex items-center justify-center font-label-sm text-xs font-bold shadow-sm">
                            AT
                          </div>
                        </div>
                      </div>

                      {/* 4 Micro Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 bg-surface-card rounded-lg shadow-sm border border-border-subtle">
                          <span className="font-body-sm text-body-sm text-text-secondary">Active Tasks</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="font-headline-md text-headline-md text-text-primary">24</span>
                            <span className="text-[10px] text-status-resolved font-medium">+3 today</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-surface-card rounded-lg shadow-sm border border-border-subtle">
                          <span className="font-body-sm text-body-sm text-text-secondary">Open Tickets</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="font-headline-md text-headline-md text-text-primary">8</span>
                            <span className="text-[10px] text-severity-blocker font-bold">1 Blocker</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-surface-card rounded-lg shadow-sm border border-border-subtle">
                          <span className="font-body-sm text-body-sm text-text-secondary">SLA Rate</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="font-headline-md text-headline-md text-text-primary">96.4%</span>
                            <span className="text-[10px] text-status-resolved">▲ 1.2%</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-surface-card rounded-lg shadow-sm border border-border-subtle">
                          <span className="font-body-sm text-body-sm text-text-secondary">Velocity</span>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="font-headline-md text-headline-md text-text-primary">82%</span>
                            <span className="text-[10px] text-btn-primary">Target 80%</span>
                          </div>
                        </div>
                      </div>

                      {/* Blocker Issue Banner (Dual SLA Timer highlighted) */}
                      <div className="p-3 bg-surface-card rounded-lg shadow-sm space-y-2 border border-border-subtle">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-severity-blocker/15 text-severity-blocker font-label-sm text-[11px] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">error</span> Blocker
                            </span>
                            <span className="font-label-md text-label-md text-text-primary font-bold">TKT-1025</span>
                            <span className="font-body-sm text-body-sm text-text-secondary truncate">
                              Payment Gateway Webhook Timeout
                            </span>
                          </div>
                          {/* Dynamic SLA Countdown */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-canvas-lavender shrink-0">
                            <span className="material-symbols-outlined text-xs text-severity-blocker animate-pulse">
                              timer
                            </span>
                            <span
                              className="font-label-sm text-label-sm font-mono text-severity-blocker font-bold"
                              id="demo-countdown"
                            >
                              {formatCountdown(countdown)}
                            </span>
                          </div>
                        </div>
                        {/* Dual Progress Bar */}
                        <div className="w-full bg-canvas-main h-1.5 rounded-full overflow-hidden flex">
                          <div className="bg-status-resolved h-full w-[45%]" title="First response met"></div>
                          <div className="bg-severity-blocker h-full w-[35%]" title="Resolution remaining"></div>
                          <div className="bg-canvas-lavender h-full w-[20%]"></div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span>
                            First response: <strong className="text-status-resolved font-medium">Met (4m)</strong>
                          </span>
                          <span>
                            Target SLA Breach: <strong className="text-severity-blocker font-medium">17:45 UTC</strong>
                          </span>
                        </div>
                      </div>

                      {/* In-progress Task Card */}
                      <div className="p-3 bg-surface-card rounded-lg shadow-sm flex items-center justify-between gap-4 border border-border-subtle">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-btn-primary shrink-0">
                            <span className="material-symbols-outlined text-base">security</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-label-sm text-label-sm text-btn-primary font-bold">TASK-204</span>
                              <span className="px-2 py-0.2 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-[10px] font-semibold">
                                WIP
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-text-primary truncate">
                              Refactor Auth Middleware for Multi-Tenant SSO
                            </p>
                          </div>
                        </div>
                        <div className="w-24 shrink-0 hidden sm:block">
                          <div className="flex justify-between text-[10px] text-text-secondary mb-1">
                            <span>Progress</span>
                            <span>75%</span>
                          </div>
                          <div className="w-full bg-canvas-main h-1.5 rounded-full overflow-hidden">
                            <div className="bg-btn-primary h-full w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LOGOS STRIP */}
            <div className="mt-20 pt-10 border-t border-border-subtle/50 flex flex-col items-center">
              <p className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider mb-6 text-center">
                Trusted by high-velocity engineering and product teams worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all">
                <div className="flex items-center gap-2 text-text-secondary font-headline-sm text-headline-sm font-bold tracking-tight">
                  <span className="material-symbols-outlined text-btn-primary">domain</span> Acme Technologies
                </div>
                <div className="flex items-center gap-2 text-text-secondary font-headline-sm text-headline-sm font-bold tracking-tight">
                  <span className="material-symbols-outlined text-status-open">cloud_done</span> CloudPulse
                </div>
                <div className="flex items-center gap-2 text-text-secondary font-headline-sm text-headline-sm font-bold tracking-tight">
                  <span className="material-symbols-outlined text-btn-primary">hub</span> NexusDev
                </div>
                <div className="flex items-center gap-2 text-text-secondary font-headline-sm text-headline-sm font-bold tracking-tight">
                  <span className="material-symbols-outlined text-status-resolved">query_stats</span> FinScale
                </div>
                <div className="flex items-center gap-2 text-text-secondary font-headline-sm text-headline-sm font-bold tracking-tight">
                  <span className="material-symbols-outlined text-severity-critical">speed</span> Veloce Labs
                </div>
              </div>
            </div>
          </section>

          {/* 6 CORE FEATURES GRID */}
          <section className="w-full bg-canvas-lavender py-20 px-6 lg:px-12 border-y border-border-subtle" id="features">
            <div className="max-w-7xl mx-auto space-y-12">
              {/* Section Header */}
              <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-3">
                <span className="font-label-md text-label-md text-btn-primary uppercase tracking-widest font-bold">
                  Purpose-Built Architecture
                </span>
                <h2 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
                  Engineered for mission-critical clarity.
                </h2>
                <p className="font-body-lg text-body-lg text-text-secondary">
                  Eliminate fragmented tools. Standardize team execution, contractual ticket handling, and post-incident learning on one cohesive platform.
                </p>
              </div>

              {/* 3x2 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Feature 1: Project Management */}
                <div className="bg-surface-card p-7 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-border-subtle">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-btn-primary mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">view_kanban</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline-md text-headline-md text-text-primary">Project Management</h3>
                      <span className="px-2 py-0.5 rounded-full bg-status-open/15 text-status-open font-label-sm text-[11px] font-semibold">
                        Sprint Ready
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mb-4">
                      Organize multi-tenant roadmaps, Kanban boards, sprint velocity, and cross-team dependencies in one place.
                    </p>
                  </div>
                  <ul className="space-y-2 pt-4 border-t border-border-subtle font-body-sm text-body-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Interactive multi-lane sprint boards</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Epics and cross-repo dependency links</span>
                    </li>
                  </ul>
                </div>

                {/* Feature 2: Ticket Tracking */}
                <div className="bg-surface-card p-7 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-border-subtle">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-secondary-container/40 flex items-center justify-center text-btn-primary mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline-md text-headline-md text-text-primary">Ticket Tracking</h3>
                      <span className="px-2 py-0.5 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-[11px] font-semibold">
                        Tier-1 triage
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mb-4">
                      Separate severity from status workflows with multi-tier escalation and real-time SLA countdown clocks.
                    </p>
                  </div>
                  <ul className="space-y-2 pt-4 border-t border-border-subtle font-body-sm text-body-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Dual status & impact classification</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Direct engineer dispatch channels</span>
                    </li>
                  </ul>
                </div>

                {/* Feature 3: Real-Time Sync */}
                <div className="bg-surface-card p-7 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-border-subtle">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-btn-primary mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">forum</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline-md text-headline-md text-text-primary">Real-Time Sync</h3>
                      <span className="px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-label-sm text-[11px] font-semibold">
                        Zero Lag
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mb-4">
                      Contextual discussions, live activity feeds, file attachments, and mention-driven task handoffs.
                    </p>
                  </div>
                  <ul className="space-y-2 pt-4 border-t border-border-subtle font-body-sm text-body-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>In-line threads & team ping mentions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Encrypted screen & log file attachments</span>
                    </li>
                  </ul>
                </div>

                {/* Feature 4: SLA Timers & Audits */}
                <div className="bg-surface-card p-7 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-border-subtle">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-severity-critical mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">avg_pace</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline-md text-headline-md text-text-primary">SLA Timers & Audits</h3>
                      <span className="px-2 py-0.5 rounded-full bg-status-on-hold/15 text-status-on-hold font-label-sm text-[11px] font-semibold">
                        Contract-level
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mb-4">
                      Strict response and resolution breach windows, automated alerts, and contractual target compliance.
                    </p>
                  </div>
                  <ul className="space-y-2 pt-4 border-t border-border-subtle font-body-sm text-body-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Segmented first-response vs resolution timers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>80% alert threshold push warnings</span>
                    </li>
                  </ul>
                </div>

                {/* Feature 5: Root Cause Analysis (RCA) */}
                <div className="bg-surface-card p-7 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-border-subtle">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-btn-primary mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">troubleshoot</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline-md text-headline-md text-text-primary">Root Cause Analysis</h3>
                      <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-bold">
                        Post-Mortem
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mb-4">
                      Structured post-mortem incident documentation, 24h RCA drafts, and preventative action tracking.
                    </p>
                  </div>
                  <ul className="space-y-2 pt-4 border-t border-border-subtle font-body-sm text-body-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Guided 5-Whys investigation wizard</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Automated executive customer debriefs</span>
                    </li>
                  </ul>
                </div>

                {/* Feature 6: Analytics & Audit */}
                <div className="bg-surface-card p-7 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border border-border-subtle">
                  <div>
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-btn-primary mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">analytics</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline-md text-headline-md text-text-primary">Analytics & Audit</h3>
                      <span className="px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-label-sm text-[11px] font-semibold">
                        SOC2 Ready
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mb-4">
                      Immutable read-only system audit trails, team velocity metrics, and automated executive export.
                    </p>
                  </div>
                  <ul className="space-y-2 pt-4 border-t border-border-subtle font-body-sm text-body-sm text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Append-only chronological audit records</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>One-click CSV/PDF compliance packaging</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* 3-STEP TIMELINE WORKFLOW */}
          <section className="w-full py-24 px-6 lg:px-12 max-w-7xl mx-auto space-y-16" id="workflow">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="font-label-md text-label-md text-btn-primary uppercase tracking-widest font-bold">
                Standardized Ops Rhythm
              </span>
              <h2 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
                From detection to post-mortem in one fluid stream.
              </h2>
              <p className="font-body-lg text-body-lg text-text-secondary">
                Reduce mean-time-to-resolution by up to 68% while capturing structured institutional knowledge for every resolved issue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-surface-card p-6 rounded-xl shadow-sm relative flex flex-col space-y-4 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-canvas-lavender text-btn-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                    01
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-status-open/15 text-status-open font-label-sm text-[11px] font-semibold">
                    Stage: Ingest
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-text-primary">Detect & Ingest</h3>
                <p className="font-body-md text-body-md text-text-secondary">
                  Automated webhooks, customer portal forms, and APM alerts trigger tickets instantly routed to on-call squads with pre-configured priorities.
                </p>
                <div className="pt-4 mt-auto">
                  <div className="p-3 rounded-lg bg-canvas-main font-body-sm text-body-sm text-text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-status-open">auto_mode</span>
                    <span>Intelligent skill-based load balancing</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-card p-6 rounded-xl shadow-sm relative flex flex-col space-y-4 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-canvas-lavender text-btn-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                    02
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-[11px] font-semibold">
                    Stage: Resolve
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-text-primary">Resolve with SLA Precision</h3>
                <p className="font-body-md text-body-md text-text-secondary">
                  Engineers inspect live countdown clocks, trigger cross-team huddles, update contextual progress markers, and log git commit SHAs.
                </p>
                <div className="pt-4 mt-auto">
                  <div className="p-3 rounded-lg bg-canvas-main font-body-sm text-body-sm text-text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-severity-blocker">alarm</span>
                    <span>Active breach notifications on Slack & SMS</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-card p-6 rounded-xl shadow-sm relative flex flex-col space-y-4 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-canvas-lavender text-btn-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold">
                    03
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-label-sm text-[11px] font-semibold">
                    Stage: Prevent
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-text-primary">Prevent & Document</h3>
                <p className="font-body-md text-body-md text-text-secondary">
                  Close out incidents with structured Root Cause Analysis documentation, auto-filed Jira work items, and immutable executive audit summaries.
                </p>
                <div className="pt-4 mt-auto">
                  <div className="p-3 rounded-lg bg-canvas-main font-body-sm text-body-sm text-text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-status-resolved">task_alt</span>
                    <span>24h RCA checklist compliance locked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS / IMPACT METRICS BANNER */}
            <div className="p-8 md:p-10 rounded-2xl bg-surface-card shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border-subtle border border-border-subtle">
              <div className="pt-4 md:pt-0">
                <div className="font-headline-xl text-headline-xl md:text-[40px] text-btn-primary font-extrabold tracking-tight">
                  99.4%
                </div>
                <div className="font-label-lg text-label-lg text-text-primary mt-1 font-semibold">SLA Target Met</div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                  Contractual compliance across Tier-1 enterprise clients
                </p>
              </div>
              <div className="pt-6 md:pt-0 md:px-6">
                <div className="font-headline-xl text-headline-xl md:text-[40px] text-btn-primary font-extrabold tracking-tight">
                  3.2x
                </div>
                <div className="font-label-lg text-label-lg text-text-primary mt-1 font-semibold">Faster Resolution</div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                  From initial detection to verified staging deployment
                </p>
              </div>
              <div className="pt-6 md:pt-0 md:px-6">
                <div className="font-headline-xl text-headline-xl md:text-[40px] text-btn-primary font-extrabold tracking-tight">
                  0%
                </div>
                <div className="font-label-lg text-label-lg text-text-primary mt-1 font-semibold">Missed Hand-offs</div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                  Zero dropped alerts via contextual ownership routing
                </p>
              </div>
            </div>
          </section>

          {/* HIGH-IMPACT FINAL CONVERSION CTA */}
          <section className="w-full pb-20 px-6 lg:px-12 max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-card via-canvas-lavender to-surface-container p-10 md:p-16 shadow-lg flex flex-col items-center text-center border border-border-subtle">
              {/* Decorative radial purple bloom */}
              <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed/50 blur-3xl pointer-events-none rounded-full"></div>
              <div className="max-w-2xl space-y-4 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-btn-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-sm">
                  <span className="material-symbols-outlined text-xs">rocket_launch</span> Ready for Production
                </span>
                <h2 className="font-headline-xl text-headline-xl lg:text-[38px] lg:leading-[44px] text-text-primary font-extrabold tracking-tight">
                  Ready to bring clarity and SLA precision to your engineering teams?
                </h2>
                <p className="font-body-lg text-body-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
                  Join thousands of project managers, operations leads, and software engineers working seamlessly on Live Workspace.
                </p>
                {/* CTAs */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <Link
                    to="/workspace/dashboard"
                    className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-primary text-on-primary font-label-lg text-label-lg shadow-md transition-all group"
                  >
                    <span>Get Started for Free</span>
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </Link>
                  <a
                    href="#demo"
                    className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-lg text-label-lg shadow-sm transition-all border border-border-subtle"
                  >
                    <span className="material-symbols-outlined text-lg text-btn-primary">calendar_today</span>
                    <span>Schedule Product Demo</span>
                  </a>
                </div>
                <p className="font-body-sm text-body-sm text-text-muted pt-2">
                  Instant onboarding in 3 minutes • SOC2 compliant • Unlimited user invites on trial
                </p>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="w-full bg-surface-card border-t border-border-subtle py-12 px-6 lg:px-12">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
              <div className="col-span-2 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-btn-primary flex items-center justify-center text-on-primary font-bold shadow-sm">
                    LW
                  </div>
                  <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight">
                    Live Workspace
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary max-w-sm">
                  The unified project management, high-severity incident response, and contractual SLA operations platform.
                </p>
              </div>
              <div>
                <p className="font-label-md text-label-md text-text-primary font-bold uppercase mb-3">Product</p>
                <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                  <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#workflow" className="hover:text-primary transition-colors">Workflow</a></li>
                  <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#security" className="hover:text-primary transition-colors">Security</a></li>
                </ul>
              </div>
              <div>
                <p className="font-label-md text-label-md text-text-primary font-bold uppercase mb-3">Resources</p>
                <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                  <li><a href="#docs" className="hover:text-primary transition-colors">Documentation</a></li>
                  <li><a href="#api" className="hover:text-primary transition-colors">API Reference</a></li>
                  <li><a href="#guides" className="hover:text-primary transition-colors">Incident Guides</a></li>
                  <li><a href="#status" className="hover:text-primary transition-colors">System Status</a></li>
                </ul>
              </div>
              <div>
                <p className="font-label-md text-label-md text-text-primary font-bold uppercase mb-3">Company</p>
                <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                  <li><a href="#about" className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="#careers" className="hover:text-primary transition-colors">Careers</a></li>
                  <li><a href="#privacy" className="hover:text-primary transition-colors">Privacy</a></li>
                  <li><a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
                </ul>
              </div>
            </div>
            <div className="max-w-7xl mx-auto pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-text-muted font-body-sm text-body-sm gap-4">
              <p>© 2026 Live Workspace / Tronix365 Cloud. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <span>SOC2 Type II</span>
                <span>ISO 27001</span>
                <span>GDPR Compliant</span>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
