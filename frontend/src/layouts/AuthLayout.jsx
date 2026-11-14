import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout
 * Layout for Authentication flows (Login, Register, Forgot Password, Reset Password, Onboarding)
 */
export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4FC] p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5E5EF] p-5 sm:p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
