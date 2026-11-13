import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { settingsService } from '../../../services/settingsService';

export const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Validation rules
  const hasMinLength = newPassword.length >= 12;
  const hasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (!hasMinLength || !hasMixedCase || !hasNumber || !hasSpecial) {
      setError('Please satisfy all enterprise security checklist requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await settingsService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        onSuccess('Password credentials updated successfully.');
      }
      onClose();
    } catch (err) {
      console.error('Password change failed:', err);
      setError(err?.response?.data?.detail || 'Current password verification failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141529]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1a1b32] rounded-2xl shadow-2xl border border-[#E5E5EF] dark:border-[#2e2f41] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white dark:bg-[#1a1b32] flex items-center justify-between border-b border-[#E5E5EF] dark:border-[#2e2f41]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#141529] dark:text-white">
                Change Password
              </h3>
              <p className="text-xs text-[#9C9CA9]">
                Update your local fallback authentication key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white hover:bg-[#F5F4FC] dark:hover:bg-[#242542] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-5">
            {error && (
              <div className="p-3 bg-[#ffdad6]/50 dark:bg-[#93000a]/20 border border-[#ba1a1a]/30 rounded-lg text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                {error}
              </div>
            )}

            {/* Current Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#141529] dark:text-white">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-10 px-3.5 pr-10 w-full rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs placeholder:text-[#9C9CA9]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#141529] dark:text-white">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder="Create strong new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 px-3.5 pr-10 w-full rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs placeholder:text-[#9C9CA9]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#141529] dark:text-white">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-10 px-3.5 pr-10 w-full rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs placeholder:text-[#9C9CA9]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-[#9C9CA9] hover:text-[#141529] dark:hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-2.5">
              <span className="text-xs font-bold text-[#5C5C70] dark:text-[#cabeff] uppercase tracking-wider">
                Enterprise Security Requirements
              </span>
              <div className="space-y-1.5 text-xs">
                <div
                  className={`flex items-center gap-2 ${
                    hasMinLength ? 'text-[#28C078]' : 'text-[#9C9CA9]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>At least 12 characters long</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasMixedCase ? 'text-[#28C078]' : 'text-[#9C9CA9]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Includes uppercase and lowercase letters</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasNumber ? 'text-[#28C078]' : 'text-[#9C9CA9]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Includes at least one number</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasSpecial ? 'text-[#28C078]' : 'text-[#9C9CA9]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Includes at least one special symbol (@, #, $, etc.)</span>
                </div>
                <div className="flex items-center gap-2 text-[#28C078]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Does not match your previous 4 passwords</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-[#F5F4FC] dark:bg-[#242542] border-t border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#F9F9FB] text-[#5C5C70] dark:text-[#cabeff] text-sm font-semibold border border-[#E5E5EF] dark:border-[#2e2f41] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !hasMinLength || !hasMixedCase || !hasNumber || !hasSpecial}
              className="h-10 px-5 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{saving ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;

