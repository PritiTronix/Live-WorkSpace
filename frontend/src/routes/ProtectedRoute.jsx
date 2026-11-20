import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthContext, AuthProvider } from '../context/AuthContext';
import { isOnboardingPath, isWorkspacePath } from '../utils/navigation';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export { useAuth, AuthContext, AuthProvider };

/**
 * ProtectedRoute
 * Authoritative guard for authenticated application routes.
 *
 * Requirements:
 * 1. Reads authenticated user session from one centralized place (AuthContext).
 * 2. Displays a neutral loading state while session verification is in progress.
 * 3. Only a 401 response from GET /auth/me means 'logged out'. Timeouts, network errors and 5xx
 *    must NOT log the user out or clear tokens; shows error state with Retry/Logout.
 * 4. organization_required === true:
 *    - All workspace routes redirect to /onboarding (or /onboarding/waiting if a pending join request exists).
 *    - Permitted to access /onboarding routes.
 * 5. organization_required === false:
 *    - Any onboarding route redirects to /workspace/dashboard.
 *    - Permitted to access workspace routes.
 * 6. Automatically re-evaluates route authorization when AuthContext user state changes.
 */
export const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    hasPendingJoinRequest,
    retry,
    logout,
  } = useAuth();

  // 1. Neutral loading state with no flash of the dashboard or onboarding
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9FB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="font-body text-sm font-medium text-text-secondary animate-pulse">
          Verifying workspace authorization...
        </p>
      </div>
    );
  }

  // 2. Non-401 Error State: session preserved with Retry and Logout buttons
  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9F9FB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="font-headline text-lg font-semibold text-text-primary mb-2">
          We could not verify your session
        </h2>
        <p className="font-body text-sm text-text-secondary max-w-md mb-6">
          A network or server issue prevented us from verifying your credentials. Your session has been preserved. Please retry or sign out.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-btn-primary hover:bg-btn-primary-hover text-white text-sm font-medium transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary hover:text-text-primary text-sm font-medium transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated user (401 or explicit logout / missing tokens) redirects to login
  if (!isAuthenticated) {
    if (location.pathname === '/auth/login') {
      return null;
    }
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const currentPath = location.pathname;
  const isOrgRequired = Boolean(user?.organization_required);
  const isWorkspace = isWorkspacePath(currentPath);
  const isOnboarding = isOnboardingPath(currentPath);

  // 4. organization_required true: workspace routes redirect to /onboarding or /onboarding/waiting
  if (isOrgRequired) {
    if (isWorkspace) {
      const destination = hasPendingJoinRequest ? '/onboarding/waiting' : '/onboarding';
      return <Navigate to={destination} replace />;
    }
    if (hasPendingJoinRequest && (currentPath === '/onboarding' || currentPath === '/onboarding/')) {
      return <Navigate to="/onboarding/waiting" replace />;
    }
  }

  // 5. organization_required false: onboarding routes redirect to /workspace/dashboard
  if (!isOrgRequired) {
    if (isOnboarding) {
      return <Navigate to="/workspace/dashboard" replace />;
    }
  }

  // 6. Authorized - render child views with current user context
  return React.isValidElement(children)
    ? React.cloneElement(children, { currentUser: user })
    : children;
};

export default ProtectedRoute;
