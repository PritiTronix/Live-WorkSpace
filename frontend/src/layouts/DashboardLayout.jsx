import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * DashboardLayout
 * Primary application workspace shell featuring:
 * - Collapsible Sidebar (#F8F8FC)
 * - Global Top Bar (#FFFFFF) with Global Search, Quick Action (+), Notification Center, User Profile
 * - Fluid Canvas Area (#F9F9FB) with dynamic route outlet
 */
export const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex bg-[#F9F9FB]">
      {/* Sidebar Placeholder */}
      <aside className="w-64 bg-[#F8F8FC] border-r border-[#E5E5EF] flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#E5E5EF]">
          <span className="font-heading font-bold text-lg text-[#141529]">Live Workspace</span>
        </div>
        <div className="p-4 flex-1">
          {/* Navigation links injected here during module implementation */}
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Header */}
        <header className="h-16 bg-white border-b border-[#E5E5EF] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-[#5C5C70]">Workspace Dashboard</span>
          </div>
          <div className="flex items-center space-x-3">
            {/* Quick Actions & Profile components placeholder */}
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
