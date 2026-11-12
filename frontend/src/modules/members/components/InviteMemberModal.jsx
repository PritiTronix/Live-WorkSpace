import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Shield, CheckCircle2, AlertCircle, Send, FolderGit2 } from 'lucide-react';
import { membersService } from '../../../services/membersService';
import { projectsService } from '../../../services/projectsService';

export const InviteMemberModal = ({ isOpen, onClose, onMemberInvited }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('employee');
      setNote('');
      setError(null);
      // Fetch projects to allow access allocation
      const loadProjects = async () => {
        try {
          const res = await projectsService.listProjects();
          const projs = res?.data || res || [];
          setAvailableProjects(projs);
          if (projs.length > 0) {
            setSelectedProjects([projs[0].id]);
          }
        } catch (err) {
          console.error('Failed to load projects for allocation:', err);
        }
      };
      loadProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const toggleProject = (projectId) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !isValidEmail) {
      setError('Please provide a valid work email address.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        email: email.trim().toLowerCase(),
        role: role.toLowerCase(),
        project_id: selectedProjects[0] || null,
        note: note.trim() || null,
      };

      const result = await membersService.inviteMember(payload);
      if (onMemberInvited) {
        onMemberInvited(result);
      }
      onClose();
    } catch (err) {
      console.error('Failed to invite member:', err);
      setError(err?.response?.data?.detail || 'Failed to dispatch workspace invitation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141529]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-[560px] bg-white dark:bg-[#1a1b32] rounded-2xl shadow-2xl border border-[#E5E5EF] dark:border-[#2e2f41] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white dark:bg-[#1a1b32] flex items-center justify-between border-b border-[#E5E5EF] dark:border-[#2e2f41]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#141529] dark:text-white">
                  Invite Team Member
                </h3>
                <span className="text-[10px] font-bold text-[#6848E8] bg-[#eeecff] dark:bg-[#2e2f41] px-2 py-0.5 rounded-full">
                  RBAC SEC-04 Active
                </span>
              </div>
              <p className="text-xs text-[#9C9CA9]">
                Grant access to Live Workspace and allocate project permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white hover:bg-[#F5F4FC] dark:hover:bg-[#242542] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5">
            {error && (
              <div className="p-3 bg-[#ffdad6]/50 dark:bg-[#93000a]/20 border border-[#ba1a1a]/30 rounded-lg text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                {error}
              </div>
            )}

            {/* Work Email Address */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Work Email Address
                </label>
                <span className="text-[11px] text-[#9C9CA9]">Domain policy enforced</span>
              </div>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-[#9C9CA9]" />
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-24 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                />
                {isValidEmail && (
                  <span className="absolute right-2 px-2 py-0.5 rounded bg-[#28C078]/10 text-[#28C078] text-[11px] font-bold">
                    Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[#9C9CA9] text-[11px] mt-0.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Permitted: <code className="text-[#6040F0] font-semibold">@tronix365.io</code> or <code className="text-[#6040F0] font-semibold">@company.com</code></span>
              </div>
            </div>

            {/* Workspace Role Radio Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#141529] dark:text-white flex items-center justify-between">
                <span>Workspace Role</span>
                <span className="text-[11px] text-[#6040F0] font-normal cursor-pointer hover:underline">
                  Learn permissions
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {/* Admin */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'admin'
                      ? 'bg-[#eeecff]/40 dark:bg-[#2e2f41] border-[#6040F0]'
                      : 'bg-white dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:bg-[#F5F4FC] dark:hover:bg-[#242542]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1 accent-[#6040F0]"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#141529] dark:text-white">
                        Administrator
                      </span>
                      <span className="text-[10px] font-bold bg-[#F55354]/10 text-[#F55354] px-1.5 py-0.5 rounded">
                        Elevated
                      </span>
                    </div>
                    <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                      Full workspace configuration, billing, security policies, and member administration.
                    </p>
                  </div>
                </label>

                {/* Project Manager */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'project_manager'
                      ? 'bg-[#eeecff]/40 dark:bg-[#2e2f41] border-[#6040F0]'
                      : 'bg-white dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:bg-[#F5F4FC] dark:hover:bg-[#242542]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1 accent-[#6040F0]"
                    checked={role === 'project_manager'}
                    onChange={() => setRole('project_manager')}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-[#141529] dark:text-white">
                      Project Manager
                    </span>
                    <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                      Create and edit projects, assign tasks, triage tickets, and manage sprint milestones.
                    </p>
                  </div>
                </label>

                {/* Employee */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'employee'
                      ? 'bg-[#eeecff]/40 dark:bg-[#2e2f41] border-[#6040F0]'
                      : 'bg-white dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:bg-[#F5F4FC] dark:hover:bg-[#242542]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1 accent-[#6040F0]"
                    checked={role === 'employee'}
                    onChange={() => setRole('employee')}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#141529] dark:text-white">
                        Employee
                      </span>
                      <span className="text-[10px] font-bold bg-[#6040F0]/10 text-[#6040F0] px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    </div>
                    <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                      View and edit assigned tasks, report tickets, participate in discussions, and collaborate.
                    </p>
                  </div>
                </label>

                {/* Viewer */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'viewer'
                      ? 'bg-[#eeecff]/40 dark:bg-[#2e2f41] border-[#6040F0]'
                      : 'bg-white dark:bg-[#141529] border-[#E5E5EF] dark:border-[#2e2f41] hover:bg-[#F5F4FC] dark:hover:bg-[#242542]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    className="mt-1 accent-[#6040F0]"
                    checked={role === 'viewer'}
                    onChange={() => setRole('viewer')}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-bold text-[#141529] dark:text-white">
                      Viewer / Guest
                    </span>
                    <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                      Read-only access to approved projects, documentation, and discussion threads.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Project Access Allocation */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#141529] dark:text-white">
                Project Access Allocation
              </label>
              <div className="min-h-11 p-2 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-wrap items-center gap-1.5">
                {selectedProjects.map((pId) => {
                  const proj = availableProjects.find((p) => p.id === pId);
                  return (
                    <span
                      key={pId}
                      className="inline-flex items-center gap-1.5 bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-semibold px-2.5 py-1 rounded-full"
                    >
                      <span>{proj ? proj.name : pId}</span>
                      <button
                        type="button"
                        onClick={() => toggleProject(pId)}
                        className="hover:text-[#F55354] ml-0.5 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
                {availableProjects
                  .filter((p) => !selectedProjects.includes(p.id))
                  .map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleProject(p.id)}
                      className="text-xs text-[#9C9CA9] hover:text-[#6040F0] px-2 py-1 rounded hover:bg-[#F5F4FC] dark:hover:bg-[#242542] transition-colors"
                    >
                      + {p.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Optional Invitation Note */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Optional Invitation Note
                </label>
                <span className="text-[11px] text-[#9C9CA9]">Markdown supported</span>
              </div>
              <textarea
                rows={2}
                placeholder="Add an onboarding greeting or context on initial deliverables..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs resize-none placeholder:text-[#9C9CA9]"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-[#F5F4FC] dark:bg-[#242542] border-t border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F9F9FB] text-[#5C5C70] dark:text-[#cabeff] text-sm font-semibold border border-[#E5E5EF] dark:border-[#2e2f41] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !email || !isValidEmail}
              className="h-10 px-5 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal;

