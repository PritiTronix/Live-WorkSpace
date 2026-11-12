import { apiClient } from './api';

export const discussionsService = {
  listDiscussions: async (params = {}) => {
    const response = await apiClient.get('/discussions', { params });
    return response.data;
  },

  getDiscussion: async (discussionId) => {
    const response = await apiClient.get(`/discussions/${discussionId}`);
    return response.data;
  },

  createDiscussion: async (data, projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.post('/discussions', data, { params });
    return response.data;
  },

  addComment: async (discussionId, data) => {
    const response = await apiClient.post(`/discussions/${discussionId}/comments`, data);
    return response.data;
  },

  toggleReaction: async (discussionId, emoji) => {
    const response = await apiClient.post(`/discussions/${discussionId}/reactions`, { emoji });
    return response.data;
  },
};

