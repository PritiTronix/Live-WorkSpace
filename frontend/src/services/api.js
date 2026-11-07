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

// Fallback user context matching Stitch design specification
export const DEFAULT_USER = {
  id: 'usr_01',
  full_name: 'Maya Shah',
  email: 'maya.shah@tronix365.cloud',
  role: 'SRE Lead',
  department: 'Platform & Reliability',
  presence: 'ONLINE',
  avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrAtOdrqsfXwMC1ggrSafmjA3tRiDOW6nsEXFzXsENjtoM3FWwKbLJA1BlzO43CGB9bykeRE8VGswBaHL8HX-wkA95x3YEk8Ido2sEJcvrr_WEWIIuLU9bOpJslSnCE2ZSZRXsXWqYDmuU8pTNCkkoaTZCzOhLNNQ2NT6sZn8vHrb0A-JPplRuViYPfX-t01H6IZLWAE4pWnivGDAtKKzl6WhvmKwlqcCaUb4gPTna',
};

// Authentication & Profile Services
export const authService = {
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
      }
      return response.data;
    } catch {
      // Mock authenticated fallback token when backend DB is pending
      const mockToken = 'mock_jwt_token_maya_shah';
      localStorage.setItem('access_token', mockToken);
      return { access_token: mockToken, user: DEFAULT_USER };
    }
  },
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/users/me');
      return response.data;
    } catch {
      return DEFAULT_USER;
    }
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
  },
};

// Global Search Services
export const searchService = {
  search: async (query, category = 'all') => {
    try {
      const response = await apiClient.get('/search', { params: { q: query, category } });
      return response.data;
    } catch {
      return null;
    }
  },
  getRecentSearches: async () => {
    try {
      const response = await apiClient.get('/search/recent');
      return response.data;
    } catch {
      return ['kafka consumer lag', 'SRE on-call rotation', 'TKT-1028'];
    }
  },
  saveRecentSearch: async (query) => {
    try {
      await apiClient.post('/search/recent', { query });
    } catch {
      // Silently ignore or handle in local state
    }
  },
};

