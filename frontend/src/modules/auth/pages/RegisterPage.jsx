import React, { useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, RotateCw, Zap, Ticket, Users, ShieldCheck, BarChart3 } from 'lucide-react';
import { authService } from '../../../services/api';
import AuthBrandShowcase from '../components/AuthBrandShowcase';
import SocialAuthButtons from '../components/SocialAuthButtons';
import AppLogo from '../components/AppLogo';
import {
  AUTH_TEXT,
  AUTH_FEATURES,
  validatePasswordRules,
  calculatePasswordStrength,
} from '../constants/authConstants';

/**
 * Screen: Live Workspace - Sign Up (Redesign)
 * Source of Truth: Stitch Redesign Screen (Desktop & Mobile)
 * Routes: /auth/register and /auth/signup
 *
 * Spacing & Viewport Fit:
 * - Desktop: 100% viewport fit (h-dvh) without whole-page scroll at 1366x768, 1440x900, 1536x864, 1920x1080 and 125% Windows scaling.
 * - Form spacing: ~20px between field groups, 8px between label & input, 44-48px inputs and buttons with 14-16px text.
 * - Password meter attached under input (hidden when empty), hint below meter, ~16px above terms checkbox, ~20px above button.
 * - Divider: ~24px above & below with centered label and background matching card.
 * - Footer: integrated into flex layout, never pushed past bottom or clipped.
 * - Right column scrolls internally if ever needed on very short heights; no overflow-hidden on body.
 */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const formId = useId();

  // Form states - starting strictly EMPTY with no demo or prefilled values
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [genericError, setGenericError] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    terms: '',
  });

  // Calculate password strength live
  const passwordStrength = calculatePasswordStrength(password);

  const getFeatureIcon = (icon) => {
    switch (icon) {
      case 'zap':
        return <Zap className="w-4 h-4 flex-shrink-0" strokeWidth={2} />;
      case 'ticket':
        return <Ticket className="w-4 h-4 flex-shrink-0" strokeWidth={2} />;
      case 'users':
        return <Users className="w-4 h-4 flex-shrink-0" strokeWidth={2} />;
      case 'shield-check':
        return <ShieldCheck className="w-4 h-4 flex-shrink-0" strokeWidth={2} />;
      case 'bar-chart':
      default:
        return <BarChart3 className="w-4 h-4 flex-shrink-0" strokeWidth={2} />;
    }
  };

  const handleInputChange = (field, setter) => (e) => {
    setter(e.target.value);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (genericError) {
      setGenericError('');
      setIsNetworkError(false);
    }
  };

  const handleCheckboxChange = (e) => {
    setAgreeTerms(e.target.checked);
    if (fieldErrors.terms) {
      setFieldErrors((prev) => ({ ...prev, terms: '' }));
    }
    if (genericError) {
      setGenericError('');
      setIsNetworkError(false);
    }
  };

  const validateForm = () => {
    const errors = {
      fullName: '',
      email: '',
      password: '',
      terms: '',
    };
    let isValid = true;

    // Full name validation
    if (!fullName.trim()) {
      errors.fullName = AUTH_TEXT.nameRequiredError;
      isValid = false;
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters long.';
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = AUTH_TEXT.emailInvalidError;
      isValid = false;
    } else if (!emailRegex.test(email.trim())) {
      errors.email = AUTH_TEXT.emailInvalidError;
      isValid = false;
    }

    // Password validation (using rules identical to backend security.py)
    const pwValidation = validatePasswordRules(password);
    if (!pwValidation.valid) {
      errors.password = pwValidation.error;
      isValid = false;
    }

    // Terms checkbox (client-side required; UserCreate backend schema does not accept agree_terms)
    if (!agreeTerms) {
      errors.terms = AUTH_TEXT.termsRequiredError;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGenericError('');
    setIsNetworkError(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/auth/login', {
          state: { message: 'Account registered successfully! Please log in.' },
        });
      }, 1500);
    } catch (err) {
      if (!err.response) {
        setGenericError(AUTH_TEXT.networkError);
        setIsNetworkError(true);
      } else if (err.response.status === 400 && typeof err.response.data?.detail === 'string') {
        const detail = err.response.data.detail;
        if (detail.toLowerCase().includes('already exists') || detail.toLowerCase().includes('email')) {
          setFieldErrors((prev) => ({ ...prev, email: detail }));
        } else {
          setGenericError(detail);
        }
      } else if (err.response.status === 422 && Array.isArray(err.response.data?.detail)) {
        const errMap = {};
        err.response.data.detail.forEach((item) => {
          const field = item.loc?.[item.loc.length - 1];
          if (field === 'email') errMap.email = item.msg;
          else if (field === 'password') errMap.password = item.msg;
          else if (field === 'full_name') errMap.fullName = item.msg;
        });
        if (Object.keys(errMap).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...errMap }));
        } else {
          setGenericError(err.response.data.detail[0]?.msg || 'Validation failed. Please verify your details.');
        }
      } else if (err.response.status === 503) {
        setGenericError('Service temporarily unavailable. Please retry in a few moments.');
        setIsNetworkError(true);
      } else {
        setGenericError(
          typeof err.response.data?.detail === 'string'
            ? err.response.data.detail
            : 'Registration failed. Please check your network or try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen lg:h-dvh flex flex-col justify-between w-full max-w-full text-text-primary relative px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-2.5 box-border"
      style={{
        background:
          'radial-gradient(circle at 10% 15%, rgba(240, 235, 255, 0.9) 0%, rgba(246, 245, 253, 0.95) 45%, #F0EEFC 100%)',
      }}
    >
      {/* ── Ambient Background Decoration Clipped within Inset ── */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-6 left-8 w-44 h-44 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgba(104, 72, 232, 0.18) 1.5px, transparent 1.5px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div
          className="absolute bottom-10 right-12 w-56 h-56 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(104, 72, 232, 0.18) 1.5px, transparent 1.5px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-10 w-96 h-96 bg-purple-200/35 rounded-full blur-3xl" />
      </div>

      {/* ── Main Container ── */}
      <main
        className="w-full max-w-[1360px] mx-auto flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-12 items-center relative z-10 my-auto"
        data-purpose="page-wrapper"
      >
        {/* ── Desktop Left Column (Brand Showcase) ── */}
        <div className="hidden lg:flex lg:col-span-7 h-full min-h-0 flex-col justify-between overflow-hidden">
          <AuthBrandShowcase />
        </div>

        {/* ── Mobile & Tablet Header (Visible only when stacked) ── */}
        <header
          className="lg:hidden w-full max-w-full sm:max-w-[460px] text-center mx-auto pt-2 min-w-0"
          data-purpose="mobile-header"
        >
          <AppLogo size="md" className="justify-center mb-4" />
          <h1 className="font-headline text-2xl sm:text-[26px] font-extrabold text-text-primary leading-snug tracking-tight">
            <span>{AUTH_TEXT.headlineMain}</span>
            <br />
            <span className="text-btn-primary">{AUTH_TEXT.headlineAccent}</span>
          </h1>
          <p className="font-body text-xs sm:text-sm text-text-secondary mt-2 max-w-xs mx-auto leading-relaxed">
            {AUTH_TEXT.subtext}
          </p>
        </header>

        {/* ── Right Column (Elevated Sign Up Card Container) ── */}
        <section
          className="w-full lg:col-span-5 h-full min-h-0 flex flex-col items-center min-w-0 overflow-y-auto custom-scrollbar py-2"
          data-purpose="signup-section"
          aria-label="User Sign Up"
        >
          <div
            className="w-full max-w-full sm:max-w-[460px] bg-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_45px_-12px_rgba(96,64,240,0.12),0_4px_16px_-2px_rgba(0,0,0,0.04)] border border-purple-50/80 relative transition-all box-border my-auto"
            data-purpose="signup-card"
          >
            {/* Header Logo Mark Badge */}
            <div className="flex justify-center mb-3.5" data-purpose="card-logo">
              <div
                className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-tr from-btn-primary to-brand-500 flex items-center justify-center text-on-primary shadow-lg shadow-btn-primary/25"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-2xl lg:text-3xl leading-none">
                  grid_view
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-5">
              <h2 className="font-headline text-2xl sm:text-[1.65rem] font-bold text-text-primary tracking-tight">
                {AUTH_TEXT.signUpTitle}
              </h2>
              <p className="font-body text-xs sm:text-sm text-text-secondary mt-1 font-normal">
                {AUTH_TEXT.signUpSubtitle}
              </p>
            </div>

            {/* Success Banner */}
            {isSuccess && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 animate-in fade-in"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold block">Account created successfully!</span>
                  Redirecting to sign-in screen...
                </div>
              </div>
            )}

            {/* Generic / Network Error Banner with Retry */}
            {genericError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 p-3 rounded-xl bg-error-container/40 border border-error/20 flex items-start justify-between gap-2.5 text-error animate-in fade-in"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="font-body text-xs sm:text-sm leading-tight break-words">
                    {genericError}
                  </span>
                </div>
                {isNetworkError && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-shrink-0 text-xs font-semibold text-btn-primary hover:underline flex items-center gap-1 cursor-pointer pl-2"
                  >
                    <RotateCw className="w-3 h-3" aria-hidden="true" />
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Sign Up Form - ~20px between field groups */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 w-full min-w-0"
              data-purpose="signup-form"
              noValidate
            >
              {/* Field 1: Full Name */}
              <div className="w-full">
                <label
                  htmlFor={`${formId}-fullName`}
                  className="block font-label-md text-xs sm:text-sm text-text-primary font-semibold mb-2"
                >
                  {AUTH_TEXT.fullNameLabel} <span className="text-error" aria-hidden="true">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  </div>
                  <input
                    id={`${formId}-fullName`}
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={handleInputChange('fullName', setFullName)}
                    placeholder={AUTH_TEXT.fullNamePlaceholder}
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? `${formId}-fullName-error` : undefined}
                    className={`w-full h-11 sm:h-12 pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-white text-sm sm:text-base text-text-primary rounded-xl border ${
                      fieldErrors.fullName
                        ? 'border-error focus:border-error focus:ring-error/20'
                        : 'border-slate-300 focus:border-btn-primary focus:ring-btn-primary/20'
                    } focus:ring-2 outline-none transition placeholder:text-text-muted box-border`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p
                    id={`${formId}-fullName-error`}
                    role="alert"
                    aria-live="polite"
                    className="text-xs text-error font-medium pt-1"
                  >
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* Field 2: Work Email */}
              <div className="w-full">
                <label
                  htmlFor={`${formId}-email`}
                  className="block font-label-md text-xs sm:text-sm text-text-primary font-semibold mb-2"
                >
                  {AUTH_TEXT.workEmailLabel} <span className="text-error" aria-hidden="true">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  </div>
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={handleInputChange('email', setEmail)}
                    placeholder={AUTH_TEXT.workEmailPlaceholder}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined}
                    className={`w-full h-11 sm:h-12 pl-10 sm:pl-11 pr-4 py-2.5 sm:py-3 bg-white text-sm sm:text-base text-text-primary rounded-xl border ${
                      fieldErrors.email
                        ? 'border-error focus:border-error focus:ring-error/20'
                        : 'border-slate-300 focus:border-btn-primary focus:ring-btn-primary/20'
                    } focus:ring-2 outline-none transition placeholder:text-text-muted box-border`}
                  />
                </div>
                {fieldErrors.email && (
                  <p
                    id={`${formId}-email-error`}
                    role="alert"
                    aria-live="polite"
                    className="text-xs text-error font-medium pt-1"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Field 3: Password */}
              <div className="w-full">
                <label
                  htmlFor={`${formId}-password`}
                  className="block font-label-md text-xs sm:text-sm text-text-primary font-semibold mb-2"
                >
                  {AUTH_TEXT.createPasswordLabel} <span className="text-error" aria-hidden="true">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                  </div>
                  <input
                    id={`${formId}-password`}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={handleInputChange('password', setPassword)}
                    placeholder={AUTH_TEXT.createPasswordPlaceholder}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={`${formId}-password-hint ${fieldErrors.password ? `${formId}-password-error` : ''}`}
                    className={`w-full h-11 sm:h-12 pl-10 sm:pl-11 pr-10 sm:pr-11 py-2.5 sm:py-3 bg-white text-sm sm:text-base text-text-primary rounded-xl border ${
                      fieldErrors.password
                        ? 'border-error focus:border-error focus:ring-error/20'
                        : 'border-slate-300 focus:border-btn-primary focus:ring-btn-primary/20'
                    } focus:ring-2 outline-none transition placeholder:text-text-muted box-border`}
                  />
                  {/* Password Show/Hide Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-primary/40 rounded-r-xl transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* Password Strength Meter: Attached under input, hidden when empty */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5 w-full" aria-live="polite">
                    <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary">
                      <span>{AUTH_TEXT.passwordStrengthLabel}</span>
                      <span className={passwordStrength.colorClass}>
                        {passwordStrength.label}
                      </span>
                    </div>

                    {/* 4-segment strength bar */}
                    <div
                      className="grid grid-cols-4 gap-1.5 h-1.5 w-full"
                      role="progressbar"
                      aria-valuenow={passwordStrength.score}
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-label="Password strength meter"
                    >
                      {[1, 2, 3, 4].map((seg) => {
                        const isFilled = passwordStrength.score >= seg;
                        return (
                          <div
                            key={seg}
                            className={`h-full rounded-full transition-colors duration-200 ${
                              isFilled ? passwordStrength.barClass : 'bg-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Password Hint below meter */}
                <p id={`${formId}-password-hint`} className="text-xs text-text-muted mt-1.5 leading-snug">
                  {AUTH_TEXT.passwordHint}
                </p>

                {fieldErrors.password && (
                  <p
                    id={`${formId}-password-error`}
                    role="alert"
                    aria-live="polite"
                    className="text-xs text-error font-medium pt-1"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Terms of Service & Privacy Policy Checkbox (~16px above checkbox via pt-4) */}
              <div className="pt-4">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={handleCheckboxChange}
                    aria-invalid={Boolean(fieldErrors.terms)}
                    aria-describedby={fieldErrors.terms ? `${formId}-terms-error` : undefined}
                    className="w-4 h-4 mt-0.5 rounded text-btn-primary focus:ring-btn-primary/30 border-slate-300 accent-btn-primary cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-text-secondary leading-snug">
                    {AUTH_TEXT.termsAgreementText}
                  </span>
                </label>
                {fieldErrors.terms && (
                  <p
                    id={`${formId}-terms-error`}
                    role="alert"
                    aria-live="polite"
                    className="text-xs text-error font-medium pt-1"
                  >
                    {fieldErrors.terms}
                  </p>
                )}
              </div>

              {/* Full-Width Purple Create Account CTA Button (~20px between checkbox and button via mt-5) */}
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className="w-full mt-5 h-11 sm:h-12 px-4 bg-btn-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-sm sm:text-base rounded-xl shadow-[0_8px_20px_-4px_rgba(96,64,240,0.45)] transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading && (
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {isLoading ? AUTH_TEXT.creatingAccountButtonText : AUTH_TEXT.createAccountButtonText}
                </span>
                {!isLoading && <ArrowRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
              </button>
            </form>

            {/* "or continue with" Divider (~24px above and below via my-6, background matching card) */}
            <div className="relative my-6" data-purpose="auth-divider">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-text-secondary font-medium uppercase tracking-wider text-[11px]">
                  {AUTH_TEXT.orDivider}
                </span>
              </div>
            </div>

            {/* Social SSO Buttons: Google, Microsoft, GitHub (Three equal squares, equal gaps) */}
            <div className="w-full">
              <SocialAuthButtons />
            </div>

            {/* Footer Link: Already have an account? Log In (centered with space under it) */}
            <p className="text-center text-xs sm:text-sm text-text-secondary mt-6 pb-1 font-normal">
              {AUTH_TEXT.alreadyAccountPrompt}{' '}
              <Link
                to="/auth/login"
                className="font-semibold text-btn-primary hover:text-primary-hover ml-1 transition-colors"
              >
                {AUTH_TEXT.logInLinkText}
              </Link>
            </p>
          </div>

          {/* ── Mobile Companion: Feature Badges Grid (Stitch Mobile Screen) ── */}
          <section
            className="lg:hidden mt-6 mb-3 w-full max-w-full sm:max-w-[460px] min-w-0"
            data-purpose="mobile-features"
            aria-label="Features Overview"
          >
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* Features 1, 2, 3 */}
              {AUTH_FEATURES.slice(0, 3).map((feat) => (
                <div
                  key={feat.id}
                  className="flex flex-col items-center text-center p-2 sm:p-2.5 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-xs min-w-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-btn-primary flex items-center justify-center mb-1.5 shadow-inner flex-shrink-0">
                    {getFeatureIcon(feat.icon)}
                  </div>
                  <span className="font-label-sm text-[10px] sm:text-[11px] font-semibold text-text-primary leading-tight whitespace-pre-line truncate max-w-full">
                    {feat.shortName}
                  </span>
                </div>
              ))}

              {/* Feature 4: SLA Monitoring */}
              <div className="flex flex-col items-center text-center p-2 sm:p-2.5 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-xs col-start-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-btn-primary flex items-center justify-center mb-1.5 shadow-inner flex-shrink-0">
                  {getFeatureIcon(AUTH_FEATURES[3].icon)}
                </div>
                <span className="font-label-sm text-[10px] sm:text-[11px] font-semibold text-text-primary leading-tight whitespace-pre-line truncate max-w-full">
                  {AUTH_FEATURES[3].shortName}
                </span>
              </div>

              {/* Feature 5: Analytics & Reports (Span 2 columns to balance row 2) */}
              <div className="flex flex-col items-center text-center p-2 sm:p-2.5 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-xs col-span-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-btn-primary flex items-center justify-center mb-1.5 shadow-inner flex-shrink-0">
                  {getFeatureIcon(AUTH_FEATURES[4].icon)}
                </div>
                <span className="font-label-sm text-[10px] sm:text-[11px] font-semibold text-text-primary leading-tight whitespace-pre-line truncate max-w-full">
                  {AUTH_FEATURES[4].shortName}
                </span>
              </div>
            </div>
          </section>
        </section>
      </main>

      {/* ── Footer with dynamically computed year (Always in layout, never clipped) ── */}
      <footer
        className="w-full max-w-full py-2 text-center text-xs text-text-muted relative z-10 flex-shrink-0"
        data-purpose="app-footer"
      >
        <p>© {new Date().getFullYear()} Live Workspace. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default RegisterPage;
