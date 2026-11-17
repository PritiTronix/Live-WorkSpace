import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

/**
 * Checks whether an access token exists and is not expired.
 */
const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Calculates display initials from user profile or email.
 */
const getUserInitials = (user) => {
  if (!user) return 'U';
  if (user.full_name?.trim()) {
    const parts = user.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user.email?.trim()) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return 'U';
};

/**
 * Top navigation links.
 * Note: 'Solutions' has been audited and removed from navigation because no
 * matching 'Solutions' section exists in the landing page design.
 */
const NAV_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'about', label: 'About' },
];

/**
 * Single IntersectionObserver hook to observe active section and highlight nav link.
 */
const useActiveSection = (sectionIds, initialSection = 'features') => {
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (sectionIds.includes(hash)) {
        return hash;
      }
    }
    return initialSection;
  });

  const isManualScrolling = useRef(false);

  useEffect(() => {
    // Include 'hero' to observe when user is at the very top of the page
    const idsToObserve = ['hero', ...sectionIds];
    const elements = idsToObserve
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (elements.length === 0) return;

    const ratios = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrolling.current) return;

        entries.forEach((entry) => {
          ratios.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        });

        let highestId = null;
        let highestRatio = 0;

        for (const [id, ratio] of ratios.entries()) {
          if (ratio > highestRatio) {
            highestRatio = ratio;
            highestId = id;
          }
        }

        if (highestId === 'hero') {
          // At the very top of the page, highlight Features as the design shows
          setActiveSection('features');
        } else if (highestId && sectionIds.includes(highestId)) {
          setActiveSection(highestId);
        }
      },
      {
        rootMargin: '-64px 0px -40% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [sectionIds]);

  return [activeSection, setActiveSection, isManualScrolling];
};

