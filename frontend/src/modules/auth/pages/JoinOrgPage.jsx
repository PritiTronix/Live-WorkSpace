import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../services/api';

export const JoinOrgPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/organizations/join', {
        token,
        password,
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept invitation. The invitation token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-surface-card rounded-2xl shadow-xl p-space-xl border border-border-subtle animate-in fade-in duration-200">
      <div className="text-center mb-space-lg">
        <div className="w-12 h-12 rounded-xl bg-primary-fixed/60 text-primary flex items-center justify-center mx-auto mb-space-sm">
          <span className="material-symbols-outlined text-[24px]">group_add</span>
        </div>
        <h2 className="font-headline-lg text-headline-lg text-text-primary">Join Live Workspace</h2>
        <p className="font-body-sm text-body-sm text-text-secondary mt-1">
          Complete your profile setup to accept your organization invitation
        </p>
      </div>

      {success ? (
        <div className="p-space-md rounded-xl bg-status-resolved/10 border border-status-resolved/20 text-center">
          <span className="material-symbols-outlined text-status-resolved text-[32px] mb-1">
            check_circle
          </span>
          <p className="font-headline-sm text-headline-sm text-text-primary">Invitation Accepted!</p>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Redirecting to sign-in portal...
          </p>
        </div>
      ) : (
        <form onSubmit={handleJoin} className="flex flex-col gap-space-md">
          {error && (
            <div className="p-3 rounded-lg bg-severity-blocker/10 border border-severity-blocker/20 text-severity-blocker font-body-sm text-body-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="font-label-md text-label-md text-text-primary font-medium">
              Invitation Token
            </label>
            <input
              type="text"
              value={token}
              disabled
              className="w-full h-10 px-3 rounded-lg bg-canvas-main/60 border border-border-subtle text-text-muted font-mono text-[12px]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-label-md text-text-primary font-medium">
              Create Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-label-md text-text-primary font-medium">
              Confirm Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle text-text-primary font-body-sm text-body-sm focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 rounded-xl bg-btn-primary text-on-primary font-label-md text-label-md font-semibold hover:opacity-95 disabled:opacity-50 transition-opacity mt-2"
          >
            {loading ? 'Joining Organization...' : 'Accept Invitation & Join'}
          </button>

          <div className="text-center pt-space-xs">
            <Link to="/auth/login" className="font-label-sm text-label-sm text-primary hover:underline">
              Already have an active account? Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default JoinOrgPage;
