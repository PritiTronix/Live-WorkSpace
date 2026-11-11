import React, { useState, useEffect } from 'react';
import { auditLogsService } from '../../../services/auditLogsService';
import { Link } from 'react-router-dom';

export const LogDetailDrawer = ({ logId, isOpen, onClose }) => {
  const [logDetail, setLogDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (logId && isOpen) {
      setIsLoading(true);
      auditLogsService
        .getLogDetail(logId)
        .then((data) => {
          setLogDetail(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load log detail:', err);
          setIsLoading(false);
        });
    }
  }, [logId, isOpen]);

  if (!isOpen) return null;

  const handleCopyHash = () => {
    if (logDetail?.immutable_hash) {
      navigator.clipboard.writeText(logDetail.immutable_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleCopyId = () => {
    if (logDetail?.id) {
      navigator.clipboard.writeText(logDetail.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatUtcDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toUTCString().replace('GMT', 'UTC');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg md:w-[500px] bg-surface-card h-full shadow-2xl border-l border-border-subtle flex flex-col z-10 animate-slide-left">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle bg-surface-card flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-canvas-lavender text-primary border border-primary/20">
                {logDetail?.log_ref || '#LOG-ENTRY'}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-canvas-default border border-border-subtle text-text-secondary">
                Audit Entry
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary pt-1">
              {logDetail?.event_label || 'Activity Log Event Details'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyId}
              type="button"
              title="Copy Event ID"
              className="p-1.5 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copiedId ? 'check' : 'content_copy'}
              </span>
            </button>
            {logDetail?.ticket_id && (
              <Link
                to={`/workspace/tickets/${logDetail.ticket_id}`}
                title="View Target Ticket"
                className="p-1.5 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary transition-colors inline-flex"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </Link>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <span className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-body-sm text-text-muted">Loading activity entry...</span>
            </div>
          ) : (
            <>
              {/* Event Description Banner */}
              <div className="p-4 rounded-xl bg-canvas-default border border-border-subtle">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
                  Event Description
                </span>
                <p className="font-body-md text-body-md text-text-primary leading-relaxed">
                  {logDetail?.description || 'System state modification recorded.'}
                </p>
                <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">schedule</span>
                    {formatUtcDate(logDetail?.created_at)}
                  </span>
                  <span className="font-mono text-[11px] text-text-secondary">
                    {logDetail?.ticket_number}
                  </span>
                </div>
              </div>

              {/* Authorized Actor & Target Entity Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Authorized Actor */}
                <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-card">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
                    Authorized Actor
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-canvas-lavender flex items-center justify-center font-bold text-primary text-xs">
                      {logDetail?.actor?.avatar_url ? (
                        <img
                          src={logDetail.actor.avatar_url}
                          alt={logDetail.actor.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        (logDetail?.actor?.full_name || 'Sys').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <span className="font-semibold text-text-primary text-sm block truncate">
                        {logDetail?.actor?.full_name || 'System Action'}
                      </span>
                      <span className="text-[11px] text-text-muted block truncate">
                        {logDetail?.actor?.role || 'User'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Entity */}
                <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-card">
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-2">
                    Target Ticket
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">
                        {logDetail?.ticket_number || 'TICK-N/A'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-canvas-lavender text-text-secondary">
                        {logDetail?.ticket_status || 'open'}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary block truncate">
                      {logDetail?.ticket_title || 'Untitled Ticket'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Value Differential Matrix */}
              <div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                  Value Differential Matrix
                </span>
                <div className="p-4 rounded-xl border border-border-subtle bg-canvas-default flex items-center justify-between gap-3">
                  <div className="flex-1 bg-surface-card p-3 rounded-lg border border-border-subtle text-center">
                    <span className="text-[11px] text-text-muted block mb-1">Previous Value</span>
                    <span className="font-mono text-xs font-semibold text-text-secondary line-through">
                      {logDetail?.previous_value || 'None'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-canvas-lavender text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </div>

                  <div className="flex-1 bg-surface-card p-3 rounded-lg border border-primary/30 text-center bg-primary/5">
                    <span className="text-[11px] text-primary font-semibold block mb-1">New Value</span>
                    <span className="font-mono text-xs font-bold text-primary">
                      {logDetail?.new_value || 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Justification & RCA Context (Truthful F-05) */}
              <div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                  Context & Mitigation Notes
                </span>
                <div className="p-4 rounded-xl bg-canvas-lavender/50 border-l-4 border-primary text-body-sm text-text-primary leading-relaxed">
                  {logDetail?.context_justification ||
                    'No specific root cause or mitigation notes recorded for this ticket event.'}
                </div>
              </div>

              {/* Technical Provenance (Honest metadata F-05) */}
              <div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                  Technical Provenance
                </span>
                <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-card space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                    <span className="text-text-muted">Originating Interface</span>
                    <span className="font-medium text-text-secondary">{logDetail?.originating_interface || 'Not recorded'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border-subtle">
                    <span className="text-text-muted">Auth Host / Gateway</span>
                    <span className="font-mono text-text-secondary">{logDetail?.auth_host || 'Not recorded'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-muted">Internal Entity ID</span>
                    <span className="font-mono text-[11px] text-text-secondary truncate max-w-[200px]">{logDetail?.id}</span>
                  </div>
                </div>
              </div>

              {/* Computed Record Fingerprint (Truthful labeling F-10) */}
              <div className="p-4 rounded-xl border border-border-subtle bg-canvas-default space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">fingerprint</span>
                    <div>
                      <span className="font-label-md text-label-md font-bold text-text-primary block">
                        Record Fingerprint (SHA-256)
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Deterministic hash computed from activity metadata for record identification
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyHash}
                    type="button"
                    className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                  >
                    <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedHash ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-card border border-border-subtle font-mono text-[11px] text-text-secondary break-all">
                  {logDetail?.immutable_hash || 'N/A'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-canvas-default flex items-center justify-between">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">history</span>
            Activity Audit History
          </span>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-lg bg-surface-card border border-border-subtle hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-colors"
          >
            Done Viewing
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogDetailDrawer;
