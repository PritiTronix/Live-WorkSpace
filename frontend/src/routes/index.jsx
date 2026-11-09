import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import DashboardOverviewPage from '../modules/dashboard/pages/DashboardOverviewPage';
import ProjectsListPage from '../modules/projects/ProjectsListPage';
import ProjectWorkspacePage from '../modules/projects/ProjectWorkspacePage';
import ProjectOverviewTab from '../modules/projects/ProjectOverviewTab';
import ProjectKanbanTab from '../modules/projects/ProjectKanbanTab';
import ProjectTimelineTab from '../modules/projects/ProjectTimelineTab';
import ProjectDiscussionTab from '../modules/projects/ProjectDiscussionTab';
import ProjectFilesTab from '../modules/projects/ProjectFilesTab';
import ProjectActivityTab from '../modules/projects/ProjectActivityTab';
import {
  TicketsDashboardPage,
  TicketBoardPage,
  TicketPriorityPage,
  TicketDetailsPage,
  PriorityIssuesPage,
} from '../modules/tickets';
import NotificationCenterPage from '../modules/notifications/pages/NotificationCenterPage';
import AllTasksPage from '../modules/tasks/pages/AllTasksPage';
import MyTasksPage from '../modules/tasks/pages/MyTasksPage';

/**
 * AppRoutes
 * Master application routing configuration
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication Shell (Screens 01-08) */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route path="login" element={<LandingPage />} />
        <Route path="register" element={<LandingPage />} />
        <Route path="forgot-password" element={<LandingPage />} />
        <Route path="reset-password" element={<LandingPage />} />
        <Route path="mfa-challenge" element={<LandingPage />} />
      </Route>

      {/* Main Authenticated Application Shell */}
      <Route path="/workspace" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/workspace/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardOverviewPage />} />
        <Route path="inbox" element={<DashboardOverviewPage />} />
        <Route path="notifications" element={<NotificationCenterPage />} />

        {/* Projects Listing & Workspace Routes (Screens 18, 38-45) */}
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/:id" element={<ProjectWorkspacePage />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<ProjectOverviewTab />} />
          <Route path="board" element={<ProjectKanbanTab />} />
          <Route path="timeline" element={<ProjectTimelineTab />} />
          <Route path="discussions" element={<ProjectDiscussionTab />} />
          <Route path="files" element={<ProjectFilesTab />} />
          <Route path="activity" element={<ProjectActivityTab />} />
          <Route path="tickets" element={<ProjectOverviewTab />} />
        </Route>

        {/* Task Management Routes (Screens 30-35 / Batch 3) */}
        <Route path="tasks" element={<AllTasksPage />} />
        <Route path="tasks/all" element={<AllTasksPage />} />
        <Route path="tasks/my-tasks" element={<MyTasksPage />} />
        <Route path="tasks/my" element={<MyTasksPage />} />

        {/* Ticket Management Routes (Screens 61-65, 69) */}
        <Route path="tickets" element={<TicketsDashboardPage />} />
        <Route path="tickets/all" element={<Navigate to="/workspace/tickets" replace />} />
        <Route path="tickets/board" element={<TicketBoardPage />} />
        <Route path="tickets/priority" element={<TicketPriorityPage />} />
        <Route path="tickets/critical" element={<PriorityIssuesPage />} />
        <Route path="tickets/:id" element={<TicketDetailsPage />} />
        <Route path="monitoring/priority" element={<Navigate to="/workspace/tickets/critical" replace />} />

        {/* Supporting Modules */}
        <Route path="sla/*" element={<DashboardOverviewPage />} />
        <Route path="rca/*" element={<DashboardOverviewPage />} />
        <Route path="discussions/*" element={<DashboardOverviewPage />} />
        <Route path="files/*" element={<DashboardOverviewPage />} />
        <Route path="audit-logs/*" element={<DashboardOverviewPage />} />
        <Route path="analytics/*" element={<DashboardOverviewPage />} />
        <Route path="settings/*" element={<DashboardOverviewPage />} />
      </Route>

      {/* Catch-all 404 handler redirects to workspace */}
      <Route path="*" element={<Navigate to="/workspace/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
