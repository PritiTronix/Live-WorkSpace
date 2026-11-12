import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../../../services/api';

/**
 * Screen 4: Live Workspace - Signup (Reference Matched)
 * Stitch ID: 0d32ef82da304cff9f93e59aea083fff
 * Route: /auth/signup
 */
export const SignupPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

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
        department: 'engineering',
      });
      // Redirect to login upon successful registration
      navigate('/auth/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail[0]?.msg || 'Validation error');
      } else {
        setErrorMessage('Failed to create account. Please try again.');
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
          <span className="material-symbols-outlined text-2xl">rocket_launch</span>
        </div>
        <h1 className="font-headline text-headline-lg text-text-primary tracking-tight">
          Get started with Live Workspace
        </h1>
        <p className="font-body text-body-md text-text-secondary mt-1">
          High-performance incident management and SLA operations
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-start gap-3 text-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-body-sm text-body-sm leading-tight">{errorMessage}</span>
        </div>
      )}

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jordan Lee"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Work Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jordan.lee@company.cloud"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block font-label-md text-label-md text-text-primary mb-1">
            Create Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border-subtle bg-white text-text-primary placeholder:text-text-muted font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-btn-primary transition-all"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg bg-btn-primary hover:bg-primary-hover text-white font-label-lg text-label-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 flex items-center justify-center gap-2 mt-4"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Switch to detailed organization registration */}
      <div className="mt-4 p-3 rounded-lg bg-canvas-main border border-border-subtle/80 text-center">
        <span className="font-body-sm text-body-sm text-text-secondary block">
          Need custom organization provisioning?
        </span>
        <Link
          to="/auth/register"
          className="font-label-md text-label-md text-btn-primary hover:text-primary-hover font-semibold inline-block mt-0.5"
        >
          Use Full Organization Registration →
        </Link>
      </div>

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
    </div>
  );
};

export default SignupPage;

