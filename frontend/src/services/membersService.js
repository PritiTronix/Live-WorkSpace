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

  getSummary: async () => {
    try {
      const response = await apiClient.get('/users/summary');
      return response.data;
    } catch {
      return null;
    }
  },

  listInvitations: async () => {
    try {
      const response = await apiClient.get('/users/invitations');
      return response.data || [];
    } catch {
      return [];
    }
  },

  inviteMember: async (data, projectId = null) => {
    if (projectId) {
      const response = await apiClient.post(`/projects/${projectId}/members`, data);
      return response.data;
    }
    const response = await apiClient.post('/users/invite', data);
    return response.data;
  },

  updateMemberRole: async (userId, role) => {
    const response = await apiClient.patch(`/users/${userId}/role`, { role });
    return response.data;
  },

  assignMemberToProject: async (projectId, userId, role = 'developer') => {
    const response = await apiClient.post(`/projects/${projectId}/members`, {
      user_id: userId,
      role: role,
    });
    return response.data;
  },
};

