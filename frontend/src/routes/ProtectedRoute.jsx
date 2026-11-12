import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

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
      // Token is expired
      return false;
    }
    return true;
  } catch {
    // Malformed token
    return false;
  }
};

/**
 * ProtectedRoute
 * Guards authenticated application routes (/workspace/*).
 * Redirects unauthenticated visitors to /auth/login while preserving the intended destination.
 */
export const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  if (!isTokenValid(token)) {
    // Clean up stale or expired token
    if (token) {
      localStorage.removeItem('access_token');
    }
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

