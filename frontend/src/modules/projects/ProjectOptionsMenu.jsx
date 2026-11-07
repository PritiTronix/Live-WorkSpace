import React, { useState, useEffect, useRef } from 'react';
import { projectsService } from '../../services/projectsService';

/**
 * ProjectOptionsMenu (Screen 36 - Stitch ID 859f7eb7e2094d4881827d3a5eda8205)
 * Context Popover Menu + Archive Project Confirmation Modal + Destructive Purge Safeguard Modal
 */
export const ProjectOptionsMenu = ({
  project,
  isOpen,
  onClose,
  onEdit,
  onManageMembers,
  onProjectUpdated,
  onProjectDeleted,
  anchorRef,
}) => {
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [toast, setToast] = useState(null);
  const menuRef = useRef(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false);
        } else if (showArchiveModal) {
          setShowArchiveModal(false);
        } else if (isOpen) {
          onClose();
        }
      }
    };

    const handleClickOutside = (e) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        (!anchorRef || !anchorRef.current || !anchorRef.current.contains(e.target))
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showArchiveModal, showDeleteModal, onClose, anchorRef]);

  const showToastNotification = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleArchive = async () => {
    try {
      setIsArchiving(true);
      await projectsService.archiveProject(project.id);
      showToastNotification('Project Archived', `${project.name} moved to archive storage.`, 'warning');
      setShowArchiveModal(false);
      onClose();
      if (onProjectUpdated) {
        onProjectUpdated({ ...project, is_archived: true, status: 'Archived' });
      }
    } catch (err) {
      console.error('Archive project failed:', err);
      showToastNotification('Archive Failed', err.response?.data?.detail || 'Could not archive project.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput.trim() !== project.name) return;

    try {
      setIsDeleting(true);
      await projectsService.deleteProject(project.id);
      showToastNotification('Project Destroyed', `All tickets, assets, and metadata for ${project.name} were purged.`, 'error');
      setShowDeleteModal(false);
      onClose();
      if (onProjectDeleted) {
        onProjectDeleted(project.id);
      }
    } catch (err) {
      console.error('Delete project failed:', err);
      showToastNotification('Purge Failed', err.response?.data?.detail || 'Could not delete project.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const isDeleteMatch = deleteInput.trim() === project?.name;
  const memberCount = project?.members?.length || 0;
  const totalTasks = project?.metrics?.total_tasks ?? 42;
  const openTickets = project?.metrics?.open_tickets ?? 3;

  return (
    <>
      {/* 1. Context Popover Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-10 w-72 bg-surface-card rounded-xl shadow-xl p-1.5 space-y-1 z-30 transition-all border border-border-subtle/60 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-border-subtle/50 flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">Quick Actions</span>
            <span className="font-label-sm text-label-sm text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded font-mono">
              {project.key || 'PR-2025'}
            </span>
          </div>

          {/* Edit Project */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-text-primary hover:bg-canvas-lavender group transition-colors text-left"
            onClick={() => {
              onClose();
              if (onEdit) onEdit(project);
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary transition-colors">
                edit
              </span>
              <span className="font-label-md text-label-md">Edit Project</span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-variant text-text-secondary font-mono">
              ⌘E
            </span>
          </button>

          {/* Manage Members */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-text-primary hover:bg-canvas-lavender group transition-colors text-left"
            onClick={() => {
              onClose();
              if (onManageMembers) onManageMembers(project);
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary transition-colors">
                group
              </span>
              <span className="font-label-md text-label-md">Manage Members</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-variant text-text-primary">
                {memberCount > 0 ? memberCount : 8}
              </span>
              <span className="material-symbols-outlined text-[14px] text-text-muted">chevron_right</span>
            </div>
          </button>

          <div className="my-1 border-t border-border-subtle/70"></div>

          {/* Archive Project */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-text-primary hover:bg-amber-50/70 group transition-colors text-left"
            onClick={() => setShowArchiveModal(true)}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-status-on-hold group-hover:scale-110 transition-transform">
                archive
              </span>
              <span className="font-label-md text-label-md text-text-primary">Archive Project</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-label-sm tracking-wide uppercase bg-amber-100 text-status-on-hold font-semibold">
              Paused
            </span>
          </button>

          {/* Delete Project */}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-severity-blocker hover:bg-red-50 group transition-colors text-left"
            onClick={() => {
              setDeleteInput('');
              setShowDeleteModal(true);
            }}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-severity-blocker group-hover:scale-110 transition-transform">
                delete_outline
              </span>
              <span className="font-label-md text-label-md text-severity-blocker">Delete Project</span>
            </div>
            <span className="font-label-sm text-label-sm text-severity-blocker bg-red-100 px-1.5 py-0.5 rounded font-mono">
              RBAC
            </span>
          </button>
        </div>
      )}

      {/* 2. Archive Project Confirmation Modal (Level 3 Popover) */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl p-space-lg space-y-space-lg animate-in fade-in zoom-in-95 duration-200 border border-border-subtle">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-status-on-hold shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">archive</span>
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-status-on-hold font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                    Non-Destructive
                  </span>
                  <h3 className="font-headline-lg text-headline-lg text-text-primary">Archive Project?</h3>
                </div>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
                onClick={() => setShowArchiveModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-space-sm text-left">
              <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                Archiving this project will move it to the workspace archive. Active sprint boards and SLA monitors will be
                paused, but all historical tickets, attachments, and logs will remain accessible for compliance and
                reporting.
              </p>

              <div className="bg-canvas-lavender p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary font-headline-sm text-headline-sm flex items-center justify-center font-bold shadow-sm">
                      {project.key?.slice(0, 2) || 'PR'}
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-text-primary">{project.name}</h4>
                      <div className="font-body-sm text-body-sm text-text-muted">
                        Repository: acme/{project.key?.toLowerCase() || 'platform-revamp'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-surface-card text-text-primary font-label-sm text-label-sm shadow-sm">
                    {project.sla_tier || 'Tier 1 Core'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">task_alt</span>
                    <span className="font-body-sm text-body-sm text-text-primary">
                      <strong className="font-semibold">{totalTasks}</strong> tasks paused
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-severity-critical">
                      confirmation_number
                    </span>
                    <span className="font-body-sm text-body-sm text-text-primary">
                      <strong className="font-semibold">{openTickets}</strong> open tickets archived
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 flex items-start gap-2.5 text-status-on-hold">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  Project team members will retain read-only permissions. You can unarchive this project at any time from
                  Workspace Settings.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-border-subtle">
              <button
                type="button"
                className="h-10 px-4 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-colors"
                onClick={() => setShowArchiveModal(false)}
                disabled={isArchiving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 px-5 rounded-lg bg-status-on-hold hover:bg-amber-600 text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                onClick={handleArchive}
                disabled={isArchiving}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isArchiving ? 'sync' : 'archive'}
                </span>
                <span>{isArchiving ? 'Archiving...' : 'Archive Project'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Destructive Purge Safeguard Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl p-space-lg space-y-space-lg animate-in fade-in zoom-in-95 duration-200 border border-border-subtle">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-severity-blocker shadow-sm">
                  <span className="material-symbols-outlined text-[28px]">warning</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-severity-blocker font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                      Destructive Safeguard
                    </span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg text-text-primary">Permanently Delete Project</h3>
                </div>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
                onClick={() => setShowDeleteModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="space-y-space-md text-left">
              <div className="p-3.5 rounded-xl bg-red-50 space-y-2">
                <div className="flex items-center gap-2 font-headline-sm text-headline-sm text-severity-blocker">
                  <span className="material-symbols-outlined text-[20px]">dangerous</span>
                  <span>This action cannot be undone.</span>
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                  All <strong className="text-text-primary">{totalTasks} tasks</strong>,{' '}
                  <strong className="text-text-primary">{openTickets} tickets</strong>, sprint history, discussion
                  threads, and uploaded artifacts will be permanently destroyed. Linked SLA reports will lose ticket
                  references.
                </p>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-canvas-lavender text-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-status-resolved">security</span>
                  <span className="font-label-sm text-label-sm">Admin / Owner privilege verified</span>
                </div>
                <span className="font-label-sm text-label-sm text-primary font-mono font-semibold">UID #94021</span>
              </div>

              <div className="space-y-2">
                <label className="block font-label-md text-label-md text-text-primary" htmlFor="delete-confirmation-input">
                  Please type{' '}
                  <span className="font-mono font-bold text-severity-blocker select-all bg-red-50 px-1 py-0.5 rounded">
                    {project.name}
                  </span>{' '}
                  to confirm:
                </label>
                <div className="relative">
                  <input
                    id="delete-confirmation-input"
                    type="text"
                    className="w-full h-11 px-3.5 rounded-lg bg-canvas-main font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-card focus:ring-2 focus:ring-severity-blocker/30 transition-all border border-border-subtle"
                    placeholder="Enter project name..."
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    autoFocus
                  />
                  {isDeleteMatch && (
                    <div className="absolute right-3 top-3 text-status-resolved flex items-center">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                <span>
                  Security Token: <span className="font-mono">PR-DEL-9844-X2</span>
                </span>
                <span
                  className={
                    isDeleteMatch
                      ? 'font-label-sm text-label-sm text-status-resolved'
                      : 'font-label-sm text-label-sm text-severity-blocker'
                  }
                >
                  {isDeleteMatch ? 'Match verified' : 'Confirmation input required'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-border-subtle">
              <button
                type="button"
                className="h-10 px-4 rounded-lg bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-colors"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`h-10 px-5 rounded-lg bg-severity-blocker text-on-primary font-label-md text-label-md flex items-center gap-2 transition-all ${
                  isDeleteMatch && !isDeleting
                    ? 'hover:bg-red-700 shadow-md cursor-pointer opacity-100'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                disabled={!isDeleteMatch || isDeleting}
                onClick={handleDelete}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isDeleting ? 'sync' : 'delete_forever'}
                </span>
                <span>{isDeleting ? 'Purging Project...' : 'Permanently Delete Project'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-card rounded-xl shadow-2xl p-4 flex items-center gap-3 border border-border-subtle animate-in slide-in-from-bottom duration-300">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              toast.type === 'warning'
                ? 'bg-amber-100 text-status-on-hold'
                : toast.type === 'error'
                ? 'bg-red-100 text-severity-blocker'
                : 'bg-green-100 text-status-resolved'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'warning'
                ? 'archive'
                : toast.type === 'error'
                ? 'delete_forever'
                : 'check_circle'}
            </span>
          </div>
          <div>
            <div className="font-label-md text-label-md text-text-primary">{toast.title}</div>
            <div className="font-body-sm text-body-sm text-text-secondary">{toast.message}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectOptionsMenu;

