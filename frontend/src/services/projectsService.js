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

  /**
   * Screen 40: Get aggregated project overview summary (burndown, milestones, workload, alerts)
   * @param {string} projectId
   */
  getProjectOverview: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/overview`);
    return response.data;
  },

  /**
   * Screen 41: Get tasks for project Kanban board
   * @param {string} projectId
   * @param {Object} params - { status, priority, assigned_to_id }
   */
  getTasks: async (projectId, params = {}) => {
    const response = await apiClient.get('/tasks', { params: { project_id: projectId, ...params } });
    return response.data;
  },

  /**
   * Create a new task in project
   * @param {Object} taskData - { title, description, status, priority, project_id, assigned_to_id }
   */
  createTask: async (taskData) => {
    const response = await apiClient.post('/tasks', taskData);
    return response.data;
  },

  /**
   * Update task (status, priority, assignee, etc.)
   * @param {string} taskId
   * @param {Object} updateData - { status, priority, title, description, assigned_to_id }
   */
  updateTask: async (taskId, updateData) => {
    const response = await apiClient.patch(`/tasks/${taskId}`, updateData);
    return response.data;
  },

  /**
   * Delete a task
   * @param {string} taskId
   */
  deleteTask: async (taskId) => {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Get project tickets for Overview and Kanban
   * @param {string} projectId
   * @param {Object} params - { severity, status }
   */
  getTickets: async (projectId, params = {}) => {
    const response = await apiClient.get('/tickets', { params: { project_id: projectId, ...params } });
    return response.data;
  },

  /**
   * Create a new ticket linked to project
   * @param {string} projectId
   * @param {Object} ticketData
   */
  createTicket: async (projectId, ticketData) => {
    const response = await apiClient.post('/tickets', ticketData, { params: { project_id: projectId } });
    return response.data;
  },

  /**
   * Screen 43: Get discussions for project
   * @param {string} projectId
   * @param {Object} params - { category, search }
   */
  getDiscussions: async (projectId, params = {}) => {
    const response = await apiClient.get('/discussions', { params: { project_id: projectId, ...params } });
    return response.data;
  },

  /**
   * Screen 43: Create discussion topic
   * @param {string} projectId
   * @param {Object} discussionData - { title, content, category, is_pinned }
   */
  createDiscussion: async (projectId, discussionData) => {
    const response = await apiClient.post('/discussions', discussionData, { params: { project_id: projectId } });
    return response.data;
  },

  /**
   * Screen 43: Add comment / reply to discussion thread
   * @param {string} discussionId
   * @param {Object} commentData - { content }
   */
  addDiscussionComment: async (discussionId, commentData) => {
    const response = await apiClient.post(`/discussions/${discussionId}/comments`, commentData);
    return response.data;
  },

  /**
   * Screen 44: Get files for project
   * @param {string} projectId
   * @param {Object} params - { file_type, search }
   */
  getProjectFiles: async (projectId, params = {}) => {
    const response = await apiClient.get('/files', { params: { project_id: projectId, ...params } });
    return response.data;
  },

  /**
   * Screen 44: Register uploaded file metadata
   * @param {string} projectId
   * @param {Object} fileData - { name, file_type, size_bytes, file_url, is_pinned, linked_task_number }
   */
  uploadProjectFile: async (projectId, fileData) => {
    const response = await apiClient.post('/files', fileData, { params: { project_id: projectId } });
    return response.data;
  },

  /**
   * Screen 44: Delete project file
   * @param {string} fileId
   */
  deleteProjectFile: async (fileId) => {
    const response = await apiClient.delete(`/files/${fileId}`);
    return response.data;
  },

  /**
   * Screen 45: Get project activity logs
   * @param {string} projectId
   * @param {Object} params - { category, actor_id, search }
   */
  getProjectActivity: async (projectId, params = {}) => {
    const response = await apiClient.get('/audit-logs', { params: { project_id: projectId, ...params } });
    return response.data;
  },
};

export default projectsService;