// Dashboard Services
export const dashboardService = {
  getMetrics: async () => {
    try {
      const response = await apiClient.get('/dashboard/metrics');
      return response.data;
    } catch {
      return {
        total_projects: 14,
        total_tasks: 248,
        my_tasks: 12,
        open_tickets: 37,
        work_in_progress: 19,
        on_hold: 5,
        sla_breached: 2,
      };
    }
  },
  getTasksBreakdown: async () => {
    try {
      const response = await apiClient.get('/dashboard/tasks-breakdown');
      return response.data;
    } catch {
      return {
        total: 248,
        done: 142,
        in_progress: 68,
        in_review: 26,
        to_do: 12,
        completion_rate: 57.2,
      };
    }
  },
  getTicketsSeverity: async () => {
    try {
      const response = await apiClient.get('/dashboard/tickets-severity');
      return response.data;
    } catch {
      return {
        total_active: 37,
        blocker: 3,
        critical: 7,
        major: 12,
        minor: 15,
        violations_24h: 2,
      };
    }
  },
  getSlaPerformance: async () => {
    try {
      const response = await apiClient.get('/dashboard/sla-performance');
      return response.data;
    } catch {
      return {
        adherence_rate: 96.4,
        adherence_delta: '+1.8%',
        average_mttr: '14m',
        mttr_delta: '-3m faster',
        resolved_rolling_total: 34,
        rolling_days: [
          { day: 'Thu', count: 4, height: '45%' },
          { day: 'Fri', count: 6, height: '60%' },
          { day: 'Sat', count: 3, height: '35%' },
          { day: 'Sun', count: 2, height: '20%' },
          { day: 'Mon', count: 9, height: '85%' },
          { day: 'Tue', count: 10, height: '100%' },
          { day: 'Today', count: 7, height: '70%' },
        ],
      };
    }
  },
  getProjectProgress: async () => {
    try {
      const response = await apiClient.get('/dashboard/project-progress');
      return response.data;
    } catch {
      return [
        { id: 'prj_1', title: 'Platform Revamp 2.0', progress: 78, squads: '4 squads assigned', target: 'Dec 15', status_color: 'bg-btn-primary' },
        { id: 'prj_2', title: 'Auth Proxy Gateway Migration', progress: 92, squads: 'SRE Canary Rollout', target: 'Nov 30', status_color: 'bg-status-resolved' },
        { id: 'prj_3', title: 'Data Pipeline v3', progress: 45, squads: 'Blocked on Kafka sync', target: 'Jan 10', status_color: 'bg-severity-critical' },
      ];
    }
  },
  getTeamWorkload: async () => {
    try {
      const response = await apiClient.get('/dashboard/team-workload');
      return response.data;
    } catch {
      return [
        { name: 'Platform Squad', capacity: 88, status: '88% Capacity', color: 'bg-primary-container', desc: '6 Engineers • 18 active tasks • Optimal burn-rate' },
        { name: 'SRE Incident Response', capacity: 94, status: '94% Overload Warning', color: 'bg-severity-critical', desc: '4 On-call SREs • 2 Blocker alerts active • High paging rate' },
        { name: 'Core API Squad', capacity: 62, status: '62% Available', color: 'bg-status-resolved', desc: '5 Engineers • Ready for failover sprint allocation' },
      ];
    }
  },
  getPriorityTickets: async () => {
    try {
      const response = await apiClient.get('/dashboard/priority-tickets');
      return response.data;
    } catch {
      return [
        {
          id: 'TKT-1025',
          title: 'Auth proxy latency spike on us-east cluster',
          severity: 'Blocker',
          severity_bg: 'bg-red-100 text-severity-blocker border-red-200',
          status: 'Work in Progress',
          status_color: 'bg-status-wip text-status-wip',
          assignee_name: 'Aarav Mehta',
          assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqo8GgKfFsr5cHkqp1lCuMgd1yOtshoM_YSGgJFFDK0Qgzdq0EUdwPnnMhWjR-vLKk-ohcrmXdD__DMIkM0sihddxtnQilLqE9PAGu-e-IxSgqZa2oyFX_FUbcgOdaYbxR0hdK5dugjU4JeIkGzzlFNdKCR8haQg1EvM3Xzb0YLd2kUzSzoev5QLC1O4W2A7GXgHhIPq6RPxCszdG_snfOg4RAAUrndtuYU-ioTyhB',
          sla_text: 'BREACHED (-14m)',
          sla_class: 'bg-error text-white animate-pulse',
        },
        {
          id: 'TKT-1031',
          title: 'Payment Webhook retry queue exhaustion',
          severity: 'Critical',
          severity_bg: 'bg-amber-100 text-severity-critical border-amber-200',
          status: 'Open',
          status_color: 'bg-status-open text-status-open',
          assignee_name: 'Maya Shah',
          assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHjELWytJwzAGP7e9QWUNSnKTW-MnICfKIA4yhY0ydh6QRNwk51QKDJmSqZNYC5W3eoKGinUDbbAQmRvX35RpXmFV6yS8x2cAOfq40RxPjGqD3zCWtI1AJFUNvHUEUugdu-zKQHOwWJdzCSo5V8qCwd6DmaI5Yi59nV-giaE3goUTr8b3RUsVWJ7BO_G0fbI6HE11ROdx7RW1hQuT1ZguQQI4UVC1w3V8obEWEYWJJ',
          sla_text: '18m remaining',
          sla_class: 'bg-amber-100 text-severity-critical border border-amber-300',
        },
        {
          id: 'TKT-1028',
          title: 'Kafka consumer lag exceeding 50k messages',
          severity: 'Critical',
          severity_bg: 'bg-amber-100 text-severity-critical border-amber-200',
          status: 'Work in Progress',
          status_color: 'bg-status-wip text-status-wip',
          assignee_name: 'David K.',
          assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgpxBabcNP-VflfUu9YxPtRNgBmTPculGmwVPxmA67FPyIuIwm4qwUa1SZB6Ob31t9xz2dfM-HZGM2mWeTTF8ELwGn7hk3zWhLyvo_abqg4as9rbKLAfWH1NfG9EvhTsIbj1jFGmgXElKtRxt-hPjG_KnFLOimtvCmZlBcEHsiM3uP1jk1DMXrsJH360536mg0WTLxlUGj0OVUbNjOySGUYJkfs01YGDuLe34eZ1DO',
          sla_text: '42m remaining',
          sla_class: 'text-text-secondary font-medium',
        },
        {
          id: 'TKT-1019',
          title: 'Cross-region telemetry replication failover',
          severity: 'Major',
          severity_bg: 'bg-yellow-100 text-[#b58300] border-yellow-200',
          status: 'On Hold',
          status_color: 'bg-status-on-hold text-text-secondary',
          assignee_name: 'Sarah T.',
          assignee_avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1igbZGJ7L1Ky6xJ0okSYPBlzX8JW7EnkSjN-LZ6EDW7hdB6IOcBjmoNieDP1pECCl5dYOzlzTfE_TMS-l2sNeANsUCp0vMRe-s3fgpUk8D_5MM8MOFF2c3HNeIN8RDawNhYFdJ38e-UiBbJbHvuFXMUUrvJdrLjYINKXjeUd5kDeC_BFI-k4XmOGA3xyZNMnY81gO8Bj6PXEAUlXsKqHIFLhSe8VEmQWgUye8JmIG',
          sla_text: '2h 15m remaining',
          sla_class: 'text-text-secondary font-medium',
        },
      ];
    }
  },
  getActivityTimeline: async () => {
    try {
      const response = await apiClient.get('/dashboard/activity-timeline');
      return response.data;
    } catch {
      return [
        {
          id: 'act_1',
          actor: 'Aarav Mehta',
          action: 'escalated',
          target_id: 'TKT-1025',
          target_type: 'ticket',
          status_badge: 'Blocker',
          status_color: 'text-severity-blocker',
          dot_color: 'bg-severity-blocker',
          meta: '4 mins ago • us-east SRE Incident Channel',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbSDx---2N7YIzdzZoQ8HAru3n3DNE-tkCnVWcCPzTznNa_RBQOPWMov2WCi5YUvRYAvfccNsDasvnWl63I735VtTdfTZqM55gCmlu3LthPMNIFIORrDgjXJ8XE6mggi_Gq_oOt2iMZHUF_zC9msl1oXX_2_juzfEdlXYmHuvA6sWB3f2Ep2LJ6gph_Q8xHVEDOaiRv4Ie_Zz9y2YhwvJZccr6CIIJHsC7ContR2EV',
        },
        {
          id: 'act_2',
          actor: 'Maya Shah',
          action: 'committed fix to branch fix/webhook-retry on Platform Revamp',
          target_id: 'commit_e8f902c',
          dot_color: 'bg-status-resolved',
          meta: '18 mins ago • GitHub Commit #e8f902c',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCy6qL9ZlcLH4Vu-iRCkxSXaW5P4LBRnvqfxp6kgLTNP06HXluT9liexSMcTufAAd3NWWFqSshRHyt4scKmJA_HEhxJoPZav3aX81osQsgOAp0QloVpsSK-_z2Rwxbu8wc_U0kolH9icYjq_8cNd3TZNyLMDqnxu_whgCJqw0mRcyFAdqsAee2mqwTcET-ovE-BcEESiGOpz5V4HIbT940fhfWtfdUi7eZtbeG_fjc',
        },
        {
          id: 'act_3',
          actor: 'System Bot',
          action: 'triggered SLA warning alert for TKT-1031 (80% threshold reached)',
          target_id: 'TKT-1031',
          dot_color: 'bg-severity-critical',
          meta: '32 mins ago • Datadog Alert Webhook',
          is_bot: true,
        },
        {
          id: 'act_4',
          actor: 'Priya Nair',
          action: 'marked TASK-198 as Resolved',
          target_id: 'TASK-198',
          dot_color: 'bg-status-resolved',
          meta: '1 hr ago • Verified in staging cluster',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEr672y36GRoGPHj6QXmjQ6FVZEYKIXOkynZXObLyfier5tVYr9Bd0TdLPzVwhakG4-1yl4Eo9I_4Ptq8N0OPGgQIJ6YCz2ra55-vKMKWwEmtA_PiWfF0RNfQBh8Sw9Qu6oU7sAhzBn6-fi_1lLFe5oUINz4TvjpZ72jWQobwHD-stL4W8xlP_eYZKa8nQXvroDFyG_bJhq6SIuurny8EwByq_n1HQ86BXP7zXa53O',
        },
      ];
    }
  },
};

// WebSocket Real-time Connection Helper
export const connectDashboardWebSocket = (onMessage, onError) => {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/dashboard/ws';
  try {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };
    ws.onerror = (err) => {
      if (onError) onError(err);
    };
    return ws;
  } catch (err) {
    console.warn('WebSocket connection unavailable:', err);
    return null;
  }
};

export { projectsService } from './projectsService';

