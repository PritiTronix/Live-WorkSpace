import React, { useState } from 'react';
import { auditLogsService } from '../../../services/auditLogsService';

export const AuditExportDialog = ({ isOpen, onClose, defaultTimeHorizon = '7d' }) => {
  const [format, setFormat] = useState('csv'); // lowercase: csv, json
  const [timeHorizon, setTimeHorizon] = useState(defaultTimeHorizon);
  const [domains, setDomains] = useState([
    'lifecycle',
    'transitions',
    'assignments',
    'signoffs',
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const toggleDomain = (domainKey) => {
    setDomains((prev) =>
      prev.includes(domainKey)
        ? prev.filter((d) => d !== domainKey)
        : [...prev, domainKey]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      await auditLogsService.exportLogs({
        format: format.toLowerCase(),
        time_horizon: timeHorizon,
        event_domains: domains,
        severity: 'all',
      });
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error('Failed to export audit logs:', err);
      setErrorMsg(err?.response?.data?.detail || 'Failed to generate audit export. Please retry.');
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
                Export Activity Log
              </h2>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Generate organization activity records in standard CSV or JSON format
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Time Window */}
          <div>
            <label className="block font-label-md text-label-md font-semibold text-text-primary mb-2">
              Audit Time Horizon
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'today', label: 'Last 24 Hours' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTimeHorizon(opt.id)}
                  className={`py-2 px-3 rounded-lg border font-label-sm text-label-sm font-medium transition-all ${
                    timeHorizon === opt.id
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border-subtle text-text-secondary hover:bg-canvas-lavender'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="block font-label-md text-label-md font-semibold text-text-primary mb-2">
              Artifact Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'csv',
                  name: 'CSV Flat File',
                  desc: 'Tabular activity dataset',
                  icon: 'dataset',
                },
                {
                  id: 'json',
                  name: 'JSON Export',
                  desc: 'Structured event records',
                  icon: 'code',
                },
              ].map((fmt) => {
                const isSelected = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border-subtle hover:border-border-medium'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[22px] ${isSelected ? 'text-primary' : 'text-text-muted'}`}>
                      {fmt.icon}
                    </span>
                    <div>
                      <span className={`block font-label-md text-label-md font-bold ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                        {fmt.name}
                      </span>
                      <span className="text-[11px] text-text-muted">{fmt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Included Event Domains */}
          <div>
            <label className="block font-label-md text-label-md font-semibold text-text-primary mb-2">
              Filter by Event Domain
            </label>
            <div className="space-y-2 bg-canvas-default p-3.5 rounded-xl border border-border-subtle text-body-sm">
              {[
                { id: 'lifecycle', label: 'Ticket Ingestion & Creation' },
                { id: 'transitions', label: 'Status & Severity Transitions' },
                { id: 'assignments', label: 'Ownership Reassignments' },
                { id: 'signoffs', label: 'Resolution & Close Events' },
              ].map((domain) => (
                <label key={domain.id} className="flex items-center justify-between cursor-pointer">
                  <span className="text-text-primary">{domain.label}</span>
                  <input
                    type="checkbox"
                    checked={domains.includes(domain.id)}
                    onChange={() => toggleDomain(domain.id)}
                    className="w-4 h-4 rounded border-border-medium text-primary focus:ring-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Notice (Truthful F-10) */}
          <div className="p-3 rounded-xl bg-canvas-lavender/60 border border-primary/20 flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed">
            <span className="material-symbols-outlined text-[18px] text-primary flex-shrink-0 mt-0.5">
              info
            </span>
            <span>
              Exports include organization-scoped activity logs. Records include deterministic SHA-256 fingerprints for identification.
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
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                <span>Export Records</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditExportDialog;
