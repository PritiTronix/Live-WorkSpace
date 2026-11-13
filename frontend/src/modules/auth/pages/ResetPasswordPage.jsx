import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Key, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../../../services/api';

/**
 * Screen 9: Live Workspace - Reset Password (Prompt 08)
 * Stitch ID: cf6b6a3e90684d0daeb14bd6c79c5209
 * Route: /auth/reset-password
 */
export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!token.trim()) {
      setErrorMessage('Reset token is required. Please check your recovery link or enter the token.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword(token.trim(), newPassword);
      setSuccessMessage(response?.message || 'Password successfully reset! Redirecting to login...');
      setTimeout(() => {
        navigate('/auth/login');
      }, 2500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail[0]?.msg || 'Validation error');
      } else {
        setErrorMessage('Failed to reset password. The token may be expired or invalid.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-canvas-lavender text-btn-primary mx-auto mb-3 flex items-center justify-center shadow-sm">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-headline text-headline-lg text-text-primary tracking-tight">
          Create new password
        </h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Set a secure, high-entropy password for your workspace account.
        </p>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="font-body-sm text-body-sm font-medium">
            {successMessage}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-body-sm text-body-sm leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Token field: shown if not already in URL */}
        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Recovery Token <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste security token from email or admin"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            New Password <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-10 pr-10 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Confirm New Password <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-lg text-label-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-6 text-center">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

