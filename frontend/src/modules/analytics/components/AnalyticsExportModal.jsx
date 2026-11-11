import React, { useState } from 'react';
import { analyticsService } from '../../../services/analyticsService';

export const AnalyticsExportModal = ({ isOpen, onClose, timeHorizon, projectId, severity }) => {
  const [selectedFormat, setSelectedFormat] = useState('csv'); // Only csv is implemented on backend
  const [includeSlaAudit, setIncludeSlaAudit] = useState(true);
  const [includeRcaBreakdown, setIncludeRcaBreakdown] = useState(true);
  const [includeWorkloadCharts, setIncludeWorkloadCharts] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await analyticsService.exportReport({
        format: 'csv',
        time_horizon: timeHorizon || '30d',
        project_id: projectId || 'all',
        severity: severity || 'all',
        include_sla_audit: includeSlaAudit,
        include_rca_breakdown: includeRcaBreakdown,
        include_workload_charts: includeWorkloadCharts,
      });
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error('Failed to export analytics report:', err);
      setExportError(err?.response?.data?.detail || 'Failed to generate report export. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-surface-card rounded-2xl border border-border-subtle shadow-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">file_download</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-text-primary">
                Export Analytics Report
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Download verified organization ticket data and incident resolution records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {exportError && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{exportError}</span>
            </div>
          )}

          {/* Format Selection Cards (Truthful representation F-09) */}
          <div>
            <label className="block font-label-md text-label-md font-semibold text-text-primary mb-2.5">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* CSV: Supported */}
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className="p-3.5 rounded-xl border border-primary bg-primary/5 ring-1 ring-primary shadow-sm text-left flex flex-col justify-between transition-all"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="material-symbols-outlined text-[22px] text-primary">dataset</span>
                  <div className="w-4 h-4 rounded-full border border-primary bg-primary flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
                <div>
                  <span className="block font-label-md text-label-md font-bold text-primary">
                    CSV Flat File
                  </span>
                  <span className="text-[11px] text-text-muted">Standard tabular data</span>
                </div>
              </button>

              {/* Excel: Unsupported on backend */}
              <div
                className="p-3.5 rounded-xl border border-border-subtle bg-canvas-default/50 opacity-60 cursor-not-allowed text-left flex flex-col justify-between"
                title="Excel .xlsx format is currently unavailable"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="material-symbols-outlined text-[22px] text-text-muted">table_view</span>
                  <span className="text-[10px] uppercase font-bold text-text-muted">Unavailable</span>
                </div>
                <div>
                  <span className="block font-label-md text-label-md font-semibold text-text-muted">
                    Excel Sheet
                  </span>
                  <span className="text-[11px] text-text-muted">Format not supported</span>
                </div>
              </div>

              {/* PDF: Unsupported on backend */}
              <div
                className="p-3.5 rounded-xl border border-border-subtle bg-canvas-default/50 opacity-60 cursor-not-allowed text-left flex flex-col justify-between"
                title="PDF format is currently unavailable"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="material-symbols-outlined text-[22px] text-text-muted">picture_as_pdf</span>
                  <span className="text-[10px] uppercase font-bold text-text-muted">Unavailable</span>
                </div>
                <div>
                  <span className="block font-label-md text-label-md font-semibold text-text-muted">
                    PDF Document
                  </span>
                  <span className="text-[11px] text-text-muted">Format not supported</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scope & Modules Included */}
          <div>
            <label className="block font-label-md text-label-md font-semibold text-text-primary mb-2">
              Included Columns & Metadata
            </label>
            <div className="space-y-2.5 bg-canvas-default p-3.5 rounded-xl border border-border-subtle">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-text-secondary">verified_user</span>
                  <span className="font-body-sm text-body-sm text-text-primary">Include SLA Deadlines & Response Timestamps</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeSlaAudit}
                  onChange={(e) => setIncludeSlaAudit(e.target.checked)}
                  className="w-4 h-4 rounded border-border-medium text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-text-secondary">query_stats</span>
                  <span className="font-body-sm text-body-sm text-text-primary">Include RCA Mitigation & Trigger Notes</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeRcaBreakdown}
                  onChange={(e) => setIncludeRcaBreakdown(e.target.checked)}
                  className="w-4 h-4 rounded border-border-medium text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-text-secondary">badge</span>
                  <span className="font-body-sm text-body-sm text-text-primary">Include Assignee & Project Relationships</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeWorkloadCharts}
                  onChange={(e) => setIncludeWorkloadCharts(e.target.checked)}
                  className="w-4 h-4 rounded border-border-medium text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>

          {/* Time Scope Indicator */}
          <div className="p-3 rounded-xl bg-canvas-lavender/60 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
              <span className="font-label-sm text-label-sm text-text-secondary">
                Selected Window: <strong className="text-text-primary uppercase">{timeHorizon || '30 Days'}</strong>
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-text-muted">CSV Format</span>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2 text-text-muted text-[11px] leading-relaxed">
            <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">info</span>
            <span>
              Exported data contains organization-scoped tickets based on your authenticated permissions.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-canvas-default border-t border-border-subtle flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            disabled={isExporting}
            className="px-4 py-2 rounded-lg border border-border-subtle hover:bg-canvas-lavender text-text-secondary font-label-md text-label-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            type="button"
            className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-[0_2px_8px_rgba(104,72,232,0.25)] transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating CSV...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download CSV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsExportModal;
