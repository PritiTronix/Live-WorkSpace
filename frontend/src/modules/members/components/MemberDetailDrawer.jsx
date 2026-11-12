import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Clock,
  Mail,
  AlertTriangle,
  Flame,
  CheckSquare,
  Square,
  MoreHorizontal,
  ExternalLink,
  ShieldCheck,
  FolderGit2
} from 'lucide-react';
import { membersService } from '../../../services/membersService';

export const MemberDetailDrawer = ({ isOpen, onClose, userId, memberData }) => {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);

  useEffect(() => {
    if (isOpen && (userId || memberData)) {
      if (memberData) {
        setMember(memberData);
      }
      if (userId) {
        const fetchDetail = async () => {
          try {
            setLoading(true);
            const data = await membersService.getMemberDetail(userId);
            setMember(data);
          } catch (err) {
            console.error('Failed to load member detail:', err);
          } finally {
            setLoading(false);
          }
        };
        fetchDetail();
      }
    }
  }, [isOpen, userId, memberData]);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    if (member?.email) {
      navigator.clipboard.writeText(member.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const workloadPct = member?.workload_percentage || 74;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#141529]/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-white dark:bg-[#1a1b32] h-full shadow-2xl flex flex-col border-l border-[#E5E5EF] dark:border-[#2e2f41] overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Top Header Card */}
        <div className="p-6 bg-[#F5F4FC] dark:bg-[#242542] border-b border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6040F0] uppercase tracking-wider bg-[#eeecff] dark:bg-[#2e2f41] px-2.5 py-0.5 rounded-full">
              Member Profile #{member?.id ? member.id.slice(0, 6) : '084'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="p-1.5 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white hover:bg-white dark:hover:bg-[#1a1b32] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xs bg-[#eeecff] dark:bg-[#2e2f41] border border-[#E5E5EF] dark:border-[#2e2f41]">
                {member?.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-extrabold text-2xl text-[#6040F0]">
                    {member?.full_name ? member.full_name.charAt(0).toUpperCase() : 'M'}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#28C078] rounded-full shadow-xs ring-2 ring-white dark:ring-[#1a1b32]"></span>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[#141529] dark:text-white truncate">
                  {member?.full_name || 'Aarav Mehta'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-[10px] font-bold shrink-0 capitalize">
                  {member?.role || 'Admin'}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff] mt-0.5 truncate">
                {member?.title || 'Lead SRE & Incident Commander'}
              </p>
              <span className="text-[11px] text-[#9C9CA9] mt-0.5 truncate">
                {member?.department || 'DevOps & Infrastructure Engineering'}
              </span>
            </div>
          </div>

          {/* Quick contact tags */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-white dark:bg-[#1a1b32] p-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col shadow-xs">
              <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Mail className="w-3 h-3" /> Internal Email
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-semibold text-[#141529] dark:text-white truncate">
                  {member?.email || 'aarav.mehta@tronix365.internal'}
                </span>
                <button
                  onClick={handleCopyEmail}
                  className="text-[#6040F0] hover:text-[#5639D8] ml-1 shrink-0"
                  title="Copy email"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#28C078]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1b32] p-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col shadow-xs">
              <span className="text-[10px] text-[#9C9CA9] flex items-center gap-1 font-semibold uppercase tracking-wider">
                <Clock className="w-3 h-3" /> Timezone
              </span>
              <span className="text-xs font-semibold text-[#141529] dark:text-white mt-1">
                UTC-05:00 (EST • 14:24)
              </span>
            </div>
          </div>

          {/* On-Call Duty Banner */}
          <div className="flex items-center justify-between p-2.5 bg-[#F55354]/10 rounded-xl border border-[#F55354]/20">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#F55354]" />
              <span className="text-xs text-[#F55354] font-bold">
                On-Call Duty: Primary P0/P1 Incident Commander
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#F55354] animate-ping"></span>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {showEmptyState ? (
            <div className="p-8 bg-[#F9F9FB] dark:bg-[#141529] rounded-2xl border border-[#E5E5EF] dark:border-[#2e2f41] text-center flex flex-col items-center gap-2">
              <CheckSquare className="w-10 h-10 text-[#28C078]" />
              <span className="text-sm font-bold text-[#141529] dark:text-white">
                No Active Items Assigned
              </span>
              <p className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] max-w-xs">
                {member?.full_name || 'Member'} has concluded all queue assignments and has 100% bandwidth available for incoming escalations.
              </p>
            </div>
          ) : (
            <>
              {/* Workload Capacity Bar */}
              <div className="bg-[#F5F4FC] dark:bg-[#242542] rounded-2xl p-4 border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
                    Active Workload Capacity
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      workloadPct > 80
                        ? 'text-[#F55354] bg-[#F55354]/15'
                        : 'text-[#28C078] bg-[#28C078]/15'
                    }`}
                  >
                    {workloadPct}% Allocated
                  </span>
                </div>
                <div className="w-full bg-white dark:bg-[#1a1b32] h-2.5 rounded-full overflow-hidden flex border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div
                    className={workloadPct > 80 ? 'bg-[#F55354] h-full' : 'bg-[#6040F0] h-full'}
                    style={{ width: `${Math.min(100, workloadPct)}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#5C5C70] dark:text-[#cabeff] pt-1">
                  <span className="flex items-center gap-1 font-bold text-[#F55354]">
                    <span className="w-2 h-2 rounded-full bg-[#F55354]"></span>
                    {member?.blockers_count || 2} Active Incidents
                  </span>
                  <span className="text-[#9C9CA9]">Threshold: 80% (Overloaded)</span>
                </div>
              </div>

              {/* Current Projects */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
                    Current Projects ({member?.projects?.length || 2})
                  </h4>
                  <button className="text-xs text-[#6040F0] font-bold hover:underline">+ Assign</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member?.projects && member.projects.length > 0 ? (
                    member.projects.map((p) => (
                      <span
                        key={p.id}
                        className="px-3 py-1 bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] rounded-lg text-[#141529] dark:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#6040F0]"></span>
                        {p.name}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="px-3 py-1 bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] rounded-lg text-[#141529] dark:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-[#6040F0]"></span>
                        Platform Revamp 2.0
                      </span>
                      <span className="px-3 py-1 bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] rounded-lg text-[#141529] dark:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-[#3888F8]"></span>
                        Auth Gateway
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Assigned Active Tickets */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
                    Assigned Active Tickets
                  </h4>
                  <span className="text-xs text-[#F55354] font-bold">2 Critical / Blocker</span>
                </div>

                {member?.tickets && member.tickets.length > 0 ? (
                  member.tickets.map((tkt) => (
                    <div
                      key={tkt.id}
                      className="p-3 bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-1.5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#6040F0]">#{tkt.ticket_number}</span>
                          <span className="px-2 py-0.5 rounded bg-[#F55354]/15 text-[#F55354] text-[10px] font-bold">
                            {tkt.severity}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-[#6848E8]/10 text-[#6848E8] px-2 py-0.5 rounded-full capitalize">
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#141529] dark:text-white">{tkt.title}</p>
                      <div className="flex items-center justify-between text-[11px] text-[#9C9CA9] pt-1">
                        <span>
                          Deadline:{' '}
                          <strong className="text-[#F55354] font-mono">
                            {tkt.deadline ? new Date(tkt.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                          </strong>
                        </span>
                        <span>Active</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3 bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-1.5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#6040F0]">#TKT-1025</span>
                          <span className="px-2 py-0.5 rounded bg-[#F55354]/15 text-[#F55354] text-[10px] font-bold">
                            Blocker
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-[#6848E8]/10 text-[#6848E8] px-2 py-0.5 rounded-full">
                          WIP
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#141529] dark:text-white">
                        Auth proxy latency spike &gt; 850ms on US-East-1
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-[#9C9CA9] pt-1">
                        <span>SLA Breaching in <strong className="text-[#F55354] font-mono">18m</strong></span>
                        <span>Updated 4m ago</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs flex flex-col gap-1.5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#6040F0]">#TKT-1019</span>
                          <span className="px-2 py-0.5 rounded bg-[#F55354]/15 text-[#F55354] text-[10px] font-bold">
                            Blocker
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-[#3888F8]/10 text-[#3888F8] px-2 py-0.5 rounded-full">
                          Open
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#141529] dark:text-white">
                        Postgres Read Replicas sync delay in Production-EU
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-[#9C9CA9] pt-1">
                        <span>SLA Target: <strong className="text-[#141529] dark:text-white font-mono">1h 45m</strong></span>
                        <span>Updated 38m ago</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sprint Tasks */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
                    Sprint Tasks (3)
                  </h4>
                  <span className="text-[11px] text-[#9C9CA9]">Due this cycle</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-[#F5F4FC] dark:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41]">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-[#6040F0]" />
                      <span className="text-xs font-semibold text-[#141529] dark:text-white">
                        Publish Zero-Trust Ingress Runbook
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9C9CA9] font-mono">Due Today</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-[#F5F4FC] dark:bg-[#242542] rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41]">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="accent-[#6040F0]" />
                      <span className="text-xs font-semibold text-[#141529] dark:text-white">
                        Configure Prometheus auto-failover
                      </span>
                    </div>
                    <span className="text-[11px] text-[#F55354] font-mono font-bold">Tomorrow</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-xs font-bold text-[#141529] dark:text-white uppercase tracking-wider">
                  Recent Activity Log
                </h4>
                <div className="space-y-3 relative pl-4 border-l-2 border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#F55354] ring-2 ring-white dark:ring-[#1a1b32]"></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        Escalated <strong>#TKT-1025</strong> to Blocker
                      </span>
                      <span className="text-[10px] text-[#9C9CA9]">4 minutes ago • Incident Desk</span>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#28C078] ring-2 ring-white dark:ring-[#1a1b32]"></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        Signed off post-mortem RCA draft #RCA-88
                      </span>
                      <span className="text-[10px] text-[#9C9CA9]">2 hours ago • Governance</span>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#6040F0] ring-2 ring-white dark:ring-[#1a1b32]"></span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        Reassigned gateway mesh test to <strong>Maya Shah</strong>
                      </span>
                      <span className="text-[10px] text-[#9C9CA9]">Yesterday at 18:30</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Simulate Empty State Toggle */}
          <div className="p-3 bg-[#eeecff]/40 dark:bg-[#2e2f41] rounded-xl flex items-center justify-between border border-[#6040F0]/20">
            <span className="text-xs text-[#5C5C70] dark:text-[#cabeff] font-medium">
              Simulate Empty Workload State
            </span>
            <button
              onClick={() => setShowEmptyState(!showEmptyState)}
              className="text-xs text-[#6040F0] font-bold hover:underline"
            >
              Toggle Preview
            </button>
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-4 bg-[#F5F4FC] dark:bg-[#242542] border-t border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F9F9FB] text-[#141529] dark:text-white text-xs font-bold border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs text-center transition-colors"
          >
            View Full Profile
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] text-white text-xs font-bold shadow-sm transition-all text-center"
          >
            Manage Role &amp; Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailDrawer;

