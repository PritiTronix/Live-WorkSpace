/**
 * Utility to resolve API URLs against the configured API origin.
 *
 * Rules:
 * 1. Returns falsy values (null, undefined, '') unchanged.
 * 2. Returns already absolute URLs (http://, https://, blob:, data:) unchanged.
 * 3. Otherwise, prefixes relative paths with the API origin derived from the
 *    configured VITE_API_BASE_URL (with no hardcoded domain).
 */

export function getApiBaseUrl() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch {
    // ignore
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }
  return '';
}

export function getApiOrigin() {
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl, typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:8000');
      if (parsed.origin && parsed.origin !== 'null') {
        return parsed.origin;
      }
    } catch {
      // fallback
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function resolveApiUrl(path) {
  if (!path || typeof path !== 'string') {
    return path;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return path;
  }

  // If already absolute or pseudo-protocol (http, https, blob, data), return unchanged
  if (/^(?:https?:|\/\/|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }

  const origin = getApiOrigin();
  if (!origin) {
    return trimmed;
  }

  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanOrigin}${cleanPath}`;
}

export function getInitials(str) {
  if (!str || typeof str !== 'string') return 'U';
  const trimmed = str.trim();
  if (!trimmed) return 'U';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default resolveApiUrl;
