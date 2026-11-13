import React, { useState, useEffect } from 'react';
import { X, BadgeCheck, Upload, Trash2, Lock, Shield, User, Phone, MessageSquare, Briefcase } from 'lucide-react';
import { settingsService } from '../../../services/settingsService';

export const EditProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    title: '',
    department: 'Infrastructure & Reliability Engineering',
    slack_handle: '',
    phone: '',
    avatar_url: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        full_name: user.full_name || '',
        display_name: user.full_name ? user.full_name.split(' ')[0] : '',
        title: user.title || 'Principal SRE',
        department: user.department || 'Infrastructure & Reliability Engineering',
        slack_handle: user.email ? user.email.split('@')[0] : '',
        phone: '+1 (555) 392-8810',
        avatar_url: user.avatar_url || '',
      });
      setError(null);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Full legal name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = await settingsService.updateProfile({
        full_name: formData.full_name.trim(),
        title: formData.title.trim() || null,
        department: formData.department.trim() || null,
        avatar_url: formData.avatar_url.trim() || null,
      });

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err?.response?.data?.detail || 'Failed to update profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar image must not exceed 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((p) => ({ ...p, avatar_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141529]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#1a1b32] rounded-2xl shadow-2xl border border-[#E5E5EF] dark:border-[#2e2f41] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-white dark:bg-[#1a1b32] flex items-center justify-between border-b border-[#E5E5EF] dark:border-[#2e2f41]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eeecff] dark:bg-[#2e2f41] flex items-center justify-center text-[#6040F0]">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#141529] dark:text-white">
                Edit Personal Profile
              </h3>
              <p className="text-xs text-[#9C9CA9]">
                Update your public identity details and contact preferences
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
          <div className="p-6 overflow-y-auto space-y-6">
            {error && (
              <div className="p-3 bg-[#ffdad6]/50 dark:bg-[#93000a]/20 border border-[#ba1a1a]/30 rounded-lg text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                {error}
              </div>
            )}

            {/* Avatar Management Section */}
            <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-[#1a1b32] border border-[#E5E5EF] dark:border-[#2e2f41] shrink-0">
                  {formData.avatar_url ? (
                    <img
                      src={formData.avatar_url}
                      alt={formData.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg text-[#6040F0] bg-[#eeecff] dark:bg-[#2e2f41]">
                      {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#141529] dark:text-white">Profile Photo</p>
                  <p className="text-xs text-[#9C9CA9]">JPG, PNG or WebP • Max 5MB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="h-9 px-3 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#eeecff] dark:hover:bg-[#2e2f41] text-[#6040F0] text-xs font-bold border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload New Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </label>
                {formData.avatar_url && (
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, avatar_url: '' }))}
                    className="h-9 px-3 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Display Name / Preferred
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                  className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-[#141529] dark:text-white">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-[#141529] dark:text-white">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                  className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                >
                  <option value="Infrastructure & Reliability Engineering">Infrastructure &amp; Reliability Engineering</option>
                  <option value="Platform Architecture">Platform Architecture</option>
                  <option value="SecOps & Incident Governance">SecOps &amp; Incident Governance</option>
                  <option value="Core Cloud Systems">Core Cloud Systems</option>
                  <option value="Engineering">Engineering</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">Slack Handle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#9C9CA9] text-sm">@</span>
                  <input
                    type="text"
                    value={formData.slack_handle}
                    onChange={(e) => setFormData((p) => ({ ...p, slack_handle: e.target.value }))}
                    className="h-10 pl-8 pr-3.5 w-full rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Escalation Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className="h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6040F0]/30 shadow-xs"
                />
              </div>
            </div>

            {/* Read-Only / Admin-Managed Fields */}
            <div className="p-4 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] space-y-3">
              <div className="flex items-center gap-1.5 text-[#9C9CA9] text-xs font-bold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>Managed By Directory &amp; SCIM</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-[#1a1b32] rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[#9C9CA9] text-[11px]">Corporate Email</span>
                    <span className="text-[#5C5C70] dark:text-[#cabeff] font-semibold mt-0.5">
                      {user?.email || 'alex.rivera@tronix365.internal'}
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-[#9C9CA9]" title="Managed by Org Admin" />
                </div>
                <div className="p-3 bg-white dark:bg-[#1a1b32] rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[#9C9CA9] text-[11px]">Account Role</span>
                    <span className="text-[#5C5C70] dark:text-[#cabeff] font-semibold mt-0.5 capitalize">
                      {user?.role || 'admin'}
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-[#9C9CA9]" title="Managed by Okta SCIM" />
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
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-all"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;

