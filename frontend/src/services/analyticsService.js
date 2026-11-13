import { apiClient } from './api';

export const analyticsService = {
  getDashboard: async (params = {}) => {
    const res = await apiClient.get('/analytics/dashboard', { params });
    return res.data;
  },

  getSummary: async () => {
    const res = await apiClient.get('/analytics/summary');
    return res.data;
  },

  exportReport: async (payload = {}) => {
    const response = await apiClient.post('/analytics/export', payload, {
      responseType: 'blob',
    });
    
    // Trigger client-side browser download
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('download', `analytics-report-${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

