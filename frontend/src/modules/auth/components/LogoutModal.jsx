import React, { useState } from 'react';
import { LogOut, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService, DEFAULT_USER } from '../../../services/api';
import Modal from '../../design-system/components/Modal';

/**
 * Screen 10: Live Workspace - Logout Confirmation Modal (Prompt 80)
 * Stitch ID: f3c70d4869e44ab883249c9c34cb65a5
 * Contextual Modal: Prompts user before session teardown and token clearance.
 */
export const LogoutModal = ({
  isOpen,
  onClose,
  currentUser = DEFAULT_USER,
}) => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = () => {
    setIsLoggingOut(true);
    try {
      authService.logout();
    } finally {
      setIsLoggingOut(false);
      onClose();
      navigate('/auth/login');
    }
  };

  const footer = (
    <>
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={onClose}
        className="px-4 py-2 rounded-lg border border-border-subtle bg-white hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={isLoggingOut}
        onClick={handleConfirmLogout}
        className="px-5 py-2 rounded-lg bg-severity-blocker hover:bg-red-600 text-white font-label-md text-label-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 flex items-center gap-2 disabled:opacity-60"
      >
        <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
        <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={footer}
      showCloseButton={!isLoggingOut}
    >
      <div className="flex flex-col items-center text-center">
        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-error-container/40 text-error flex items-center justify-center mb-4">
          <LogOut className="w-6 h-6" />
        </div>

        <h3 className="font-headline text-headline-sm text-text-primary tracking-tight mb-1.5">
          Sign Out of Live Workspace?
        </h3>
        <p className="font-body text-body-sm text-text-secondary leading-relaxed max-w-xs mb-5">
          Are you sure you want to end your active session? You will need to authenticate again to access projects and tickets.
        </p>

        {/* Current User Session Card */}
        <div className="w-full p-3.5 rounded-xl bg-canvas-main border border-border-subtle/80 flex items-center gap-3 text-left mb-4">
          <img
            alt={currentUser?.full_name || 'User'}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-border-subtle flex-shrink-0"
            src={currentUser?.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
          />
          <div className="min-w-0 flex-1">
            <span className="font-label-md text-label-md text-text-primary truncate block font-semibold">
              {currentUser?.full_name || 'Active User'}
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary truncate block">
              {currentUser?.email || 'user@tronix365.cloud'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-xs font-semibold">
            Active
          </span>
        </div>

        {/* Notice */}
        <div className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-canvas-lavender/60 border border-border-subtle/60 text-text-secondary text-left font-body-sm text-xs">
          <AlertCircle className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          <span>
            Draft incident notes and local workspace layout preferences will be preserved on this device.
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default LogoutModal;

