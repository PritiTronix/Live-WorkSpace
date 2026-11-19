import React, { useState, useEffect, useMemo } from 'react';
import { filesService } from '../../../services/filesService';
import { projectsService } from '../../../services/projectsService';
import FileUploadModal from '../components/FileUploadModal';
import FilePreviewDrawer from '../components/FilePreviewDrawer';
import { authService, DEFAULT_USER } from '../../../services/api';
import ErrorState from '../../design-system/components/ErrorState';

export const CentralFilesPage = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedUploader, setSelectedUploader] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('table'); // table or grid

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);
  const [projectList, setProjectList] = useState([]);

  // Determine user permissions for upload
  const currentUser = authService.getCurrentUserSync();
  const userRole = (currentUser?.memberships?.[0]?.role || currentUser?.role || 'member').toLowerCase();
  const canUpload = userRole !== 'viewer';

  // Load projects for project association and display mapping
  useEffect(() => {
    projectsService.getProjects()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items || []);
        setProjectList(list);
      })
      .catch(() => {
        setProjectList([]);
      });
  }, []);

  // Map project ID to project name
  const projectMap = useMemo(() => {
    const map = {};
    for (const p of projectList) {
      map[p.id] = p.name;
    }
    return map;
  }, [projectList]);

  useEffect(() => {
    loadFilesAndStats();
  }, [searchQuery, selectedType, selectedProject, selectedUploader]);

  const loadFilesAndStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedType !== 'all') params.file_type = selectedType;
      if (selectedProject !== 'all') params.project_id = selectedProject;
      if (selectedUploader !== 'all') params.uploader_id = selectedUploader;

      const [filesData, statsData] = await Promise.all([
        filesService.listFiles(params),
        filesService.getStats().catch(() => null),
      ]);

      setFiles(Array.isArray(filesData) ? filesData : []);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError(err);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    loadFilesAndStats();
  };

  const handleFileUploaded = (newFile) => {
    setFiles((prev) => [newFile, ...prev]);
    loadFilesAndStats();
  };

  const handleFileDeleted = (deletedId) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
    if (selectedFileForPreview?.id === deletedId) {
      setSelectedFileForPreview(null);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (type, name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { icon: 'picture_as_pdf', color: 'text-severity-blocker', bg: 'bg-red-100' };
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext))
      return { icon: 'image', color: 'text-primary', bg: 'bg-purple-100' };
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return { icon: 'table_chart', color: 'text-status-resolved', bg: 'bg-green-100' };
    if (ext === 'pcap') return { icon: 'lan', color: 'text-status-open', bg: 'bg-blue-100' };
    return { icon: 'description', color: 'text-text-secondary', bg: 'bg-canvas-lavender' };
  };

  // Sort files client-side
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (sortBy === 'alpha') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [files, sortBy]);

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-text-primary text-3xl font-headline-xl font-bold tracking-tight">
            Files & Documents
          </h1>
          <p className="text-text-secondary font-body-md text-body-md">
            Central repository for workspace documents, architecture specs, incident traces, and export reports across all projects.
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            type="button"
            className="h-10 px-4 bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Upload Document</span>
          </button>
        )}
      </div>

      {/* Storage and File Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm animate-pulse">
                <div className="h-4 w-24 bg-[#E8E6FE]/50 rounded" />
                <div className="h-7 w-32 bg-[#E8E6FE]/50 rounded mt-1" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
              <p className="text-text-secondary text-sm font-medium">Total Storage</p>
              <p className="text-text-primary text-2xl font-bold tracking-tight">
                {stats?.total_storage_formatted || (stats?.total_bytes ? formatBytes(stats.total_bytes) + ' / 50 GB' : '0.0 GB / 50 GB')}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
              <p className="text-text-secondary text-sm font-medium">Total Files</p>
              <p className="text-text-primary text-2xl font-bold tracking-tight">
                {stats?.total_files ?? files.length} documents
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
              <p className="text-text-secondary text-sm font-medium">PDF Reports</p>
              <p className="text-text-primary text-2xl font-bold tracking-tight">
                {stats?.pdf_count ?? files.filter((f) => f.name?.toLowerCase().endsWith('.pdf')).length} files
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
              <p className="text-text-secondary text-sm font-medium">Images & Traces</p>
              <p className="text-text-primary text-2xl font-bold tracking-tight">
                {stats?.images_count ?? files.filter((f) => /\.(png|jpg|jpeg|webp|pcap|svg|gif)$/i.test(f.name || '')).length} files
              </p>
            </div>
          </>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-4 top-3 text-[22px] text-text-muted">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by file name, uploader, project, or ticket key..."
          className="w-full h-12 pl-12 pr-4 bg-surface-card border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20 shadow-sm text-sm"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Types' },
          { id: 'document', label: 'PDF & Docs' },
          { id: 'media', label: 'Images' },
          { id: 'schema', label: 'Packet Traces & Schemas' },
          { id: 'archive', label: 'Archives' },
        ].map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => setSelectedType(pill.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              selectedType === pill.id
                ? 'bg-btn-primary text-on-primary font-semibold'
                : 'bg-surface-card hover:bg-canvas-lavender text-text-secondary border border-border-subtle'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Secondary Controls & Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-card p-3 rounded-xl border border-border-subtle shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none bg-canvas-lavender hover:bg-surface-container border border-border-subtle text-text-primary text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-text-secondary text-sm">
              expand_more
            </span>
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-canvas-lavender hover:bg-surface-container border border-border-subtle text-text-primary text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            >
              <option value="recent">Recently Uploaded ▾</option>
              <option value="alpha">Alphabetical (A-Z)</option>
              <option value="size">File Size (Largest)</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-text-secondary text-sm">
              swap_vert
            </span>
          </div>
        </div>

        {/* View Toggle & Upload Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-canvas-lavender p-0.5 rounded-lg border border-border-subtle">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md flex items-center justify-center transition ${
                viewMode === 'table' ? 'bg-surface-card text-primary shadow-xs' : 'text-text-secondary'
              }`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md flex items-center justify-center transition ${
                viewMode === 'grid' ? 'bg-surface-card text-primary shadow-xs' : 'text-text-secondary'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
            </button>
          </div>
          {canUpload && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
              className="flex items-center gap-1.5 bg-btn-primary hover:bg-primary-hover text-on-primary px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Viewport: Error, Loading Skeleton, Empty State, or Data */}
      {error ? (
        <div className="bg-surface-card rounded-xl border border-border-subtle p-8 shadow-sm">
          <ErrorState
            variant={error?.cause === 'network' ? 'network' : '500'}
            title="Unable to load files"
            description={
              error?.response?.status === 503
                ? 'The files service is currently undergoing maintenance. Please retry in a moment.'
                : error?.message || 'We encountered an unexpected error loading repository files.'
            }
            onRetry={handleRetry}
            isRetrying={isRetrying}
            actionText="Try Again"
          />
        </div>
      ) : loading ? (
        viewMode === 'table' ? (
          <div className="bg-surface-card rounded-xl border border-border-subtle shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-canvas-lavender/60 text-text-secondary text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 w-10">
                      <div className="size-4 rounded bg-[#E8E6FE]/50 animate-pulse" />
                    </th>
                    <th className="py-3 px-4">Document Name</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-3">Uploaded Date</th>
                    <th className="py-3 px-3">Project & Ticket</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-xs">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="size-4 rounded bg-[#E8E6FE]/50" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-[#E8E6FE]/50 shrink-0" />
                          <div className="space-y-1.5 w-48">
                            <div className="h-3.5 bg-[#E8E6FE]/50 rounded w-3/4" />
                            <div className="h-2.5 bg-[#E8E6FE]/40 rounded w-1/2" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="h-3 bg-[#E8E6FE]/50 rounded w-12" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-[#E8E6FE]/50" />
                          <div className="h-3 bg-[#E8E6FE]/50 rounded w-20" />
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="h-3 bg-[#E8E6FE]/50 rounded w-16" />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="h-3 bg-[#E8E6FE]/50 rounded w-20" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="h-4 bg-[#E8E6FE]/50 rounded w-12 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
              <div key={card} className="bg-surface-card rounded-xl p-4 border border-border-subtle shadow-sm animate-pulse space-y-3">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-lg bg-[#E8E6FE]/50" />
                  <div className="h-3 w-12 bg-[#E8E6FE]/50 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-[#E8E6FE]/50 rounded w-3/4" />
                  <div className="h-2.5 bg-[#E8E6FE]/40 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : sortedFiles.length === 0 ? (
        /* Empty State */
        <div className="bg-surface-card rounded-xl border border-border-subtle p-12 shadow-sm flex flex-col items-center justify-center text-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-canvas-lavender flex items-center justify-center text-primary mb-4 shadow-xs">
            <span className="material-symbols-outlined text-3xl">folder_open</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-text-primary mb-1">
            {searchQuery.trim() || selectedType !== 'all' || selectedProject !== 'all'
              ? 'No matching documents'
              : 'No files yet'}
          </h3>
          <p className="font-body-md text-body-md text-text-secondary max-w-md mb-6 leading-relaxed">
            {searchQuery.trim() || selectedType !== 'all' || selectedProject !== 'all'
              ? 'No files matched your active filters or search term. Try adjusting your search query or reset your filters.'
              : 'Your workspace repository currently has no files uploaded. Upload architecture specs, incident traces, or project documentation to collaborate.'}
          </p>
          {canUpload && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
              className="px-5 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>Upload Document</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Primary Files Table */
        <div className="bg-surface-card rounded-xl border border-border-subtle shadow-sm overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-canvas-lavender/60 text-text-secondary text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-10">
                    <input type="checkbox" className="rounded text-primary size-4" />
                  </th>
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-3">Uploaded Date</th>
                  <th className="py-3 px-3">Project & Ticket</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {sortedFiles.map((file) => {
                  const iconMeta = getFileIcon(file.file_type, file.name);
                  const uploader = file.uploader || DEFAULT_USER;
                  const projectName = projectMap[file.project_id] || file.project?.name || 'Workspace';

                  return (
                    <tr
                      key={file.id}
                      onClick={() => setSelectedFileForPreview(file)}
                      className="hover:bg-surface-container-low transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-primary size-4" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-8 rounded-lg ${iconMeta.bg} flex items-center justify-center ${iconMeta.color} shrink-0`}>
                            <span className="material-symbols-outlined text-lg">{iconMeta.icon}</span>
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-text-primary text-sm group-hover:text-primary transition truncate max-w-sm">
                              {file.name}
                            </p>
                            <p className="text-text-muted text-[11px] capitalize">
                              {file.file_type || 'Document'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-text-secondary whitespace-nowrap">
                        {formatBytes(file.size_bytes)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary-fixed text-primary font-bold text-[10px] flex items-center justify-center">
                            {(uploader.full_name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-text-primary">{uploader.full_name || 'Team Member'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-text-secondary whitespace-nowrap">
                        {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-text-primary">{projectName}</span>
                          {file.linked_task_number ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-status-open bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                              <span className="material-symbols-outlined text-[10px]">confirmation_number</span>
                              #{file.linked_task_number}
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted">Repository</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedFileForPreview(file)}
                            className="p-1 text-text-secondary hover:text-primary hover:bg-canvas-lavender rounded cursor-pointer"
                            title="Preview File"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => filesService.downloadFile(file.id, file.name)}
                            className="p-1 text-text-secondary hover:text-primary hover:bg-canvas-lavender rounded cursor-pointer"
                            title="Download File"
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-surface-card border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
            <span>Showing <strong>{sortedFiles.length}</strong> documents</span>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {sortedFiles.map((file) => {
            const iconMeta = getFileIcon(file.file_type, file.name);
            return (
              <div
                key={file.id}
                onClick={() => setSelectedFileForPreview(file)}
                className="bg-surface-card rounded-xl p-4 border border-border-subtle shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`size-10 rounded-lg ${iconMeta.bg} flex items-center justify-center ${iconMeta.color}`}>
                    <span className="material-symbols-outlined text-xl">{iconMeta.icon}</span>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {formatBytes(file.size_bytes)}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm truncate" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFileUploaded={handleFileUploaded}
        projects={projectList}
      />

      {/* File Preview Drawer */}
      <FilePreviewDrawer
        file={selectedFileForPreview}
        isOpen={Boolean(selectedFileForPreview)}
        onClose={() => setSelectedFileForPreview(null)}
        onFileDeleted={handleFileDeleted}
      />
    </div>
  );
};

export default CentralFilesPage;
