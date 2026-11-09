import React, { useState, useRef, useEffect } from 'react';
import { authService, DEFAULT_USER } from '../../services/api';
import NotificationDropdown from '../../modules/notifications/components/NotificationDropdown';

export const GlobalTopBar = ({
  onOpenSearch,
  onTogglePlusMenu,
  isPlusMenuOpen,
  activeBreadcrumbs = ['Live Workspace', 'Platform Revamp', 'Overview'],
  unreadNotifications = 0,
  slaBreachCount = 2,
  isCollapsed = false,
}) => {
  const [user, setUser] = useState(DEFAULT_USER);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [presence, setPresence] = useState('ONLINE');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    authService.getCurrentUser().then((userData) => {
      if (userData) {
        setUser(userData);
        if (userData.presence) setPresence(userData.presence);
      }
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresenceChange = async (newPresence) => {
    setPresence(newPresence);
    await authService.updatePresence(newPresence);
  };

  const getPresenceColor = (status) => {
    switch (status) {
      case 'AWAY':
        return 'bg-status-on-hold';
      case 'DND':
        return 'bg-severity-blocker';
      default:
        return 'bg-status-resolved';
    }
  };

  return (
    <header className={`fixed top-0 right-0 h-16 bg-surface-card/90 backdrop-blur-xl z-40 border-b border-border-subtle shadow-[0_1px_8px_rgba(20,21,41,0.04)] px-space-lg flex items-center justify-between transition-all duration-200 ${
      isCollapsed ? 'left-20' : 'left-72'
    }`}>
      {/* 1. Left Region: Breadcrumb Navigation */}
      <div className="flex items-center gap-space-sm min-w-0">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 font-label-md text-label-md whitespace-nowrap">
          {activeBreadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-text-muted">/</span>}
              <span
                className={
                  idx === activeBreadcrumbs.length - 1
                    ? 'font-headline-sm text-headline-sm text-text-primary'
                    : 'text-text-muted hover:text-text-primary cursor-pointer transition-colors'
                }
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* 2. Center Region: Global Search Trigger */}
      <div className="flex-1 max-w-lg mx-space-xl hidden md:block">
        <div
          onClick={onOpenSearch}
          onMouseEnter={() => setIsSearchHovered(true)}
          onMouseLeave={() => setIsSearchHovered(false)}
          className="relative flex items-center group cursor-pointer"
        >
          <span className="material-symbols-outlined absolute left-3 text-text-muted text-[18px] group-hover:text-primary transition-colors">
            search
          </span>
          <input
            className={`w-full h-10 pl-9 pr-14 rounded-lg font-body-sm text-body-sm text-text-primary placeholder:text-text-muted cursor-pointer transition-all focus:outline-none ${
              isSearchHovered ? 'bg-canvas-lavender' : 'bg-canvas-main'
            }`}
            placeholder="Search projects, tasks, tickets, people... (Ctrl + K)"
            readOnly
            type="text"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 rounded bg-surface-card text-text-muted font-label-sm text-label-sm shadow-sm pointer-events-none border border-border-subtle">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* 3. Right Region: CTA, Notification Bell & Profile */}
      <div className="flex items-center gap-space-md">
        {/* Quick Create Action Button */}
        <button
          id="create-action-btn"
          onClick={onTogglePlusMenu}
          className={`h-10 px-3.5 rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-primary text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-[0_2px_8px_rgba(104,72,232,0.2)] transition-all transform active:scale-95 ${
            isPlusMenuOpen ? 'ring-2 ring-primary-container ring-offset-2' : ''
          }`}
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Ticket</span>
        </button>

        {/* Notifications & Help Utilities */}
        <div className="flex items-center gap-space-xs">
          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            {slaBreachCount > 0 ? (
              <button
                aria-label="Active Breach Notifications"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`relative w-10 h-10 rounded-lg bg-error-container text-severity-blocker flex items-center justify-center shadow-sm hover:bg-error-container/80 transition-colors ${isNotifOpen ? 'ring-2 ring-severity-blocker' : ''}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] animate-bounce">
                  notifications_active
                </span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-blocker opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-severity-blocker text-on-error font-label-sm text-[9px] items-center justify-center font-bold">
                    {slaBreachCount}
                  </span>
                </span>
              </button>
            ) : (
              <button
                aria-label="Notifications"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                className={`relative w-10 h-10 rounded-lg hover:bg-canvas-lavender text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors ${isNotifOpen ? 'bg-canvas-lavender text-primary' : ''}`}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-severity-blocker text-on-primary font-label-sm text-[10px] leading-none flex items-center justify-center font-bold">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {/* Notification Dropdown */}
            <NotificationDropdown
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
            />
          </div>

          {/* Documentation Icon */}
          <button
            aria-label="Documentation"
            className="w-10 h-10 rounded-lg hover:bg-canvas-lavender text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
          </button>
        </div>

        {/* User Profile Context & Dropdown Trigger */}
        <div ref={profileRef} className="relative">
          <div
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`flex items-center gap-space-sm pl-space-xs cursor-pointer group rounded-lg p-1 transition-all ${
              isProfileOpen ? 'bg-canvas-lavender ring-2 ring-primary' : 'hover:bg-canvas-lavender'
            }`}
          >
            <div className="relative">
              <img
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover group-hover:opacity-90 transition-opacity"
                src={user.avatar_url}
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getPresenceColor(
                  presence
                )} ring-2 ring-surface-card`}
              ></span>
            </div>
            <div className="text-left hidden lg:block">
              <p className="font-label-md text-label-md text-text-primary leading-none">{user.full_name}</p>
              <p className="font-label-sm text-label-sm text-primary leading-none mt-1">{user.role}</p>
            </div>
            <span className="material-symbols-outlined text-text-muted text-[16px] group-hover:text-text-primary transition-colors hidden sm:inline-block">
              {isProfileOpen ? 'keyboard_arrow_up' : 'expand_more'}
            </span>
          </div>

          {/* Expanded Profile Popover Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-72 rounded-xl bg-surface-card shadow-xl p-space-sm space-y-space-sm z-50 border border-border-subtle animate-in fade-in zoom-in-95 duration-150">
              <div className="p-space-sm rounded-lg bg-canvas-main flex items-center gap-space-sm">
                <div className="relative">
                  <img
                    alt={user.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                    src={user.avatar_url}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getPresenceColor(
                      presence
                    )} ring-2 ring-surface-card`}
                  ></span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-headline-sm text-headline-sm text-text-primary truncate">{user.full_name}</h4>
                  <p className="font-body-sm text-body-sm text-text-secondary truncate">{user.email}</p>
                </div>
              </div>

              {/* Presence Status Selector */}
              <div className="space-y-1">
                <label className="font-label-sm text-label-sm text-text-muted px-space-xs uppercase tracking-wider">
                  Presence Status
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-surface-container">
                  {[['ONLINE', 'bg-status-resolved', 'Online'], ['AWAY', 'bg-status-on-hold', 'Away'], ['DND', 'bg-severity-blocker', 'DND']].map(([val, dotCls, label]) => (
                    <button
                      key={val}
                      onClick={() => handlePresenceChange(val)}
                      className={`py-1 px-2 rounded-md font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all ${
                        presence === val
                          ? 'bg-surface-card shadow-sm text-text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                      type="button"
                    >
                      <span className={`w-2 h-2 rounded-full ${dotCls}`}></span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Items */}
              <div className="pt-1 border-t border-border-subtle space-y-0.5 font-label-md text-label-md">
                <a href="#settings" className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  <span>Personal Settings</span>
                </a>
                <a href="#notifications" className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>Notification Preferences</span>
                </a>
                <a href="#shortcuts" className="flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors">
                  <span className="material-symbols-outlined text-[18px]">keyboard</span>
                  <span>Keyboard Shortcuts</span>
                </a>
                <div className="pt-1 border-t border-border-subtle">
                  <button
                    onClick={() => authService.logout()}
                    className="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-error hover:bg-error-container/30 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalTopBar;
