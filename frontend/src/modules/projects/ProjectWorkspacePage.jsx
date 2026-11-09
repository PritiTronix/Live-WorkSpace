import React, { useState, useEffect } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import ProjectHeaderTabs from './ProjectHeaderTabs';
import projectsService from '../../services/projectsService';

/**
 * ProjectWorkspacePage
 * Root page component managing project context across all tab routes:
 * /workspace/projects/:id (defaults to /overview)
 * /workspace/projects/:id/overview
 * /workspace/projects/:id/board
 * /workspace/projects/:id/timeline
 * /workspace/projects/:id/discussions
 * /workspace/projects/:id/files
 * /workspace/projects/:id/activity
 */
export const ProjectWorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsService.getProject(id);
      setProject(data);
    } catch (err) {
      console.error('Failed to load project workspace:', err);
      setError(err.message || 'Project not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <span className="mt-4 font-body-md text-text-secondary">Loading Project Workspace...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-surface-card rounded-2xl p-space-2xl border border-error/20 text-center max-w-xl mx-auto my-12 shadow-sm">
        <span className="material-symbols-outlined text-[48px] text-error mb-3">folder_off</span>
        <h2 className="font-headline-md text-headline-md text-text-primary mb-2">Project Not Found</h2>
        <p className="font-body-md text-text-secondary mb-space-lg">
          {error || `The requested project with ID '${id}' could not be loaded.`}
        </p>
        <button
          type="button"
          onClick={() => navigate('/workspace/projects')}
          className="px-5 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all"
        >
          Return to Projects Listing
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Shared Project Workspace Header & Tabs (Screens 38 & 39) */}
      <ProjectHeaderTabs
        project={project}
        onProjectUpdated={fetchProject}
        onOpenNewWorkItem={(type) => {
          if (type === 'task') {
            navigate(`/workspace/projects/${id}/board`);
          } else if (type === 'ticket') {
            navigate(`/workspace/projects/${id}/overview`);
          }
        }}
      />

      {/* Dynamic Tab View Sub-Routes */}
      <div className="flex-1 pb-space-2xl">
        <Outlet context={{ project, onProjectUpdated: fetchProject }} />
      </div>
    </div>
  );
};

export default ProjectWorkspacePage;

