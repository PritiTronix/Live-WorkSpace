import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Copy,
  Check,
  Clock,
  Mail,
  Flame,
  CheckSquare,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
  Ticket as TicketIcon,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { membersService } from '../../../services/membersService';
import { projectsService } from '../../../services/projectsService';
import { authService } from '../../../services/api';
import Avatar from '../../../components/common/Avatar';
import { PRESENCE_CONFIG, formatLastActive } from '../../../constants/presence';

export const MemberDetailDrawer = ({ isOpen, onClose, userId, memberData, onMemberUpdated }) => {
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localTime, setLocalTime] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Role Management Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('member');
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [roleError, setRoleError] = useState(null);

  // Assign Project Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedProjectRole, setSelectedProjectRole] = useState('developer');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState(null);

  // Load current viewer info
  useEffect(() => {
    const user = authService.getCurrentUserSync();
    setCurrentUser(user);
    authService.getCurrentUser().then((u) => {
      if (u) setCurrentUser(u);
    }).catch(() => {});
  }, []);

  // Fetch member details with request cancellation
  useEffect(() => {
    if (!isOpen || (!userId && !memberData)) {
      setMember(null);
      return;
    }

    if (memberData) {
      setMember(memberData);
    }

    const targetId = userId || memberData?.id;
    if (!targetId) return;

    let isCancelled = false;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await membersService.getMemberDetail(targetId);
        if (!isCancelled) {
          setMember(data);
          setSelectedRole(data.role || 'member');
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load member detail:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, userId, memberData]);

  // Live timezone clock (updates every 60s)
  useEffect(() => {
    if (!member?.timezone) {
      setLocalTime('');
      return;
    }

    const updateTime = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: member.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        setLocalTime(formatter.format(new Date()));
      } catch {
        setLocalTime('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [member?.timezone]);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    if (member?.email) {
      navigator.clipboard.writeText(member.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenRoleModal = () => {
    setSelectedRole(member?.role || 'member');
    setRoleError(null);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!member?.id) return;
    try {
      setRoleUpdating(true);
      setRoleError(null);
      const res = await membersService.updateMemberRole(member.id, selectedRole);
      setMember((prev) => ({ ...prev, role: selectedRole }));
      if (onMemberUpdated) {
        onMemberUpdated({ ...member, role: selectedRole });
      }
      setIsRoleModalOpen(false);
    } catch (err) {
      setRoleError(err.response?.data?.detail || err.message || 'Failed to update member role.');
    } finally {
      setRoleUpdating(false);
    }
  };

  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    setAssignError(null);
    try {
      const data = await projectsService.getProjects();
      const list = Array.isArray(data) ? data : data?.projects || [];
      // Exclude projects already assigned
      const assignedIds = new Set((member?.projects || []).map((p) => p.id));
      const unassigned = list.filter((p) => !assignedIds.has(p.id));
      setAvailableProjects(unassigned);
      if (unassigned.length > 0) {
        setSelectedProjectId(unassigned[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const handleAssignProject = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !member?.id) return;
    try {
      setAssigning(true);
      setAssignError(null);
      await membersService.assignMemberToProject(selectedProjectId, member.id, selectedProjectRole);
      const assignedProj = availableProjects.find((p) => p.id === selectedProjectId);
      if (assignedProj) {
        const newProj = {
          id: assignedProj.id,
          name: assignedProj.name,
          key: assignedProj.key,
          role: selectedProjectRole,
          status: assignedProj.status,
        };
        setMember((prev) => ({
          ...prev,
          projects: [...(prev?.projects || []), newProj],
        }));
      }
      setIsAssignModalOpen(false);
    } catch (err) {
      setAssignError(err.response?.data?.detail || err.message || 'Failed to assign project.');
    } finally {
      setAssigning(false);
    }
  };

  const currentRole = (currentUser?.role || '').toLowerCase();
  const canManageRoles = currentRole === 'owner' || currentRole === 'admin';
  const canAssignProjects = ['owner', 'admin', 'manager', 'lead'].includes(currentRole);

  const workloadPct = member?.workload?.percentage ?? member?.workload_percentage;
  const threshold = member?.workload?.threshold || 80;
  const isOverloaded = workloadPct !== null && workloadPct !== undefined && workloadPct > threshold;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#141529]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-white dark:bg-[#1a1b32] h-full shadow-2xl flex flex-col border-l border-[#E5E5EF] dark:border-[#2e2f41] overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Top Header Card */}
        <div className="p-6 bg-[#F5F4FC] dark:bg-[#242542] border-b border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            {member?.id ? (
              <span className="text-[11px] font-bold text-[#6040F0] uppercase tracking-wider bg-[#eeecff] dark:bg-[#2e2f41] px-2.5 py-0.5 rounded-full font-mono">
                Member #{member.id.slice(0, 8)}
              </span>
            ) : (
              <span></span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white hover:bg-white dark:hover:bg-[#1a1b32] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Avatar
                src={member?.avatar_url}
                name={member?.full_name || 'Member'}
                size="xl"
                shape="rounded-2xl"
                ring="border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs"
                className="w-16 h-16 text-2xl"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full shadow-xs ring-2 ring-white dark:ring-[#1a1b32] ${
                  (PRESENCE_CONFIG[member?.presence] || PRESENCE_CONFIG.offline).dotClass
                }`}
                title={`Presence: ${(PRESENCE_CONFIG[member?.presence] || PRESENCE_CONFIG.offline).label}`}
              ></span>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#141529] dark:text-white truncate">
                  {member?.full_name || 'Loading...'}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      (PRESENCE_CONFIG[member?.presence] || PRESENCE_CONFIG.offline).badgeClass
                    }`}
                  >
                    {(PRESENCE_CONFIG[member?.presence] || PRESENCE_CONFIG.offline).label}
                  </span>
                  {member?.role && (
                    <span className="px-2 py-0.5 rounded-full bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-[10px] font-bold capitalize">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
              {member?.title && (
                <p className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff] mt-0.5 truncate">
                  {member.title}
                </p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-[#9C9CA9] mt-0.5">
                {member?.department && <span className="truncate">{member.department}</span>}
                <span>•</span>
                <span title="Real last active timestamp">
                  {formatLastActive(member?.last_active_at || member?.last_active)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick contact tags */}
          <div className={`grid ${member?.timezone ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-1`}>
            {member?.email && (
              <div className="bg-white dark:bg-[#1a1b32] p-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col shadow-xs">
                <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
                  <Mail className="w-3 h-3" /> Email
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-[#141529] dark:text-white truncate">
                    {member.email}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className="text-[#6040F0] hover:text-[#5639D8] ml-1 shrink-0 p-0.5 cursor-pointer"
                    title="Copy email"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#28C078]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Timezone (Rendered only if saved) */}
            {member?.timezone && (
              <div className="bg-white dark:bg-[#1a1b32] p-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col shadow-xs">
                <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
                  <Clock className="w-3 h-3" /> Timezone
                </span>
                <span className="text-xs font-semibold text-[#141529] dark:text-white mt-1 truncate">
                  {member.timezone} {localTime ? `• ${localTime}` : ''}
                </span>
              </div>
            )}
          </div>

          {/* On-Call Duty Banner (Rendered only if on_call_role exists) */}
          {member?.on_call_role && (
            <div className="flex items-center justify-between p-2.5 bg-[#F55354]/10 rounded-xl border border-[#F55354]/20">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F55354]" />
                <span className="text-xs text-[#F55354] font-bold">
                  On-Call Duty: {member.on_call_role}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#F55354] animate-ping"></span>
            </div>
          )}
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && !member ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-[#6040F0] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-[#9C9CA9]">Loading member details...</span>
            </div>
          ) : (
            <>
              {/* Workload Capacity Bar */}
              {workloadPct !== null && workloadPct !== undefined ? (
                <div className="bg-[#F5F4FC] dark:bg-[#242542] rounded-2xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
                      Active Workload Capacity
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isOverloaded
                          ? 'text-[#F55354] bg-[#F55354]/15'
                          : 'text-[#28C078] bg-[#28C078]/15'
                      }`}
                    >
                      {workloadPct}% Allocated ({isOverloaded ? 'Overloaded' : 'Optimal'})
                    </span>
                  </div>
                  <div className="w-full bg-white dark:bg-[#1a1b32] h-2.5 rounded-full overflow-hidden flex border border-[#E5E5EF] dark:border-[#2e2f41]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isOverloaded ? 'bg-[#F55354]' : 'bg-[#6040F0]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, workloadPct))}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#5C5C70] dark:text-[#cabeff] pt-1">
                    <span
                      className={`flex items-center gap-1 font-bold ${
                        member?.blockers_count > 0 ? 'text-[#F55354]' : 'text-[#28C078]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          member?.blockers_count > 0 ? 'bg-[#F55354]' : 'bg-[#28C078]'
                        }`}
                      ></span>
                      {member?.blockers_count || 0} Critical / Blocker
                    </span>
                    <span className="text-[#9C9CA9]">
                      Threshold: {threshold}% ({isOverloaded ? 'Overloaded' : 'Within Limit'})
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Current Projects */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-[#6040F0]" />
                    Current Projects ({member?.projects?.length || 0})
                  </h4>
                  {canAssignProjects && (
                    <button
                      type="button"
                      onClick={handleOpenAssignModal}
                      className="text-xs text-[#6040F0] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Assign
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {member?.projects && member.projects.length > 0 ? (
                    member.projects.map((p) => (
                      <span
                        key={p.id}
                        onClick={() => {
                          onClose();
                          navigate(`/workspace/projects/${p.id}/overview`);
                        }}
                        className="px-3 py-1 bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] rounded-lg text-[#141529] dark:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:border-[#6040F0] cursor-pointer transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#6040F0]"></span>
                        {p.name}
                        {p.role && (
                          <span className="text-[10px] text-[#9C9CA9] font-normal uppercase">
                            ({p.role})
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#9C9CA9]">No projects assigned</span>
                  )}
                </div>
              </div>

              {/* Assigned Active Tickets */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <TicketIcon className="w-3.5 h-3.5 text-[#6040F0]" />
                    Assigned Active Tickets ({member?.active_tickets_count || member?.tickets?.length || 0})
                  </h4>
                  {member?.blockers_count > 0 && (
                    <span className="text-xs text-[#F55354] font-bold">
                      {member.blockers_count} Critical / Blocker
                    </span>
                  )}
                </div>

                {member?.tickets && member.tickets.length > 0 ? (
                  member.tickets.map((tkt) => {
                    const sla = tkt.sla_state;
                    return (
                      <div
                        key={tkt.id}
                        onClick={() => {
                          onClose();
                          navigate(`/workspace/tickets/${tkt.id}`);
                        }}
                        className="p-3 bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-1.5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#6040F0]">
                              #{tkt.ticket_number || tkt.id.slice(0, 8)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                tkt.severity === 'critical' || tkt.severity === 'blocker'
                                  ? 'bg-[#F55354]/15 text-[#F55354]'
                                  : 'bg-[#F8A040]/15 text-[#F8A040]'
                              }`}
                            >
                              {tkt.severity}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold bg-[#6848E8]/10 text-[#6848E8] px-2 py-0.5 rounded-full capitalize">
                            {tkt.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#141529] dark:text-white line-clamp-1">
                          {tkt.title}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-[#9C9CA9] pt-1 border-t border-[#E5E5EF]/60 dark:border-[#2e2f41]/60">
                          {sla?.label ? (
                            <span
                              className={`font-mono font-bold ${
                                sla.status === 'breached'
                                  ? 'text-[#F55354]'
                                  : sla.status === 'breaching_soon'
                                  ? 'text-[#F8A040]'
                                  : 'text-[#28C078]'
                              }`}
                            >
                              {sla.label}
                            </span>
                          ) : (
                            <span>
                              Deadline:{' '}
                              <strong className="text-[#5C5C70] dark:text-[#cabeff] font-mono">
                                {tkt.deadline ? new Date(tkt.deadline).toLocaleDateString() : 'None'}
                              </strong>
                            </span>
                          )}
                          <span>
                            {tkt.updated_at ? `Updated ${new Date(tkt.updated_at).toLocaleDateString()}` : 'Active'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-[#F9F9FB] dark:bg-[#141529] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] text-center">
                    <span className="text-xs text-[#9C9CA9]">No active tickets assigned</span>
                  </div>
                )}
              </div>

              {/* Tasks Assigned */}
              {member?.tasks && member.tasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#6040F0]" />
                      Open Tasks ({member.tasks.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {member.tasks.map((tk) => (
                      <div
                        key={tk.id}
                        className="flex items-center justify-between p-2.5 bg-[#F5F4FC] dark:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#6040F0]">
                            #{tk.task_number || tk.id.slice(0, 6)}
                          </span>
                          <span className="text-xs font-semibold text-[#141529] dark:text-white truncate max-w-[200px]">
                            {tk.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#9C9CA9] font-mono">
                          {tk.due_date ? `Due ${new Date(tk.due_date).toLocaleDateString()}` : tk.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-4 bg-[#F5F4FC] dark:bg-[#242542] border-t border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              if (member?.id) {
                onClose();
                navigate(`/workspace/members/${member.id}`);
              }
            }}
            className="flex-1 py-2.5 px-3 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F9F9FB] text-[#141529] dark:text-white text-xs font-bold border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs text-center transition-colors cursor-pointer"
          >
            View Full Profile
          </button>
          {canManageRoles ? (
            <button
              onClick={handleOpenRoleModal}
              className="flex-1 py-2.5 px-3 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] text-white text-xs font-bold shadow-sm transition-all text-center cursor-pointer"
            >
              Manage Role &amp; Access
            </button>
          ) : (
            <button
              disabled
              title="Only workspace owners and administrators can change roles"
              className="flex-1 py-2.5 px-3 rounded-lg bg-[#E5E5EF] dark:bg-[#2e2f41] text-[#9C9CA9] text-xs font-bold shadow-none text-center cursor-not-allowed"
            >
              Role Managed by Admin
            </button>
          )}
        </div>
      </div>

      {/* Role Management Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#141529]/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1a1b32] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141529] dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#6040F0]" />
                Manage Role &amp; Access
              </h3>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5C5C70] dark:text-[#cabeff]">
              Select access permissions for <strong className="text-[#141529] dark:text-white">{member?.full_name}</strong> ({member?.email}).
            </p>

            {roleError && (
              <div className="p-3 bg-[#F55354]/10 border border-[#F55354]/20 rounded-xl text-xs text-[#F55354] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roleError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#141529] dark:text-white mb-1.5">
                  Assigned Workspace Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F9FB] dark:bg-[#242542] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:border-[#6040F0]"
                >
                  {currentRole === 'owner' && <option value="owner">Owner (Full Workspace Control)</option>}
                  <option value="admin">Admin (Team &amp; Settings Admin)</option>
                  <option value="manager">Manager (Project &amp; Squad Lead)</option>
                  <option value="lead">Lead (Technical Lead)</option>
                  <option value="developer">Developer (Write &amp; Deploy)</option>
                  <option value="member">Member (Standard Contributor)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3 py-2 text-xs font-bold text-[#5C5C70] dark:text-[#cabeff] hover:bg-[#F9F9FB] dark:hover:bg-[#242542] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleUpdating}
                  className="px-4 py-2 bg-[#6040F0] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#5235d9] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {roleUpdating ? 'Saving...' : 'Save Role Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign to Project Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-[#141529]/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1a1b32] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141529] dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-[#6040F0]" />
                Assign to Project
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#5C5C70] dark:text-[#cabeff]">
              Allocate <strong className="text-[#141529] dark:text-white">{member?.full_name}</strong> to a workspace project.
            </p>

            {assignError && (
              <div className="p-3 bg-[#F55354]/10 border border-[#F55354]/20 rounded-xl text-xs text-[#F55354] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {availableProjects.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#9C9CA9]">
                All available projects are already assigned to this member.
              </div>
            ) : (
              <form onSubmit={handleAssignProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#141529] dark:text-white mb-1.5">
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9FB] dark:bg-[#242542] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:border-[#6040F0]"
                  >
                    {availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.key ? `(${p.key})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#141529] dark:text-white mb-1.5">
                    Project Role
                  </label>
                  <select
                    value={selectedProjectRole}
                    onChange={(e) => setSelectedProjectRole(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F9FB] dark:bg-[#242542] text-[#141529] dark:text-white text-xs font-semibold rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] focus:outline-none focus:border-[#6040F0]"
                  >
                    <option value="developer">Developer</option>
                    <option value="lead">Lead</option>
                    <option value="maintainer">Maintainer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-[#5C5C70] dark:text-[#cabeff] hover:bg-[#F9F9FB] dark:hover:bg-[#242542] rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning}
                    className="px-4 py-2 bg-[#6040F0] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#5235d9] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {assigning ? 'Assigning...' : 'Assign to Project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetailDrawer;
