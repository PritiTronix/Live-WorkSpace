import React, { useState } from 'react';
import { Layers, AlertTriangle, AlertCircle, Info, CheckCircle2, Maximize2, Trash2, ShieldCheck, Download } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmationDialog from '../components/ConfirmationDialog';

/**
 * Screen 22: Live Workspace - Modal Library & Confirmation Dialogs
 * Stitch ID: 4fa65d21655f427d960753ddabdd78d8
 * Route: /design-system/modals or /workspace/design-system/modals
 */
export const ModalCatalogPage = () => {
  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'danger' | 'warning' | 'info' | 'success' | 'sm' | 'md' | 'lg' | 'xl' | 'delete-ticket' | 'export-data'
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const showNotification = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleConfirmAction = (name) => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setActiveModal(null);
      showNotification(`Successfully executed action: "${name}"`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-canvas-main p-6 lg:p-10">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-text-primary text-white font-label-md text-label-md shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Screen 22 • Stitch Design System
              </span>
              <span className="text-text-muted text-xs">Prompt 81-83</span>
            </div>
            <h1 className="font-headline text-headline-xl text-text-primary tracking-tight">
              Modal Library & Confirmation Dialogs
            </h1>
            <p className="font-body text-body-md text-text-secondary mt-1 max-w-2xl">
              Standardized dialog architectures, destructive action verifications, system alerts, and size matrices used across Live Workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-label-sm text-label-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Interactive Component Catalog
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-10">
        {/* SECTION 1: Confirmation Dialog Variants (Prompt 82) */}
        <section>
          <div className="mb-4">
            <h2 className="font-headline text-headline-md text-text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-btn-primary" />
              <span>1. Confirmation Dialog Variants</span>
            </h2>
            <p className="font-body text-body-sm text-text-secondary">
              High-consequence user interactions categorized by severity and semantic intent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Danger Card */}
            <div className="p-6 rounded-2xl bg-white border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-xl bg-error-container/40 text-error flex items-center justify-center mb-4">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-headline text-headline-sm text-text-primary mb-1">
                  Danger / Destructive
                </h3>
                <p className="font-body text-body-sm text-text-secondary leading-relaxed mb-4">
                  Permanent data deletion, ticket purge, member removal, or repository decoupling.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('danger')}
                className="w-full py-2.5 px-4 rounded-lg bg-severity-blocker hover:bg-red-600 text-white font-label-md text-label-md transition-all shadow-sm"
              >
                Trigger Danger Modal
              </button>
            </div>

            {/* Warning Card */}
            <div className="p-6 rounded-2xl bg-white border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-headline text-headline-sm text-text-primary mb-1">
                  Warning / Attention
                </h3>
                <p className="font-body text-body-sm text-text-secondary leading-relaxed mb-4">
                  Unsaved form state loss, SLA risk downgrade, or overriding ticket priority.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('warning')}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-label-md text-label-md transition-all shadow-sm"
              >
                Trigger Warning Modal
              </button>
            </div>

            {/* Info Card */}
            <div className="p-6 rounded-2xl bg-white border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-4">
                  <Info className="w-5 h-5" />
                </div>
                <h3 className="font-headline text-headline-sm text-text-primary mb-1">
                  Information / Notice
                </h3>
                <p className="font-body text-body-sm text-text-secondary leading-relaxed mb-4">
                  Export generation, workflow status notices, or subscription tier limit advisories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('info')}
                className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-md text-label-md transition-all shadow-sm"
              >
                Trigger Info Modal
              </button>
            </div>

            {/* Success Card */}
            <div className="p-6 rounded-2xl bg-white border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-headline text-headline-sm text-text-primary mb-1">
                  Success / Positive
                </h3>
                <p className="font-body text-body-sm text-text-secondary leading-relaxed mb-4">
                  Batch resolution completed, bulk task dispatch, or SLA verification report ready.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('success')}
                className="w-full py-2.5 px-4 rounded-lg bg-status-resolved hover:bg-emerald-600 text-white font-label-md text-label-md transition-all shadow-sm"
              >
                Trigger Success Modal
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: Size & Scale Matrix (Prompt 81) */}
        <section>
          <div className="mb-4">
            <h2 className="font-headline text-headline-md text-text-primary flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-btn-primary" />
              <span>2. Dialog Dimension & Sizing Matrix</span>
            </h2>
            <p className="font-body text-body-sm text-text-secondary">
              Responsive width steps constrained to consistent desktop and tablet ergonomics.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { size: 'sm', width: '384px (max-w-sm)', desc: 'Confirmations, quick inputs, MFA verification' },
              { size: 'md', width: '512px (max-w-lg)', desc: 'Standard forms, assignment changes, small wizards' },
              { size: 'lg', width: '672px (max-w-2xl)', desc: 'Rich content editors, member matrices, RCA logs' },
              { size: 'xl', width: '896px (max-w-4xl)', desc: 'Large data tables, multi-column analytics previews' },
            ].map((item) => (
              <div key={item.size} className="p-5 rounded-2xl bg-white border border-border-subtle flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-headline text-headline-sm text-text-primary uppercase font-bold">
                      Size: {item.size}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-canvas-lavender font-mono text-xs text-primary font-medium">
                      {item.width.split(' ')[0]}
                    </span>
                  </div>
                  <p className="font-body text-body-sm text-text-secondary mb-4">
                    {item.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(item.size)}
                  className="w-full py-2 px-3 rounded-lg border border-border-subtle hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all"
                >
                  Preview {item.size.toUpperCase()} Modal
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: Contextual Production Modals */}
        <section>
          <div className="mb-4">
            <h2 className="font-headline text-headline-md text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-btn-primary" />
              <span>3. Contextual Production Dialogs</span>
            </h2>
            <p className="font-body text-body-sm text-text-secondary">
              Real-world implementations wired into ticket and workspace flows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-white border border-border-subtle flex items-center justify-between gap-4">
              <div>
                <h3 className="font-headline text-headline-sm text-text-primary flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-severity-blocker" />
                  <span>Delete Ticket Confirmation</span>
                </h3>
                <p className="font-body text-body-sm text-text-secondary mt-1">
                  Destructive prompt requiring conscious user confirmation before removing ticket.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('delete-ticket')}
                className="px-4 py-2 rounded-lg bg-severity-blocker text-white font-label-md text-label-md hover:bg-red-600 transition-all flex-shrink-0"
              >
                Open Dialog
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-border-subtle flex items-center justify-between gap-4">
              <div>
                <h3 className="font-headline text-headline-sm text-text-primary flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  <span>Export Compliance Archive</span>
                </h3>
                <p className="font-body text-body-sm text-text-secondary mt-1">
                  Format selection modal for audit logs (JSON, CSV, PDF).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('export-data')}
                className="px-4 py-2 rounded-lg bg-btn-primary text-white font-label-md text-label-md hover:bg-primary-hover transition-all flex-shrink-0"
              >
                Open Dialog
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── MODAL INSTANCES ── */}

      {/* 1. Danger Modal */}
      <ConfirmationDialog
        isOpen={activeModal === 'danger'}
        onClose={() => setActiveModal(null)}
        onConfirm={() => handleConfirmAction('Permanent Resource Deletion')}
        variant="danger"
        title="Permanently Delete Workspace Project?"
        description="This action cannot be undone. All 42 associated tickets, 18 discussion threads, and attached assets will be permanently unlinked."
        confirmText="Yes, Delete Project"
        isLoading={isProcessing}
      />

      {/* 2. Warning Modal */}
      <ConfirmationDialog
        isOpen={activeModal === 'warning'}
        onClose={() => setActiveModal(null)}
        onConfirm={() => handleConfirmAction('Discard Unsaved Changes')}
        variant="warning"
        title="Discard Unsaved Draft?"
        description="You have unsaved changes in your Incident RCA editor. Navigating away now will reset your modifications to the last auto-saved version."
        confirmText="Discard Changes"
        isLoading={isProcessing}
      />

      {/* 3. Info Modal */}
      <ConfirmationDialog
        isOpen={activeModal === 'info'}
        onClose={() => setActiveModal(null)}
        onConfirm={() => handleConfirmAction('Generate Analytics Report')}
        variant="info"
        title="Generate Monthly SLA Audit Report?"
        description="The system will compile metrics across 4 workspace projects and generate an encrypted PDF report for the platform engineering review."
        confirmText="Generate Report"
        isLoading={isProcessing}
      />

      {/* 4. Success Modal */}
      <ConfirmationDialog
        isOpen={activeModal === 'success'}
        onClose={() => setActiveModal(null)}
        onConfirm={() => handleConfirmAction('Batch Ticket Resolution')}
        variant="success"
        title="Confirm Batch Resolution"
        description="You are about to mark 7 blocker tickets as Resolved. SLA timers will stop and notifications will be dispatched to incident subscribers."
        confirmText="Confirm Resolution"
        isLoading={isProcessing}
      />

      {/* 5. Size Demo Modals */}
      {['sm', 'md', 'lg', 'xl'].map((sz) => (
        <Modal
          key={sz}
          isOpen={activeModal === sz}
          onClose={() => setActiveModal(null)}
          title={`Modal Size Demonstration: ${sz.toUpperCase()}`}
          subtitle={`Rendered using responsive Tailwind width tokens (${sz})`}
          size={sz}
          footer={
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-lg bg-btn-primary text-white font-label-md text-label-md"
            >
              Done Previewing
            </button>
          }
        >
          <div className="space-y-4 py-2">
            <p className="font-body text-body-md text-text-secondary leading-relaxed">
              This modal represents size <span className="font-mono font-semibold text-text-primary">'{sz}'</span>. It supports responsive scrolling when child elements exceed the viewport height and maintains accessible focus traps.
            </p>
            <div className="p-4 rounded-xl bg-canvas-main border border-border-subtle/80 flex items-center justify-between">
              <div>
                <span className="font-label-md text-label-md text-text-primary block">
                  Ergonomic Layout Verification
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary">
                  Viewport constrained padding and responsive max-width.
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-canvas-lavender font-mono text-xs text-primary font-bold">
                Pass
              </span>
            </div>
          </div>
        </Modal>
      ))}

      {/* 6. Contextual: Delete Ticket */}
      <ConfirmationDialog
        isOpen={activeModal === 'delete-ticket'}
        onClose={() => setActiveModal(null)}
        onConfirm={() => handleConfirmAction('Delete Ticket TKT-1042')}
        variant="danger"
        title="Delete Ticket TKT-1042?"
        description="Are you sure you want to delete 'Kafka Consumer Lag Breach in us-east-1'? This ticket will be marked as purged from active boards."
        confirmText="Delete Ticket"
        isLoading={isProcessing}
      />

      {/* 7. Contextual: Export Data */}
      <Modal
        isOpen={activeModal === 'export-data'}
        onClose={() => setActiveModal(null)}
        title="Export System Audit Logs"
        subtitle="Select file format and date range for enterprise export"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-lg border border-border-subtle text-text-secondary font-label-md text-label-md hover:bg-canvas-lavender"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirmAction('Export System Logs')}
              className="px-4 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-md text-label-md"
            >
              Download Archive
            </button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block font-label-md text-label-md text-text-primary mb-1.5">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['JSON (Complete)', 'CSV (Spreadsheet)', 'PDF (Audit Summary)'].map((fmt, i) => (
                <button
                  key={fmt}
                  type="button"
                  className={`py-2 px-3 rounded-lg border text-center font-label-sm text-label-sm ${
                    i === 0
                      ? 'border-btn-primary bg-canvas-lavender text-primary font-bold'
                      : 'border-border-subtle text-text-secondary hover:bg-canvas-main'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-text-primary mb-1.5">
              Include Event Categories
            </label>
            <div className="space-y-2">
              {['Authentication & Session Changes', 'SLA Breaches & Governance Alerts', 'Ticket Status Transitions'].map((cat) => (
                <label key={cat} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-border-subtle text-btn-primary focus:ring-primary" />
                  <span className="font-body-sm text-body-sm text-text-primary">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModalCatalogPage;

