import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Reusable Base Modal Component (Prompt 81 / Screen 22)
 * Features:
 * - Rendered through React portal into document.body
 * - Backdrop blur full-screen overlay (fixed, inset 0, high z-index)
 * - Centered dialog layout
 * - Escape key listener & outside-click dismissal
 * - Focus moves into dialog on open and returns to trigger on close
 * - Responsive size variants: sm (400px), md (520px), lg (680px), xl (860px)
 * - Accessible dialog role and focus trap handling
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  triggerRef: triggerRefProp,
}) => {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // Focus management & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = triggerRefProp?.current || document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog
    const focusTimer = setTimeout(() => {
      if (!modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        modalRef.current.focus?.();
      }
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      const targetTrigger = triggerRefProp?.current || triggerRef.current;
      if (targetTrigger && document.body.contains(targetTrigger) && typeof targetTrigger.focus === 'function') {
        targetTrigger.focus();
      } else {
        const fallback =
          document.getElementById('user-profile-trigger') ||
          document.getElementById('create-action-btn') ||
          document.getElementById('notif-bell-btn');
        fallback?.focus?.();
      }
    };
  }, [isOpen, triggerRefProp]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-lg';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#141529]/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses} bg-white rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 outline-none`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-subtle/80">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 rounded-xl bg-canvas-lavender text-btn-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div>
                {title && (
                  <h3 className="font-headline text-headline-sm text-text-primary tracking-tight">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="font-body text-body-sm text-text-secondary mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-canvas-lavender transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-canvas-main/60 border-t border-border-subtle flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;

