import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout
 * Master shell for authentication flows (Login, Signup, Register, Verification, Password Reset)
 */
export const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full bg-surface-card flex flex-col">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
