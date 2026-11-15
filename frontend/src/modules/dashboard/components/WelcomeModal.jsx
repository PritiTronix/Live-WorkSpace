import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Timer,
  ShieldAlert,
  Command,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

const TOUR_STEPS = [
  {
    badge: 'Welcome to Live Workspace',
    title: 'Your Unified Engineering & Operations Hub',
    description:
      'Live Workspace brings incident triage, high-velocity project tracking, real-time SLA monitors, and team collaboration into one cohesive command center.',
    icon: Sparkles,
    iconBg: 'bg-primary-fixed text-primary',
    highlightTitle: 'Key Capabilities:',
    highlights: [
      'Centralized incident management with automated severity tagging',
      'Real-time WebSocket telemetry for immediate team synchronization',
      'Multi-tenant workspace architecture with granular role access',
    ],
  },
  {
    badge: 'Automated SLA Monitoring',
    title: 'Never Miss a Critical Service Target',
    description:
      'Continuous Dual-SLA trackers measure First Response and Resolution deadlines with automated warning thresholds and escalation tiers.',
    icon: Timer,
    iconBg: 'bg-amber-100 text-amber-700',
    highlightTitle: 'Reliability Features:',
    highlights: [
      'Automatic SLA tier calculation based on ticket severity and impact',
      'Live visual countdown timers with breach alerts and audit logging',
      'Configurable warning notifications at 80% threshold',
    ],
  },
  {
    badge: 'Blameless Root Cause Analysis',
    title: 'Transform Outages into Engineering Resilience',
    description:
      'Document incidents with comprehensive Five-Whys analysis, sequence-of-events timelines, and traceable preventive action items.',
    icon: ShieldAlert,
    iconBg: 'bg-emerald-100 text-emerald-700',
    highlightTitle: 'Postmortem Standards:',
    highlights: [
      'Multi-version RCA documents with immutable change histories',
      'Action item ownership mapped directly to sprint boards',
      'Customer-impact summaries and outage duration metrics',
    ],
  },
  {
    badge: 'Productivity & Navigation',
    title: 'Built for Speed with Keyboard Shortcuts',
    description:
      'Navigate and execute operations rapidly without touching the mouse using global spotlight search and streamlined creation flows.',
    icon: Command,
    iconBg: 'bg-canvas-lavender text-btn-primary',
    highlightTitle: 'Shortcuts at Your Fingertips:',
    highlights: [
      '⌘K or Ctrl+K to open Spotlight Search from any screen',
      'Quick create menu for instant ticket and task dispatching',
      'Responsive slide-out drawers for contextual detail inspection',
    ],
  },
];

export const WelcomeModal = ({
  isOpen = true,
  onClose,
  userName = 'Team Member',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // Focus management & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      const focusable = modalRef.current?.querySelector(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable) {
        focusable.focus();
      } else {
        modalRef.current?.focus?.();
      }
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen]);

  // Escape key listener counts as skipping tour
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome Tour"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#141529]/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-xl bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 outline-none flex flex-col"
      >
        {/* Top Accent Gradient Line */}
        <div className="h-1.5 bg-gradient-to-r from-btn-primary via-primary-light to-secondary-container" />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between border-b border-border-subtle/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${step.iconBg}`}
            >
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-label-sm text-xs font-semibold uppercase tracking-wider text-primary">
                {step.badge}
              </span>
              <p className="font-body-sm text-xs text-text-muted">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome tour"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-canvas-lavender transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-headline text-headline-sm text-text-primary tracking-tight mb-2">
              {step.title}
            </h3>
            <p className="font-body text-body-sm text-text-secondary leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Feature Highlights Card */}
          <div className="p-4 rounded-xl bg-canvas-main/80 border border-border-subtle/80 space-y-2.5">
            <span className="font-label-md text-xs font-bold text-text-primary uppercase tracking-wide">
              {step.highlightTitle}
            </span>
            <ul className="space-y-2">
              {step.highlights.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-text-secondary font-body-sm text-xs leading-normal"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stepper Dots Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-btn-primary'
                    : 'w-2 bg-border-subtle hover:bg-text-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-canvas-lavender/40 border-t border-border-subtle flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-canvas-lavender font-label-md text-label-md transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>{isLastStep ? 'Get Started' : 'Next'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default WelcomeModal;
