import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import ProjectTicketsTab from '../modules/projects/ProjectTicketsTab';
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
import { TeamMembersPage, MemberProfilePage } from '../modules/members';
import { SlaConfigPage, UserProfilePage } from '../modules/settings';
import {
  LoginPage,
  RegisterPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '../modules/auth';
import {
  OnboardingChoicePage,
  CreateOrgPage,
  JoinOrgPage,
  WaitingApprovalPage,
} from '../modules/onboarding';
import { LogoutModal } from '../modules/auth/components/LogoutModal';
import { RcaManagementPage } from '../modules/rca';
import { ModalCatalogPage, StatesCatalogPage } from '../modules/design-system';
import CompleteProfilePage from '../modules/users/CompleteProfilePage';
import ProtectedRoute from './ProtectedRoute';
import ErrorBoundary from '../components/common/ErrorBoundary';
import NotFoundPage from '../components/common/NotFoundPage';
import { Activity, ShieldCheck, BarChart3, Settings, MessageSquare, FolderGit2, LogOut } from 'lucide-react';

/**
 * OnboardingLayout
 * Minimal layout for organization onboarding screens.
 * Contains brand logo and Logout button connected to LogoutModal; no workspace sidebar.
 */
const OnboardingLayout = ({ currentUser }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <div className="min-h-screen bg-canvas-main flex flex-col text-text-primary font-body">
      <header className="h-16 px-4 sm:px-6 bg-surface-card border-b border-border-subtle flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 rounded-xl bg-btn-primary flex items-center justify-center text-white font-bold shadow-sm shrink-0">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-headline font-bold text-base sm:text-lg text-text-primary tracking-tight truncate">
            Live Workspace
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 min-h-[40px] sm:min-h-[36px] rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary text-xs sm:text-sm font-medium transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </header>
      <main className="flex-1 flex flex-col justify-center items-center p-3 sm:p-6 w-full max-w-full">
        <Outlet context={{ currentUser }} />
      </main>
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        currentUser={currentUser}
      />
    </div>
  );
};

/**
 * AppRoutes
 * Master application routing configuration
 */
export const AppRoutes = () => {
  const isDev = Boolean(import.meta.env.DEV);

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

      {/* Onboarding Shell */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OnboardingChoicePage />} />
        <Route path="create-org" element={<CreateOrgPage />} />
        <Route path="join-org" element={<JoinOrgPage />} />
        <Route path="waiting" element={<WaitingApprovalPage />} />
        <Route path="profile" element={<CompleteProfilePage />} />
      </Route>

      {/* Design System Catalogs (Available only in DEV mode) */}
      {isDev && (
        <>
          <Route path="/design-system/modals" element={<ModalCatalogPage />} />
          <Route path="/design-system/states" element={<StatesCatalogPage />} />
        </>
      )}

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
        <Route path="inbox" element={<NotificationCenterPage />} />
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
          <Route path="tickets" element={<ProjectTicketsTab />} />
        </Route>

        {/* Task Management Routes (Screens 30-35 / Batch 3) */}
        <Route path="tasks" element={<AllTasksPage />} />
        <Route path="tasks/all" element={<AllTasksPage />} />
        <Route path="tasks/my-tasks" element={<MyTasksPage />} />
        <Route path="tasks/my" element={<MyTasksPage />} />

        {/* Ticket Management Routes with Error Boundary (Screens 61-65, 69) */}
        <Route
          element={
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          }
        >
          <Route path="tickets" element={<TicketsDashboardPage />} />
          <Route path="tickets/all" element={<Navigate to="/workspace/tickets" replace />} />
          <Route path="tickets/board" element={<TicketBoardPage />} />
          <Route path="tickets/priority" element={<TicketPriorityPage />} />
          <Route path="tickets/critical" element={<PriorityIssuesPage />} />
          <Route path="tickets/:id" element={<TicketDetailsPage />} />
          <Route path="monitoring/priority" element={<Navigate to="/workspace/tickets/critical" replace />} />
        </Route>

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
        <Route path="members/:id" element={<MemberProfilePage />} />
        <Route path="members/*" element={<TeamMembersPage />} />

        {/* System Activity & Audit Logs (Screens 02 & 03 / Batch 05) */}
        <Route path="audit-logs" element={<SystemActivityLogsPage />} />
        <Route path="audit-logs/*" element={<SystemActivityLogsPage />} />

        {/* Reports & Analytics (Screen 01 / Batch 05) */}
        <Route path="analytics" element={<ReportsAnalyticsPage />} />
        <Route path="analytics/*" element={<ReportsAnalyticsPage />} />

        {/* Design System Catalogs in Workspace (Available only in DEV mode) */}
        {isDev && (
          <>
            <Route path="design-system/modals" element={<ModalCatalogPage />} />
            <Route path="design-system/states" element={<StatesCatalogPage />} />
            <Route path="design-system/*" element={<Navigate to="/workspace/design-system/modals" replace />} />
          </>
        )}

        {/* Workspace Settings, SLA, Notifications, Appearance & Profile (Screens 49 & 73) */}
        <Route path="settings" element={<Navigate to="/workspace/settings/sla" replace />} />
        <Route path="settings/sla" element={<SlaConfigPage initialTab="sla" />} />
        <Route path="settings/notifications" element={<SlaConfigPage initialTab="notifications" />} />
        <Route path="settings/appearance" element={<SlaConfigPage initialTab="appearance" />} />
        <Route path="settings/profile" element={<UserProfilePage />} />
        <Route path="settings/*" element={<SlaConfigPage />} />
        <Route path="profile" element={<Navigate to="/workspace/settings/profile" replace />} />

        {/* Workspace Shell Catch-All 404 Handler */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Global Catch-all 404 handler outside workspace */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
