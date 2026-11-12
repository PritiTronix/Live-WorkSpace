import { apiClient } from './api';

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
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    return `${base}/files/${fileId}/download`;
  },
};

