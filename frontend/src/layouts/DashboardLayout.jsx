import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import GlobalTopBar from '../components/navigation/GlobalTopBar';
import GlobalPlusMenu from '../components/navigation/GlobalPlusMenu';
import GlobalSearchOverlay from '../components/navigation/GlobalSearchOverlay';

/**
 * DashboardLayout
 * Application workspace shell featuring:
 * - Collapsible Sidebar (w-72 or w-20)
 * - Global Top Bar (breadcrumbs, search trigger, new ticket button, SLA breach counter, profile popover)
 * - Global Plus Action Menu modal
 * - Global Spotlight Search Overlay (Ctrl+K / Cmd+K)
 * - Main viewport with dynamic outlet
 */
export const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

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

  const handleActionSelect = (actionType) => {
    if (actionType === 'CREATE_PROJECT') {
      navigate('/workspace/projects');
    }
    setIsPlusMenuOpen(false);
  };

  const handleSearchResultSelect = (result) => {
    console.log('Search result selected:', result);
    setIsSearchOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-canvas-main">
      {/* 1. Left Nav Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onOpenCreate={() => setIsPlusMenuOpen(true)}
      />

      {/* 2. Main Workspace Viewport */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isSidebarCollapsed ? 'pl-20' : 'pl-72'
        }`}
      >
        {/* Global Top Bar Component */}
        <GlobalTopBar
          isCollapsed={isSidebarCollapsed}
          onOpenSearch={() => setIsSearchOpen(true)}
          onTogglePlusMenu={() => setIsPlusMenuOpen((prev) => !prev)}
          isPlusMenuOpen={isPlusMenuOpen}
          activeBreadcrumbs={getBreadcrumbs()}
          unreadNotifications={3}
          slaBreachCount={2}
        />

        {/* Content Viewport */}
        <main className="flex-1 pt-20 px-6 lg:px-8 py-6 min-h-screen overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* 3. Global Modals & Overlays */}
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
    </div>
  );
};

export default DashboardLayout;
