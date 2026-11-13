import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

/**
 * Reusable Confirmation Dialog Component (Prompts 82-83 / Screen 22)
 * Supports variants: 'danger', 'warning', 'info', 'success'
 */
export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'danger',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  children,
}) => {
  const variantConfig = {
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-error-container/40 text-error',
      confirmBtn: 'bg-severity-blocker hover:bg-red-600 text-white focus:ring-red-500/30',
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-amber-100 text-amber-600',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500/30',
    },
    info: {
      icon: Info,
      iconBg: 'bg-primary-fixed text-primary',
      confirmBtn: 'bg-btn-primary hover:bg-primary-hover text-white focus:ring-primary/30',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-100 text-emerald-600',
      confirmBtn: 'bg-status-resolved hover:bg-emerald-600 text-white focus:ring-emerald-500/30',
    },
  }[variant] || {
    icon: AlertTriangle,
    iconBg: 'bg-error-container/40 text-error',
    confirmBtn: 'bg-severity-blocker hover:bg-red-600 text-white',
  };

  const Icon = variantConfig.icon;

  const footer = (
    <>
      <button
        type="button"
        disabled={isLoading}
        onClick={onClose}
        className="px-4 py-2 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        type="button"
        disabled={isLoading}
        onClick={onConfirm}
        className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 flex items-center gap-2 ${variantConfig.confirmBtn}`}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        <span>{confirmText}</span>
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={footer}
      showCloseButton={!isLoading}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${variantConfig.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h4 className="font-headline text-headline-sm text-text-primary tracking-tight mb-2">
          {title}
        </h4>
        <p className="font-body text-body-sm text-text-secondary leading-relaxed max-w-sm mb-2">
          {description}
        </p>
        {children && <div className="w-full mt-3 text-left">{children}</div>}
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;

