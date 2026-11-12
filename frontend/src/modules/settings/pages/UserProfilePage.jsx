import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ShieldCheck,
  Edit3,
  Key,
  Bell,
  Palette,
  Camera,
  Mail,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  ArrowDown,
  Layers,
  AlertTriangle,
  Flame,
  BadgeAlert,
  Server,
  Lock,
  MessageSquare,
  Phone,
  MapPin,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { apiClient } from '../../../services/api';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

export const UserProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users/me');
      setUser(res.data);
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <div className="w-full bg-[#F9F9FB] dark:bg-[#141529] min-h-screen py-6 px-6 lg:px-10 font-body text-[#141529] dark:text-[#eeecff]">
      <div className="max-w-7xl mx-auto flex flex-col space-y-8 pb-16">
        {/* Top Context Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-[#9C9CA9] uppercase tracking-wider font-semibold">
              <span>Account</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#141529] dark:text-white font-bold">Profile Overview</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[#141529] dark:text-white tracking-tight">
                User Profile
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#28C078]/15 text-[#28C078] text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#28C078] animate-pulse"></span>
                Active Enterprise Profile
              </span>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="h-10 px-4 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="h-10 px-4 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] text-[#141529] dark:text-white text-sm font-semibold border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-2 shadow-xs transition-all"
            >
              <Key className="w-4 h-4 text-[#9C9CA9]" />
              <span>Change Password</span>
            </button>
            <button
              onClick={() => navigate('/workspace/settings/notifications')}
              className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] text-[#5C5C70] dark:text-[#cabeff] text-sm font-semibold border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </button>
            <button
              onClick={() => navigate('/workspace/settings/appearance')}
              className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] text-[#5C5C70] dark:text-[#cabeff] text-sm font-semibold border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Theme</span>
            </button>
          </div>
        </div>

        {/* Primary Identity Hero Banner */}
        <div className="relative bg-white dark:bg-[#1a1b32] rounded-2xl border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs overflow-hidden p-6 md:p-8">
          <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#6040F0]/10 blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar with micro badge */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md ring-4 ring-[#F5F4FC] dark:ring-[#242542] bg-[#eeecff] dark:bg-[#2e2f41]">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.full_name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-extrabold text-3xl text-[#6040F0]">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#6040F0] hover:bg-[#5639D8] text-white shadow-md transition-transform active:scale-90"
                  title="Upload new photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Name & Organization Metadata */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#141529] dark:text-white">
                    {user?.full_name || 'Alex Rivera'}
                  </h2>
                  <span className="px-3 py-0.5 rounded-full bg-[#eeecff] dark:bg-[#2e2f41] text-[#6040F0] text-xs font-bold">
                    {user?.title || 'Incident Lead (Principal SRE)'}
                  </span>
                </div>
                <p className="text-sm text-[#5C5C70] dark:text-[#a0a0b8] flex items-center gap-1.5 font-medium">
                  <Server className="w-4 h-4 text-[#9C9CA9]" />
                  <span>{user?.department || 'Infrastructure & Reliability Engineering'}</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-[#9C9CA9] text-xs">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email || 'alex.rivera@tronix365.internal'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>UTC-05:00 (Eastern Time - US &amp; Canada)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Joined{' '}
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'March 2023'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Badges */}
            <div className="flex items-center gap-3 self-start lg:self-center bg-[#F5F4FC] dark:bg-[#242542] px-4 py-3 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41]">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#1a1b32] flex items-center justify-center text-[#28C078] shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#141529] dark:text-white">
                  Hardware 2FA Active
                </span>
                <span className="text-xs text-[#9C9CA9]">YubiKey 5C NFC Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Core Grid: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Column 1: Personal Work & Operational Summary (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            {/* Metrics Strip */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-6 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EF] dark:border-[#2e2f41]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#6040F0]" />
                  <h3 className="text-base font-bold text-[#141529] dark:text-white">
                    Operational Velocity
                  </h3>
                </div>
                <span className="text-xs text-[#9C9CA9] uppercase font-bold tracking-wider">
                  Current Quarter
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                    SLA Adherence
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      99.1%
                    </span>
                    <span className="text-xs font-bold text-[#28C078] flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +0.4%
                    </span>
                  </div>
                  <div className="w-full bg-[#E5E5EF] dark:bg-[#1a1b32] rounded-full h-1.5 mt-3 overflow-hidden">
                    <div className="bg-[#28C078] h-1.5 rounded-full" style={{ width: '99.1%' }}></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                    Mean Time to Resolve
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      1h 12m
                    </span>
                    <span className="text-xs font-bold text-[#28C078] flex items-center">
                      <ArrowDown className="w-3.5 h-3.5 mr-0.5" /> -18m
                    </span>
                  </div>
                  <span className="text-xs text-[#9C9CA9] mt-3">Target: &lt; 2h 00m</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col justify-between">
                  <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                    Incidents Resolved
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-extrabold text-[#141529] dark:text-white">
                      121
                    </span>
                    <span className="text-xs font-bold text-[#6040F0]">P1 / P2</span>
                  </div>
                  <span className="text-xs text-[#9C9CA9] mt-3">Zero unmitigated breaches</span>
                </div>
              </div>
            </div>

            {/* Active Operational Queue */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-6 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EF] dark:border-[#2e2f41]">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#6040F0]" />
                  <h3 className="text-base font-bold text-[#141529] dark:text-white">
                    Active Operational Queue
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#6040F0] bg-[#eeecff] dark:bg-[#2e2f41] px-2.5 py-1 rounded-full">
                  18 Items Assigned
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="p-3.5 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] flex flex-col border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                      Open Tickets
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#3888F8]"></span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#141529] dark:text-white mt-1">4</span>
                  <span className="text-xs text-[#9C9CA9] mt-0.5">2 high priority</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] flex flex-col border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                      In-Review RCAs
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#F8A040]"></span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#141529] dark:text-white mt-1">2</span>
                  <span className="text-xs text-[#9C9CA9] mt-0.5">Awaiting CAB signoff</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] flex flex-col border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                      Sprint Tasks
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#6848E8]"></span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#141529] dark:text-white mt-1">12</span>
                  <span className="text-xs text-[#9C9CA9] mt-0.5">Sprint 24-Q2.4</span>
                </div>
              </div>

              {/* Task List Preview */}
              <div className="mt-4 pt-4 space-y-2.5">
                <div
                  onClick={() => navigate('/workspace/tickets/critical')}
                  className="p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F55354]/15 text-[#F55354]">
                      BLOCKER
                    </span>
                    <span className="text-xs font-semibold text-[#141529] dark:text-white">
                      INC-8492: US-East-1 Ingress Packet Drop Mitigated
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#6848E8] bg-[#6848E8]/10 px-2 py-0.5 rounded-full">
                    In Review
                  </span>
                </div>

                <div
                  onClick={() => navigate('/workspace/tickets')}
                  className="p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] hover:bg-[#F5F4FC] dark:hover:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8A040]/15 text-[#F8A040]">
                      CRITICAL
                    </span>
                    <span className="text-xs font-semibold text-[#141529] dark:text-white">
                      RCA-1102: Postgres RDS Connection Spike Post-Migration
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#F8A040] bg-[#F8A040]/10 px-2 py-0.5 rounded-full">
                    Signoff Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Governance Roles & Responsibilities */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-6 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
              <div className="flex items-center gap-2 pb-4 border-b border-[#E5E5EF] dark:border-[#2e2f41]">
                <ShieldCheck className="w-5 h-5 text-[#6040F0]" />
                <h3 className="text-base font-bold text-[#141529] dark:text-white">
                  Governance Roles &amp; Responsibilities
                </h3>
              </div>
              <div className="space-y-3 pt-3">
                <div className="p-3.5 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#1a1b32] text-[#6040F0] shadow-xs">
                    <Flame className="w-5 h-5 text-[#F55354]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#141529] dark:text-white">
                      Primary On-Call Incident Commander
                    </span>
                    <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                      Authoritative commander for Severity 0 and Severity 1 enterprise outages across Tier-1 microservices.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#1a1b32] text-[#6040F0] shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-[#28C078]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#141529] dark:text-white">
                      RCA Governance Signatory
                    </span>
                    <span className="text-xs text-[#5C5C70] dark:text-[#a0a0b8] mt-0.5">
                      Final technical review authority on corrective actions, timeline fidelity, and preventative infra guardrails.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Account, Security & Work Environment (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Authentication & Security Information */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-6 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EF] dark:border-[#2e2f41]">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#6040F0]" />
                  <h3 className="text-base font-bold text-[#141529] dark:text-white">
                    Security &amp; Auth
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#28C078]/15 text-[#28C078]">
                  COMPLIANT
                </span>
              </div>

              <div className="space-y-3.5 pt-3">
                <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                      Authentication Protocol
                    </span>
                    <span className="text-xs font-bold text-[#28C078]">SAML 2.0</span>
                  </div>
                  <p className="text-sm font-bold text-[#141529] dark:text-white">
                    Single Sign-On (Okta SAML 2.0)
                  </p>
                  <span className="text-xs text-[#9C9CA9]">Enforced by Corporate IT • 90-day key rotation cycle</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                      Active Session
                    </span>
                    <span className="text-xs font-bold text-[#28C078] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#28C078]"></span> Current
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#141529] dark:text-white">
                    macOS Sonoma • Chrome 124
                  </p>
                  <span className="text-xs text-[#9C9CA9]">IP 198.51.100.42 • Session started 18m ago</span>
                </div>

                <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-[#5C5C70] dark:text-[#cabeff]">
                    Enterprise Organization
                  </span>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[#141529] dark:text-white">Tronix365 Enterprise</p>
                    <code className="px-2 py-0.5 bg-white dark:bg-[#1a1b32] rounded text-xs text-[#6040F0] font-mono font-bold border border-[#E5E5EF] dark:border-[#2e2f41]">
                      ORG-99214
                    </code>
                  </div>
                  <span className="text-xs text-[#9C9CA9]">Tenant: tronix365-prod-us01.cloud</span>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#F5F4FC] dark:bg-[#242542] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#6040F0] text-sm font-bold flex items-center justify-center gap-2 border border-[#E5E5EF] dark:border-[#2e2f41] transition-colors"
                >
                  <Key className="w-4 h-4" />
                  <span>Update Security Credentials</span>
                </button>
              </div>
            </div>

            {/* Contact & Communication Card */}
            <div className="bg-white dark:bg-[#1a1b32] rounded-2xl p-6 border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EF] dark:border-[#2e2f41]">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#6040F0]" />
                  <h3 className="text-base font-bold text-[#141529] dark:text-white">
                    Contact &amp; Escalation
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[#6040F0] hover:text-[#5639D8] text-xs font-bold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-[#9C9CA9]" />
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#9C9CA9]">Slack Handle</span>
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        @{user?.email ? user.email.split('@')[0] : 'alex.rivera'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#28C078]/15 text-[#28C078]">
                    ON CALL
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#9C9CA9]" />
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#9C9CA9]">Escalation Pager</span>
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        +1 (555) 392-8810
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9C9CA9]">SMS &amp; Voice Alert</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41]">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-[#9C9CA9]" />
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#9C9CA9]">Location / Hub</span>
                      <span className="text-xs font-bold text-[#141529] dark:text-white">
                        Boston HQ (Tech Center 4)
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9C9CA9]">Hybrid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onProfileUpdated={(updated) => {
          setUser(updated);
          triggerToast('Profile information successfully updated.');
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(msg) => triggerToast(msg)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141529] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#2e2f41] animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-[#28C078]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;

