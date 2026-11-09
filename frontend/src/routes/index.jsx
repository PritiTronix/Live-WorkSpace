import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import DashboardOverviewPage from '../modules/dashboard/pages/DashboardOverviewPage';
import NotificationCenterPage from '../modules/notifications/pages/NotificationCenterPage';

/**
 * AppRoutes
 * Central route configuration orchestrating modular route endpoints.
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing & Marketing */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      {/* Authentication & Onboarding Routes */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<div>Login</div>} />
        <Route path="register" element={<div>Register</div>} />
        <Route path="verify-email" element={<div>Verify Email</div>} />
        <Route path="forgot-password" element={<div>Forgot Password</div>} />
        <Route path="reset-password" element={<div>Reset Password</div>} />
        <Route path="onboarding" element={<div>Onboarding</div>} />
      </Route>

      {/* Authenticated Dashboard Workspace Routes */}
      <Route path="/workspace" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/workspace/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardOverviewPage />} />
        <Route path="notifications" element={<NotificationCenterPage />} />
        <Route path="projects/*" element={<DashboardOverviewPage />} />
        <Route path="tasks/*" element={<DashboardOverviewPage />} />
        <Route path="tickets/*" element={<DashboardOverviewPage />} />
        <Route path="sla/*" element={<DashboardOverviewPage />} />
        <Route path="rca/*" element={<DashboardOverviewPage />} />
        <Route path="discussions/*" element={<DashboardOverviewPage />} />
        <Route path="files/*" element={<DashboardOverviewPage />} />
        <Route path="analytics/*" element={<DashboardOverviewPage />} />
        <Route path="members/*" element={<DashboardOverviewPage />} />
        <Route path="audit-logs/*" element={<DashboardOverviewPage />} />
        <Route path="settings/*" element={<DashboardOverviewPage />} />
        <Route path="inbox" element={<DashboardOverviewPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
