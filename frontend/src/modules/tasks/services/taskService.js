/**
 * taskService — API calls for the tasks module.
 * All methods return raw API data or null/[] on error.
 */
import { apiClient, buildWebSocketUrl, safeCloseWebSocket } from '../../../services/api';

const BASE = '/tasks';

export const taskService = {
  list: async (params = {}) => {
    try {
      const res = await apiClient.get(BASE, { params });
      return res.data;
    } catch {
      return { items: [], total: 0, page: 1, page_size: 25 };
    }
  },

  listMy: async (params = {}) => {
    try {
      const res = await apiClient.get(`${BASE}/my`, { params });
      return res.data;
    } catch {
      return { items: [], total: 0, page: 1, page_size: 25 };
    }
  },

  get: async (taskId) => {
    try {
      const res = await apiClient.get(`${BASE}/${taskId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  create: async (payload) => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  update: async (taskId, payload) => {
    const res = await apiClient.patch(`${BASE}/${taskId}`, payload);
    return res.data;
  },

  changeStatus: async (taskId, newStatus) => {
    const res = await apiClient.patch(`${BASE}/${taskId}/status`, { status: newStatus });
    return res.data;
  },

  delete: async (taskId) => {
    await apiClient.delete(`${BASE}/${taskId}`);
  },

  listComments: async (taskId) => {
    try {
      const res = await apiClient.get(`${BASE}/${taskId}/comments`);
      return res.data;
    } catch {
      return [];
    }
  },

  addComment: async (taskId, body) => {
    const res = await apiClient.post(`${BASE}/${taskId}/comments`, { body });
    return res.data;
  },

  listAttachments: async (taskId) => {
    try {
      const res = await apiClient.get(`${BASE}/${taskId}/attachments`);
      return res.data;
    } catch {
      return [];
    }
  },

  registerAttachment: async (taskId, metadata) => {
    const res = await apiClient.post(`${BASE}/${taskId}/attachments`, metadata);
    return res.data;
  },

  getEnums: async () => {
    try {
      const res = await apiClient.get(`${BASE}/meta/enums`);
      return res.data;
    } catch {
      return null;
    }
  },
};

export const connectTasksWebSocket = (onMessage, workspaceId) => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  const endpoint = workspaceId ? `/api/v1/tasks/ws/${encodeURIComponent(workspaceId)}` : '/api/v1/tasks/ws';
  const wsUrl = buildWebSocketUrl(endpoint, token);

  let isDisposed = false;
  let ws = null;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (isDisposed) {
        safeCloseWebSocket(ws);
      }
    };

    ws.onmessage = (event) => {
      if (isDisposed) return;
      try {
        onMessage?.(JSON.parse(event.data));
      } catch {}
    };

    ws.onerror = (err) => {
      if (isDisposed || ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) return;
      console.warn('Tasks WebSocket error:', err);
    };

    ws._dispose = () => {
      isDisposed = true;
    };

    return ws;
  } catch (err) {
    console.warn('Tasks WebSocket initialization failed:', err);
    return null;
  }
};
