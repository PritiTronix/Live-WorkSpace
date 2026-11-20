import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserPlus, ArrowRight, ShieldCheck, Users } from 'lucide-react';

/**
 * OnboardingChoicePage
 * Route: /onboarding
 * Provides two prominent choice cards for new users:
 * 1. Create a new organization (Owner Path)
 * 2. Join an existing one via join code (Employee Path)
 */
export const OnboardingChoicePage = () => {
  const navigate = useNavigate();

  const handleKeyDown = (e, path) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(path);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Organization Setup</span>
        </div>
        <h1 className="font-headline font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
          Welcome to Live Workspace
        </h1>
        <p className="font-body text-base text-text-secondary mt-2 max-w-xl mx-auto leading-relaxed">
          To begin collaborating on incident response and SLAs, establish a new organization workspace or join your existing team.
        </p>
      </div>

      {/* Two Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Create Organization */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/onboarding/create-org')}
          onKeyDown={(e) => handleKeyDown(e, '/onboarding/create-org')}
          className="group relative flex flex-col justify-between p-7 rounded-2xl bg-surface-card border border-border-subtle hover:border-btn-primary/60 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-btn-primary/30"
          aria-label="Create a new organization"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
              <Building2 className="w-7 h-7 text-btn-primary" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-btn-primary bg-primary-fixed/60 px-2 py-0.5 rounded-md">
                Owner Path
              </span>
            </div>

            <h2 className="font-headline font-semibold text-xl text-text-primary group-hover:text-btn-primary transition-colors">
              Create a new organization
            </h2>

            <p className="font-body text-sm text-text-secondary mt-2.5 leading-relaxed">
              Set up a dedicated multi-tenant workspace for your company. You will become the primary owner, configure SLA tiers, and invite team members.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-btn-primary shrink-0" />
                <span>Full owner governance & workspace settings</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-btn-primary shrink-0" />
                <span>Generate join codes for team invitations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-btn-primary shrink-0" />
                <span>Default 24x7 Continuous Tier-1 Operations schedule</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-border-subtle/80 flex items-center justify-between text-btn-primary font-label-md text-sm font-semibold">
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Join Existing Organization */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/onboarding/join-org')}
          onKeyDown={(e) => handleKeyDown(e, '/onboarding/join-org')}
          className="group relative flex flex-col justify-between p-7 rounded-2xl bg-surface-card border border-border-subtle hover:border-btn-primary/60 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-btn-primary/30"
          aria-label="Join an existing organization"
        >
          <div>
            <div className="w-14 h-14 rounded-2xl bg-status-open/10 text-status-open flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
              <UserPlus className="w-7 h-7 text-status-open" />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-status-open bg-status-open/10 px-2 py-0.5 rounded-md">
                Employee Path
              </span>
            </div>

            <h2 className="font-headline font-semibold text-xl text-text-primary group-hover:text-status-open transition-colors">
              Join an existing one
            </h2>

            <p className="font-body text-sm text-text-secondary mt-2.5 leading-relaxed">
              Have an organization join code from your administrator or manager? Request access to collaborate directly with your team.
            </p>

            <ul className="mt-5 space-y-2 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-status-open shrink-0" />
                <span>Instant join code validation</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-status-open shrink-0" />
                <span>Attach optional message for workspace approvers</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-status-open shrink-0" />
                <span>Live status updates via notifications WebSocket</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-border-subtle/80 flex items-center justify-between text-status-open font-label-md text-sm font-semibold">
            <span>Enter Join Code</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingChoicePage;
