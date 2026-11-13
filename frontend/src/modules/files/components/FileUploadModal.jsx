import React, { useState } from 'react';
import { filesService } from '../../../services/filesService';

export const FileUploadModal = ({ isOpen, onClose, onFileUploaded, projects = [] }) => {
  const [queue, setQueue] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [relatedTicket, setRelatedTicket] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validated = [];
    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds 50MB limit.`);
        continue;
      }
      const lower = f.name.toLowerCase();
      if (lower.endsWith('.exe') || lower.endsWith('.dmg') || lower.endsWith('.bat') || lower.endsWith('.sh')) {
        setError(`Executable file "${f.name}" is blocked by security policy.`);
        continue;
      }
      validated.push({
        file: f,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        rawSize: f.size,
      });
    }

    if (validated.length > 0) {
      setError(null);
      setQueue((prev) => [...prev, ...validated]);
    }
  };

  const removeQueueItem = (idx) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadAll = async () => {
    if (queue.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      for (const item of queue) {
        const formData = new FormData();
        formData.append('file', item.file);
        if (selectedProject) formData.append('project_id', selectedProject);
        if (relatedTicket) formData.append('linked_task_number', relatedTicket);

        const uploaded = await filesService.uploadFile(formData);
        if (onFileUploaded) {
          onFileUploaded(uploaded);
        }
      }

      setQueue([]);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative bg-surface-card w-full max-w-[520px] rounded-xl shadow-2xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-canvas-lavender/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">cloud_upload</span>
            </div>
            <div>
              <h3 className="text-text-primary text-base font-bold font-headline-sm">Upload Files & Documents</h3>
              <p className="text-text-secondary text-xs">Add files directly to workspace repository</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface-container transition"
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-error/30 rounded-lg flex items-start gap-2.5 text-xs text-error">
              <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <label className="border-2 border-dashed border-primary-light hover:border-btn-primary transition-colors rounded-xl p-6 bg-surface-container-low/60 flex flex-col items-center justify-center text-center cursor-pointer group block">
            <div className="w-12 h-12 rounded-full bg-surface-card shadow-xs flex items-center justify-center text-btn-primary group-hover:scale-110 transition-transform mb-3 mx-auto">
              <span className="material-symbols-outlined text-2xl">drive_folder_upload</span>
            </div>
            <p className="text-sm font-semibold text-text-primary">
              Drag & drop files here, or <span className="text-btn-primary hover:underline">browse from computer</span>
            </p>
            <p className="text-[11px] text-text-secondary mt-1 max-w-sm mx-auto">
              Supports PDF, PNG, JPG, XLSX, CSV, DOCX, and PCAP traces (up to 50MB per file)
            </p>
            <input type="file" multiple className="hidden" onChange={handleFileSelection} />
          </label>

          {/* Upload Queue Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Upload Queue ({queue.length} files)
              </label>
              {queue.length > 0 && (
                <span className="text-[11px] font-medium text-btn-primary">
                  {(queue.reduce((acc, f) => acc + f.rawSize, 0) / (1024 * 1024)).toFixed(1)} MB total
                </span>
              )}
            </div>

            {queue.map((item, idx) => (
              <div key={idx} className="p-3 bg-canvas-lavender rounded-lg border border-border-subtle flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="material-symbols-outlined text-primary text-lg shrink-0">description</span>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-text-primary truncate">{item.name}</p>
                      <p className="text-[10px] text-text-secondary">{item.size} • Ready</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="material-symbols-outlined text-status-resolved text-base">check_circle</span>
                    <button
                      type="button"
                      onClick={() => removeQueueItem(idx)}
                      className="text-text-muted hover:text-severity-blocker transition"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-btn-primary h-full rounded-full transition-all duration-300" style={{ width: '100%' }} />
                </div>
              </div>
            ))}

            {queue.length === 0 && (
              <p className="text-xs text-text-muted text-center py-2">No files selected in queue.</p>
            )}
          </div>

          {/* Metadata Association Fields */}
          <div className="space-y-3 pt-1 border-t border-border-subtle">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Metadata Association
            </label>
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">Project Association</label>
              <div className="relative">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-canvas-lavender border border-border-subtle text-xs rounded-lg py-2 pl-3 pr-8 focus:ring-1 focus:ring-primary focus:outline-none appearance-none"
                >
                  <option value="">Auto-associate to primary project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="Platform Revamp 2.0">Platform Revamp 2.0</option>
                  <option value="Cloud Core Infra">Cloud Core Infra</option>
                  <option value="Operations & SLA">Operations & SLA</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-2.5 text-text-secondary text-sm">
                  expand_more
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Related Ticket / Task (Optional)
              </label>
              <div className="relative">
                <select
                  value={relatedTicket}
                  onChange={(e) => setRelatedTicket(e.target.value)}
                  className="w-full bg-canvas-lavender border border-border-subtle text-xs rounded-lg py-2 pl-3 pr-8 focus:ring-1 focus:ring-primary focus:outline-none appearance-none"
                >
                  <option value="">None / Standalone Workspace File</option>
                  <option value="TKT-1025">#TKT-1025 Auth proxy latency spike</option>
                  <option value="TKT-1019">#TKT-1019 Postgres Replication Sync</option>
                  <option value="TKT-994">#TKT-994 Redis cache failover testing</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-2.5 text-text-secondary text-sm">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Validation Guardrail Banner */}
          <div className="p-3 bg-red-50 border border-error/30 rounded-lg flex items-start gap-2.5">
            <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">error</span>
            <div className="text-[11px] leading-snug">
              <p className="font-semibold text-error">Validation Guardrail</p>
              <p className="text-on-surface-variant">
                System blocks files exceeding 50 MB and unsupported executable formats (.exe / .dmg / scripts).
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-canvas-lavender/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-lg transition hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={isUploading || queue.length === 0}
            className="px-4 py-2 text-xs font-semibold bg-btn-primary hover:bg-primary-hover text-on-primary rounded-lg transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">file_upload</span>
            <span>{isUploading ? 'Uploading...' : `Upload ${queue.length} Files`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;

