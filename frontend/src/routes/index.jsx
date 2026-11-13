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
import ModuleComingSoonPage from '../components/ModuleComingSoonPage';
import ReportsAnalyticsPage from '../modules/analytics/pages/ReportsAnalyticsPage';
import SystemActivityLogsPage from '../modules/audit/pages/SystemActivityLogsPage';
import { TeamDiscussionsPage, DiscussionThreadPage } from '../modules/discussions';
import { CentralFilesPage } from '../modules/files';
import { TeamMembersPage } from '../modules/members';
import { SlaConfigPage, UserProfilePage } from '../modules/settings';
import {
  LoginPage,
  RegisterPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  JoinOrgPage,
} from '../modules/auth';
import { RcaManagementPage } from '../modules/rca';
import { ModalCatalogPage, StatesCatalogPage } from '../modules/design-system';
import ProtectedRoute from './ProtectedRoute';
import { Activity, ShieldCheck, BarChart3, Settings, MessageSquare, FolderGit2 } from 'lucide-react';

/**
 * AppRoutes
 * Master application routing configuration
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication Shell (Screens 4-9) */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="join" element={<JoinOrgPage />} />
        <Route path="mfa-challenge" element={<LoginPage />} />
      </Route>

      {/* Design System Catalogs (Screens 22 & 25) */}
      <Route path="/design-system/modals" element={<ModalCatalogPage />} />
      <Route path="/design-system/states" element={<StatesCatalogPage />} />

      {/* Main Authenticated Application Shell */}
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
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

        {/* SLA Governance & Engine Configuration (Screen 49 / Prompt 76-78) */}
        <Route path="sla" element={<SlaConfigPage initialTab="sla" />} />
        <Route path="sla/overview" element={<SlaConfigPage initialTab="sla" />} />
        <Route path="sla/*" element={<SlaConfigPage initialTab="sla" />} />

        {/* RCA Governance */}
        <Route path="rca" element={<RcaManagementPage />} />
        <Route path="rca/*" element={<RcaManagementPage />} />

        {/* Team Discussions Hub (Screens 11 & 12 / Prompts 61-63) */}
        <Route path="discussions" element={<TeamDiscussionsPage />} />
        <Route path="discussions/:id" element={<DiscussionThreadPage />} />
        <Route path="discussions/*" element={<Navigate to="/workspace/discussions" replace />} />

        {/* Central Files & Assets (Screen 26 / Prompts 64-66) */}
        <Route path="files" element={<CentralFilesPage />} />
        <Route path="files/*" element={<CentralFilesPage />} />

        {/* Team Members Directory (Screen 71 & 72 / Prompts 58-60) */}
        <Route path="members" element={<TeamMembersPage />} />
        <Route path="members/*" element={<TeamMembersPage />} />

        {/* System Activity & Audit Logs (Screens 02 & 03 / Batch 05) */}
        <Route path="audit-logs" element={<SystemActivityLogsPage />} />
        <Route path="audit-logs/*" element={<SystemActivityLogsPage />} />

        {/* Reports & Analytics (Screen 01 / Batch 05) */}
        <Route path="analytics" element={<ReportsAnalyticsPage />} />
        <Route path="analytics/*" element={<ReportsAnalyticsPage />} />

        {/* Design System Catalogs in Workspace (Screens 22 & 25) */}
        <Route path="design-system/modals" element={<ModalCatalogPage />} />
        <Route path="design-system/states" element={<StatesCatalogPage />} />
        <Route path="design-system/*" element={<Navigate to="/workspace/design-system/modals" replace />} />

        {/* Workspace Settings, SLA, Notifications, Appearance & Profile (Screens 49 & 73) */}
        <Route path="settings" element={<Navigate to="/workspace/settings/sla" replace />} />
        <Route path="settings/sla" element={<SlaConfigPage initialTab="sla" />} />
        <Route path="settings/notifications" element={<SlaConfigPage initialTab="notifications" />} />
        <Route path="settings/appearance" element={<SlaConfigPage initialTab="appearance" />} />
        <Route path="settings/profile" element={<UserProfilePage />} />
        <Route path="settings/*" element={<SlaConfigPage />} />
        <Route path="profile" element={<Navigate to="/workspace/settings/profile" replace />} />
      </Route>

      {/* Catch-all 404 handler redirects to workspace */}
      <Route path="*" element={<Navigate to="/workspace/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
