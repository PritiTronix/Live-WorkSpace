import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

/**
 * AuthLayout
 * Layout for Authentication flows (Login, Register, Forgot Password, Reset Password, Onboarding)
 * Scoped redesign: LoginPage renders its full dual-column canvas layout, while other auth pages
 * retain their dedicated centered card layout.
 */
export const AuthLayout = () => {
  const location = useLocation();
  const isFullCanvasAuth = [
    '/auth/login',
    '/auth/register',
    '/auth/signup',
    '/auth/mfa-challenge',
  ].includes(location.pathname);

  if (isFullCanvasAuth) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen lg:min-h-dvh flex items-center justify-center bg-[#F5F4FC] p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5E5EF] p-5 sm:p-8 max-h-[92dvh] overflow-y-auto custom-scrollbar">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
