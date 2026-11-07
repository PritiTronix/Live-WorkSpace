import { apiClient } from './api';

/**
 * Projects API Service
 * Encapsulates all project and project-member communication with FastAPI backend
 */
export const projectsService = {
  /**
   * Get list of projects with optional query filters
   * @param {Object} params - { search, status, lead_id, visibility, sort_by, include_archived }
   */
  getProjects: async (params = {}) => {
    const response = await apiClient.get('/projects', { params });
    return response.data;
  },

  /**
   * Get single project details by ID
   * @param {string} id - Project ID
   */
  getProject: async (id) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  /**
   * Create a new project
   * @param {Object} projectData
   */
  createProject: async (projectData) => {
    const response = await apiClient.post('/projects', projectData);
    return response.data;
  },

  /**
   * Update an existing project
   * @param {string} id - Project ID
   * @param {Object} projectData
   */
  updateProject: async (id, projectData) => {
    const response = await apiClient.patch(`/projects/${id}`, projectData);
    return response.data;
  },

  /**
   * Archive a project (non-destructive)
   * @param {string} id - Project ID
   */
  archiveProject: async (id) => {
    const response = await apiClient.post(`/projects/${id}/archive`);
    return response.data;
  },

  /**
   * Unarchive a project
   * @param {string} id - Project ID
   */
  unarchiveProject: async (id) => {
    const response = await apiClient.post(`/projects/${id}/unarchive`);
    return response.data;
  },

  /**
   * Permanently delete a project
   * @param {string} id - Project ID
   */
  deleteProject: async (id) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  /**
   * Get members and pending invitations of a project
   * @param {string} projectId
   */
  getProjectMembers: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/members`);
    return response.data;
  },

  /**
   * Add a member or send invitation to a project
   * @param {string} projectId
   * @param {Object} memberData - { user_id, email, role, access_scope }
   */
  addProjectMember: async (projectId, memberData) => {
    const response = await apiClient.post(`/projects/${projectId}/members`, memberData);
    return response.data;
  },

  /**
   * Update member role or access scope
   * @param {string} projectId
   * @param {string} memberId
   * @param {Object} updateData - { role, access_scope }
   */
  updateProjectMember: async (projectId, memberId, updateData) => {
    const response = await apiClient.patch(`/projects/${projectId}/members/${memberId}`, updateData);
    return response.data;
  },

  /**
   * Remove member from project
   * @param {string} projectId
   * @param {string} memberId
   */
  removeProjectMember: async (projectId, memberId) => {
    const response = await apiClient.delete(`/projects/${projectId}/members/${memberId}`);
    return response.data;
  },

  /**
   * Resend pending invitation
   * @param {string} projectId
   * @param {string} invitationId
   */
  resendInvitation: async (projectId, invitationId) => {
    const response = await apiClient.post(`/projects/${projectId}/invitations/${invitationId}/resend`);
    return response.data;
  },

  /**
   * Revoke pending invitation
   * @param {string} projectId
   * @param {string} invitationId
   */
  revokeInvitation: async (projectId, invitationId) => {
    const response = await apiClient.delete(`/projects/${projectId}/invitations/${invitationId}`);
    return response.data;
  },

  /**
   * Get all workspace users for member assignment / lead selection
   */
  getUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },
};

export default projectsService;

