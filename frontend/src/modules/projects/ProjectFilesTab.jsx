import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import projectsService from '../../services/projectsService';

/**
 * Screen 44: Project Files Tab
 * Visual Reference: Stitch Screen 44 (`a8ea0deb64b344d89be8cc51a2d44482`)
 * Route: `/workspace/projects/:id/files`
 */
export const ProjectFilesTab = () => {
  const { id } = useParams();
  const context = useOutletContext();
  const project = context?.project;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Upload modal state (Rule 2: empty by default)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('document');
  const [newLinkedTask, setNewLinkedTask] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileTypeFilters = [
    { key: 'all', label: 'All Files' },
    { key: 'document', label: 'Documents' },
    { key: 'design', label: 'Design & Specs' },
    { key: 'schema', label: 'Architecture & Schemas' },
    { key: 'media', label: 'Media & Logs' },
  ];

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const data = await projectsService.getProjectFiles(id, {
        file_type: activeType !== 'all' ? activeType : undefined,
        search: search.trim() || undefined,
      });
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [id, activeType]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      setSubmitting(true);
      const created = await projectsService.uploadProjectFile(id, {
        name: newFileName.trim(),
        file_type: newFileType,
        size_bytes: 1024 * 1024 * 2.5, // 2.5MB simulation
        is_pinned: isPinned,
        linked_task_number: newLinkedTask.trim() || null,
      });
      setFiles((prev) => [created, ...prev]);
      // Reset form (Rule 2)
      setNewFileName('');
      setNewFileType('document');
      setNewLinkedTask('');
      setIsPinned(false);
      setShowUploadModal(false);
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('Failed to register file');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this project file?')) return;
    try {
      await projectsService.deleteProjectFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'schema':
        return { icon: 'code', color: 'text-primary' };
      case 'design':
        return { icon: 'draw', color: 'text-secondary' };
      case 'media':
        return { icon: 'terminal', color: 'text-severity-critical' };
      default:
        return { icon: 'picture_as_pdf', color: 'text-severity-blocker' };
    }
  };

  const pinnedFiles = files.filter((f) => f.is_pinned);
  const regularFiles = files.filter((f) => !f.is_pinned);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* 1. Storage & Utilization Banner (Screen 44) */}
      <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[28px]">folder_special</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Total Repository</span>
              <span className="px-2 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved text-[11px] font-bold">
                Synced
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary mt-0.5">
              {files.length} Assets (4.2 GB Allocated)
            </h2>
          </div>
        </div>

        {/* Storage Bar Gauge */}
        <div className="w-full md:w-72 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-label-sm font-semibold text-text-secondary">
            <span>Storage Utilization</span>
            <span className="text-text-primary">16.8% Used</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
            <div className="bg-btn-primary h-2 rounded-full" style={{ width: '16.8%' }} />
          </div>
          <span className="font-body-sm text-[11px] text-text-muted">4.2 GB of 25 GB Available</span>
        </div>
      </div>

      {/* 2. File Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md bg-surface-card rounded-xl p-space-md shadow-sm border border-border-subtle/50">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {fileTypeFilters.map((tf) => (
            <button
              key={tf.key}
              type="button"
              onClick={() => setActiveType(tf.key)}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                activeType === tf.key
                  ? 'bg-btn-primary text-on-primary font-bold shadow-xs'
                  : 'bg-canvas-main hover:bg-canvas-lavender text-text-secondary border border-border-subtle'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-space-sm">
          <div className="relative flex-1 sm:w-60">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
              placeholder="Search assets..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center p-1 bg-canvas-main rounded-lg border border-border-subtle text-text-muted">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-surface-card text-primary shadow-xs' : 'hover:text-text-primary'}`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-surface-card text-primary shadow-xs' : 'hover:text-text-primary'}`}
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="h-9 px-3.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
            <span>+ Upload Files</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-surface-card rounded-xl border border-border-subtle">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 font-body-md text-text-secondary">Loading files...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-surface-card rounded-xl p-space-2xl text-center border border-border-subtle">
          <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">folder_open</span>
          <h3 className="font-headline-sm text-headline-sm text-text-primary">No files in this project</h3>
          <p className="font-body-sm text-text-secondary mt-1">Upload technical runbooks, Figma designs, or schemas.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-space-lg">
          {/* Pinned / Recent Assets Section */}
          {pinnedFiles.length > 0 && (
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">push_pin</span>
                <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
                  Recent & Pinned Assets
                </h3>
                <span className="font-body-sm text-[12px] text-text-muted">Updated recently</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md">
                {pinnedFiles.map((f) => {
                  const { icon, color } = getFileIcon(f.file_type);

                  return (
                    <div
                      key={f.id}
                      className="bg-surface-card p-space-md rounded-xl shadow-sm border border-border-subtle/70 hover:shadow-md transition-all flex flex-col justify-between gap-space-md group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-10 h-10 rounded-lg bg-canvas-main flex items-center justify-center">
                            <span className={`material-symbols-outlined text-[24px] ${color}`}>{icon}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-headline-sm text-[13px] text-text-primary font-bold truncate group-hover:text-primary transition-colors">
                              {f.name}
                            </h4>
                            <span className="font-body-sm text-[11px] text-text-muted">
                              {formatBytes(f.size_bytes)} • {f.file_type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          className="text-text-muted hover:text-error transition-colors p-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      {f.linked_task_number && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-canvas-main text-text-secondary font-label-sm text-[11px]">
                          <span className="material-symbols-outlined text-[13px] text-primary">link</span>
                          <span className="font-mono font-bold">{f.linked_task_number}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-text-muted font-body-sm text-[11px] pt-space-xs border-t border-border-subtle/40">
                        <span className="truncate">{f.uploader?.full_name || 'Team member'}</span>
                        <a
                          href={f.file_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary-hover font-bold flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">download</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Files Grid / List */}
          <div className="flex flex-col gap-space-md">
            <h3 className="font-headline-sm text-headline-sm text-text-primary font-bold">
              All Project Files ({files.length})
            </h3>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md">
                {files.map((f) => {
                  const { icon, color } = getFileIcon(f.file_type);

                  return (
                    <div
                      key={f.id}
                      className="bg-surface-card p-space-md rounded-xl shadow-sm border border-border-subtle/50 hover:shadow-md transition-all flex flex-col justify-between gap-space-md group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-10 h-10 rounded-lg bg-canvas-main flex items-center justify-center">
                            <span className={`material-symbols-outlined text-[24px] ${color}`}>{icon}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-headline-sm text-[13px] text-text-primary font-bold truncate group-hover:text-primary transition-colors">
                              {f.name}
                            </h4>
                            <span className="font-body-sm text-[11px] text-text-muted">
                              {formatBytes(f.size_bytes)} • {f.file_type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          className="text-text-muted hover:text-error transition-colors p-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      {f.linked_task_number && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-canvas-main text-text-secondary font-label-sm text-[11px]">
                          <span className="material-symbols-outlined text-[13px] text-primary">link</span>
                          <span className="font-mono font-bold">{f.linked_task_number}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-text-muted font-body-sm text-[11px] pt-space-xs border-t border-border-subtle/40">
                        <span className="truncate">{f.uploader?.full_name || 'Team member'}</span>
                        <a
                          href={f.file_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary-hover font-bold flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[15px]">download</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List Table View */
              <div className="bg-surface-card rounded-xl border border-border-subtle/50 overflow-hidden shadow-sm">
                <table className="w-full text-left font-body-sm text-body-sm">
                  <thead className="bg-canvas-lavender/70 font-label-sm text-label-sm text-text-muted uppercase border-b border-border-subtle">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Linked Deliverable</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/40">
                    {files.map((f) => (
                      <tr key={f.id} className="hover:bg-canvas-lavender/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-text-primary flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                          <span>{f.name}</span>
                        </td>
                        <td className="py-3 px-4 text-text-secondary uppercase text-[11px] font-semibold">{f.file_type}</td>
                        <td className="py-3 px-4 text-text-muted">{formatBytes(f.size_bytes)}</td>
                        <td className="py-3 px-4 text-text-secondary font-mono">{f.linked_task_number || '—'}</td>
                        <td className="py-3 px-4 text-text-secondary">{f.uploader?.full_name || 'Team member'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(f.id)}
                            className="text-text-muted hover:text-error transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload File Modal (Rule 2: empty by default) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl border border-border-subtle p-space-xl flex flex-col gap-space-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-lg text-headline-lg text-text-primary">Upload Project File</h2>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-space-md">
              <div>
                <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                  File Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. database_migration_runbook_v2.pdf"
                  className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-md text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                    File Type
                  </label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="document">Document (PDF/MD)</option>
                    <option value="design">Design (Figma/SVG)</option>
                    <option value="schema">Schema (JSON/YAML)</option>
                    <option value="media">Media / Logs</option>
                  </select>
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                    Link to Task (Optional)
                  </label>
                  <input
                    type="text"
                    value={newLinkedTask}
                    onChange={(e) => setNewLinkedTask(e.target.value)}
                    placeholder="e.g. TASK-204"
                    className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pin-file-chk"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                />
                <label htmlFor="pin-file-chk" className="font-label-sm text-label-sm text-text-primary cursor-pointer">
                  Pin to Recent & Pinned section
                </label>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-border-subtle mt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-canvas-lavender text-text-secondary font-label-md text-label-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newFileName.trim()}
                  className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFilesTab;

