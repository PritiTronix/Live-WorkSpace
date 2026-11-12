import React, { useState, useEffect } from 'react';
import { filesService } from '../../../services/filesService';
import FileUploadModal from '../components/FileUploadModal';
import FilePreviewDrawer from '../components/FilePreviewDrawer';
import { DEFAULT_USER } from '../../../services/api';

export const CentralFilesPage = () => {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedUploader, setSelectedUploader] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('table'); // table or grid

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);

  useEffect(() => {
    loadFilesAndStats();
  }, [searchQuery, selectedType, selectedProject, selectedUploader]);

  const loadFilesAndStats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedType !== 'all') params.file_type = selectedType;
      if (selectedProject !== 'all') params.project_id = selectedProject;
      if (selectedUploader !== 'all') params.uploader_id = selectedUploader;

      const [filesData, statsData] = await Promise.all([
        filesService.listFiles(params),
        filesService.getStats().catch(() => null),
      ]);

      setFiles(filesData);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = (newFile) => {
    setFiles((prev) => [newFile, ...prev]);
    loadFilesAndStats();
  };

  const handleFileDeleted = (deletedId) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
  };

  const getFileIcon = (type, name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { icon: 'picture_as_pdf', color: 'text-severity-blocker', bg: 'bg-red-100' };
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext))
      return { icon: 'image', color: 'text-primary', bg: 'bg-purple-100' };
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return { icon: 'table_chart', color: 'text-status-resolved', bg: 'bg-green-100' };
    if (ext === 'pcap') return { icon: 'lan', color: 'text-status-open', bg: 'bg-blue-100' };
    return { icon: 'description', color: 'text-text-secondary', bg: 'bg-canvas-lavender' };
  };

  // Sort files client-side
  const sortedFiles = [...files].sort((a, b) => {
    if (sortBy === 'alpha') return a.name.localeCompare(b.name);
    if (sortBy === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

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
        <button
          onClick={() => setIsUploadModalOpen(true)}
          type="button"
          className="h-10 px-4 bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>+ Upload Document</span>
        </button>
      </div>

      {/* Storage and File Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
          <p className="text-text-secondary text-sm font-medium">Total Storage</p>
          <p className="text-text-primary text-2xl font-bold tracking-tight">
            {stats?.total_storage_formatted || '4.8 GB / 50 GB'}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
          <p className="text-text-secondary text-sm font-medium">Total Files</p>
          <p className="text-text-primary text-2xl font-bold tracking-tight">
            {files.length} documents
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
          <p className="text-text-secondary text-sm font-medium">PDF Reports</p>
          <p className="text-text-primary text-2xl font-bold tracking-tight">
            {files.filter((f) => f.name.toLowerCase().endsWith('.pdf')).length} files
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-surface-card border border-border-subtle shadow-sm">
          <p className="text-text-secondary text-sm font-medium">Images & Traces</p>
          <p className="text-text-primary text-2xl font-bold tracking-tight">
            {files.filter((f) => /\.(png|jpg|jpeg|webp|pcap)$/i.test(f.name)).length} files
          </p>
        </div>
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
              <option value="all">All Projects ▾</option>
              <option value="Cloud Core Infra">Cloud Core Infra</option>
              <option value="Platform Revamp 2.0">Platform Revamp 2.0</option>
              <option value="Operations & SLA">Operations & SLA</option>
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

        {/* View Toggle */}
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
        </div>
      </div>

      {/* Primary Files Table */}
      {viewMode === 'table' ? (
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
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted">
                      <span className="w-4 h-4 border-2 border-btn-primary border-t-transparent rounded-full animate-spin inline-block mr-2" />
                      Loading repository files...
                    </td>
                  </tr>
                ) : sortedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      <span className="material-symbols-outlined text-3xl mb-1 block">folder_open</span>
                      No documents found in central repository.
                    </td>
                  </tr>
                ) : (
                  sortedFiles.map((file) => {
                    const iconMeta = getFileIcon(file.file_type, file.name);
                    const uploader = file.uploader || DEFAULT_USER;

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
                                {file.file_type} • Version 1.0
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-text-secondary whitespace-nowrap">
                          {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(0)} KB` : '1.2 MB'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-primary-fixed text-primary font-bold text-[10px] flex items-center justify-center">
                              {uploader.full_name?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium text-text-primary">{uploader.full_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-text-secondary whitespace-nowrap">
                          {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Today'}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-text-primary">Platform Core</span>
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
                              className="p-1 text-text-secondary hover:text-primary hover:bg-canvas-lavender rounded"
                              title="Preview File"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </button>
                            <a
                              href={filesService.getDownloadUrl(file.id)}
                              download={file.name}
                              className="p-1 text-text-secondary hover:text-primary hover:bg-canvas-lavender rounded"
                              title="Download File"
                            >
                              <span className="material-symbols-outlined text-base">download</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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
                    {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(0)} KB` : '1.2 MB'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary text-sm truncate" title={file.name}>
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Today'}
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

