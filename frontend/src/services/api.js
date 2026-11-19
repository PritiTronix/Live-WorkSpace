import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;
      try {
        const refreshData = await authService.refreshToken();
        if (refreshData?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${refreshData.access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        authService.logout();
        return Promise.reject(refreshError);
      }
    }

    const status = error.response?.status;
    const data = error.response?.data;
    const retryAfterHeader =
      error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) || retryAfterHeader : null;

    let errorCode = null;
    if (data?.error && typeof data.error === 'object' && data.error.code) {
      errorCode = data.error.code;
    } else if (data?.detail && typeof data.detail === 'object' && data.detail.code) {
      errorCode = data.detail.code;
    } else if (typeof data?.code === 'string') {
      errorCode = data.code;
    } else if (typeof data?.error === 'string') {
      errorCode = data.error;
    }

    let cause = 'unknown';
    if (!error.response) {
      cause = 'network';
      errorCode = errorCode || (error.code === 'ECONNABORTED' ? 'timeout' : 'network_error');
    } else if (status === 401) {
      cause = '401';
      errorCode = errorCode || 'unauthorized';
    } else if (status === 403) {
      cause = '403';
      errorCode = errorCode || 'forbidden';
    } else if (status === 404) {
      cause = '404';
      errorCode = errorCode || 'not_found';
    } else if (status === 422) {
      cause = '422';
      errorCode = errorCode || 'validation_error';
    } else if (status === 429) {
      cause = '429';
      errorCode = errorCode || 'rate_limited';
    } else if (status >= 500 && status <= 599) {
      cause = '5xx';
      errorCode = errorCode || (status === 503 ? 'service_unavailable' : 'server_error');
    }

    error.errorCode = errorCode;
    error.cause = cause;
    if (retryAfter !== null) {
      error.retryAfter = retryAfter;
    }

    // Treat 403 whose error code is 'organization_required' by redirecting to /onboarding
    if (status === 403 && errorCode === 'organization_required') {
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/onboarding') &&
        !window.location.pathname.startsWith('/auth')
      ) {
        window.location.assign('/onboarding');
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Shared API Error Helper
 * Maps HTTP and network errors to consistent user-facing error messages:
 * - Network / Timeout: 'Cannot reach the server' / 'The server took too long to respond. Please retry.'
 * - 401: 'Authentication required. Please sign in.'
 * - 403: 'Access denied.' or detail message
 * - 404: 'The requested resource was not found.'
 * - 422: 'The filter is not valid'
 * - 429: 'Too many requests. Please wait a moment and try again.' (includes Retry-After when available)
 * - 5xx: 'An unexpected server error occurred. Please retry.' (503: 'Service temporarily unavailable. Please retry.')
 */
export const getApiErrorMessage = (error, defaultMessage = 'An unexpected error occurred.') => {
  if (!error) return defaultMessage;

  // Timeout error: ECONNABORTED or message contains timeout
  if (
    error.code === 'ECONNABORTED' ||
    (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'))
  ) {
    return 'The server took too long to respond. Please retry.';
  }

  // Failed connection: no response from server, network down, or connection error
  if (!error.response) {
    return 'Cannot reach the server';
  }

  const statusCode = error.response.status;

  if (statusCode === 422) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    return 'The filter is not valid';
  }

  if (statusCode === 429) {
    const retryAfter = error.retryAfter || error.response?.headers?.['retry-after'];
    if (retryAfter) {
      return `Too many requests. Please wait ${retryAfter} second${retryAfter === 1 ? '' : 's'} and try again.`;
    }
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (statusCode >= 500 && statusCode <= 599) {
    if (statusCode === 503) {
      return 'Service temporarily unavailable. Please retry.';
    }
    return 'An unexpected server error occurred. Please retry.';
  }

  if (statusCode === 401) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    return 'Authentication required. Please sign in.';
  }

  if (statusCode === 403) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    if (detail && typeof detail === 'object' && detail.message) return detail.message;
    if (error.response.data?.error?.message) return error.response.data.error.message;
    return 'Access denied. You do not have permission to perform this action.';
  }

  if (statusCode === 404) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
    return 'The requested resource was not found.';
  }

  if (error.response.data?.error?.message) {
    return error.response.data.error.message;
  }

  const detail = error.response.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }
  if (detail && typeof detail === 'object' && detail.message) {
    return detail.message;
  }

  return error.message || defaultMessage;
};

/**
 * Exposes full parsed error object to callers (cause, code, status, message, retryAfter).
 */
export const parseApiError = (error) => {
  if (!error) {
    return {
      cause: 'unknown',
      code: null,
      status: null,
      message: 'An unexpected error occurred.',
      retryAfter: null,
    };
  }

  const status = error.response?.status || null;
  const retryAfter =
    error.retryAfter ||
    (error.response?.headers?.['retry-after']
      ? parseInt(error.response.headers['retry-after'], 10) || error.response.headers['retry-after']
      : null);

  return {
    cause: error.cause || (!error.response ? 'network' : String(status)),
    code: error.errorCode || error.code || null,
    status,
    message: getApiErrorMessage(error),
    retryAfter,
  };
};

