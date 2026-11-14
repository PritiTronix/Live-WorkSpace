import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../../../services/api';

/**
 * Screen 5: Live Workspace - Account Registration & Signup
 * Stitch ID: f9bc7e5e49c34e12bac3d1f85a57e705
 * Route: /auth/register
 */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('engineering');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [legalModal, setLegalModal] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreeTerms) {
      setErrorMessage('You must agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        title: title.trim() || 'Software Engineer',
        department: department.toLowerCase(),
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail[0]?.msg || 'Validation error');
      } else {
        setErrorMessage('Failed to register account. Please check your network or try a different email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-btn-primary mx-auto mb-3 flex items-center justify-center text-on-primary shadow-sm">
          <span className="material-symbols-outlined text-2xl">grid_view</span>
        </div>
        <h1 className="font-headline text-headline-lg text-text-primary tracking-tight">
          Create your account
        </h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          Join your organization's engineering workspace
        </p>
      </div>

      {/* Success Notification */}
      {isSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="font-body-sm text-body-sm">
            <span className="font-semibold block">Account registered successfully!</span>
            Redirecting to sign-in screen...
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

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Full Name <span className="text-error">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Work Email Address <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.morgan@company.cloud"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Password <span className="text-error">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-label-md text-label-md text-text-primary mb-1">
              Department
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-border-subtle bg-white text-text-primary font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all appearance-none"
              >
                <option value="engineering">Engineering</option>
                <option value="platform">Platform & SRE</option>
                <option value="devops">DevOps & Infra</option>
                <option value="security">Cybersecurity</option>
                <option value="product">Product Management</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-text-primary mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SRE Engineer"
              className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        {/* Terms */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="rounded border-border-subtle text-btn-primary focus:ring-primary/30 w-4 h-4 mt-0.5"
            />
            <span className="font-body-sm text-body-sm text-text-secondary leading-snug">
              I agree to the{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLegalModal('terms');
                }}
                className="text-btn-primary hover:underline font-medium cursor-pointer"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLegalModal('privacy');
                }}
                className="text-btn-primary hover:underline font-medium cursor-pointer"
              >
                Privacy Policy
              </button>
              .
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isSuccess}
          className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-lg text-label-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 flex items-center justify-center gap-2 mt-3"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
        </button>
      </form>

      {/* Footer Login Link */}
      <div className="mt-6 text-center">
        <p className="font-body-sm text-body-sm text-text-secondary">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="font-label-md text-label-md text-btn-primary hover:text-primary-hover font-bold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Interactive Terms & Privacy Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-container/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {legalModal === 'terms' ? 'gavel' : 'policy'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-text-primary font-['Plus_Jakarta_Sans']">
                  {legalModal === 'terms' ? 'Terms of Service' : 'Privacy & Security Policy'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-text-secondary leading-relaxed">
              {legalModal === 'terms' ? (
                <>
                  <p className="font-semibold text-text-primary">Live Workspace Enterprise Terms of Service</p>
                  <p>1. By registering, you are authorized to collaborate across designated projects, task boards, and incident management queues within your organization.</p>
                  <p>2. Users must maintain credential confidentiality. Multi-factor authentication is recommended for Administrator and Owner accounts.</p>
                  <p>3. Enterprise data stored in PostgreSQL is maintained with strict isolation and automatic backup snapshots.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-text-primary">Live Workspace Privacy Policy</p>
                  <p>1. We strictly encrypt all user credentials via 12-round bcrypt hashes and secure sessions using cryptographic JWTs.</p>
                  <p>2. Personal data is never shared with third parties. Telemetry is collected solely for SLA calculation and MTTR analytics.</p>
                  <p>3. All API communications operate under TLS 1.3 encryption with AES-256 data storage.</p>
                </>
              )}
            </div>
            <div className="px-6 py-3 bg-surface-container/40 border-t border-border-subtle flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-semibold text-xs transition-colors cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;

