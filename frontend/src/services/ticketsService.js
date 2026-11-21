import { apiClient, authService, buildWebSocketUrl, safeCloseWebSocket, resolveApiUrl } from './api';

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

  getCritical: async (params = {}) => {
    const res = await apiClient.get('/tickets/critical', { params });
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

  changeStatus: async (ticketId, data) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/status`, data);
    return res.data;
  },

  changeSeverity: async (ticketId, data) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/severity`, data);
    return res.data;
  },

  reassignTicket: async (ticketId, data) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/assignee`, data);
    return res.data;
  },

  changeDeadline: async (ticketId, data) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/deadline`, data);
    return res.data;
  },

  reopenTicket: async (ticketId, data) => {
    const res = await apiClient.post(`/tickets/${ticketId}/reopen`, data);
    return res.data;
  },

  closeTicket: async (ticketId, data) => {
    const res = await apiClient.post(`/tickets/${ticketId}/close`, data);
    return res.data;
  },

  getAttachmentDownloadUrl: (ticketId, attachmentId) => {
    return resolveApiUrl(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}/download`);
  },

  createTicketsWebSocket: (workspaceId, onEvent) => createTicketsWebSocket(workspaceId, onEvent),
};

/**
 * Helper to resolve active workspace ID strictly from authenticated context.
 * Returns null if no verified organization or workspace ID is present.
 */
export const getAuthenticatedWorkspaceId = (explicitWorkspaceId) => {
  // Authoritative tenant identity from authenticated session
  const user = authService.getCurrentUserSync();
  const authenticatedOrgId =
    user?.organization_id ||
    user?.organization?.id ||
    user?.workspace_id ||
    null;

  let storedUserOrgId = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      storedUserOrgId = parsed?.organization_id || parsed?.organization?.id || parsed?.workspace_id || null;
    }
  } catch {}

  const authoritativeOrgId = authenticatedOrgId || storedUserOrgId;

  // Validate explicit workspace ID against authenticated tenant identity
  if (
    explicitWorkspaceId &&
    typeof explicitWorkspaceId === 'string' &&
    explicitWorkspaceId.trim() &&
    explicitWorkspaceId !== 'null' &&
    explicitWorkspaceId !== 'undefined'
  ) {
    const trimmed = explicitWorkspaceId.trim();
    if (authoritativeOrgId) {
      if (trimmed === authoritativeOrgId || (user?.organization?.slug && trimmed === user.organization.slug)) {
        return trimmed;
      }
      // Explicit ID does not match authenticated tenant; enforce verified tenant identity
      return authoritativeOrgId;
    }
    // If no authenticated tenant identity exists, disallow unverified explicit workspace IDs
    return null;
  }

  return authoritativeOrgId;
};

/**
 * Real-time WebSocket connection for ticket events scoped strictly to authenticated workspace.
 */
export const createTicketsWebSocket = (workspaceId, onEvent, onStatusChange) => {
  const token = localStorage.getItem('access_token');
  const resolvedWorkspaceId = getAuthenticatedWorkspaceId(workspaceId);

  // If token or workspace ID is missing, safely transition to disconnected state without connecting
  if (!token || !resolvedWorkspaceId) {
    if (typeof onStatusChange === 'function') onStatusChange(false);
    const noopCleanup = () => {};
    noopCleanup.close = noopCleanup;
    return noopCleanup;
  }

  const wsUrl = buildWebSocketUrl(`/api/v1/tickets/ws/${encodeURIComponent(resolvedWorkspaceId)}`, token);

  let ws = null;
  let retryTimer = null;
  let isDisposed = false;

  const clearExistingTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (isDisposed) return;
    clearExistingTimer();
    retryTimer = setTimeout(() => {
      if (!isDisposed) {
        connect();
      }
    }, 3000);
  };

  const connect = () => {
    if (isDisposed) return;
    clearExistingTimer();

    // Close any prior socket instance cleanly before creating a new one
    if (ws) {
      const prevWs = ws;
      ws = null;
      safeCloseWebSocket(prevWs);
    }

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isDisposed) {
          safeCloseWebSocket(ws);
          ws = null;
          return;
        }
        if (typeof onStatusChange === 'function') onStatusChange(true);
      };

      ws.onmessage = (event) => {
        if (isDisposed) return;
        try {
          const payload = JSON.parse(event.data);
          if (onEvent) onEvent(payload);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = (event) => {
        if (isDisposed) return;
        if (typeof onStatusChange === 'function') onStatusChange(false);
        // Do not reconnect on normal closure (1000) or authentication / policy violation (1008)
        if (event && (event.code === 1000 || event.code === 1008 || event.code === 1003)) {
          return;
        }
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        if (isDisposed) return;
        if (typeof onStatusChange === 'function') onStatusChange(false);
        // Note: onclose will fire following onerror to handle single reconnect
      };
    } catch (err) {
      if (isDisposed) return;
      if (typeof onStatusChange === 'function') onStatusChange(false);
      scheduleReconnect();
    }
  };

  connect();

  const cleanup = () => {
    isDisposed = true;
    clearExistingTimer();
    if (typeof onStatusChange === 'function') onStatusChange(false);
    if (ws) {
      safeCloseWebSocket(ws);
      ws = null;
    }
  };

  // Provide both functional cleanup and .close() compatibility
  cleanup.close = cleanup;
  return cleanup;
};

export const connectTicketsWebSocket = createTicketsWebSocket;
ticketsService.createTicketsWebSocket = createTicketsWebSocket;
ticketsService.connectTicketsWebSocket = createTicketsWebSocket;

export default ticketsService;

