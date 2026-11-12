import React, { useState } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Ticket,
  Users2,
  BellRing,
  ArrowRight,
  Star,
} from 'lucide-react';
import { authService } from '../../../services/api';
import { useAuth } from '../../auth/hooks/useAuth';

/**
 * WelcomeModal
 * Screen 1: First-Time Welcome Popup (Prompt 09)
 * Triggers on /workspace/dashboard if user has not completed onboarding.
 * Dismissal calls POST /api/v1/auth/onboarding/complete to persist state in DB.
 */
export const WelcomeModal = ({ isOpen = true, onClose }) => {
  const { refreshUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = async () => {
    setIsSubmitting(true);
    try {
      await authService.completeOnboarding();
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.warn('Failed to persist onboarding completion:', err);
    } finally {
      setIsSubmitting(false);
      if (onClose) onClose();
    }
  };

  const tiles = [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      color: 'text-primary',
      desc: 'Real-time metrics, project velocity, and SLA health indicators at a glance.',
    },
    {
      icon: FolderKanban,
      title: 'Projects',
      color: 'text-status-open',
      desc: 'Multi-tenant roadmaps, Kanban boards, and sprint milestones.',
    },
    {
      icon: CheckSquare,
      title: 'Tasks',
      color: 'text-status-resolved',
      desc: 'Assigned action items, dependency tracking, and code PR linkages.',
    },
    {
      icon: Ticket,
      title: 'Tickets',
      color: 'text-severity-blocker',
      desc: 'Priority triage, severity tags (Blocker/Critical), and response timers.',
    },
    {
      icon: Users2,
      title: 'Team Members',
      color: 'text-primary-light',
      desc: 'Cross-functional roles, real-time collaboration, and ownership.',
    },
    {
      icon: BellRing,
      title: 'Notifications',
      color: 'text-status-on-hold',
      desc: 'Instant Slack/email dispatch and SLA breach escalation alerts.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#191a2b]/40 backdrop-blur-[6px] transition-opacity duration-300 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-heading"
        className="relative w-full max-w-2xl bg-surface-card rounded-[24px] shadow-[0_16px_40px_rgba(20,21,41,0.14),0_4px_16px_rgba(104,72,232,0.08)] p-6 sm:p-8 overflow-hidden flex flex-col transition-all duration-300 transform scale-100"
      >
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary-light/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-primary-fixed/30 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Modal Header */}
        <div className="relative z-10 flex flex-col items-center text-center mb-6">
          {/* Header Badge / Stepper */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary mb-3 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-btn-primary animate-pulse" />
            <span className="font-label-sm text-xs text-primary font-semibold tracking-wide">
              Onboarding • Step 1 of 3
            </span>
          </div>

          {/* Brand Icon with Sparkle Accent */}
          <div className="relative mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-btn-primary to-primary-light flex items-center justify-center text-white shadow-[0_8px_20px_rgba(96,64,240,0.3)]">
              <Sparkles className="w-7 h-7 text-white fill-white/20" />
            </div>
            {/* Micro Confetti Accents */}
            <Star className="w-4 h-4 text-status-on-hold fill-status-on-hold absolute -top-1 -right-2 rotate-12" />
            <span className="w-2 h-2 rounded-full bg-status-resolved absolute bottom-0 -left-2" />
          </div>

          {/* Heading & Subtitle */}
          <h1
            id="welcome-heading"
            className="font-headline text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2"
          >
            Welcome to Your Workspace!
          </h1>
          <p className="text-sm text-text-secondary max-w-lg leading-relaxed">
            Everything your team needs to plan sprints, track tickets, and hit SLA deadlines is right here.
          </p>
        </div>

        {/* 2. Six Compact Feature Tiles (2 rows x 3 columns) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.title}
                className="group p-3 rounded-xl bg-canvas-main hover:bg-canvas-lavender border border-border-subtle/50 transition-all duration-200 cursor-default flex flex-col justify-between shadow-2xs"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-7 h-7 rounded-lg bg-surface-card flex items-center justify-center ${tile.color} shadow-xs group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-label-md text-xs font-semibold text-text-primary group-hover:text-btn-primary transition-colors">
                    {tile.title}
                  </h3>
                </div>
                <p className="text-[11px] text-text-secondary leading-snug">
                  {tile.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* 3. Modal Footer */}
        <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border-subtle/40">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="w-full sm:w-auto text-xs font-medium text-text-secondary hover:text-text-primary transition-colors px-3 py-2 rounded-lg hover:bg-canvas-lavender"
          >
            Skip Tutorial
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-5 bg-btn-primary hover:bg-primary-hover active:bg-[#471ac8] text-white font-label-md text-xs sm:text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Finalizing Setup...' : 'Get Started (Next: Setup Profile)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
