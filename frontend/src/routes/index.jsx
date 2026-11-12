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
import {
  LoginPage,
  SignupPage,
  RegisterPage,
  VerifyEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ProtectedRoute,
  PublicOnlyRoute,
} from '../modules/auth';
import { SLAOverviewPage, SLASettingsPage } from '../modules/sla';
import { RCAListPage, RCAFormPage, RCADetailsPage } from '../modules/rca';
import ModuleComingSoonPage from '../components/ModuleComingSoonPage';
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

      {/* Authentication Shell (Screens 01-08 / Batch 4) */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route index element={<Navigate to="/auth/login" replace />} />
        <Route
          path="login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route
          path="forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="mfa-challenge" element={<LoginPage />} />
      </Route>

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

        {/* SLA Management Routes (Screens 49-51, 76-78 / Batch 5) */}
        <Route path="sla" element={<SLAOverviewPage />} />
        <Route path="sla/overview" element={<SLAOverviewPage />} />

        {/* Root Cause Analysis (RCA) Governance Routes (Screens 52-53 / Batch 5) */}
        <Route path="rca" element={<RCAListPage />} />
        <Route path="rca/new" element={<RCAFormPage />} />
        <Route path="rca/:id" element={<RCADetailsPage />} />
        <Route path="rca/:id/edit" element={<RCAFormPage />} />
        <Route
          path="discussions/*"
          element={
            <ModuleComingSoonPage
              title="Team Discussions Hub"
              description="Workspace-wide collaborative threads outside project workspaces. Project discussions remain fully accessible within project tabs."
              icon={MessageSquare}
            />
          }
        />
        <Route
          path="files/*"
          element={
            <ModuleComingSoonPage
              title="Central Files & Assets"
              description="Central document browser and cloud storage manager. Project-specific files remain fully accessible inside project tabs."
              icon={FolderGit2}
            />
          }
        />
        <Route
          path="audit-logs/*"
          element={
            <ModuleComingSoonPage
              title="Audit Logs & Compliance Trail"
              description="Enterprise event logging, SOC-2 activity stream, and security history."
              icon={ShieldCheck}
            />
          }
        />
        <Route
          path="analytics/*"
          element={
            <ModuleComingSoonPage
              title="Analytics & Velocity Reports"
              description="Sprint burn-down metrics, workload distribution matrix, and automated reporting."
              icon={BarChart3}
            />
          }
        />
        {/* Workspace Settings (Prompts 76-78 / Batch 5) */}
        <Route path="settings" element={<SLASettingsPage />} />
        <Route path="settings/sla" element={<SLASettingsPage />} />
        <Route path="settings/*" element={<SLASettingsPage />} />
      </Route>

      {/* Catch-all 404 handler redirects to workspace */}
      <Route path="*" element={<Navigate to="/workspace/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
