import React from 'react';
import RegisterPage from './RegisterPage';

/**
 * Screen: Live Workspace - Sign Up (Redesign)
 * Route: /auth/signup
 * Re-uses RegisterPage to guarantee unified styling, behavior, and responsiveness across /auth/signup and /auth/register.
 */
export const SignupPage = () => {
  return <RegisterPage />;
};

export default SignupPage;
