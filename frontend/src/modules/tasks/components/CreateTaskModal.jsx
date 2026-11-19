import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from '../../design-system/components/Modal';
import Avatar from '../../../components/common/Avatar';
import { projectsService } from '../../../services/projectsService';
import { authService } from '../../../services/api';
import {
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABEL,
  TASK_PRIORITY_OPTIONS,
  TASK_PRIORITY_LABEL,
  TASK_TYPE_OPTIONS,
  TASK_TYPE_LABEL,
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
} from '../constants/taskEnums';

/**
 * CreateTaskModal
 * Clean, production modal for creating tasks using shared Modal component.
 * Includes interactive Assigner and Assignee dropdowns with real workspace users.
 */
export const CreateTaskModal = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  // All fields start strictly EMPTY
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [storyPoints, setStoryPoints] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Workspace members & authenticated user state
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUserSync());
  const [assignerId, setAssignerId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Dropdown open states & search query states
  const [isAssignerOpen, setIsAssignerOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [assignerSearch, setAssignerSearch] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const assignerRef = useRef(null);
  const assigneeRef = useRef(null);

  // Reset form and initialize users on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('');
      setPriority('');
      setTaskType('');
      setStoryPoints('');
      setDueDate('');
      setErrorMessage('');
      setIsSubmitting(false);

      // Authenticated user initialization
      const user = authService.getCurrentUserSync();
      if (user) {
        setCurrentUser(user);
        setAssignerId(user.id);
      } else {
        authService.getCurrentUser().then((u) => {
          if (u) {
            setCurrentUser(u);
            setAssignerId(u.id);
          }
        });
      }

      setAssigneeId('');
      setIsAssignerOpen(false);
      setIsAssigneeOpen(false);
      setAssignerSearch('');
      setAssigneeSearch('');

      // Fetch dynamic workspace members
      setIsLoadingUsers(true);
      projectsService
        .getUsers()
        .then((data) => {
          setUsers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error('Failed to load workspace members:', err);
        })
        .finally(() => {
          setIsLoadingUsers(false);
        });
    }
  }, [isOpen]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (assignerRef.current && !assignerRef.current.contains(e.target)) {
        setIsAssignerOpen(false);
      }
      if (assigneeRef.current && !assigneeRef.current.contains(e.target)) {
        setIsAssigneeOpen(false);
      }
    };
    if (isAssignerOpen || isAssigneeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssignerOpen, isAssigneeOpen]);

  // Check RBAC permission for changing assigner (owner, admin, manager, lead)
  const userRole = (currentUser?.role || '').toLowerCase();
  const canChangeAssigner = ['owner', 'admin', 'manager', 'lead'].includes(userRole);

  // Filtered users for searching
  const filteredAssigners = useMemo(() => {
    if (!assignerSearch.trim()) return users;
    const q = assignerSearch.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, assignerSearch]);

  const filteredAssignees = useMemo(() => {
    if (!assigneeSearch.trim()) return users;
    const q = assigneeSearch.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [users, assigneeSearch]);

  const selectedAssigner = users.find((u) => u.id === assignerId) || currentUser;
  const selectedAssignee = users.find((u) => u.id === assigneeId) || null;

  const hasUnsavedChanges = Boolean(
    title.trim() ||
    description.trim() ||
    status ||
    priority ||
    taskType ||
    storyPoints ||
    dueDate ||
    assigneeId ||
    (currentUser && assignerId !== currentUser.id)
  );

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Task title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        status: status || TASK_STATUS.TODO,
        priority: priority || TASK_PRIORITY.MEDIUM,
        task_type: taskType || TASK_TYPE.FEATURE,
        story_points: storyPoints !== '' ? Number(storyPoints) : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId || null,
        assigned_to_id: assigneeId || null,
        assigner_id: assignerId || currentUser?.id,
        reporter_id: assignerId || currentUser?.id,
      };

      await onCreateTask(payload);
      onClose();
    } catch (err) {
      console.error('Failed to create task', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-secondary hover:bg-canvas-lavender font-label-md text-label-md transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="px-5 py-2.5 rounded-xl bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
            <span>Creating...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create Task</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Task"
      subtitle="Add an operational or feature work item"
      size="lg"
      footer={footer}
      hasUnsavedChanges={hasUnsavedChanges}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-error-container/40 text-error font-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block font-label-md text-label-md text-text-secondary mb-1">
            Title <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement Kafka telemetry health check"
            className="w-full h-11 px-3.5 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            autoFocus
          />
        </div>

        {/* Type, Priority, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Task Type */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select type</option>
              {TASK_TYPE_OPTIONS.map((tp) => (
                <option key={tp} value={tp}>
                  {TASK_TYPE_LABEL[tp]}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select priority</option>
              {TASK_PRIORITY_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>
                  {TASK_PRIORITY_LABEL[pr]}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select status</option>
              {TASK_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {TASK_STATUS_LABEL[st]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Story Points & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Story Points
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-canvas-main text-text-primary font-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Assigner & Assignee Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Assigner */}
          <div className="relative" ref={assignerRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-label-md text-label-md text-text-secondary">
                Assigner
              </label>
              {!canChangeAssigner && (
                <span className="text-[11px] text-text-muted flex items-center gap-0.5" title="Only administrators, managers, and leads can change assigner">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  Locked
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!canChangeAssigner || isLoadingUsers}
              onClick={() => {
                setIsAssignerOpen((prev) => !prev);
                setIsAssigneeOpen(false);
              }}
              className={`w-full h-11 px-3 rounded-lg border border-border-subtle bg-canvas-main flex items-center justify-between transition-colors text-left ${
                canChangeAssigner ? 'hover:bg-canvas-lavender/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20' : 'cursor-default opacity-85'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Avatar
                  src={selectedAssigner?.avatar_url}
                  name={selectedAssigner?.full_name}
                  size="sm"
                  shape="rounded-full"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-text-primary truncate">
                    {selectedAssigner?.full_name || 'Select Assigner'}
                  </span>
                  {selectedAssigner?.role && (
                    <span className="text-[10px] text-text-muted capitalize leading-none">
                      {selectedAssigner.role}
                    </span>
                  )}
                </div>
              </div>
              {canChangeAssigner ? (
                <span className="material-symbols-outlined text-text-muted text-[18px]">
                  {isAssignerOpen ? 'expand_less' : 'expand_more'}
                </span>
              ) : (
                <span className="material-symbols-outlined text-text-muted text-[16px]">lock</span>
              )}
            </button>

            {/* Assigner Dropdown Popover */}
            {isAssignerOpen && canChangeAssigner && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-surface-card rounded-xl shadow-xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-border-subtle bg-canvas-main">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-card rounded-lg border border-border-subtle">
                    <span className="material-symbols-outlined text-text-muted text-[16px]">search</span>
                    <input
                      type="text"
                      value={assignerSearch}
                      onChange={(e) => setAssignerSearch(e.target.value)}
                      placeholder="Search assigner..."
                      autoFocus
                      className="w-full bg-transparent border-0 outline-none font-body-sm text-body-sm text-text-primary placeholder:text-text-muted"
                    />
                    {assignerSearch && (
                      <button
                        type="button"
                        onClick={() => setAssignerSearch('')}
                        className="text-text-muted hover:text-text-primary"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-1 divide-y divide-border-subtle/30">
                  {filteredAssigners.length === 0 ? (
                    <div className="p-3 text-center text-text-muted font-body-sm text-body-sm">
                      No members found
                    </div>
                  ) : (
                    filteredAssigners.map((u) => {
                      const isSelected = u.id === assignerId;
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setAssignerId(u.id);
                            setIsAssignerOpen(false);
                            setAssignerSearch('');
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-canvas-lavender text-primary font-semibold'
                              : 'hover:bg-canvas-lavender/50 text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <Avatar
                              src={u.avatar_url}
                              name={u.full_name}
                              size="sm"
                              shape="rounded-full"
                            />
                            <div className="flex flex-col text-left min-w-0">
                              <span className="font-label-md text-label-md truncate">
                                {u.full_name}
                              </span>
                              <span className="text-[11px] text-text-muted truncate">
                                {u.email || u.role}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="relative" ref={assigneeRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-label-md text-label-md text-text-secondary">
                Assignee
              </label>
            </div>

            <button
              type="button"
              disabled={isLoadingUsers}
              onClick={() => {
                setIsAssigneeOpen((prev) => !prev);
                setIsAssignerOpen(false);
              }}
              className="w-full h-11 px-3 rounded-lg border border-border-subtle bg-canvas-main hover:bg-canvas-lavender/30 flex items-center justify-between transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                {selectedAssignee ? (
                  <>
                    <Avatar
                      src={selectedAssignee.avatar_url}
                      name={selectedAssignee.full_name}
                      size="sm"
                      shape="rounded-full"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-md text-label-md text-text-primary truncate">
                        {selectedAssignee.full_name}
                      </span>
                      {selectedAssignee.role && (
                        <span className="text-[10px] text-text-muted capitalize leading-none">
                          {selectedAssignee.role}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="w-7 h-7 rounded-full bg-border-subtle/50 flex items-center justify-center text-text-muted">
                      <span className="material-symbols-outlined text-[16px]">person</span>
                    </span>
                    <span className="font-body-sm text-body-sm text-text-muted">
                      Unassigned
                    </span>
                  </div>
                )}
              </div>
              <span className="material-symbols-outlined text-text-muted text-[18px]">
                {isAssigneeOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Assignee Dropdown Popover */}
            {isAssigneeOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-surface-card rounded-xl shadow-xl border border-border-subtle overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-border-subtle bg-canvas-main">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-card rounded-lg border border-border-subtle">
                    <span className="material-symbols-outlined text-text-muted text-[16px]">search</span>
                    <input
                      type="text"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search assignee..."
                      autoFocus
                      className="w-full bg-transparent border-0 outline-none font-body-sm text-body-sm text-text-primary placeholder:text-text-muted"
                    />
                    {assigneeSearch && (
                      <button
                        type="button"
                        onClick={() => setAssigneeSearch('')}
                        className="text-text-muted hover:text-text-primary"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-1 divide-y divide-border-subtle/30">
                  {/* Unassigned Option */}
                  <div
                    onClick={() => {
                      setAssigneeId('');
                      setIsAssigneeOpen(false);
                      setAssigneeSearch('');
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                      !assigneeId
                        ? 'bg-canvas-lavender text-primary font-semibold'
                        : 'hover:bg-canvas-lavender/50 text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-border-subtle/40 flex items-center justify-center text-text-muted">
                        <span className="material-symbols-outlined text-[16px]">person_off</span>
                      </span>
                      <span className="font-label-md text-label-md">Unassigned</span>
                    </div>
                    {!assigneeId && (
                      <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                    )}
                  </div>

                  {filteredAssignees.length === 0 ? (
                    <div className="p-3 text-center text-text-muted font-body-sm text-body-sm">
                      No members found
                    </div>
                  ) : (
                    filteredAssignees.map((u) => {
                      const isSelected = u.id === assigneeId;
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setAssigneeId(u.id);
                            setIsAssigneeOpen(false);
                            setAssigneeSearch('');
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-canvas-lavender text-primary font-semibold'
                              : 'hover:bg-canvas-lavender/50 text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <Avatar
                              src={u.avatar_url}
                              name={u.full_name}
                              size="sm"
                              shape="rounded-full"
                            />
                            <div className="flex flex-col text-left min-w-0">
                              <span className="font-label-md text-label-md truncate">
                                {u.full_name}
                              </span>
                              <span className="text-[11px] text-text-muted truncate">
                                {u.email || u.role}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-label-md text-label-md text-text-secondary mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, prerequisites, or implementation plan..."
            className="w-full p-3 rounded-xl border border-border-subtle bg-canvas-main text-text-primary font-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
