import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService, organizationService } from '../services/api';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    hasPendingJoinRequest: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const autoRetryCountRef = useRef(0);

  /**
   * Refreshes user session from backend GET /auth/me.
   * Options:
   * - force: clears in-flight promise and cached user to ensure an authoritative fresh check
   * - silent: updates context without flipping isLoading to true
   */
  const refreshUser = useCallback(async (options = {}) => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (!token && !refreshToken) {
      if (isMountedRef.current) {
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          hasPendingJoinRequest: false,
          error: null,
        });
      }
      return null;
    }

    if (!options?.silent && !options?.isAutoRetry) {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const user = await authService.getMe(options);
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

      if (isMountedRef.current) {
        autoRetryCountRef.current = 0;
        setAuthState({
          isLoading: false,
          isAuthenticated: true,
          user,
          hasPendingJoinRequest: hasPending,
          error: null,
        });
      }
      return user;
    } catch (err) {
      const is401 = err?.response?.status === 401 || err?.status === 401 || err?.cause === '401';
      if (is401) {
        // Authoritative logout only on HTTP 401
        authService.logout();
        if (isMountedRef.current) {
          autoRetryCountRef.current = 0;
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            hasPendingJoinRequest: false,
            error: null,
          });
        }
        return null;
      }

      // Timeouts, network errors and 5xx must NOT log the user out
      if (!options?.isAutoRetry && autoRetryCountRef.current === 0) {
        autoRetryCountRef.current = 1;
        setTimeout(() => {
          if (isMountedRef.current) {
            refreshUser({ ...options, isAutoRetry: true });
          }
        }, 800);
        return null;
      }

      if (isMountedRef.current) {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'We could not verify your session',
        }));
      }
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    if (isMountedRef.current) {
      autoRetryCountRef.current = 0;
      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        hasPendingJoinRequest: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshUser();
    return () => {
      isMountedRef.current = false;
    };
  }, [refreshUser]);

  const value = {
    ...authState,
    refreshUser,
    retry: () => {
      autoRetryCountRef.current = 0;
      return refreshUser({ force: true });
    },
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
