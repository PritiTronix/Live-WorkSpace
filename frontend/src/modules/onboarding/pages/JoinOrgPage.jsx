import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Building, RefreshCw } from 'lucide-react';
import { organizationService, getApiErrorMessage, resolveApiUrl } from '../../../services/api';

/**
 * JoinOrgPage
 * Route: /onboarding/join-org
 * Employee Onboarding:
 * 1. Code input (uppercase, trims spaces, accepts paste)
 * 2. Lookup organization details to confirm
 * 3. Optional message (max 300 chars)
 * 4. Submit join request with 429 Retry-After handling and generic invalid code feedback.
 */
export const JoinOrgPage = () => {
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [confirmedOrg, setConfirmedOrg] = useState(null); // { name, logo_path }
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [lookupError, setLookupError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Rate limit cooldown timer (seconds)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const interval = setInterval(() => {
      setRetryAfterSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfterSeconds]);

  // Code input normalizer: uppercase, trim internal spaces, accept paste
  const handleCodeChange = (e) => {
    const rawValue = e.target.value;
    const sanitized = rawValue.toUpperCase().replace(/\s+/g, '');
    setCode(sanitized);
    if (lookupError) setLookupError(null);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text') || '';
    const sanitized = pastedText.toUpperCase().replace(/\s+/g, '');
    setCode(sanitized);
    if (lookupError) setLookupError(null);
  };

  // Step 1: Lookup Join Code
  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setLookupError('Please enter an organization join code.');
      return;
    }

    if (retryAfterSeconds > 0) {
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setSubmitError(null);

    try {
      const data = await organizationService.lookupJoinCode(cleanCode);
      if (data && data.name) {
        setConfirmedOrg({
          name: data.name,
          logo_path: data.logo_path || null,
        });
      } else {
        // Fallback generic message
        setLookupError('Invalid, expired, or revoked join code. Please verify the code with your administrator.');
      }
    } catch (err) {
      // 429 Rate Limiting
      if (err.cause === '429' || err.response?.status === 429) {
        const wait = err.retryAfter || (err.response?.headers?.['retry-after'] ? parseInt(err.response.headers['retry-after'], 10) : 60);
        setRetryAfterSeconds(wait);
        setLookupError(`Too many join attempts. Please wait ${wait} seconds before trying again.`);
      } else {
        // Bad, expired or revoked codes return one single generic message
        setLookupError('Invalid, expired, or revoked join code. Please verify the code with your administrator.');
      }
    } finally {
      setLookingUp(false);
    }
  };

  // Reset to enter a different code
  const handleChangeCode = () => {
    setConfirmedOrg(null);
    setMessage('');
    setLookupError(null);
    setSubmitError(null);
  };

  // Step 2: Submit Join Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode || !confirmedOrg) {
      return;
    }

    if (retryAfterSeconds > 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await organizationService.requestJoin(cleanCode, message.trim());
      // Successful request creation -> redirect directly to waiting screen
      navigate('/onboarding/waiting', { replace: true });
    } catch (err) {
      if (err.cause === '429' || err.response?.status === 429) {
        const wait = err.retryAfter || (err.response?.headers?.['retry-after'] ? parseInt(err.response.headers['retry-after'], 10) : 60);
        setRetryAfterSeconds(wait);
        setSubmitError(`Too many join attempts. Please wait ${wait} seconds before trying again.`);
      } else {
        const messageText = getApiErrorMessage(err, 'Failed to submit join request. Please retry or contact support.');
        setSubmitError(messageText);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-6 px-4 animate-in fade-in duration-200">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to options</span>
        </Link>
      </div>

      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-status-open/10 text-status-open flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6 text-status-open" />
          </div>
          <div>
            <h1 className="font-headline font-bold text-2xl text-text-primary tracking-tight">
              Join an Organization
            </h1>
            <p className="font-body text-xs text-text-secondary mt-0.5">
              Enter the join code shared by your workspace administrator.
            </p>
          </div>
        </div>

        {/* Global Rate Limit Warning */}
        {retryAfterSeconds > 0 && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-severity-critical/10 border border-severity-critical/20 flex items-start gap-3 text-severity-critical"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium leading-relaxed">
              Too many join attempts. Please wait <span className="font-bold">{retryAfterSeconds}s</span> before retrying.
            </div>
          </div>
        )}

        {/* Step 1: Code Input & Verification */}
        {!confirmedOrg ? (
          <form onSubmit={handleLookup} className="space-y-5" noValidate>
            {lookupError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 flex items-start gap-3 text-severity-blocker"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm font-medium leading-relaxed">
                  {lookupError}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="join-code-input"
                className="font-label-md text-sm font-medium text-text-primary"
              >
                Organization Join Code <span className="text-severity-blocker">*</span>
              </label>
              <input
                id="join-code-input"
                type="text"
                value={code}
                onChange={handleCodeChange}
                onPaste={handlePaste}
                placeholder="e.g. 7K9X2MN4PQ"
                maxLength={20}
                required
                autoComplete="off"
                spellCheck="false"
                aria-label="Organization Join Code"
                className="w-full h-11 px-3.5 rounded-xl bg-canvas-main border border-border-subtle text-text-primary font-mono text-base tracking-wider uppercase placeholder:normal-case placeholder:font-body placeholder:text-sm placeholder:tracking-normal transition-colors focus:outline-none focus:border-btn-primary focus:ring-2 focus:ring-btn-primary/20"
              />
              <p className="text-xs text-text-muted mt-1">
                Codes are case-insensitive and roughly 10 characters long.
              </p>
            </div>

            <button
              type="submit"
              disabled={lookingUp || !code.trim() || retryAfterSeconds > 0}
              className="w-full h-11 rounded-xl bg-btn-primary text-white font-label-md text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-btn-primary/30 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lookingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Looking up Organization...</span>
                </>
              ) : (
                <span>Find Organization</span>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: Confirmed Organization Preview & Message Submission */
          <form onSubmit={handleSubmitRequest} className="space-y-5" noValidate>
            {submitError && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 flex items-start gap-3 text-severity-blocker"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm font-medium leading-relaxed">
                  {submitError}
                </div>
              </div>
            )}

            {/* Confirmed Org Card */}
            <div className="p-4 rounded-xl bg-canvas-main border border-border-subtle flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {confirmedOrg.logo_path ? (
                  <img
                    src={resolveApiUrl(confirmedOrg.logo_path)}
                    alt={confirmedOrg.name}
                    className="w-12 h-12 rounded-xl object-cover border border-border-subtle shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-btn-primary/10 text-btn-primary flex items-center justify-center shrink-0 font-bold text-lg">
                    {confirmedOrg.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline font-semibold text-base text-text-primary truncate block">
                      {confirmedOrg.name}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-status-resolved shrink-0" />
                  </div>
                  <span className="text-xs text-text-muted font-mono uppercase block mt-0.5">
                    Code: {code}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleChangeCode}
                className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-text-primary px-2.5 py-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender transition-colors shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change</span>
              </button>
            </div>

            {/* Optional message for administrator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="join-message"
                  className="font-label-md text-sm font-medium text-text-primary"
                >
                  Message for Administrator <span className="text-text-muted text-xs font-normal">(Optional)</span>
                </label>
                <span className={`text-xs ${message.length > 300 ? 'text-severity-blocker font-semibold' : 'text-text-muted'}`}>
                  {message.length} / 300
                </span>
              </div>
              <textarea
                id="join-message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 300))}
                maxLength={300}
                rows={3}
                placeholder="Introduce yourself or mention your squad/team..."
                className="w-full p-3 rounded-xl bg-canvas-main border border-border-subtle text-text-primary font-body text-sm transition-colors focus:outline-none focus:border-btn-primary focus:ring-2 focus:ring-btn-primary/20 resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleChangeCode}
                className="px-4 h-11 rounded-xl border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-secondary text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || retryAfterSeconds > 0}
                className="flex-1 h-11 rounded-xl bg-btn-primary text-white font-label-md text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-btn-primary/30 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <span>Send Join Request</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default JoinOrgPage;
