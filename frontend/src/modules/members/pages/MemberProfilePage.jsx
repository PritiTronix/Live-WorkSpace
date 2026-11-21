import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resolveApiUrl } from '../../../utils/apiUrl';
import {
  ArrowLeft,
  Mail,
  Copy,
  Check,
  Clock,
  Flame,
  Calendar,
  Activity,
  FolderGit2,
  Ticket as TicketIcon,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { membersService } from '../../../services/membersService';

export const MemberProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    let isCancelled = false;

    const fetchMember = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await membersService.getMemberDetail(id);
        if (!isCancelled) {
          setMember(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.response?.data?.detail || 'Member not found in this organization.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchMember();
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Live timezone clock updating every minute
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

  const handleCopyEmail = () => {
    if (member?.email) {
      navigator.clipboard.writeText(member.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#6040F0] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-[#9C9CA9]">Loading member profile...</span>
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-8 bg-white dark:bg-[#1a1b32] rounded-2xl border border-[#E5E5EF] dark:border-[#2e2f41] text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-[#F55354]" />
          <h2 className="text-lg font-bold text-[#141529] dark:text-white">Profile Unavailable</h2>
          <p className="text-xs text-[#5C5C70] dark:text-[#cabeff] max-w-md">{error}</p>
          <Link
            to="/workspace/members"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#6040F0] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#5235d9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Team Directory
          </Link>
        </div>
      </div>
    );
  }

  const workloadPct = member.workload?.percentage ?? member.workload_percentage;
  const threshold = member.workload?.threshold || 80;
  const isOverloaded = workloadPct !== null && workloadPct !== undefined && workloadPct > threshold;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation & Header Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/workspace/members"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6040F0] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team Directory
        </Link>
        <span className="text-xs font-mono font-bold text-[#9C9CA9]">
          ID: #{member.id ? member.id.slice(0, 10) : ''}
        </span>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-6 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xs bg-[#eeecff] dark:bg-[#2e2f41] border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-center font-extrabold text-3xl text-[#6040F0]">
                {member.avatar_url ? (
                  <img
                    src={resolveApiUrl(member.avatar_url)}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  member.full_name?.charAt(0).toUpperCase() || 'M'
                )}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full shadow-xs ring-2 ring-white dark:ring-[#1a1b32] ${
                  member.is_active ? 'bg-[#28C078]' : 'bg-[#9C9CA9]'
                }`}
                title={member.is_active ? 'Active' : 'Inactive'}
              ></span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#141529] dark:text-white">
                  {member.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-bold capitalize">
                  {member.role || 'Member'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    member.is_active
                      ? 'bg-[#28C078]/15 text-[#28C078]'
                      : 'bg-[#9C9CA9]/15 text-[#9C9CA9]'
                  }`}
                >
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {member.title && (
                <p className="text-sm font-semibold text-[#5C5C70] dark:text-[#cabeff] mt-1">
                  {member.title}
                </p>
              )}

              {member.department && (
                <span className="text-xs text-[#9C9CA9] mt-0.5">
                  Department: <strong className="text-[#141529] dark:text-white">{member.department}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs text-[#9C9CA9]">
            {member.joined_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined: {new Date(member.joined_date).toLocaleDateString()}
              </span>
            )}
            {member.last_active && (
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Last active: {new Date(member.last_active).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Quick Contact & Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-[#E5E5EF] dark:border-[#2e2f41]">
          {/* Email */}
          <div className="bg-[#F9F9FB] dark:bg-[#242542] p-3 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col">
            <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
              <Mail className="w-3 h-3" /> Email Address
            </span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs font-semibold text-[#141529] dark:text-white truncate">
                {member.email}
              </span>
              <button
                onClick={handleCopyEmail}
                className="text-[#6040F0] hover:text-[#5235d9] ml-2 shrink-0 p-1"
                title="Copy email"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#28C078]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Timezone (Rendered only if saved) */}
          {member.timezone && (
            <div className="bg-[#F9F9FB] dark:bg-[#242542] p-3 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col">
              <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Clock className="w-3 h-3" /> Timezone
              </span>
              <span className="text-xs font-semibold text-[#141529] dark:text-white mt-1.5">
                {member.timezone} {localTime ? `• ${localTime}` : ''}
              </span>
            </div>
          )}

          {/* Role Access Scope */}
          <div className="bg-[#F9F9FB] dark:bg-[#242542] p-3 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col">
            <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" /> Role Scope
            </span>
            <span className="text-xs font-semibold text-[#141529] dark:text-white mt-1.5 capitalize">
              {member.role || 'Member'} Access
            </span>
          </div>
        </div>

        {/* On-Call Banner (Rendered only if on_call_role exists) */}
        {member.on_call_role && (
          <div className="flex items-center justify-between p-3 bg-[#F55354]/10 rounded-xl border border-[#F55354]/20">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#F55354]" />
              <span className="text-xs text-[#F55354] font-bold">
                On-Call Duty: {member.on_call_role}
              </span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#F55354] animate-ping"></span>
          </div>
        )}
      </div>

      {/* Workload Capacity Card */}
      {workloadPct !== null && workloadPct !== undefined && (
        <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
              Active Workload Capacity
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isOverloaded
                  ? 'text-[#F55354] bg-[#F55354]/15'
                  : 'text-[#28C078] bg-[#28C078]/15'
              }`}
            >
              {workloadPct}% Allocated ({isOverloaded ? 'Overloaded' : 'Optimal'})
            </span>
          </div>
          <div className="w-full bg-[#E5E5EF] dark:bg-[#242542] h-2.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                isOverloaded ? 'bg-[#F55354]' : 'bg-[#6040F0]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, workloadPct))}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-xs text-[#5C5C70] dark:text-[#cabeff] pt-1">
            <span className="flex items-center gap-1.5 font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  member.blockers_count > 0 ? 'bg-[#F55354]' : 'bg-[#28C078]'
                }`}
              ></span>
              {member.blockers_count || 0} Critical / Blocker Tickets
            </span>
            <span className="text-[#9C9CA9]">
              Threshold: {threshold}% ({isOverloaded ? 'Exceeded' : 'Within Limit'})
            </span>
          </div>
        </div>
      )}

      {/* Content Columns: Projects & Tickets & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Projects & Tasks */}
        <div className="space-y-6">
          {/* Projects */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FolderGit2 className="w-4 h-4 text-[#6040F0]" />
                Assigned Projects ({member.projects?.length || 0})
              </h3>
            </div>
            {member.projects && member.projects.length > 0 ? (
              <div className="space-y-2">
                {member.projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/workspace/projects/${p.id}/overview`)}
                    className="p-3 bg-[#F9F9FB] dark:bg-[#242542] hover:bg-[#F5F4FC] dark:hover:bg-[#2c2d4d] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6040F0]"></span>
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        {p.name}
                      </span>
                      {p.key && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#1a1b32] text-[#9C9CA9] border border-[#E5E5EF] dark:border-[#2e2f41]">
                          {p.key}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#6040F0] uppercase">
                        {p.role || 'Member'}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#9C9CA9]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9C9CA9] py-2">No projects currently assigned to this member.</p>
            )}
          </div>

          {/* Open Tasks */}
          <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#6040F0]" />
                Assigned Open Tasks ({member.tasks_count || member.tasks?.length || 0})
              </h3>
            </div>
            {member.tasks && member.tasks.length > 0 ? (
              <div className="space-y-2">
                {member.tasks.map((tk) => (
                  <div
                    key={tk.id}
                    className="p-3 bg-[#F9F9FB] dark:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#6040F0]">
                          #{tk.task_number || tk.id.slice(0, 6)}
                        </span>
                        <span className="text-xs font-semibold text-[#141529] dark:text-white">
                          {tk.title}
                        </span>
                      </div>
                      {tk.due_date && (
                        <span className="text-[10px] text-[#9C9CA9]">
                          Due: {new Date(tk.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white dark:bg-[#1a1b32] text-[#5C5C70] dark:text-[#cabeff] border border-[#E5E5EF] dark:border-[#2e2f41]">
                      {tk.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9C9CA9] py-2">No open tasks assigned.</p>
            )}
          </div>
        </div>

        {/* Right Column: Active Tickets */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-5 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4 text-[#6040F0]" />
                Assigned Active Tickets ({member.active_tickets_count || member.tickets?.length || 0})
              </h3>
              {member.blockers_count > 0 && (
                <span className="text-xs text-[#F55354] font-bold">
                  {member.blockers_count} Critical / Blocker
                </span>
              )}
            </div>
            {member.tickets && member.tickets.length > 0 ? (
              <div className="space-y-2.5">
                {member.tickets.map((tkt) => {
                  const sla = tkt.sla_state;
                  return (
                    <div
                      key={tkt.id}
                      onClick={() => navigate(`/workspace/tickets/${tkt.id}`)}
                      className="p-3 bg-[#F9F9FB] dark:bg-[#242542] hover:bg-[#F5F4FC] dark:hover:bg-[#2c2d4d] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-1.5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                            <strong className="font-mono text-[#5C5C70] dark:text-[#cabeff]">
                              {tkt.deadline ? new Date(tkt.deadline).toLocaleDateString() : 'None'}
                            </strong>
                          </span>
                        )}
                        {tkt.updated_at && (
                          <span>Updated {new Date(tkt.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#9C9CA9] py-2">No active tickets assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfilePage;
