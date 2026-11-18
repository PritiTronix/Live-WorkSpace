import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight, Zap, Ticket, Users, ShieldCheck, BarChart3 } from 'lucide-react';
import { authService } from '../../../services/api';
import AuthBrandShowcase from '../components/AuthBrandShowcase';
import SocialAuthButtons from '../components/SocialAuthButtons';
import AppLogo from '../components/AppLogo';
import { AUTH_TEXT, AUTH_FEATURES } from '../constants/authConstants';

/**
 * Screen: Live Workspace - Login (Redesign)
 * Source of Truth: Stitch Redesign Screen (Desktop & Mobile)
 * Route: /auth/login
 */
export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Form states - starting strictly EMPTY with no demo or prefilled values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.login({
        email: email.trim().toLowerCase(),
        password: password,
      });
      const destination = location.state?.from?.pathname || '/workspace/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      // Security requirement: Error messages stay generic and never reveal whether an account exists
      if (!err.response) {
        setErrorMessage(AUTH_TEXT.networkError);
      } else {
        setErrorMessage(AUTH_TEXT.genericError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full max-w-full text-text-primary relative overflow-x-hidden flex flex-col justify-between items-center p-3 sm:p-6 lg:p-10 box-border"
      style={{
        background: 'radial-gradient(circle at 10% 15%, rgba(240, 235, 255, 0.9) 0%, rgba(246, 245, 253, 0.95) 45%, #F0EEFC 100%)',
      }}
    >
      {/* ── Ambient Background Decoration Clipped within Inset ── */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-6 left-6 w-36 h-36 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(#d3cbf7 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px',
          }}
        />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-10 w-96 h-96 bg-purple-200/35 rounded-full blur-3xl" />
      </div>

      {/* ── Main Container ── */}
      <main
        className="w-full max-w-[1360px] mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center relative z-10 min-w-0"
        data-purpose="page-wrapper"
      >
        {/* ── Desktop Left Column (Brand Showcase) ── */}
        <div className="hidden lg:block lg:col-span-7 min-w-0">
          <AuthBrandShowcase />
        </div>

        {/* ── Mobile & Tablet Header (Visible only when stacked) ── */}
        <header className="lg:hidden w-full max-w-full sm:max-w-[460px] text-center mx-auto pt-2 min-w-0" data-purpose="mobile-header">
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

        {/* ── Right Column (Elevated Authentication Card) ── */}
        <section
          className="w-full lg:col-span-5 flex flex-col items-center justify-center lg:justify-end min-w-0"
          data-purpose="login-section"
          aria-label="User Sign In"
        >
          <div
            className="w-full max-w-full sm:max-w-[460px] bg-white rounded-3xl p-5 sm:p-8 lg:p-10 shadow-[0_20px_45px_-12px_rgba(96,64,240,0.12),0_4px_16px_-2px_rgba(0,0,0,0.04)] border border-purple-50/80 relative transition-all box-border"
            data-purpose="login-card"
          >
            {/* Logo Badge Inside Card */}
            <div className="flex justify-center mb-5" data-purpose="card-logo">
              <div
                className="w-14 h-14 rounded-2xl bg-btn-primary flex items-center justify-center text-on-primary shadow-lg shadow-btn-primary/25"
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-3xl leading-none">
                  grid_view
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6 sm:mb-7">
              <h2 className="font-headline text-2xl sm:text-[1.75rem] font-bold text-text-primary tracking-tight">
                {AUTH_TEXT.loginTitle}
              </h2>
              <p className="font-body text-xs sm:text-sm text-text-secondary mt-1 font-normal">
                {AUTH_TEXT.loginSubtitle}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-error animate-in fade-in"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="font-body text-sm leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 w-full min-w-0" data-purpose="login-form" noValidate={false}>
              {/* Email Address */}
              <div className="space-y-1.5 w-full">
                <label
                  htmlFor="email"
                  className="block font-label-md text-label-md text-text-primary font-semibold"
                >
                  {AUTH_TEXT.emailLabel}
                </label>
                <div className="relative rounded-xl shadow-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={AUTH_TEXT.emailPlaceholder}
                    className="w-full pl-11 pr-4 py-3 bg-white text-base sm:text-sm text-text-primary rounded-xl border border-slate-300 focus:border-btn-primary focus:ring-2 focus:ring-btn-primary/20 outline-none transition placeholder:text-text-muted box-border"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 w-full">
                <label
                  htmlFor="password"
                  className="block font-label-md text-label-md text-text-primary font-semibold"
                >
                  {AUTH_TEXT.passwordLabel}
                </label>
                <div className="relative rounded-xl shadow-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                    <Lock className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={AUTH_TEXT.passwordPlaceholder}
                    className="w-full pl-11 pr-11 py-3 bg-white text-base sm:text-sm text-text-primary rounded-xl border border-slate-300 focus:border-btn-primary focus:ring-2 focus:ring-btn-primary/20 outline-none transition placeholder:text-text-muted box-border"
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
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Row (Remember Me hidden since backend does not support session duration flag) */}
              <div className="flex items-center justify-end text-xs sm:text-sm pt-1">
                <Link
                  to="/auth/forgot-password"
                  className="font-semibold text-btn-primary hover:text-primary-hover transition-colors"
                >
                  {AUTH_TEXT.forgotPasswordText}
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-btn-primary hover:bg-primary-hover active:scale-[0.99] text-white font-semibold text-sm sm:text-base rounded-xl shadow-[0_8px_20px_-4px_rgba(96,64,240,0.45)] transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-btn-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading && (
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{isLoading ? AUTH_TEXT.submittingButtonText : AUTH_TEXT.submitButtonText}</span>
                {!isLoading && <ArrowRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6" data-purpose="auth-divider">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-text-secondary font-medium uppercase tracking-wider text-[11px]">
                  {AUTH_TEXT.orDivider}
                </span>
              </div>
            </div>

            {/* Social Authentication Grid */}
            <SocialAuthButtons />

            {/* Sign Up Prompt */}
            <p className="text-center text-xs sm:text-sm text-text-secondary mt-7 font-normal">
              {AUTH_TEXT.noAccountPrompt}{' '}
              <Link
                to="/auth/register"
                className="font-semibold text-btn-primary hover:text-primary-hover ml-1 transition-colors"
              >
                {AUTH_TEXT.signUpLinkText}
              </Link>
            </p>
          </div>

          {/* ── Mobile Companion: Feature Badges Grid (Stitch Mobile Screen) ── */}
          <section
            className="lg:hidden mt-8 mb-4 w-full max-w-full sm:max-w-[460px] min-w-0"
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

      {/* ── Footer with dynamically computed year ── */}
      <footer className="w-full max-w-full py-4 text-center text-xs text-text-muted relative z-10" data-purpose="app-footer">
        <p>© {new Date().getFullYear()} Live Workspace. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LoginPage;
