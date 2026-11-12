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

  changePassword: async (data) => {
    const response = await apiClient.post('/users/change-password', data);
    return response.data;
  },
};

