import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService, organizationService } from '../services/api';
import { isOnboardingPath, isWorkspacePath } from '../utils/navigation';

/**
 * Checks whether an access token exists and is not visibly expired.
 * Note: Frontend token inspection is a UX optimization only;
 * authoritative authentication and authorization is enforced by the FastAPI backend.
 */
const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * ProtectedRoute
 * Authoritative guard for authenticated application routes.
 *
 * Requirements:
 * 1. Validates session with backend GET /auth/me (no fake data, no fallback user, no localStorage).
 * 2. Displays a neutral loading state while session verification is in progress (no flash of dashboard or onboarding).
 * 3. Logged-out users redirect to /auth/login with return state; avoids redirect loops.
 * 4. organization_required === true:
 *    - All workspace routes redirect to /onboarding (or /onboarding/waiting if a pending join request exists).
 *    - Permitted to access /onboarding routes.
 * 5. organization_required === false:
 *    - Any onboarding route redirects to /workspace/dashboard.
 *    - Permitted to access workspace routes.
 */
export const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    hasPendingJoinRequest: false,
  });

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem('access_token');
      if (!isTokenValid(token)) {
        if (token) {
          localStorage.removeItem('access_token');
        }
        if (isMounted) {
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            hasPendingJoinRequest: false,
          });
        }
        return;
      }

      try {
        const user = await authService.getMe();
        let hasPending = false;

        if (user?.organization_required) {
          try {
            const requests = await organizationService.myJoinRequests();
            if (Array.isArray(requests)) {
              hasPending = requests.some((req) => req.status === 'pending');
            }
          } catch {
            hasPending = false;
          }
        }

        if (isMounted) {
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            user,
            hasPendingJoinRequest: hasPending,
          });
        }
      } catch (err) {
        if (isMounted) {
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            hasPendingJoinRequest: false,
          });
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Loading state with no flash of the dashboard or of onboarding
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9FB] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="font-body text-sm font-medium text-text-secondary animate-pulse">
          Verifying workspace authorization...
        </p>
      </div>
    );
  }

  // 2. Unauthenticated user redirects to login
  if (!authState.isAuthenticated) {
    if (location.pathname === '/auth/login') {
      return null;
    }
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const currentPath = location.pathname;
  const isOrgRequired = Boolean(authState.user?.organization_required);
  const isWorkspace = isWorkspacePath(currentPath);
  const isOnboarding = isOnboardingPath(currentPath);

  // 3. organization_required true: workspace routes redirect to /onboarding or /onboarding/waiting
  if (isOrgRequired) {
    if (isWorkspace) {
      const destination = authState.hasPendingJoinRequest ? '/onboarding/waiting' : '/onboarding';
      return <Navigate to={destination} replace />;
    }
    // If user has a pending join request and navigates to root /onboarding, steer to /onboarding/waiting
    if (authState.hasPendingJoinRequest && (currentPath === '/onboarding' || currentPath === '/onboarding/')) {
      return <Navigate to="/onboarding/waiting" replace />;
    }
  }

  // 4. organization_required false: onboarding routes redirect to /workspace/dashboard
  if (!isOrgRequired) {
    if (isOnboarding) {
      return <Navigate to="/workspace/dashboard" replace />;
    }
  }

  // 5. Authorized - render child views with current user context
  return React.isValidElement(children)
    ? React.cloneElement(children, { currentUser: authState.user })
    : children;
};

export default ProtectedRoute;
