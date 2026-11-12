import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, Key, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { authService } from '../../../services/api';

/**
 * Screen 7: Live Workspace - Email Verification (Prompt 03)
 * Stitch ID: fa85ca673aca4156960012c9c52d1ab0
 * Route: /auth/verify-email
 */
export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || '';

  const [token, setToken] = useState(queryToken);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async (tokenToVerify) => {
    const t = tokenToVerify || token;
    if (!t.trim()) {
      setErrorMessage('Please provide an email verification token.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await authService.verifyEmail(t.trim());
      setVerificationResult({
        verified: true,
        email: response?.email,
        message: response?.message || 'Email address successfully verified.',
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else {
        setErrorMessage('Verification failed. The token is invalid or has expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (queryToken) {
      handleVerify(queryToken);
    }
  }, [queryToken]);

  return (
    <div className="w-full">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-canvas-lavender text-btn-primary mx-auto mb-3 flex items-center justify-center shadow-sm">
          <MailCheck className="w-6 h-6" />
        </div>
        <h1 className="font-headline text-headline-lg text-text-primary tracking-tight">
          Verify your email address
        </h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Confirm your identity to activate access to Live Workspace
        </p>
      </div>

      {/* Success State */}
      {verificationResult ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="font-body-sm text-body-sm">
              <span className="font-semibold block">Cryptographic Verification Success</span>
              <span>{verificationResult.message}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-canvas-main border border-border-subtle/80 flex items-start gap-2.5 text-xs text-text-secondary font-body-sm">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              Architecture Notice: Verification signature was cryptographically validated against JWT secret. Full persistence is marked pending schema migration.
            </span>
          </div>

          <Link
            to="/auth/login"
            className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-lg text-label-lg transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="font-body-sm text-body-sm leading-tight">{errorMessage}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-canvas-main border border-border-subtle/80 text-center">
            <p className="font-body-sm text-body-sm text-text-secondary mb-2">
              If you received a verification token from your administrator or security link, enter it below to confirm:
            </p>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-text-primary mb-1">
              Verification Security Token
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste security token here"
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading || !token.trim()}
            onClick={() => handleVerify(token)}
            className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-lg text-label-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isLoading ? 'Validating Token...' : 'Verify Email Token'}</span>
          </button>

          {/* Return to Sign in */}
          <div className="pt-4 text-center border-t border-border-subtle/60">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyEmailPage;

