import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

/**
 * AppRoutes
 * Central route configuration orchestrating modular route endpoints
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing & Marketing */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<div className="p-8 text-center"><h1 className="text-3xl font-bold font-heading">Live Workspace</h1><p className="text-[#5C5C70] mt-2">SaaS Collaboration & Engineering Operations Platform</p></div>} />
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
        <Route path="dashboard" element={<div>Dashboard</div>} />
        <Route path="projects/*" element={<div>Projects Module</div>} />
        <Route path="tasks/*" element={<div>Tasks Module</div>} />
        <Route path="tickets/*" element={<div>Tickets Module</div>} />
        <Route path="sla/*" element={<div>SLA Module</div>} />
        <Route path="rca/*" element={<div>RCA Module</div>} />
        <Route path="discussions/*" element={<div>Discussions Module</div>} />
        <Route path="files/*" element={<div>Files Module</div>} />
        <Route path="analytics/*" element={<div>Analytics Module</div>} />
        <Route path="members/*" element={<div>Members Module</div>} />
        <Route path="audit-logs/*" element={<div>Audit Logs Module</div>} />
        <Route path="settings/*" element={<div>Settings Module</div>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
