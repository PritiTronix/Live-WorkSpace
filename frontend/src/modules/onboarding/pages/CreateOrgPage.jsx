import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { organizationService, authService, getApiErrorMessage } from '../../../services/api';

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
 * and seamlessly transitions to /workspace/dashboard.
 */
export const CreateOrgPage = () => {
  const navigate = useNavigate();

  // All fields empty by default
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [sizeRange, setSizeRange] = useState('');

  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Client validation: name must be between 2 and 80 characters
  const trimmedName = name.trim();
  const isNameValid = trimmedName.length >= 2 && trimmedName.length <= 80;
  const nameError = touched && !isNameValid
    ? trimmedName.length === 0
      ? 'Organization name is required.'
      : 'Organization name must be between 2 and 80 characters.'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);

    if (!isNameValid) {
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      await organizationService.createOrganization({
        name: trimmedName,
        industry: industry || undefined,
        size_range: sizeRange || undefined,
      });

      // Refresh authenticated session context
      await authService.getMe();

      // Navigate directly to dashboard on success
      navigate('/workspace/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = getApiErrorMessage(err, 'Failed to create organization. Please review the inputs and retry.');
      setServerError(errorMsg);
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

        {/* Server error alert */}
        {serverError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-severity-blocker/10 border border-severity-blocker/20 flex items-start gap-3 text-severity-blocker"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {serverError}
            </div>
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

          {/* Industry (Dropdown from lowercase constants) */}
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
              onChange={(e) => setIndustry(e.target.value)}
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

          {/* Size Range (Dropdown from lowercase constants) */}
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

          {/* Note: Logo field is hidden per project specification */}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (touched && !isNameValid)}
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
