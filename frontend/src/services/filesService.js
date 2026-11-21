import { apiClient } from './api';
import { resolveApiUrl } from '../utils/apiUrl';

export const filesService = {
  listFiles: async (params = {}) => {
    const response = await apiClient.get('/files', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/files/stats');
    return response.data;
  },

  uploadFile: async (formData) => {
    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await apiClient.delete(`/files/${fileId}`);
    return response.data;
  },

  getDownloadUrl: (fileId) => {
    return resolveApiUrl(`/api/v1/files/${fileId}/download`);
  },

  downloadFile: async (fileId, fileName = 'download') => {
    const response = await apiClient.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

