import React, { useState, useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2, PauseCircle } from 'lucide-react';
import { SLA_STATUS, STATUS_LABELS } from '../constants/slaConstants';

/**
 * Format milliseconds remaining into human-readable countdown string (e.g. "01:42:19", "08:45")
 */
function formatCountdown(ms) {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  return isNegative ? `-${timeStr}` : timeStr;
}

/**
 * SLATimer Component Matrix (Prompt 49)
 * Supports 'badge', 'card', and 'dual' variants across all SLA states:
 * on_track, at_risk, breached, paused, met.
 * Ticks client-side every second from server timestamp (target_at).
 */
export const SLATimer = ({
  targetAt,
  startedAt,
  status = SLA_STATUS.ON_TRACK,
  timerType = 'first_response',
  policyName = 'Standard SaaS Tier 1',
  variant = 'badge',
  onBreach,
}) => {
  const [now, setNow] = useState(Date.now());

  // Tick timer every second
  useEffect(() => {
    if (status === SLA_STATUS.MET || status === SLA_STATUS.PAUSED) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const targetMs = useMemo(() => {
    return targetAt ? new Date(targetAt).getTime() : Date.now() + 3600000;
  }, [targetAt]);

  const startMs = useMemo(() => {
    return startedAt ? new Date(startedAt).getTime() : targetMs - 7200000;
  }, [startedAt, targetMs]);

  const remainingMs = targetMs - now;
  const isBreached = remainingMs <= 0 || status === SLA_STATUS.BREACHED;
  const isAtRisk = !isBreached && (remainingMs < 1800000 || status === SLA_STATUS.AT_RISK); // < 30m

  // Notify parent on client-side threshold crossing
  useEffect(() => {
    if (isBreached && status !== SLA_STATUS.BREACHED && onBreach) {
      onBreach();
    }
  }, [isBreached, status, onBreach]);

  const resolvedStatus = useMemo(() => {
    if (status === SLA_STATUS.MET) return SLA_STATUS.MET;
    if (status === SLA_STATUS.PAUSED) return SLA_STATUS.PAUSED;
    if (isBreached) return SLA_STATUS.BREACHED;
    if (isAtRisk) return SLA_STATUS.AT_RISK;
    return SLA_STATUS.ON_TRACK;
  }, [status, isBreached, isAtRisk]);

  // Compute progress bar percentage (0 to 100)
  const progressPercent = useMemo(() => {
    const totalDuration = Math.max(1, targetMs - startMs);
    const elapsed = Math.max(0, now - startMs);
    const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    return percent;
  }, [startMs, targetMs, now]);

  // 1. Badge Variant (Compact pill for tables/rows)
  if (variant === 'badge') {
    if (resolvedStatus === SLA_STATUS.BREACHED) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-severity-blocker/10 text-severity-blocker text-xs font-mono font-semibold">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>{formatCountdown(remainingMs)} breached</span>
        </span>
      );
    }
    if (resolvedStatus === SLA_STATUS.AT_RISK) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-on-hold/15 text-status-on-hold text-xs font-mono font-semibold animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{formatCountdown(remainingMs)} at risk</span>
        </span>
      );
    }
    if (resolvedStatus === SLA_STATUS.MET) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved text-xs font-mono font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Met</span>
        </span>
      );
    }
    if (resolvedStatus === SLA_STATUS.PAUSED) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-text-secondary text-xs font-mono font-medium">
          <PauseCircle className="w-3.5 h-3.5 text-text-muted" />
          <span>Paused</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-resolved/10 text-status-resolved text-xs font-mono font-medium">
        <Clock className="w-3.5 h-3.5" />
        <span>{formatCountdown(remainingMs)} left</span>
      </span>
    );
  }

  // 2. Card Variant (Detailed countdown box with progress bar)
  const statusStyles = {
    [SLA_STATUS.ON_TRACK]: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/50',
      text: 'text-status-resolved',
      barBg: 'bg-status-resolved',
      icon: Clock,
      label: 'On Track',
    },
    [SLA_STATUS.AT_RISK]: {
      border: 'border-amber-200',
      bg: 'bg-amber-50/50',
      text: 'text-status-on-hold',
      barBg: 'bg-status-on-hold',
      icon: AlertTriangle,
      label: 'At Risk (< 30m)',
    },
    [SLA_STATUS.BREACHED]: {
      border: 'border-rose-200',
      bg: 'bg-rose-50/50',
      text: 'text-severity-blocker',
      barBg: 'bg-severity-blocker',
      icon: AlertOctagon,
      label: 'SLA Breached',
    },
    [SLA_STATUS.PAUSED]: {
      border: 'border-border-subtle',
      bg: 'bg-canvas-main',
      text: 'text-text-secondary',
      barBg: 'bg-text-muted',
      icon: PauseCircle,
      label: 'Timer Paused',
    },
    [SLA_STATUS.MET]: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/30',
      text: 'text-status-resolved',
      barBg: 'bg-status-resolved',
      icon: CheckCircle2,
      label: 'SLA Fulfilled',
    },
  }[resolvedStatus];

  const Icon = statusStyles.icon;

  return (
    <div className={`p-4 rounded-xl border ${statusStyles.border} ${statusStyles.bg} flex flex-col justify-between transition-all shadow-xs`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-4 h-4 ${statusStyles.text}`} />
          <span className="text-xs font-semibold text-text-primary capitalize">
            {timerType.replace('_', ' ')} SLA
          </span>
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusStyles.bg} ${statusStyles.text}`}>
          {statusStyles.label}
        </span>
      </div>

      <div className="my-2">
        <div className={`text-2xl font-bold font-mono tracking-tight ${statusStyles.text}`}>
          {resolvedStatus === SLA_STATUS.MET
            ? '00:00:00'
            : formatCountdown(remainingMs)}
        </div>
        <div className="text-[11px] text-text-secondary flex justify-between mt-0.5">
          <span>{resolvedStatus === SLA_STATUS.BREACHED ? 'Overdue Elapsed' : 'Time Remaining'}</span>
          <span>{policyName}</span>
        </div>
      </div>

      {/* SLA Progress Bar */}
      <div className="mt-2">
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusStyles.barBg} transition-all duration-500`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SLATimer;
