import React, { useState } from 'react';
import { filesService } from '../../../services/filesService';
import { DEFAULT_USER } from '../../../services/api';

export const FilePreviewDrawer = ({ file, isOpen, onClose, onFileDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!isOpen || !file) return null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${file.name}"?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await filesService.deleteFile(file.id);
      if (onFileDeleted) {
        onFileDeleted(file.id);
      }
      onClose();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (type, name = '') => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { icon: 'picture_as_pdf', color: 'text-severity-blocker', bg: 'bg-red-100' };
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext))
      return { icon: 'image', color: 'text-primary', bg: 'bg-purple-100' };
    if (['xls', 'xlsx', 'csv'].includes(ext))
      return { icon: 'table_chart', color: 'text-status-resolved', bg: 'bg-green-100' };
    if (ext === 'pcap') return { icon: 'lan', color: 'text-status-open', bg: 'bg-blue-100' };
    return { icon: 'description', color: 'text-text-secondary', bg: 'bg-gray-100' };
  };

  const iconMeta = getFileIcon(file.file_type, file.name);
  const uploader = file.uploader || DEFAULT_USER;
  const downloadUrl = filesService.getDownloadUrl(file.id);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-[480px] bg-surface-card border-l border-border-subtle shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Drawer Header with Preview Controls */}
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-canvas-lavender/60">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className={`material-symbols-outlined text-xl shrink-0 ${iconMeta.color}`}>
            {iconMeta.icon}
          </span>
          <h3 className="text-xs font-bold text-text-primary truncate" title={file.name}>
            {file.name}
          </h3>
        </div>

        {/* Quick Viewer Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 25, 200))}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container rounded"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-base">zoom_in</span>
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container rounded"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-base">zoom_out</span>
          </button>
          <button
            type="button"
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container rounded"
            title="Rotate"
          >
            <span className="material-symbols-outlined text-base">rotate_right</span>
          </button>
          <div className="h-4 w-px bg-border-subtle mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-container rounded"
            title="Close Preview"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Rendered Document Preview Pane */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Rendered Document Preview</span>
            <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-mono">
              Zoom: {zoomLevel}%
            </span>
          </div>

          <div className="border border-border-subtle rounded-xl bg-canvas-lavender/30 p-4 shadow-inner relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
              className="w-full flex flex-col items-center justify-center text-center transition-transform duration-150"
            >
              <div className={`w-16 h-16 rounded-xl ${iconMeta.bg} flex items-center justify-center ${iconMeta.color} mb-3 shadow-sm`}>
                <span className="material-symbols-outlined text-3xl">{iconMeta.icon}</span>
              </div>
              <p className="font-label-md text-text-primary font-semibold max-w-xs truncate">{file.name}</p>
              <p className="font-body-sm text-text-muted mt-0.5">
                {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(0)} KB` : 'Verified Spec'} • {file.file_type || 'document'}
              </p>
            </div>
          </div>
        </div>

        {/* File Information & Metadata Card */}
        <div className="space-y-3">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-text-secondary block">
            File Specifications
          </span>

          <div className="bg-canvas-main rounded-xl p-4 border border-border-subtle space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">File Type</span>
              <span className="font-semibold text-text-primary uppercase">{file.file_type || 'Document'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Storage Size</span>
              <span className="font-semibold text-text-primary">
                {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Uploaded Date</span>
              <span className="font-medium text-text-secondary">
                {file.created_at ? new Date(file.created_at).toLocaleString() : 'Recent'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Linked Ticket/Task</span>
              <span className="font-semibold text-primary font-mono">
                {file.linked_task_number ? `#${file.linked_task_number}` : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Uploader Details */}
        <div className="space-y-3">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-text-secondary block">
            Contributor Attribution
          </span>

          <div className="flex items-center gap-3 p-3 bg-canvas-main rounded-xl border border-border-subtle">
            <img
              src={uploader.avatar_url || DEFAULT_USER.avatar_url}
              alt={uploader.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex flex-col truncate">
              <span className="font-label-md text-text-primary font-bold truncate">{uploader.full_name}</span>
              <span className="font-body-sm text-text-muted truncate">{uploader.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Actions Footer */}
      <div className="p-4 border-t border-border-subtle bg-canvas-lavender/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 text-severity-blocker hover:bg-error-container/20 rounded-lg transition-colors flex items-center gap-1 font-label-md text-label-md"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
          <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert('File link copied to clipboard!');
            }}
            className="px-3 py-2 bg-surface-card hover:bg-canvas-lavender text-text-primary border border-border-subtle rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            <span>Share Link</span>
          </button>
          <a
            href={downloadUrl}
            download={file.name}
            className="px-4 py-2 bg-btn-primary hover:bg-primary-hover text-on-primary rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewDrawer;

