import { apiClient } from './api';

export const settingsService = {
  getWorkspaceSettings: async () => {
    const response = await apiClient.get('/settings/workspace');
    return response.data;
  },

  updateWorkspaceSettings: async (data) => {
    const response = await apiClient.patch('/settings/workspace', data);
    return response.data;
  },

  getSlaConfig: async () => {
    const response = await apiClient.get('/settings/sla');
    return response.data;
  },

  updateSlaConfig: async (data) => {
    const response = await apiClient.patch('/settings/sla', data);
    return response.data;
  },

  deleteSlaConfig: async () => {
    const response = await apiClient.delete('/settings/sla');
    return response.data;
  },

  getNotificationPreferences: async () => {
    const response = await apiClient.get('/settings/notifications');
    return response.data;
  },

  updateNotificationPreferences: async (data) => {
    const response = await apiClient.patch('/settings/notifications', data);
    return response.data;
  },

  getAppearance: async () => {
    const response = await apiClient.get('/settings/appearance');
    return response.data;
  },

  updateAppearance: async (data) => {
    const response = await apiClient.patch('/settings/appearance', data);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await apiClient.patch('/users/me', data);
    return response.data;
  },

  uploadAvatar: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onUploadProgress(percent);
        }
      },
    });
    return response.data;
  },

  deleteAvatar: async () => {
    const response = await apiClient.delete('/users/me/avatar');
    return response.data;
  },

  changePassword: async (data) => {
    const response = await apiClient.post('/users/change-password', data);
    return response.data;
  },
};

