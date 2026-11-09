/**
 * taskService — API calls for the tasks module.
 * All methods return raw API data or null/[] on error.
 */
import { apiClient } from '../../../services/api';

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

export const connectTasksWebSocket = (onMessage) => {
  const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
  const wsUrl = `${base}/api/v1/tasks/ws`;
  try {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try { onMessage?.(JSON.parse(event.data)); } catch {}
    };
    return ws;
  } catch {
    return null;
  }
};
