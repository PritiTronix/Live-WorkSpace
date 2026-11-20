import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowLeft, AlertCircle, CheckCircle2, Loader2, RefreshCw, Send, ArrowRight } from 'lucide-react';
import { organizationService, authService, getApiErrorMessage } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

export const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology & Software' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare & Life Sciences' },
  { value: 'ecommerce', label: 'E-Commerce & Retail' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

export const SIZE_RANGE_OPTIONS = [
  { value: '1-10', label: '1 - 10 employees' },
  { value: '11-50', label: '11 - 50 employees' },
  { value: '51-200', label: '51 - 200 employees' },
  { value: '201-500', label: '201 - 500 employees' },
  { value: '501-1000', label: '501 - 1,000 employees' },
  { value: '1000+', label: '1,000+ employees' },
];

/**
 * CreateOrgPage
 * Route: /onboarding/create-org
 * Owner Onboarding: Authenticated user creates an organization, receives owner membership,
 * updates centralized AuthContext with fresh session check, and smoothly transitions to /workspace/dashboard.
 */
export const CreateOrgPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  // All fields empty by default on placeholder options
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [industryOther, setIndustryOther] = useState('');
  const [sizeRange, setSizeRange] = useState('');

  const [touched, setTouched] = useState(false);
  const [industryOtherTouched, setIndustryOtherTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  const industryOtherInputRef = useRef(null);

  // Client validation: name must be between 2 and 80 characters
  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 80;
  const nameError = touched && !isNameValid
    ? trimmedName.length === 0
      ? 'Organization name is required.'
      : 'Organization name must be between 2 and 80 characters.'
    : (errorState?.fieldErrors?.name || null);

  // Client validation: industryOther required when industry is 'other'
  const validateIndustryOther = (val) => {
    if (!val || val.length === 0) {
      return 'Specify your industry is required.';
    }
    if (val.startsWith(' ') || val.endsWith(' ')) {
      return 'Industry cannot have leading or trailing spaces.';
    }
    for (let i = 0; i < val.length; i++) {
      const code = val.charCodeAt(i);
      if (code < 32 || (code >= 127 && code <= 159)) {
        return 'Control characters are not allowed.';
      }
    }
    const allowedRegex = /^[a-zA-Z0-9 &/'.-]+$/;
    if (!allowedRegex.test(val)) {
      return "Industry can only contain letters, numbers, spaces, and basic punctuation (&, -, /, ', .).";
    }
    const trimmed = val.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      return 'Industry must be between 2 and 60 characters.';
    }
    return null;
  };

  const industryOtherClientError = industry === 'other' ? validateIndustryOther(industryOther) : null;
  const isIndustryOtherValid = industry !== 'other' || !industryOtherClientError;

  const industryOtherError = (touched || industryOtherTouched) && industry === 'other' && industryOtherClientError
    ? industryOtherClientError
    : (errorState?.fieldErrors?.industry_other || null);

  // Move focus to industry-other input when "other" is selected
  useEffect(() => {
    if (industry === 'other') {
      industryOtherInputRef.current?.focus();
    }
  }, [industry]);

  const handleIndustryChange = (e) => {
    const val = e.target.value;
    setIndustry(val);
    if (val !== 'other') {
      setIndustryOther('');
      setIndustryOtherTouched(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    setResendStatus(null);
    try {
      await authService.resendVerification();
      setResendStatus({
        success: true,
        message: 'Verification email resent successfully. Please check your inbox.',
      });
    } catch (err) {
      setResendStatus({
        success: false,
        message: getApiErrorMessage(err, 'Failed to resend verification email.'),
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Prevent duplicate submits while request is in-flight
    if (loading) {
      return;
    }

    setTouched(true);
    if (industry === 'other') {
      setIndustryOtherTouched(true);
    }

    if (!isNameValid || !isIndustryOtherValid) {
      return;
    }

    setLoading(true);
    setErrorState(null);
    setResendStatus(null);

    try {
      await organizationService.createOrganization({
        name: trimmedName,
        industry: industry && industry.trim() ? industry.trim() : null,
        industry_other: industry === 'other' && industryOther && industryOther.trim() ? industryOther.trim() : null,
        size_range: sizeRange && sizeRange.trim() ? sizeRange.trim() : null,
      });

      // Force authoritative fresh session check: clears in-flight promise and cached user
      const refreshedUser = await refreshUser({ force: true });

      // Only navigate to dashboard when the refreshed user has organization_required false
      if (refreshedUser && !refreshedUser.organization_required) {
        navigate('/workspace/dashboard', { replace: true });
      } else {
        setErrorState({
          type: 'server_error',
          message: 'Organization created successfully, but workspace authorization is still syncing. Please retry.',
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const detail = data?.detail;
      const code = data?.error?.code || detail?.code || err.errorCode;

      // 1. 422 Field Validation Errors
      if (status === 422) {
        const fieldMap = {};
        let summaryMsg = 'Validation failed. Please review the highlighted fields.';
        if (Array.isArray(detail)) {
          detail.forEach((item) => {
            const field = item.loc?.[item.loc.length - 1];
            if (field) fieldMap[field] = item.msg;
          });
          summaryMsg = detail.map((d) => d.msg).join('; ');
        } else if (typeof detail === 'string') {
          summaryMsg = detail;
        } else if (data?.error?.message) {
          summaryMsg = data.error.message;
        }
        setErrorState({
          type: 'validation',
          message: summaryMsg,
          fieldErrors: fieldMap,
        });
      }
      // 2. 409 Conflict: user already has an active organization
      else if (status === 409 || code === 'organization_already_exists') {
        const msg = typeof detail === 'object' && detail?.message
          ? detail.message
          : (data?.error?.message || typeof detail === 'string' ? detail : 'User already has an active organization membership.');
        setErrorState({
          type: 'already_exists',
          message: msg,
        });
      }
      // 3. Email verification required with Resend button
      else if (
        status === 403 &&
        (code === 'email_verification_required' || (typeof detail === 'string' && detail.includes('Email verification')))
      ) {
        setErrorState({
          type: 'email_verification',
          message: 'Email verification is required before creating an organization.',
        });
      }
      // 4. 429 Rate limited with wait time
      else if (status === 429) {
        const retryAfterHeader = err.response?.headers?.['retry-after'] || err.response?.headers?.['Retry-After'];
        const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) || retryAfterHeader : null;
        setErrorState({
          type: 'rate_limited',
          message: `Too many requests. Please wait ${retryAfter ? `${retryAfter} seconds` : 'a moment'} before trying again.`,
          retryAfter,
        });
      }
      // 5. 5xx Server Error with Retry
      else if (status >= 500 && status <= 599) {
        setErrorState({
          type: 'server_error',
          message: 'An unexpected server error occurred while establishing the organization. Please retry.',
        });
      }
      // Generic fallback
      else {
        setErrorState({
          type: 'generic',
          message: getApiErrorMessage(err, 'Failed to create organization. Please review the inputs and retry.'),
        });
      }
    } finally {
      setLoading(false);
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
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-btn-primary" />
          </div>
          <div>
            <h1 className="font-headline font-bold text-2xl text-text-primary tracking-tight">
              Create an Organization
            </h1>
            <p className="font-body text-xs text-text-secondary mt-0.5">
              Establish your team's workspace and operational governance.
            </p>
          </div>
        </div>

        {/* Mapped Error Alerts */}
        {errorState && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 flex flex-col gap-3 text-severity-blocker"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm font-medium leading-relaxed">
                {errorState.message}
              </div>
            </div>

            {/* Error Cause Specific Action Controls */}
            {errorState.type === 'already_exists' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/workspace/dashboard', { replace: true })}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <span>Go to Workspace Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {errorState.type === 'email_verification' && (
              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={resendingEmail}
                  onClick={handleResendEmail}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-semibold transition-colors shadow-xs w-fit disabled:opacity-60 cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${resendingEmail ? 'animate-pulse' : ''}`} />
                  <span>{resendingEmail ? 'Sending...' : 'Resend Verification Email'}</span>
                </button>
                {resendStatus && (
                  <p className={`text-xs font-medium ${resendStatus.success ? 'text-emerald-700' : 'text-severity-blocker'}`}>
                    {resendStatus.message}
                  </p>
                )}
              </div>
            )}

            {errorState.type === 'server_error' && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-btn-primary hover:bg-btn-primary-hover text-white text-xs font-semibold transition-colors shadow-xs w-fit"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Submission</span>
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Organization Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="org-name"
                className="font-label-md text-sm font-medium text-text-primary"
              >
                Organization Name <span className="text-severity-blocker">*</span>
              </label>
              <span className={`text-xs ${name.length > 80 ? 'text-severity-blocker font-semibold' : 'text-text-muted'}`}>
                {name.length} / 80
              </span>
            </div>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              maxLength={85}
              placeholder="e.g. Acme Cloud Operations"
              required
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'org-name-error' : undefined}
              className={`w-full h-11 px-3.5 rounded-xl bg-canvas-main border text-text-primary font-body text-sm transition-colors focus:outline-none focus:ring-2 ${
                nameError
                  ? 'border-severity-blocker focus:border-severity-blocker focus:ring-severity-blocker/20'
                  : 'border-border-subtle focus:border-btn-primary focus:ring-btn-primary/20'
              }`}
            />
            {nameError && (
              <p id="org-name-error" className="text-xs text-severity-blocker font-medium mt-1">
                {nameError}
              </p>
            )}
          </div>

          {/* Industry (Dropdown starts empty on placeholder) */}
          <div className="space-y-1.5">
            <label
              htmlFor="org-industry"
              className="font-label-md text-sm font-medium text-text-primary"
            >
              Industry <span className="text-text-muted text-xs font-normal">(Optional)</span>
            </label>
            <select
              id="org-industry"
              value={industry}
              onChange={handleIndustryChange}
              className="w-full h-11 px-3.5 rounded-xl bg-canvas-main border border-border-subtle text-text-primary font-body text-sm transition-colors focus:outline-none focus:border-btn-primary focus:ring-2 focus:ring-btn-primary/20"
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Specify your industry (Visible when 'other' is chosen) */}
          {industry === 'other' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="org-industry-other"
                  className="font-label-md text-sm font-medium text-text-primary"
                >
                  Specify your industry <span className="text-severity-blocker">*</span>
                </label>
                <span className={`text-xs ${industryOther.length > 60 ? 'text-severity-blocker font-semibold' : 'text-text-muted'}`}>
                  {industryOther.length} / 60
                </span>
              </div>
              <input
                id="org-industry-other"
                ref={industryOtherInputRef}
                type="text"
                value={industryOther}
                onChange={(e) => {
                  setIndustryOther(e.target.value);
                  if (!industryOtherTouched) setIndustryOtherTouched(true);
                }}
                onBlur={() => setIndustryOtherTouched(true)}
                maxLength={65}
                placeholder="e.g. Logistics or Non-profit"
                required
                aria-invalid={Boolean(industryOtherError)}
                aria-describedby={industryOtherError ? 'org-industry-other-error' : undefined}
                className={`w-full h-11 px-3.5 rounded-xl bg-canvas-main border text-text-primary font-body text-sm transition-colors focus:outline-none focus:ring-2 ${
                  industryOtherError
                    ? 'border-severity-blocker focus:border-severity-blocker focus:ring-severity-blocker/20'
                    : 'border-border-subtle focus:border-btn-primary focus:ring-btn-primary/20'
                }`}
              />
              {industryOtherError && (
                <p id="org-industry-other-error" className="text-xs text-severity-blocker font-medium mt-1">
                  {industryOtherError}
                </p>
              )}
            </div>
          )}

          {/* Size Range (Dropdown starts empty on placeholder) */}
          <div className="space-y-1.5">
            <label
              htmlFor="org-size-range"
              className="font-label-md text-sm font-medium text-text-primary"
            >
              Company Size <span className="text-text-muted text-xs font-normal">(Optional)</span>
            </label>
            <select
              id="org-size-range"
              value={sizeRange}
              onChange={(e) => setSizeRange(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-canvas-main border border-border-subtle text-text-primary font-body text-sm transition-colors focus:outline-none focus:border-btn-primary focus:ring-2 focus:ring-btn-primary/20"
            >
              <option value="">Select team size</option>
              {SIZE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (touched && (!isNameValid || !isIndustryOtherValid))}
              className="w-full h-11 rounded-xl bg-btn-primary text-white font-label-md text-sm font-semibold hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-btn-primary/30 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Organization...</span>
                </>
              ) : (
                <span>Create Organization & Enter Workspace</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrgPage;