export const LandingPage = () => {
  const [countdown, setCountdown] = useState(42 * 60 + 18); // 42m 18s
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | null

  // User authentication & avatar state
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);

  // Active section tracking with IntersectionObserver
  const sectionIds = ['features', 'workflow', 'pricing', 'about'];
  const [activeSection, setActiveSection, isManualScrolling] = useActiveSection(sectionIds, 'features');

  // Demo destination configuration
  const demoUrl = import.meta.env.VITE_DEMO_URL?.trim();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
  const demoDestination = demoUrl || (supportEmail ? `mailto:${supportEmail}?subject=Live%20Workspace%20Product%20Demo%20Request` : null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine auth status and fetch user details for avatar/initials
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const valid = isTokenValid(token);
    setIsLoggedIn(valid);
    if (valid) {
      const syncUser = authService.getCurrentUserSync();
      if (syncUser && (syncUser.full_name || syncUser.email || syncUser.avatar_url)) {
        setCurrentUser(syncUser);
      }
      authService.getCurrentUser().then((userData) => {
        if (userData && (userData.full_name || userData.email || userData.avatar_url)) {
          setCurrentUser(userData);
        }
      }).catch(() => {});
    }
  }, []);

  // Scroll to hash section on initial page load if hash exists
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        setActiveSection(hash);
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [setActiveSection]);

  // Handle smooth scroll, URL hash update via replaceState (no page jump), and mobile menu close
  const handleNavClick = (e, targetId) => {
    if (e) e.preventDefault();
    const el = document.getElementById(targetId);
    if (!el) return;

    isManualScrolling.current = true;
    setActiveSection(targetId);
    window.history.replaceState(null, '', `#${targetId}`);

    el.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      isManualScrolling.current = false;
    }, 750);

    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !mobileToggleRef.current?.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close mobile menu on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => handleNavClick(e, link.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={
                    isActive
                      ? 'text-btn-primary font-label-lg transition-colors font-semibold'
                      : 'font-body-md text-body-md text-text-secondary hover:text-text-primary transition-colors'
                  }
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            {!isLoggedIn ? (
              <>
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
              </>
            ) : (
              <>
                <Link
                  to="/workspace/dashboard"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-btn-primary font-label-lg text-label-lg text-on-primary hover:bg-primary-hover shadow-sm transition-all"
                >
                  Go to Workspace
                </Link>
                <Link
                  to="/workspace/dashboard"
                  className="focus:outline-none focus:ring-2 focus:ring-btn-primary/30 rounded-full"
                  title={currentUser?.full_name ? `${currentUser.full_name} (${currentUser.email || ''})` : 'User profile'}
                >
                  {currentUser?.avatar_url && !avatarError ? (
                    <img
                      alt={currentUser.full_name || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-border-subtle hover:ring-btn-primary transition-all"
                      src={currentUser.avatar_url}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-btn-primary text-on-primary font-bold text-xs flex items-center justify-center ring-2 ring-border-subtle hover:ring-btn-primary shadow-sm transition-all">
                      {getUserInitials(currentUser)}
                    </div>
                  )}
                </Link>
              </>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              ref={mobileToggleRef}
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-canvas-lavender focus:outline-none focus:ring-2 focus:ring-btn-primary/30 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden border-b border-border-subtle bg-surface-card/98 backdrop-blur-xl px-6 py-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <nav className="flex flex-col space-y-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={(e) => handleNavClick(e, link.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={
                      isActive
                        ? 'text-btn-primary font-label-lg font-semibold py-2 px-3 rounded-lg bg-canvas-lavender transition-colors'
                        : 'font-body-md text-text-secondary hover:text-text-primary hover:bg-canvas-lavender/60 py-2 px-3 rounded-lg transition-colors'
                    }
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
            {!isLoggedIn && (
              <div className="pt-4 mt-3 border-t border-border-subtle flex flex-col gap-2.5 sm:hidden">
                <Link
                  to="/auth/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg border border-border-subtle bg-surface-card font-label-lg text-text-primary hover:bg-canvas-lavender transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/workspace/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-btn-primary font-label-lg text-on-primary hover:bg-primary-hover shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <main className="w-full pt-16 bg-canvas-main min-h-screen">
        <div className="flex flex-col w-full">
          {/* HERO SECTION */}
          <section id="hero" className="relative w-full overflow-hidden px-6 lg:px-12 pt-10 pb-20 max-w-7xl mx-auto scroll-mt-16" style={{ scrollMarginTop: '64px' }}>
            {/* Ambient subtle background glow */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-primary-fixed/40 via-surface-container-low/20 to-transparent blur-3xl pointer-events-none -z-10 rounded-full"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Copy & Actions */}
              <div className="lg:col-span-6 flex flex-col items-start space-y-6">
                {/* Release Pill */}
                <a
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-canvas-lavender hover:bg-surface-container-high transition-all shadow-sm"
                  href="#features"
                  onClick={(e) => handleNavClick(e, 'features')}
                >
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
          <section className="w-full bg-canvas-lavender py-20 px-6 lg:px-12 border-y border-border-subtle scroll-mt-16" id="features" style={{ scrollMarginTop: '64px' }}>
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

          {/* 3-STEP TIMELINE WORKFLOW & SOLUTIONS */}
          <section className="w-full py-24 px-6 lg:px-12 max-w-7xl mx-auto space-y-16 scroll-mt-16" id="workflow" style={{ scrollMarginTop: '64px' }}>
            <div id="solutions" className="scroll-mt-16" style={{ scrollMarginTop: '64px' }}></div>
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

          {/* PRICING SECTION */}
          <section className="w-full py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-12 scroll-mt-16" id="pricing" style={{ scrollMarginTop: '64px' }}>
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="font-label-md text-label-md text-btn-primary uppercase tracking-widest font-bold">
                Transparent Pricing
              </span>
              <h2 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
                Predictable plans for teams of any scale.
              </h2>
              <p className="font-body-lg text-body-lg text-text-secondary">
                No hidden per-ticket surcharges. Full dual-timer SLA automation and immutable audit logging included.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter */}
              <div className="bg-surface-card p-8 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-headline-md text-headline-md text-text-primary font-bold">Starter</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-1">For growing engineering squads.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-text-primary">$0</span>
                    <span className="text-xs text-text-muted">/ forever free</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Up to 10 active projects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Standard SLA response timers</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>30-day activity audit history</span>
                    </li>
                  </ul>
                </div>
                <Link
                  to="/auth/register"
                  className="mt-8 w-full py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-bold text-center text-xs transition-colors block"
                >
                  Get Started Free
                </Link>
              </div>

              {/* Professional */}
              <div className="bg-surface-card p-8 rounded-2xl border-2 border-btn-primary shadow-lg flex flex-col justify-between relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-btn-primary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                  Most Popular
                </span>
                <div>
                  <h3 className="font-headline-md text-headline-md text-text-primary font-bold">Pro Scale</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-1">For production ops & multi-squad teams.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-btn-primary">$49</span>
                    <span className="text-xs text-text-muted">/ member / month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Unlimited projects, boards & tickets</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Dual-timer SLA warning countdown engine</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>1-year immutable audit ledger</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Priority on-call paging & WebSocket sync</span>
                    </li>
                  </ul>
                </div>
                <Link
                  to="/auth/register"
                  className="mt-8 w-full py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-bold text-center text-xs transition-colors shadow-sm block"
                >
                  Start 14-Day Pro Trial
                </Link>
              </div>

              {/* Enterprise */}
              <div className="bg-surface-card p-8 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-headline-md text-headline-md text-text-primary font-bold">Enterprise</h3>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-1">For mission-critical regulated organizations.</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-text-primary">Custom</span>
                    <span className="text-xs text-text-muted">/ dedicated cluster</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs text-text-secondary">
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Custom contractual SLA guarantees</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Dedicated Neon PostgreSQL compute branch</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>Single Sign-On (SAML / Okta / Azure AD)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-status-resolved">check</span>
                      <span>24/7 dedicated SRE incident coordinator</span>
                    </li>
                  </ul>
                </div>
                <Link
                  to="/auth/login"
                  className="mt-8 w-full py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary font-bold text-center text-xs transition-colors block"
                >
                  Contact Enterprise Sales
                </Link>
              </div>
            </div>
          </section>

          {/* SECURITY & COMPLIANCE SECTION */}
          <section className="w-full bg-surface-card py-20 px-6 lg:px-12 border-y border-border-subtle scroll-mt-16" id="security" style={{ scrollMarginTop: '64px' }}>
            <div className="max-w-7xl mx-auto space-y-12">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <span className="font-label-md text-label-md text-btn-primary uppercase tracking-widest font-bold">
                  Enterprise Security
                </span>
                <h2 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
                  Zero Trust Architecture from Storage to Edge.
                </h2>
                <p className="font-body-lg text-body-lg text-text-secondary">
                  Engineered with end-to-end TLS 1.3, AES-256 database encryption, and cryptographic JWT sessions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-xl bg-canvas-main border border-border-subtle space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">shield</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-text-primary font-bold">SOC2 & ISO 27001</h4>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Audited compliance controls guaranteeing data integrity and tenant isolation.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-canvas-main border border-border-subtle space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">key</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-text-primary font-bold">Industrial RBAC</h4>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Role inheritance hierarchy from Owner down to Viewer with strict server-side validation.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-canvas-main border border-border-subtle space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">database</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-text-primary font-bold">PostgreSQL Isolation</h4>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Multi-tenant data scoping enforced via parameterized queries on Neon Cloud PostgreSQL.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-canvas-main border border-border-subtle space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">speed</span>
                  </div>
                  <h4 className="font-headline-sm text-headline-sm text-text-primary font-bold">DDoS & Rate Limiting</h4>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Proxy-aware multi-user rate limiting protecting all public authentication and API endpoints.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ABOUT SECTION */}
          <section className="w-full py-20 px-6 lg:px-12 max-w-7xl mx-auto space-y-8 scroll-mt-16" id="about" style={{ scrollMarginTop: '64px' }}>
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <span className="font-label-md text-label-md text-btn-primary uppercase tracking-widest font-bold">
                About Live Workspace
              </span>
              <h2 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
                Built by Engineers, for Mission-Critical Engineering Teams.
              </h2>
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                Live Workspace was conceived by founders Bhavesh Burad and Shubhaam Tronix to eliminate the friction between sprint execution, defect tracking, and high-stakes SLA compliance. We provide engineering organizations with an all-in-one operational ecosystem designed for uncompromised reliability.
              </p>
              <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/workspace/dashboard"
                  className="px-6 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-semibold text-xs transition-colors shadow-sm"
                >
                  Explore Platform Live
                </Link>
                <a
                  href="mailto:contact@tronix365.cloud"
                  className="px-6 py-2.5 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary border border-border-subtle font-semibold text-xs transition-colors"
                >
                  Contact Founders
                </a>
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
                  {demoDestination && (
                    <a
                      href={demoDestination}
                      target={demoDestination.startsWith('http') ? '_blank' : undefined}
                      rel={demoDestination.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-lg text-label-lg shadow-sm transition-all border border-border-subtle"
                    >
                      <span className="material-symbols-outlined text-lg text-btn-primary">calendar_today</span>
                      <span>Schedule Product Demo</span>
                    </a>
                  )}
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
                  <li><a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="hover:text-primary transition-colors">Features</a></li>
                  <li><a href="#workflow" onClick={(e) => handleNavClick(e, 'workflow')} className="hover:text-primary transition-colors">Workflow</a></li>
                  <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="hover:text-primary transition-colors">Pricing</a></li>
                  <li><a href="#security" onClick={(e) => handleNavClick(e, 'security')} className="hover:text-primary transition-colors">Security</a></li>
                </ul>
              </div>
              <div>
                <p className="font-label-md text-label-md text-text-primary font-bold uppercase mb-3">Resources</p>
                <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                  <li>
                    {import.meta.env.VITE_DOCS_URL ? (
                      <a href={import.meta.env.VITE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Documentation</a>
                    ) : (
                      <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="hover:text-primary transition-colors">Documentation</a>
                    )}
                  </li>
                  <li>
                    {import.meta.env.VITE_DOCS_URL ? (
                      <a href={import.meta.env.VITE_DOCS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">API Reference</a>
                    ) : (
                      <a href="#workflow" onClick={(e) => handleNavClick(e, 'workflow')} className="hover:text-primary transition-colors">API Reference</a>
                    )}
                  </li>
                  <li><Link to="/workspace/rca" className="hover:text-primary transition-colors">Incident Guides</Link></li>
                  <li>
                    {import.meta.env.VITE_STATUS_URL ? (
                      <a href={import.meta.env.VITE_STATUS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">System Status (Live)</a>
                    ) : (
                      <Link to="/workspace/dashboard" className="hover:text-primary transition-colors">System Status (Live)</Link>
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-label-md text-label-md text-text-primary font-bold uppercase mb-3">Company</p>
                <ul className="space-y-2 font-body-sm text-body-sm text-text-secondary">
                  <li><a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="hover:text-primary transition-colors">About</a></li>
                  <li><a href="mailto:careers@tronix365.cloud?subject=Engineering%20Careers%20Application" className="hover:text-primary transition-colors">Careers</a></li>
                  <li><button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-primary transition-colors text-left cursor-pointer">Privacy Policy</button></li>
                  <li><button type="button" onClick={() => setLegalModal('terms')} className="hover:text-primary transition-colors text-left cursor-pointer">Terms of Service</button></li>
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

      {/* Interactive Terms & Privacy Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-container/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {legalModal === 'terms' ? 'gavel' : 'policy'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary font-['Plus_Jakarta_Sans']">
                  {legalModal === 'terms' ? 'Terms of Service' : 'Privacy & Security Policy'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-text-secondary leading-relaxed">
              {legalModal === 'terms' ? (
                <>
                  <p className="font-semibold text-text-primary">Last Updated: March 2026 • Live Workspace Enterprise SLA Agreement</p>
                  <p>1. By accessing or using the Live Workspace platform operated by Tronix365 Cloud, you agree to comply with and be bound by these enterprise Terms of Service.</p>
                  <p>2. Authorized users are granted role-based access to workspace resources including projects, task boards, defect tickets, SLA timers, and team discussions in accordance with their designated role level.</p>
                  <p>3. Enterprise organizations retain complete ownership and intellectual property rights over all uploaded attachments, tickets, post-mortem RCA documentation, and operational telemetry stored in Neon PostgreSQL.</p>
                  <p>4. Availability guarantees and service level agreements (SLAs) are enforced pursuant to your subscription plan. Contractual dual-timer tracking operates 24/7 with multi-region compute failover.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-text-primary">Last Updated: March 2026 • Live Workspace Privacy & Data Governance</p>
                  <p>1. Tronix365 Cloud prioritizes the confidentiality, integrity, and availability of your engineering data across all services.</p>
                  <p>2. All network transmissions are strictly encrypted via TLS 1.3 with Perfect Forward Secrecy. Data at rest is encrypted utilizing AES-256 keys on Neon Cloud PostgreSQL.</p>
                  <p>3. Authentication utilizes tamper-resistant cryptographic JWT tokens with short-lived access periods and rotating refresh tokens.</p>
                  <p>4. We do not sell, rent, or monetize your project records, code metadata, or team communications to any third parties.</p>
                </>
              )}
            </div>
            <div className="px-6 py-3 bg-surface-container/40 border-t border-border-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-semibold text-xs transition-colors cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default LandingPage;
