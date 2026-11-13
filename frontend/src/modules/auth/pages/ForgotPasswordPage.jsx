import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { authService } from '../../../services/api';

/**
 * Screen 8: Live Workspace - Forgot Password (Prompt 07)
 * Stitch ID: 7d53cd20a82c4fef941482fbde54bd90
 * Route: /auth/forgot-password
 */
export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusNotice, setStatusNotice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusNotice(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your registered work email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim().toLowerCase());
      setStatusNotice({
        type: 'success',
        title: 'Instructions Sent',
        message: response?.message || 'If an account exists for this email, reset instructions have been dispatched.',
      });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 501 || status === 503) {
        // Honest server message explaining SMTP provider is unconfigured
        setStatusNotice({
          type: 'warning',
          title: 'Email Delivery Unavailable (BLOCKED)',
          message:
            typeof detail === 'string'
              ? detail
              : 'Email delivery service (SMTP) is not configured in this environment. Password reset email cannot be automatically dispatched.',
        });
      } else {
        setErrorMessage(
          typeof detail === 'string'
            ? detail
            : 'Unable to process password reset request. Please check server connectivity.'
        );
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
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="font-headline text-headline-lg text-text-primary tracking-tight">
          Reset your password
        </h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Enter your registered work email address to receive recovery instructions.
        </p>
      </div>

      {/* Status Notice (e.g. SMTP unconfigured notice per strict audit rules) */}
      {statusNotice && (
        <div
          className={`mb-5 p-4 rounded-xl border flex items-start gap-3 ${
            statusNotice.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusNotice.type === 'warning' ? (
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="font-body-sm text-body-sm">
            <span className="font-semibold block">{statusNotice.title}</span>
            <span>{statusNotice.message}</span>
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

      {/* Reset Request Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Registered Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.cloud"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-lg text-label-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isLoading ? 'Verifying Account...' : 'Send Recovery Instructions'}</span>
        </button>
      </form>

      {/* Return to Login */}
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

export default ForgotPasswordPage;