// Fallback user context
export const DEFAULT_USER = {
  id: '',
  full_name: '',
  email: '',
  role: 'member',
  department: '',
  presence: 'ONLINE',
  onboarding_completed: true,
  avatar_url: '',
};

// Authentication & Profile Services
export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data?.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    if (response.data?.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    if (response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');
    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refresh_token: refreshToken,
    });
    if (response.data?.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    if (response.data?.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    if (response.data?.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
  verifyEmail: async (token) => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  getCurrentUserSync: () => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  },
  getCurrentUser: async () => {
    try {
      let response;
      try {
        response = await apiClient.get('/auth/me');
      } catch {
        response = await apiClient.get('/users/me');
      }
      if (response?.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
      }
      return authService.getCurrentUserSync();
    } catch {
      return authService.getCurrentUserSync();
    }
  },
  completeOnboarding: async () => {
    const response = await apiClient.post('/auth/onboarding/complete');
    await authService.getCurrentUser();
    return response.data;
  },
  updatePresence: async (presence) => {
    try {
      const response = await apiClient.patch('/users/me/presence', { presence });
      return response.data;
    } catch {
      return { presence };
    }
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// Global Search Services
export const searchService = {
  search: async (query, category = 'all', options = {}) => {
    const { page = 1, limit = 20, signal } = options;
    const response = await apiClient.get('/search', {
      params: { q: query, type: category, category, page, limit },
      signal,
    });
    return response.data;
  },
  getRecentSearches: async () => {
    try {
      const response = await apiClient.get('/search/recent');
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      return [];
    }
  },
  saveRecentSearch: async (query) => {
    try {
      const response = await apiClient.post('/search/recent', { query });
      return response.data;
    } catch {
      return null;
    }
  },
  clearRecentSearches: async (query) => {
    try {
      const response = await apiClient.delete('/search/recent', {
        params: query ? { query } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },
};

// Organization Services
export const organizationService = {
  list: async () => {
    try {
      const response = await apiClient.get('/organizations');
      return response.data || [];
    } catch {
      return [];
    }
  },
  getCurrent: async () => {
    try {
      const response = await apiClient.get('/settings/workspace');
      return response.data;
    } catch {
      return null;
    }
  },
  createOrganization: async (data) => {
    const response = await apiClient.post('/organizations', data);
    return response.data;
  },
  lookupJoinCode: async (code) => {
    const payload = typeof code === 'string' ? { code: code.trim().toUpperCase() } : code;
    const response = await apiClient.post('/organizations/join/lookup', payload);
    return response.data;
  },
  requestJoin: async (payloadOrCode, message) => {
    const payload =
      typeof payloadOrCode === 'string'
        ? { code: payloadOrCode.trim().toUpperCase(), ...(message ? { message: message.trim() } : {}) }
        : payloadOrCode;
    const response = await apiClient.post('/organizations/join', payload);
    return response.data;
  },
  myJoinRequests: async () => {
    const response = await apiClient.get('/organizations/join-requests/mine');
    return response.data;
  },
  cancelJoinRequest: async (requestId) => {
    const response = await apiClient.post(`/organizations/join-requests/${requestId}/cancel`);
    return response.data;
  },
  listJoinRequests: async (organizationId, status, page = 1, pageSize = 20) => {
    const params = { page, page_size: pageSize };
    if (status) {
      params.status = String(status).toLowerCase().trim();
    }
    const response = await apiClient.get(`/organizations/${organizationId}/join-requests`, { params });
    return response.data;
  },
  approveJoinRequest: async (organizationId, requestId) => {
    const response = await apiClient.post(
      `/organizations/${organizationId}/join-requests/${requestId}/approve`
    );
    return response.data;
  },
  rejectJoinRequest: async (organizationId, requestId, reason) => {
    let payload = {};
    if (typeof reason === 'string') {
      if (reason.trim()) payload = { decision_reason: reason.trim() };
    } else if (reason && typeof reason === 'object') {
      payload = reason;
    }
    const response = await apiClient.post(
      `/organizations/${organizationId}/join-requests/${requestId}/reject`,
      payload
    );
    return response.data;
  },
  generateJoinCode: async (organizationId, options = {}) => {
    const response = await apiClient.post(`/organizations/${organizationId}/join-code`, options);
    return response.data;
  },
  revokeJoinCode: async (organizationId) => {
    const response = await apiClient.delete(`/organizations/${organizationId}/join-code`);
    return response.data;
  },
};

// Dashboard Services
export const dashboardService = {
  getFilters: async () => {
    try {
      const response = await apiClient.get('/dashboard/filters');
      return response.data;
    } catch {
      return { teams: [], projects: [], date_ranges: [] };
    }
  },
  getMetrics: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/metrics', { params });
      return response.data;
    } catch {
      return {
        total_projects: 0,
        projects_this_month: null,
        total_tasks: 0,
        tasks_completion_rate: null,
        my_tasks: 0,
        my_tasks_due_today: null,
        open_tickets: 0,
        triage_count: null,
        work_in_progress: 0,
        active_squads_count: null,
        on_hold: 0,
        on_hold_subtext: null,
        sla_breached: 0,
        sla_compliance_rate: null,
      };
    }
  },
  getTasksBreakdown: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/tasks-breakdown', { params });
      return response.data;
    } catch {
      return {
        total: 0,
        done: 0,
        in_progress: 0,
        in_review: 0,
        to_do: 0,
        completion_rate: 0.0,
      };
    }
  },
  getTicketsSeverity: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/tickets-severity', { params });
      return response.data;
    } catch {
      return {
        total_active: 0,
        blocker: 0,
        critical: 0,
        major: 0,
        minor: 0,
        violations_24h: 0,
      };
    }
  },
  getSlaPerformance: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/sla-performance', { params });
      return response.data;
    } catch {
      return {
        adherence_rate: null,
        adherence_delta: null,
        average_mttr: '—',
        mttr_delta: null,
        resolved_rolling_total: 0,
        rolling_days: [],
      };
    }
  },
  getProjectProgress: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/project-progress', { params });
      return response.data;
    } catch {
      return [];
    }
  },
  getTeamWorkload: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/team-workload', { params });
      return response.data;
    } catch {
      return [];
    }
  },
  getPriorityTickets: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/priority-tickets', { params });
      return response.data;
    } catch {
      return [];
    }
  },
  getActivityTimeline: async (params = {}) => {
    try {
      const response = await apiClient.get('/dashboard/activity-timeline', { params });
      return response.data;
    } catch {
      return [];
    }
  },
  exportSummary: async (params = {}, format = 'csv') => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const response = await apiClient.get('/dashboard/export', {
      params: { ...params, format, tz },
      responseType: 'blob',
    });
    const disposition = response.headers ? response.headers['content-disposition'] : null;
    let filename = `workspace-summary-${new Date().toISOString().slice(0, 10)}.${format}`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }
    const blob = new Blob([response.data], {
      type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

// WebSocket Real-time Connection Helper
export const connectDashboardWebSocket = (onMessage, onError, onStatusChange) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    onStatusChange?.('offline');
    return null;
  }
  const baseWs = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const urlObj = new URL('/api/v1/dashboard/ws', baseWs.startsWith('ws') ? baseWs.replace('ws', 'http') : baseWs);
  const protocol = baseWs.startsWith('https') || baseWs.startsWith('wss') ? 'wss:' : 'ws:';
  const fullWsUrl = `${protocol}//${urlObj.host}${urlObj.pathname}?token=${encodeURIComponent(token)}`;

  try {
    onStatusChange?.('reconnecting');
    const ws = new WebSocket(fullWsUrl);
    ws.onopen = () => {
      onStatusChange?.('connected');
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };
    ws.onerror = (err) => {
      onStatusChange?.('offline');
      if (onError) onError(err);
    };
    ws.onclose = () => {
      onStatusChange?.('offline');
    };
    return ws;
  } catch (err) {
    onStatusChange?.('offline');
    if (onError) onError(err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Notification Services — Batch 2
// ---------------------------------------------------------------------------
export const notificationService = {
  list: async (params = {}) => {
    try {
      const response = await apiClient.get('/notifications', { params });
      return response.data;
    } catch {
      return { items: [], total: 0, unread_count: 0, page: 1, page_size: 20 };
    }
  },
  getUnreadCount: async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data;
    } catch {
      return { unread_count: 0, sla_breach_count: 0 };
    }
  },
  getInboxCount: async () => {
    try {
      const response = await apiClient.get('/notifications/inbox-count');
      return response.data?.inbox_count || 0;
    } catch {
      return 0;
    }
  },
  markRead: async (notificationId) => {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch {
      return { success: false };
    }
  },
  markAllRead: async () => {
    try {
      const response = await apiClient.patch('/notifications/read-all');
      return response.data;
    } catch {
      return { marked_count: 0 };
    }
  },
};

export const connectNotificationsWebSocket = (onMessage, onError) => {
  const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const wsUrl = `${base}/api/v1/notifications/ws`;
  try {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('Notifications WS parse error:', err);
      }
    };
    ws.onerror = (err) => { if (onError) onError(err); };
    return ws;
  } catch (err) {
    console.warn('Notifications WebSocket unavailable:', err);
    return null;
  }
};

export const supportService = {
  createRequest: async (data) => {
    const response = await apiClient.post('/support/requests', data);
    return response.data;
  },
};

export { projectsService } from './projectsService';
export { taskService, connectTasksWebSocket } from '../modules/tasks/services/taskService';
export { analyticsService } from './analyticsService';
export { auditLogsService } from './auditLogsService';
export { discussionsService } from './discussionsService';
export { filesService } from './filesService';
export { membersService } from './membersService';
export { settingsService } from './settingsService';
export { ticketsService, createTicketsWebSocket } from './ticketsService';
