import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import GlobalTopBar from '../components/navigation/GlobalTopBar';
import GlobalPlusMenu from '../components/navigation/GlobalPlusMenu';
import GlobalSearchOverlay from '../components/navigation/GlobalSearchOverlay';
import { notificationService } from '../services/api';
import CreateTaskModal from '../modules/tasks/components/CreateTaskModal';
import { taskService } from '../modules/tasks/services/taskService';
import CreateTicketModal from '../modules/tickets/components/CreateTicketModal';
import CreateProjectModal from '../modules/projects/CreateProjectModal';
import InviteMemberModal from '../modules/members/components/InviteMemberModal';
import FileUploadModal from '../modules/files/components/FileUploadModal';
import CreateDiscussionModal from '../modules/discussions/components/CreateDiscussionModal';

/**
 * DashboardLayout
 * Application workspace shell:
 * - Collapsible Sidebar (w-72 or w-20) on desktop
 * - Mobile: hidden sidebar replaced by slide-in drawer + bottom nav bar
 * - Global Top Bar with live unread notification count
 * - Global Plus Action Menu
 * - Global Spotlight Search (Ctrl+K / Cmd+K)
 */
export const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isCreateDiscussionModalOpen, setIsCreateDiscussionModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch live unread count on mount and location change
  useEffect(() => {
    notificationService.getUnreadCount().then((count) => setUnreadCount(count));
  }, [location.pathname]);

  // Dynamic breadcrumbs based on active route
  const getBreadcrumbs = () => {
    if (location.pathname.startsWith('/workspace/projects')) {
      return ['Live Workspace', 'Projects', 'Overview'];
    }
    return ['Live Workspace', 'Platform Revamp', 'Overview'];
  };

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleActionSelect = (actionType) => {
    setIsPlusMenuOpen(false);
    if (actionType === 'CREATE_PROJECT') {
      setIsCreateProjectModalOpen(true);
    } else if (actionType === 'CREATE_TASK') {
      setIsCreateTaskModalOpen(true);
    } else if (actionType === 'CREATE_TICKET') {
      setIsCreateTicketModalOpen(true);
    } else if (actionType === 'INVITE_MEMBER') {
      setIsInviteMemberModalOpen(true);
    } else if (actionType === 'UPLOAD_DOC') {
      setIsFileUploadModalOpen(true);
    } else if (actionType === 'POST_ANNOUNCEMENT') {
      setIsCreateDiscussionModalOpen(true);
    }
  };

  const handleSearchResultSelect = (result) => {
    setIsSearchOpen(false);
    if (result && result.route) {
      navigate(result.route);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-default text-text-primary flex">
      {/* ── 1. Desktop Sidebar ── */}
      <div className="hidden md:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenCreate={() => setIsPlusMenuOpen(true)}
        />
      </div>

      {/* ── 2. Mobile Drawer Sidebar (Prompt 89) ── */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          isMobileSidebarOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        <div
          className={`absolute top-0 left-0 bottom-0 w-72 bg-surface-sidebar shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <span className="font-headline-sm text-headline-sm text-text-primary">Navigation</span>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-secondary"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => {}}
              onOpenCreate={() => {
                setIsMobileSidebarOpen(false);
                setIsPlusMenuOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Workspace Viewport ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'
        }`}
      >
        {/* Mobile Top Bar (hamburger + logo) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface-card border-b border-border-subtle flex items-center px-4 gap-3 z-40 shadow-sm">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            type="button"
            className="w-9 h-9 rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-secondary"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm">
              LW
            </div>
            <span className="font-headline-sm text-headline-sm text-text-primary">Live Workspace</span>
          </div>
          <button
            onClick={() => setIsSearchOpen(true)}
            type="button"
            className="w-9 h-9 rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-secondary"
            aria-label="Search"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setIsPlusMenuOpen((prev) => !prev)}
              type="button"
              className="w-9 h-9 rounded-lg bg-btn-primary text-on-primary flex items-center justify-center shadow-sm"
              aria-label="Create"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
        </div>

        {/* Desktop Global Top Bar */}
        <div className="hidden md:block">
          <GlobalTopBar
            isCollapsed={isSidebarCollapsed}
            onOpenSearch={() => setIsSearchOpen(true)}
            onTogglePlusMenu={() => setIsPlusMenuOpen((prev) => !prev)}
            isPlusMenuOpen={isPlusMenuOpen}
            activeBreadcrumbs={getBreadcrumbs()}
            unreadNotifications={unreadCount}
            slaBreachCount={2}
          />
        </div>

        {/* Content Viewport */}
        <main className="flex-1 pt-14 md:pt-20 px-4 md:px-6 lg:px-8 py-6 min-h-screen overflow-y-auto pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation Bar ── */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface-card border-t border-border-subtle flex items-center justify-around px-2 z-40 md:hidden shadow-[0_-2px_8px_rgba(20,21,41,0.06)]">
          <MobileNavItem to="/workspace/dashboard" icon="home" label="Home" />
          <MobileNavItem to="/workspace/tasks" icon="task_alt" label="Tasks" />
          <MobileNavItem to="/workspace/tickets" icon="confirmation_number" label="Tickets" badge={3} />
          <MobileNavItem to="/workspace/notifications" icon="notifications" label="Alerts" badge={unreadCount} />
          <MobileNavItem to="/workspace/settings" icon="settings" label="Settings" />
        </nav>
      </div>

      {/* ── Global Modals & Overlays ── */}
      <GlobalPlusMenu
        isOpen={isPlusMenuOpen}
        onClose={() => setIsPlusMenuOpen(false)}
        onActionSelect={handleActionSelect}
      />

      <GlobalSearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSearchResultSelect}
      />

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onCreateTask={async (payload) => {
          await taskService.create(payload);
        }}
      />

      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setIsCreateTicketModalOpen(false)}
        onTicketCreated={() => {
          setIsCreateTicketModalOpen(false);
          window.dispatchEvent(new CustomEvent('ticket-created'));
        }}
      />

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onProjectCreated={() => {
          setIsCreateProjectModalOpen(false);
          window.dispatchEvent(new CustomEvent('project-created'));
        }}
      />

      <InviteMemberModal
        isOpen={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
        onMemberInvited={() => {
          setIsInviteMemberModalOpen(false);
        }}
      />

      <FileUploadModal
        isOpen={isFileUploadModalOpen}
        onClose={() => setIsFileUploadModalOpen(false)}
        onFileUploaded={() => {
          setIsFileUploadModalOpen(false);
        }}
      />

      <CreateDiscussionModal
        isOpen={isCreateDiscussionModalOpen}
        onClose={() => setIsCreateDiscussionModalOpen(false)}
        onDiscussionCreated={() => {
          setIsCreateDiscussionModalOpen(false);
        }}
      />
    </div>
  );
};

/** Reusable bottom nav tab */
function MobileNavItem({ to, icon, label, badge }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[56px] ${
        isActive ? 'text-primary' : 'text-text-muted'
      }`}
    >
      <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
        {icon}
      </span>
      <span className={`font-label-sm text-[10px] leading-none ${isActive ? 'text-primary font-semibold' : 'text-text-muted'}`}>
        {label}
      </span>
      {badge > 0 && (
        <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-severity-blocker text-on-primary text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

export default DashboardLayout;
