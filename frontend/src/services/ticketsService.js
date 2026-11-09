import { apiClient } from './api';

/**
 * Tickets API Service
 * Handles tickets, stats, board, priority views, comments, and attachments
 */
export const ticketsService = {
  getStats: async (params = {}) => {
    const res = await apiClient.get('/tickets/stats', { params });
    return res.data;
  },

  getTickets: async (params = {}) => {
    const res = await apiClient.get('/tickets', { params });
    return res.data;
  },

  getBoard: async (params = {}) => {
    const res = await apiClient.get('/tickets/board', { params });
    return res.data;
  },

  getPriority: async (params = {}) => {
    const res = await apiClient.get('/tickets/priority', { params });
    return res.data;
  },

  getTicket: async (ticketId) => {
    const res = await apiClient.get(`/tickets/${ticketId}`);
    return res.data;
  },

  createTicket: async (ticketData) => {
    const res = await apiClient.post('/tickets', ticketData);
    return res.data;
  },

  updateTicket: async (ticketId, updateData) => {
    const res = await apiClient.patch(`/tickets/${ticketId}`, updateData);
    return res.data;
  },

  deleteTicket: async (ticketId) => {
    const res = await apiClient.delete(`/tickets/${ticketId}`);
    return res.data;
  },

  addComment: async (ticketId, commentData) => {
    const res = await apiClient.post(`/tickets/${ticketId}/comments`, commentData);
    return res.data;
  },

  addAttachment: async (ticketId, fileOrFormData) => {
    let payload = fileOrFormData;
    let headers = {};
    if (fileOrFormData instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrFormData);
      payload = formData;
      headers = { 'Content-Type': 'multipart/form-data' };
    } else if (fileOrFormData instanceof FormData) {
      payload = fileOrFormData;
      headers = { 'Content-Type': 'multipart/form-data' };
    }
    const res = await apiClient.post(`/tickets/${ticketId}/attachments`, payload, { headers });
    return res.data;
  },
};

/**
 * Real-time WebSocket hook for ticket events in workspace
 */
export const createTicketsWebSocket = (workspaceId = 'org_01', onEvent) => {
  const token = localStorage.getItem('access_token') || 'mock_jwt_token_maya_shah';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = `?token=${encodeURIComponent(token)}`;
  // Point to backend websocket URL (default port 8000 in local dev)
  const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/tickets/ws/${workspaceId}${query}`;

  let ws = null;
  let retryTimer = null;

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (onEvent) onEvent(payload);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        retryTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (ws) ws.close();
      };
    } catch (err) {
      retryTimer = setTimeout(connect, 3000);
    }
  };

  connect();

  return () => {
    if (retryTimer) clearTimeout(retryTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  };
};

export default ticketsService;

