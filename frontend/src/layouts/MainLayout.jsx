import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * MainLayout
 * Public and marketing layout for Live Workspace (Landing page, docs, public previews)
 */
export const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FB]">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
