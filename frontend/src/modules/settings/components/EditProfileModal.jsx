import React, { useState, useEffect } from 'react';
import { X, BadgeCheck, Upload, Trash2, Lock, Shield, User, Phone, MessageSquare, Briefcase, AlertCircle, RefreshCw } from 'lucide-react';
import { settingsService } from '../../../services/settingsService';
import { resolveApiUrl } from '../../../utils/apiUrl';

const STANDARD_DEPARTMENTS = [
  'Engineering',
  'Infrastructure & Reliability Engineering',
  'Platform & Reliability',
  'Platform Architecture',
  'SecOps & Incident Governance',
  'Core Cloud Systems',
  'Product & Design',
  'Quality Assurance',
  'Executive & Architecture',
  'Operations',
  'Security',
];

export const EditProfileModal = ({ isOpen, onClose, user, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    title: '',
    department: '',
    slack_handle: '',
    phone: '',
    avatar_url: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  // Initialize strictly with real saved user values; unset values remain EMPTY
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        full_name: user.full_name || '',
        display_name: user.display_name || '',
        title: user.title || '',
        department: user.department || '',
        slack_handle: user.slack_handle || '',
        phone: user.phone || '',
        avatar_url: user.avatar_url || '',
      });
      setSelectedFile(null);
      setPreviewUrl(user.avatar_url || null);
      setAvatarRemoved(false);
      setFieldErrors({});
      setGeneralError(null);
      setUploadProgress(0);
    }
  }, [user, isOpen]);

  // Clean up any object URL when modal unmounts or closes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const validatePhoneClient = (val) => {
    if (!val || !val.trim()) return null;
    const clean = val.trim();
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(clean)) {
      return 'Phone number must be in E.164 format (e.g. +14155552671)';
    }
    return null;
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file works
    e.target.value = '';

    // Clear previous avatar errors
    setFieldErrors((prev) => {
      const rest = { ...prev };
      delete rest.avatar;
      return rest;
    });

    // Client-side type validation: JPG, PNG, WebP only. Reject SVG.
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const lowerName = file.name.toLowerCase();
    const isSvg = file.type.includes('svg') || lowerName.endsWith('.svg');
    const hasValidExt = validExts.some((ext) => lowerName.endsWith(ext));

    if (isSvg || !validTypes.includes(file.type) || !hasValidExt) {
      setFieldErrors((prev) => ({
        ...prev,
        avatar: 'Invalid file type. Only JPG, PNG, and WebP images are permitted (SVG is not supported).',
      }));
      return;
    }

    // Client-side size validation: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        avatar: 'Image size exceeds the maximum allowed limit of 5MB.',
      }));
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setAvatarRemoved(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRemoveAvatar = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setAvatarRemoved(true);
    setFormData((prev) => ({ ...prev, avatar_url: '' }));
    setFieldErrors((prev) => {
      const rest = { ...prev };
      delete rest.avatar;
      return rest;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setGeneralError(null);
    const errors = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full legal name is required.';
    }

    const phoneErr = validatePhoneClient(formData.phone);
    if (phoneErr) {
      errors.phone = phoneErr;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setFieldErrors({});

      let finalAvatarUrl = formData.avatar_url;

      // 1. Photo upload handling if new file chosen
      if (selectedFile) {
        try {
          const avatarRes = await settingsService.uploadAvatar(selectedFile, (progress) => {
            setUploadProgress(progress);
          });
          if (avatarRes?.avatar_url) {
            finalAvatarUrl = avatarRes.avatar_url;
          }
        } catch (avatarErr) {
          console.error('Avatar upload failed:', avatarErr);
          const detail = avatarErr?.response?.data?.detail;
          const msg = typeof detail === 'string'
            ? detail
            : 'Failed to upload photo. Please ensure it is a valid JPG, PNG, or WebP under 5MB.';
          setFieldErrors((prev) => ({ ...prev, avatar: msg }));
          setSaving(false);
          return;
        }
      } else if (avatarRemoved) {
        try {
          await settingsService.deleteAvatar();
          finalAvatarUrl = null;
        } catch (delErr) {
          console.error('Avatar deletion failed:', delErr);
        }
      }

      // 2. Save profile fields
      const payload = {
        full_name: formData.full_name.trim(),
        display_name: formData.display_name.trim() || null,
        title: formData.title.trim() || null,
        department: formData.department.trim() || null,
        phone: formData.phone.trim() || null,
        slack_handle: formData.slack_handle.trim() || null,
      };

      const updated = await settingsService.updateProfile(payload);

      if (finalAvatarUrl !== undefined) {
        updated.avatar_url = finalAvatarUrl;
      }

      // Sync updated user to localStorage and dispatch event for immediate reactivity
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not cache user to localStorage', e);
      }

      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updated }));

      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      if (err?.response?.status === 422 && Array.isArray(err?.response?.data?.detail)) {
        // Map server validation errors to matching fields
        const mappedErrors = {};
        err.response.data.detail.forEach((issue) => {
          const field = issue.loc && issue.loc.length > 0 ? issue.loc[issue.loc.length - 1] : 'general';
          mappedErrors[field] = issue.msg || 'Invalid field value';
        });
        setFieldErrors(mappedErrors);
      } else {
        const msg = err?.response?.data?.detail;
        setGeneralError(
          typeof msg === 'string'
            ? msg
            : 'An unexpected error occurred while saving profile settings. Please try again.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // Determine avatar initial letter
  const initialLetter = formData.full_name
    ? formData.full_name.trim().charAt(0).toUpperCase()
    : 'U';

  // Build departments list ensuring current department is always included
  const departmentOptions = [...STANDARD_DEPARTMENTS];
  if (formData.department && !departmentOptions.some((d) => d.toLowerCase() === formData.department.toLowerCase())) {
    departmentOptions.push(formData.department);
  }

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
                Update your identity details and contact preferences
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
            {/* Generic unexpected error banner with retry */}
            {generalError && (
              <div className="p-3.5 bg-[#ffdad6]/50 dark:bg-[#93000a]/20 border border-[#ba1a1a]/30 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
                  <span>{generalError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-2.5 py-1 rounded bg-[#ba1a1a] text-white text-xs font-bold hover:bg-[#93000a] flex items-center gap-1 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Avatar Management Section */}
            <div className="p-4 rounded-xl bg-[#F5F4FC] dark:bg-[#242542] border border-[#E5E5EF] dark:border-[#2e2f41] flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-[#1a1b32] border border-[#E5E5EF] dark:border-[#2e2f41] shrink-0">
                    {previewUrl ? (
                      <img
                        src={resolveApiUrl(previewUrl)}
                        alt={formData.full_name || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xl text-[#6040F0] bg-[#eeecff] dark:bg-[#2e2f41]">
                        {initialLetter}
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
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </label>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="h-9 px-3 rounded-lg bg-white dark:bg-[#1a1b32] hover:bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold border border-[#E5E5EF] dark:border-[#2e2f41] shadow-xs transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Progress Bar */}
              {saving && selectedFile && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full mt-2">
                  <div className="flex justify-between text-[11px] text-[#6040F0] font-semibold mb-1">
                    <span>Uploading photo...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#E5E5EF] dark:bg-[#1a1b32] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#6040F0] h-1.5 rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Field specific error for Avatar */}
              {fieldErrors.avatar && (
                <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                  {fieldErrors.avatar}
                </p>
              )}
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Legal Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, full_name: e.target.value }));
                    if (fieldErrors.full_name) {
                      setFieldErrors((prev) => {
                        const r = { ...prev };
                        delete r.full_name;
                        return r;
                      });
                    }
                  }}
                  className={`h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border ${
                    fieldErrors.full_name
                      ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/30'
                      : 'border-[#E5E5EF] dark:border-[#2e2f41] focus:ring-[#6040F0]/30'
                  } text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 shadow-xs`}
                />
                {fieldErrors.full_name && (
                  <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              {/* Display Name / Preferred */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Display Name / Preferred
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, display_name: e.target.value }));
                    if (fieldErrors.display_name) {
                      setFieldErrors((prev) => {
                        const r = { ...prev };
                        delete r.display_name;
                        return r;
                      });
                    }
                  }}
                  placeholder="e.g. Alex"
                  className={`h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border ${
                    fieldErrors.display_name
                      ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/30'
                      : 'border-[#E5E5EF] dark:border-[#2e2f41] focus:ring-[#6040F0]/30'
                  } text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 shadow-xs`}
                />
                {fieldErrors.display_name && (
                  <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                    {fieldErrors.display_name}
                  </p>
                )}
              </div>

              {/* Job Title */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-[#141529] dark:text-white">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  placeholder="e.g. Senior Site Reliability Engineer"
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, title: e.target.value }));
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => {
                        const r = { ...prev };
                        delete r.title;
                        return r;
                      });
                    }
                  }}
                  className={`h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border ${
                    fieldErrors.title
                      ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/30'
                      : 'border-[#E5E5EF] dark:border-[#2e2f41] focus:ring-[#6040F0]/30'
                  } text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 shadow-xs`}
                />
                {fieldErrors.title && (
                  <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Department */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-[#141529] dark:text-white">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, department: e.target.value }));
                    if (fieldErrors.department) {
                      setFieldErrors((prev) => {
                        const r = { ...prev };
                        delete r.department;
                        return r;
                      });
                    }
                  }}
                  className={`h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border ${
                    fieldErrors.department
                      ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/30'
                      : 'border-[#E5E5EF] dark:border-[#2e2f41] focus:ring-[#6040F0]/30'
                  } text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 shadow-xs`}
                >
                  <option value="">Select Department (Optional)</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {fieldErrors.department && (
                  <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                    {fieldErrors.department}
                  </p>
                )}
              </div>

              {/* Slack Handle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">Slack Handle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#9C9CA9] text-sm">@</span>
                  <input
                    type="text"
                    value={formData.slack_handle}
                    placeholder="username"
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, slack_handle: e.target.value }));
                      if (fieldErrors.slack_handle) {
                        setFieldErrors((prev) => {
                          const r = { ...prev };
                          delete r.slack_handle;
                          return r;
                        });
                      }
                    }}
                    className={`h-10 pl-8 pr-3.5 w-full rounded-lg bg-white dark:bg-[#141529] border ${
                      fieldErrors.slack_handle
                        ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/30'
                        : 'border-[#E5E5EF] dark:border-[#2e2f41] focus:ring-[#6040F0]/30'
                    } text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 shadow-xs`}
                  />
                </div>
                {fieldErrors.slack_handle && (
                  <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                    {fieldErrors.slack_handle}
                  </p>
                )}
              </div>

              {/* Escalation Phone (Optional, E.164) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#141529] dark:text-white">
                  Escalation Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+14155552671"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, phone: e.target.value }));
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => {
                        const r = { ...prev };
                        delete r.phone;
                        return r;
                      });
                    }
                  }}
                  className={`h-10 px-3.5 rounded-lg bg-white dark:bg-[#141529] border ${
                    fieldErrors.phone
                      ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/30'
                      : 'border-[#E5E5EF] dark:border-[#2e2f41] focus:ring-[#6040F0]/30'
                  } text-[#141529] dark:text-white text-sm focus:outline-none focus:ring-2 shadow-xs`}
                />
                <span className="text-[11px] text-[#9C9CA9]">
                  E.164 international format (e.g. +14155552671)
                </span>
                {fieldErrors.phone && (
                  <p className="text-xs font-semibold text-[#ba1a1a] dark:text-[#ffb4ab]">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Read-Only / Directory Information */}
            <div className="p-4 rounded-xl bg-[#F9F9FB] dark:bg-[#141529] border border-[#E5E5EF] dark:border-[#2e2f41] space-y-3">
              <div className="flex items-center gap-1.5 text-[#9C9CA9] text-xs font-bold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" />
                <span>Managed By Organization Workspace</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-[#1a1b32] rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[#9C9CA9] text-[11px]">Corporate Email</span>
                    <span className="text-[#5C5C70] dark:text-[#cabeff] font-semibold mt-0.5">
                      {user?.email || '—'}
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-[#9C9CA9]" title="Managed by Org Admin" />
                </div>
                <div className="p-3 bg-white dark:bg-[#1a1b32] rounded-lg border border-[#E5E5EF] dark:border-[#2e2f41] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[#9C9CA9] text-[11px]">Account Role</span>
                    <span className="text-[#5C5C70] dark:text-[#cabeff] font-semibold mt-0.5 capitalize">
                      {user?.role || 'member'}
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-[#9C9CA9]" title="Role managed by Org Admin" />
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
              className="h-10 px-5 rounded-lg bg-[#6040F0] hover:bg-[#5639D8] disabled:opacity-60 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
