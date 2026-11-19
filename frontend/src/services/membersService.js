import { apiClient, organizationService } from './api';

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

  // Organization Join Requests & Join Codes (Owner/Admin)
  listJoinRequests: async (organizationId, status, page = 1, pageSize = 20) => {
    return organizationService.listJoinRequests(organizationId, status, page, pageSize);
  },

  approveJoinRequest: async (organizationId, requestId) => {
    return organizationService.approveJoinRequest(organizationId, requestId);
  },

  rejectJoinRequest: async (organizationId, requestId, reason) => {
    return organizationService.rejectJoinRequest(organizationId, requestId, reason);
  },

  generateJoinCode: async (organizationId, options = {}) => {
    return organizationService.generateJoinCode(organizationId, options);
  },

  revokeJoinCode: async (organizationId) => {
    return organizationService.revokeJoinCode(organizationId);
  },
};

