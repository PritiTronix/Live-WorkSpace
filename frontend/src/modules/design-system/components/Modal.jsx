import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../../utils/scrollLock';

/**
 * Enterprise Shared Modal Component (Prompt 81 / Screen 22)
 *
 * Universal Modal / Dialog adhering to universal project rules:
 * - Rendered through React portal into document.body
 * - Fixed overlay with backdrop blur
 * - Dialog layout: flex column with max-height of 90vh (90dvh where supported)
 * - Sticky header with title, subtitle, and always-visible close button
 * - Scrollable body with overflow-y: auto and overscroll-behavior: contain
 * - Sticky footer holding action buttons
 * - Reference-counted scroll lock preserving scrollbar width (no layout shift)
 * - Confirmation on Esc, close button, or overlay click if hasUnsavedChanges is true
 * - Focus trapping inside dialog with return of focus to opener on close
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
  hasUnsavedChanges = false,
  unsavedChangesPrompt = 'You have unsaved changes. Are you sure you want to discard them?',
  triggerRef: triggerRefProp,
  className = '',
}) => {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);
  const titleId = useId();

  // Scroll lock & Focus restoration
  useEffect(() => {
    if (!isOpen) return;

    // Save opener element for focus restoration
    triggerRef.current = triggerRefProp?.current || document.activeElement;
    lockScroll();

    // Move focus into the dialog on open
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
      unlockScroll();

      const targetTrigger = triggerRefProp?.current || triggerRef.current;
      if (targetTrigger && document.body.contains(targetTrigger) && typeof targetTrigger.focus === 'function') {
        targetTrigger.focus();
      }
    };
  }, [isOpen, triggerRefProp]);

  // Close attempt handler with unsaved changes verification
  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(unsavedChangesPrompt);
      if (!confirmed) return;
    }
    onClose?.();
  };

  // Keyboard navigation: Escape key & Focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        handleCloseAttempt();
        return;
      }

      // Focus trap navigation
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, hasUnsavedChanges, unsavedChangesPrompt, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-[95vw]',
  }[size] || 'max-w-lg';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      {/* Fixed Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-[#141529]/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={closeOnBackdrop ? handleCloseAttempt : undefined}
        aria-hidden="true"
      />

      {/* Dialog Surface: Max Height 90vh (90dvh where supported), Flex Column Layout */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses} max-h-[90vh] max-h-[90dvh] flex flex-col bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 outline-none ${className}`}
      >
        {/* Sticky Header with Title and Always-Visible Close Button */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-border-subtle/80 bg-surface-card sticky top-0 z-20 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-3 text-left">
              {Icon && (
                <div className="w-10 h-10 rounded-xl bg-canvas-lavender text-btn-primary flex items-center justify-center flex-shrink-0">
                  {typeof Icon === 'string' ? (
                    <span className="material-symbols-outlined text-[20px]">{Icon}</span>
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 id={titleId} className="font-headline text-headline-sm text-text-primary tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="font-body text-body-sm text-text-secondary mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={handleCloseAttempt}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-canvas-lavender transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Body with overscroll-behavior: contain */}
        <div
          className="p-6 overflow-y-auto flex-1 overscroll-contain text-left"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-6 py-4 bg-canvas-main/80 border-t border-border-subtle flex items-center justify-end gap-3 sticky bottom-0 z-20 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
