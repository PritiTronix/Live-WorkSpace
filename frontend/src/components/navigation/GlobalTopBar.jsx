import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import NotificationDropdown from '../../modules/notifications/components/NotificationDropdown';
import LogoutModal from '../../modules/auth/components/LogoutModal';
import KeyboardShortcutsModal from '../modals/KeyboardShortcutsModal';
import Avatar from '../common/Avatar';

export const GlobalTopBar = ({
  onOpenSearch,
  onTogglePlusMenu,
  isPlusMenuOpen,
  activeBreadcrumbs = [authService.getCurrentUserSync()?.memberships?.[0]?.organization_name || authService.getCurrentUserSync()?.organization_summary?.name || authService.getCurrentUserSync()?.organization?.name || ''],
  unreadNotifications = 0,
  slaBreachCount = 0,
  isCollapsed = false,
}) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => authService.getCurrentUserSync() || { full_name: 'Team Member', role: 'Operations', avatar_url: '' });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [presence, setPresence] = useState('ONLINE');
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const profileRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    authService.getCurrentUser().then((userData) => {
      if (userData) {
        setUser(userData);
        if (userData.presence) setPresence(userData.presence);
      }
    });

    const handleProfileUpdated = (e) => {
      if (e.detail) {
        setUser((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('user-profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdated);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target) &&
        !event.target.closest?.('[role="dialog"]')
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Esc key listener for profile popover
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isProfileOpen) {
        setIsProfileOpen(false);
        profileTriggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileOpen]);

  const handlePresenceChange = async (newPresence) => {
    const clean = String(newPresence).toLowerCase();
    setPresence(clean);
    await authService.updatePresence(clean);
    window.dispatchEvent(new CustomEvent('presence-updated', { detail: { presence: clean } }));
  };

  const getPresenceColor = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'away':
        return 'bg-status-on-hold';
      case 'busy':
      case 'dnd':
        return 'bg-severity-blocker';
      case 'offline':
        return 'bg-surface-outline';
      default:
        return 'bg-status-resolved';
    }
  };

  return (
    <header className={`fixed top-0 right-0 h-16 bg-surface-card/90 backdrop-blur-xl z-40 border-b border-border-subtle shadow-[0_1px_8px_rgba(20,21,41,0.04)] px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-200 ${
      isCollapsed ? 'left-20' : 'left-72'
    }`}>
      {/* 1. Left Region: Breadcrumb Navigation */}
      <div className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-xs md:max-w-sm lg:max-w-none">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 font-label-md text-label-md overflow-hidden text-ellipsis whitespace-nowrap">
          {activeBreadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-text-muted">/</span>}
              <span
                className={`truncate max-w-[110px] sm:max-w-[160px] md:max-w-none ${
                  idx === activeBreadcrumbs.length - 1
                    ? 'font-headline-sm text-headline-sm text-text-primary'
                    : 'text-text-muted hover:text-text-primary cursor-pointer transition-colors'
                }`}
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* 2. Center Region: Global Search Trigger */}
      <div className="flex-1 max-w-xs xl:max-w-md mx-2 lg:mx-6 hidden md:block">
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
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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
            <button
              id="notif-bell-btn"
              aria-label="Notifications"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className={`relative w-10 h-10 rounded-lg hover:bg-canvas-lavender text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer ${
                isNotifOpen ? 'bg-canvas-lavender text-primary' : ''
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-btn-primary text-on-primary font-label-sm text-[10px] leading-none flex items-center justify-center font-bold">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              triggerRef={notifRef}
            />
          </div>

          {/* Documentation Link (from VITE_DOCS_URL, hidden if empty) */}
          {import.meta.env.VITE_DOCS_URL && (
            <a
              href={import.meta.env.VITE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Documentation"
              className="w-10 h-10 rounded-lg hover:bg-canvas-lavender text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
              title="Documentation"
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </a>
          )}
        </div>

        {/* User Profile Context & Dropdown Trigger */}
        <div ref={profileRef} className="relative">
          <div
            id="user-profile-trigger"
            ref={profileTriggerRef}
            tabIndex={0}
            role="button"
            aria-label="User profile menu"
            aria-haspopup="true"
            aria-expanded={isProfileOpen}
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsProfileOpen((prev) => !prev);
              }
            }}
            className={`flex items-center gap-space-sm pl-space-xs cursor-pointer group rounded-lg p-1 transition-all ${
              isProfileOpen ? 'bg-canvas-lavender ring-2 ring-primary' : 'hover:bg-canvas-lavender'
            }`}
          >
            <div className="relative">
              <Avatar
                src={user.avatar_url}
                name={user.full_name}
                size="md"
                className="group-hover:opacity-90 transition-opacity"
              />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ${getPresenceColor(
                  presence
                )} ring-2 ring-surface-card`}
              ></span>
            </div>
            <div className="text-left hidden lg:block">
              <p className="font-label-md text-label-md text-text-primary leading-none">{user.full_name || 'Team Member'}</p>
              <p className="font-label-sm text-label-sm text-primary leading-none mt-1 capitalize">{user.role || 'member'}</p>
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
                  <Avatar
                    src={user.avatar_url}
                    name={user.full_name}
                    size="lg"
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
                  {[['online', 'bg-status-resolved', 'Online'], ['away', 'bg-status-on-hold', 'Away'], ['busy', 'bg-severity-blocker', 'Busy']].map(([val, dotCls, label]) => (
                    <button
                      key={val}
                      onClick={() => handlePresenceChange(val)}
                      className={`py-1 px-2 rounded-md font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-all ${
                        presence?.toLowerCase() === val
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
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/workspace/settings/profile');
                  }}
                  className="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  <span>Personal Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/workspace/settings/notifications');
                  }}
                  className="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                  <span>Notification Preferences</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsShortcutsOpen(true);
                  }}
                  className="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-text-secondary hover:bg-canvas-lavender hover:text-text-primary transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">keyboard</span>
                  <span>Keyboard Shortcuts</span>
                </button>
                <div className="pt-1 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-error hover:bg-error-container/30 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Screen 10: Logout Confirmation Modal */}
          <LogoutModal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            currentUser={user}
            triggerRef={profileTriggerRef}
          />

          {/* Keyboard Shortcuts Cheatsheet Modal */}
          <KeyboardShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />
        </div>
      </div>
    </header>
  );
};

export default GlobalTopBar;
