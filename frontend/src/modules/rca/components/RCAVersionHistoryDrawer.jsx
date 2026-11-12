import React, { useState, useEffect } from 'react';
import { X, History, FileText, CheckCircle2, ChevronRight, ArrowLeft } from 'lucide-react';
import { rcaService } from '../../../services/api';

/**
 * RCAVersionHistoryDrawer
 * Contextual drawer displaying immutable version history audit trail for an RCA.
 */
export const RCAVersionHistoryDrawer = ({
  isOpen = false,
  rcaId,
  currentVersion = 1,
  onClose,
}) => {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  useEffect(() => {
    if (!isOpen || !rcaId) return;

    let isMounted = true;
    const loadVersions = async () => {
      setIsLoading(true);
      try {
        const data = await rcaService.getVersions(rcaId);
        if (isMounted) setVersions(data || []);
      } catch (err) {
        console.warn('Failed to load RCA versions:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadVersions();
    return () => {
      isMounted = false;
    };
  }, [isOpen, rcaId]);

  if (!isOpen) return null;

  const handleViewSnapshot = (v) => {
    try {
      const parsed = JSON.parse(v.snapshot_data);
      setSelectedSnapshot({ ...parsed, changelog: v.changelog, version_number: v.version_number, author_name: v.author_name });
    } catch {
      setSelectedSnapshot(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#191a2b]/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-surface-card h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-border-subtle"
      >
        {/* Header */}
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-text-primary">
                Version History & Audit Log
              </h2>
              <p className="text-xs text-text-secondary">
                Immutable snapshots recorded per approval or update.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas-lavender"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {selectedSnapshot ? (
            /* Historical Snapshot View */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="inline-flex items-center gap-1.5 text-xs text-btn-primary hover:underline font-semibold mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Version List</span>
              </button>

              <div className="p-3.5 rounded-xl bg-canvas-main border border-border-subtle space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text-primary">
                    Version {selectedSnapshot.version_number}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    By {selectedSnapshot.author_name || 'Team Author'}
                  </span>
                </div>
                <p className="text-text-secondary font-medium italic">
                  "{selectedSnapshot.changelog || 'No changelog recorded'}"
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-text-primary block mb-0.5">Title</span>
                  <p className="text-text-secondary">{selectedSnapshot.title}</p>
                </div>

                <div>
                  <span className="font-semibold text-text-primary block mb-0.5">Summary</span>
                  <p className="text-text-secondary">{selectedSnapshot.summary || 'None'}</p>
                </div>

                <div>
                  <span className="font-semibold text-text-primary block mb-1">5-Whys</span>
                  <div className="space-y-1">
                    {(selectedSnapshot.five_whys || []).map((w, idx) => (
                      <div key={idx} className="p-2 rounded bg-surface-card border border-border-subtle text-[11px]">
                        <span className="font-bold mr-1 text-primary">Why {idx + 1}:</span>
                        <span>{w || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Versions List */
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  No historical versions logged for this incident.
                </div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-canvas-main/60 border border-border-subtle hover:border-btn-primary/40 transition-all flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-btn-primary/10 text-btn-primary font-mono font-bold text-[11px]">
                          v{v.version_number}
                        </span>
                        {v.version_number === currentVersion && (
                          <span className="text-[10px] bg-emerald-50 text-status-resolved font-semibold px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                        <span className="text-text-muted text-[11px]">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-text-primary font-medium">{v.changelog || 'Version revision'}</p>
                      <p className="text-text-secondary text-[11px]">
                        Recorded by {v.author_name || 'Workspace User'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewSnapshot(v)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border-subtle hover:bg-surface-card text-btn-primary flex items-center gap-1 shadow-2xs"
                    >
                      <span>Snapshot</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle text-right bg-canvas-main/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-card border border-border-subtle hover:bg-canvas-lavender text-text-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RCAVersionHistoryDrawer;
