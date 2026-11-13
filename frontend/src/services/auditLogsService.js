import { apiClient } from './api';

export const auditLogsService = {
  listLogs: async (params = {}) => {
    const res = await apiClient.get('/audit-logs', { params });
    return res.data;
  },

  getLogDetail: async (logId) => {
    const res = await apiClient.get(`/audit-logs/${logId}`);
    return res.data;
  },

  getActors: async () => {
    const res = await apiClient.get('/audit-logs/actors');
    return res.data;
  },

  exportLogs: async (payload = {}) => {
    const format = (payload.format || 'csv').toLowerCase();
    const response = await apiClient.post('/audit-logs/export', payload, {
      responseType: 'blob',
    });

    const mimeType = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
    const ext = format === 'json' ? 'json' : 'csv';

    const blob = new Blob([response.data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `audit-log-${timestamp}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};
