import { apiClient } from './api';

export const membersService = {
  listMembers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getMemberDetail: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  inviteMember: async (data, projectId = null) => {
    if (projectId) {
      const response = await apiClient.post(`/projects/${projectId}/members`, data);
      return response.data;
    }
    const response = await apiClient.post('/users/invite', data);
    return response.data;
  },
};

