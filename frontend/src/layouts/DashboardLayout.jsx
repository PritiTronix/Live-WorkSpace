import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import GlobalTopBar from '../components/navigation/GlobalTopBar';
import GlobalPlusMenu from '../components/navigation/GlobalPlusMenu';
import GlobalSearchOverlay from '../components/navigation/GlobalSearchOverlay';
import {authService, notificationService, organizationService, dashboardService, connectDashboardWebSocket, safeCloseWebSocket } from '../services/api';
import CreateTaskModal from '../modules/tasks/components/CreateTaskModal';
import { taskService } from '../modules/tasks/services/taskService';
import CreateTicketModal from '../modules/tickets/components/CreateTicketModal';
import CreateProjectModal from '../modules/projects/CreateProjectModal';
import InviteMemberModal from '../modules/members/components/InviteMemberModal';
import FileUploadModal from '../modules/files/components/FileUploadModal';
import CreateDiscussionModal from '../modules/discussions/components/CreateDiscussionModal';
import KeyboardShortcutsModal from '../components/modals/KeyboardShortcutsModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { isSidebarItemActive } from '../utils/navigation';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

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

  // Detect active project context from URL when inside a project workspace
  const projectPathMatch = location.pathname.match(/\/workspace\/projects\/([^/]+)/);
  const currentProjectId = projectPathMatch ? projectPathMatch[1] : undefined;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1180;
    }
    return false;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isCreateDiscussionModalOpen, setIsCreateDiscussionModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [slaBreachCount, setSlaBreachCount] = useState(0);
  const [priorityIssuesCount, setPriorityIssuesCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [workspaceName, setWorkspaceName] = useState(() => {
    const syncUser = authService.getCurrentUserSync();
    return syncUser?.memberships?.[0]?.organization_name || syncUser?.organization_summary?.name || syncUser?.organization?.name || '';
  });
  const [currentProjectName, setCurrentProjectName] = useState(null);

  // Responsive Breakpoint Handler: automatically adapt sidebar on tablet vs desktop
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // Crossing from desktop into tablet -> collapse sidebar
      if (currentWidth >= 768 && currentWidth < 1180 && lastWidth >= 1180) {
        setIsSidebarCollapsed(true);
      }
      // Crossing from tablet into desktop -> expand sidebar
      else if (currentWidth >= 1180 && lastWidth < 1180) {
        setIsSidebarCollapsed(false);
      }
      // Close mobile drawer if resized to tablet/desktop
      if (currentWidth >= 768) {
        setIsMobileSidebarOpen(false);
      }
      lastWidth = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch workspace and live badges
  const refreshBadges = async () => {
    try {
      const [uRes, iCount, metrics, priorityTkts] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getInboxCount(),
        dashboardService.getMetrics(),
        dashboardService.getPriorityTickets(),
      ]);
      const payload = uRes?.data || uRes;
      const totalUnread = typeof payload === 'object' && payload !== null
        ? (payload.unread_count ?? 0)
        : (Number(payload) || 0);
      const notifBreachCount = typeof payload === 'object' && payload !== null
        ? (payload.sla_breach_count ?? 0)
        : 0;

      setUnreadCount(totalUnread);
      setInboxCount(iCount || 0);
      if (metrics) {
        setSlaBreachCount(metrics.sla_breached ?? notifBreachCount ?? 0);
        setOpenTicketsCount(metrics.open_tickets || 0);
      } else {
        setSlaBreachCount(notifBreachCount || 0);
      }
      if (priorityTkts) {
        setPriorityIssuesCount(priorityTkts.length || 0);
      }
    } catch (err) {
      console.warn('Failed to refresh badges:', err);
    }
  };

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      const orgName = u?.memberships?.[0]?.organization_name || u?.organization_summary?.name || u?.organization?.name;
      if (orgName) setWorkspaceName(orgName);
    });
    refreshBadges();

    const ws = connectDashboardWebSocket((event) => {
      if (
        event.type === 'METRICS_UPDATE' ||
        event.type === 'PRIORITY_TICKETS_UPDATE' ||
        event.type === 'NOTIFICATION_NEW'
      ) {
        refreshBadges();
      }
    });

    const handleNotifUpdate = () => {
      refreshBadges();
    };
    window.addEventListener('notifications-updated', handleNotifUpdate);

    return () => {
      window.removeEventListener('notifications-updated', handleNotifUpdate);
      if (ws) safeCloseWebSocket(ws);
    };
  }, [location.pathname]);

  // Dynamic breadcrumbs based on active route and verified tenant data
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/workspace/dashboard' || path === '/workspace' || path === '/workspace/') {
      return [workspaceName, 'Dashboard'];
    }
    if (path.startsWith('/workspace/inbox')) {
      return [workspaceName, 'Inbox'];
    }
    if (path.startsWith('/workspace/notifications')) {
      return [workspaceName, 'Notifications'];
    }
    if (path.startsWith('/workspace/projects/')) {
      return currentProjectName ? [workspaceName, 'Projects', currentProjectName] : [workspaceName, 'Projects', 'Project Detail'];
    }
    if (path === '/workspace/projects') {
      return [workspaceName, 'Projects'];
    }
    if (path === '/workspace/tasks/my-tasks' || path === '/workspace/tasks/my') {
      return [workspaceName, 'Tasks', 'My Tasks'];
    }
    if (path === '/workspace/tasks/all') {
      return [workspaceName, 'Tasks', 'All Tasks'];
    }
    if (path.startsWith('/workspace/tasks')) {
      return [workspaceName, 'Tasks'];
    }
    if (path === '/workspace/tickets/critical') {
      return [workspaceName, 'Tickets', 'Priority Issues'];
    }
    if (path === '/workspace/tickets/priority') {
      return [workspaceName, 'Tickets', 'Priority View'];
    }
    if (path === '/workspace/tickets/board') {
      return [workspaceName, 'Tickets', 'Board View'];
    }
    if (path.startsWith('/workspace/tickets/')) {
      return [workspaceName, 'Tickets', 'Ticket Detail'];
    }
    if (path === '/workspace/tickets') {
      return [workspaceName, 'Tickets'];
    }
    if (path.startsWith('/workspace/members')) {
      return [workspaceName, 'Team Members'];
    }
    if (path.startsWith('/workspace/discussions/')) {
      return [workspaceName, 'Discussions', 'Discussion Thread'];
    }
    if (path.startsWith('/workspace/discussions')) {
      return [workspaceName, 'Discussions'];
    }
    if (path.startsWith('/workspace/files')) {
      return [workspaceName, 'Files'];
    }
    if (path.startsWith('/workspace/sla')) {
      return [workspaceName, 'SLA Overview'];
    }
    if (path.startsWith('/workspace/audit-logs')) {
      return [workspaceName, 'Activity Logs'];
    }
    if (path.startsWith('/workspace/analytics')) {
      return [workspaceName, 'Reports'];
    }
    if (path === '/workspace/settings/sla') {
      return [workspaceName, 'Settings', 'SLA Config'];
    }
    if (path === '/workspace/settings/notifications') {
      return [workspaceName, 'Settings', 'Notifications'];
    }
    if (path === '/workspace/settings/appearance') {
      return [workspaceName, 'Settings', 'Appearance'];
    }
    if (path.startsWith('/workspace/settings')) {
      return [workspaceName, 'Settings'];
    }
    return [workspaceName];
  };

  // Synchronize browser tab document.title with verified page context
  useEffect(() => {
    const crumbs = getBreadcrumbs();
    if (crumbs && crumbs.length > 1) {
      document.title = `${crumbs.slice(1).join(' / ')} — ${workspaceName || 'Live Workspace'}`;
    } else if (workspaceName) {
      document.title = `${workspaceName} — Live Workspace`;
    }
  }, [location.pathname, workspaceName, currentProjectName]);

  // Global keyboard shortcuts (Ctrl+K or Cmd+K for Search, ? for Shortcuts)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll and listen for Escape key when mobile sidebar drawer is open
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    lockScroll();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

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
    } else if (actionType === 'OPEN_SHORTCUTS') {
      setIsShortcutsOpen(true);
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
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          unreadNotifications={unreadCount}
          inboxCount={inboxCount}
          priorityIssuesCount={priorityIssuesCount}
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
          className={`absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-surface-sidebar shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <span className="font-headline-sm text-headline-sm text-text-primary">Navigation</span>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-secondary cursor-pointer"
              aria-label="Close navigation"
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
              onOpenShortcuts={() => {
                setIsMobileSidebarOpen(false);
                setIsShortcutsOpen(true);
              }}
              unreadNotifications={unreadCount}
              inboxCount={inboxCount}
              priorityIssuesCount={priorityIssuesCount}
              isMobile={true}
              onNavigate={() => setIsMobileSidebarOpen(false)}
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
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface-card border-b border-border-subtle flex items-center px-3 sm:px-4 gap-2 sm:gap-3 z-40 shadow-sm">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            type="button"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-secondary cursor-pointer"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-bold text-sm shrink-0">
              {workspaceName ? (workspaceName.trim().split(/\s+/).length >= 2 ? (workspaceName.trim().split(/\s+/)[0][0] + workspaceName.trim().split(/\s+/)[1][0]).toUpperCase() : workspaceName.slice(0, 2).toUpperCase()) : ''}
            </div>
            <span className="font-headline-sm text-headline-sm text-text-primary truncate">{workspaceName}</span>
          </div>
          <button
            onClick={() => setIsSearchOpen(true)}
            type="button"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg hover:bg-canvas-lavender flex items-center justify-center text-text-secondary cursor-pointer"
            aria-label="Search"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setIsPlusMenuOpen((prev) => !prev)}
              type="button"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-btn-primary text-on-primary flex items-center justify-center shadow-sm cursor-pointer"
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
            slaBreachCount={slaBreachCount}
          />
        </div>

        {/* Content Viewport */}
        <main className="flex-1 pt-16 md:pt-20 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 min-h-screen overflow-y-auto pb-24 md:pb-8 w-full max-w-full">
          <div className="w-full max-w-[1720px] mx-auto min-w-0">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* ── Mobile Bottom Navigation Bar ── */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface-card/95 backdrop-blur-md border-t border-border-subtle flex items-center justify-around px-2 z-40 md:hidden shadow-[0_-2px_12px_rgba(20,21,41,0.08)] pb-[env(safe-area-inset-bottom)]">
          <MobileNavItem to="/workspace/dashboard" icon="home" label="Home" />
          <MobileNavItem to="/workspace/tasks" icon="task_alt" label="Tasks" />
          <MobileNavItem to="/workspace/tickets" icon="confirmation_number" label="Tickets" badge={openTicketsCount > 0 ? openTicketsCount : null} />
          <MobileNavItem to="/workspace/notifications" icon="notifications" label="Alerts" badge={unreadCount > 0 ? unreadCount : null} />
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
          await taskService.create({
            ...payload,
            project_id: payload.project_id || currentProjectId,
          });
        }}
      />

      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setIsCreateTicketModalOpen(false)}
        defaultProjectId={currentProjectId}
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

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};

/** Reusable bottom nav tab */
function MobileNavItem({ to, icon, label, badge }) {
  const location = useLocation();
  const isActive = isSidebarItemActive(location.pathname, to);

  return (
    <Link
      to={to}
      className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] min-h-[44px] ${
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
        <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-severity-blocker text-on-primary text-[9px] font-bold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

export default DashboardLayout;
