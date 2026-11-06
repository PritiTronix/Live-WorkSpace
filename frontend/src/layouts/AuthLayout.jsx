import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout
 * Layout for Authentication flows (Login, Register, Forgot Password, Reset Password, Onboarding)
 */
export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4FC] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-[#E5E5EF] p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
