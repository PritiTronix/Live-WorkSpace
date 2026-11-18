import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Briefcase,
  Building,
  Camera,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import Avatar from '../../components/common/Avatar';

/**
 * CompleteProfilePage — Stitch Screen ID: `b1b381d1d8cb45e79db3dbffe5e7fadf` (Prompt 10)
 * Allows users upon registration or first invite to complete their profile attributes.
 */
export const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    title: '',
    department: '',
    phone: '',
    avatar_url: '',
    bio: '',
  });

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        setFetching(true);
        const res = await apiClient.get('/users/me');
        if (res.data) {
          setFormData({
            full_name: res.data.full_name || '',
            title: res.data.title || '',
            department: res.data.department || '',
            phone: res.data.phone || '',
            avatar_url: res.data.avatar_url || '',
            bio: res.data.bio || '',
          });
        }
      } catch (err) {
        console.warn('Unable to prefetch user details:', err);
      } finally {
        setFetching(false);
      }
    };
    loadCurrentUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Please provide your full legal or display name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.patch('/users/me', {
        full_name: formData.full_name,
        title: formData.title,
        department: formData.department,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
      });

      if (res.data) {
        localStorage.setItem('user', JSON.stringify(res.data));
      }
      setSuccess(true);
      setTimeout(() => {
        navigate('/workspace/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Failed to complete profile:', err);
      setError(err.response?.data?.detail || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#141529] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#6040F0] animate-spin" />
          <p className="text-sm font-semibold text-[#666687] dark:text-[#a5a5b5]">
            Loading profile information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] dark:bg-[#141529] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-body">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6040F0] to-[#8C70FF] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#141529] dark:text-white">
            Live Workspace
          </span>
        </div>
        <h2 className="text-center text-2xl font-black text-[#141529] dark:text-white">
          Complete Your Enterprise Profile
        </h2>
        <p className="mt-2 text-center text-sm text-[#666687] dark:text-[#a5a5b5]">
          Step 2 of 2: Personalize your presence so your team members can recognize and collaborate with you.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-[#1a1b32] py-8 px-6 shadow-sm border border-[#E5E5EF] dark:border-[#2e2f41] rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-[#EB3D54]/10 border border-[#EB3D54]/20 flex items-start gap-3 text-sm text-[#EB3D54]">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-[#28C078]/10 border border-[#28C078]/20 flex items-center gap-3 text-sm text-[#28C078] font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Profile updated successfully! Redirecting to your workspace...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar
                  src={formData.avatar_url}
                  name={formData.full_name || 'User'}
                  size="xl"
                  ring="ring-4 ring-[#6040F0]/20 border border-[#E5E5EF] dark:border-[#2e2f41]"
                  className="w-20 h-20 text-2xl"
                />
                <label
                  htmlFor="avatar-url-input"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#6040F0] text-white hover:bg-[#5235D6] shadow cursor-pointer transition-colors"
                  title="Change avatar image URL"
                >
                  <Camera className="w-3.5 h-3.5" />
                </label>
              </div>
              <input
                id="avatar-url-input"
                type="text"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleChange}
                placeholder="Paste avatar image URL (optional)"
                className="w-full text-xs text-center border-b border-[#E5E5EF] dark:border-[#2e2f41] bg-transparent text-[#666687] dark:text-[#a5a5b5] focus:outline-none focus:border-[#6040F0] py-1"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#666687] dark:text-[#a5a5b5] mb-1.5">
                Full Legal / Display Name <span className="text-[#EB3D54]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9C9CA9] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Maya Shah"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-sm font-semibold focus:outline-none focus:border-[#6040F0] transition-colors"
                />
              </div>
            </div>

            {/* Job Title & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#666687] dark:text-[#a5a5b5] mb-1.5">
                  Job Role / Title
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-[#9C9CA9] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. SRE Lead"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-sm font-semibold focus:outline-none focus:border-[#6040F0] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#666687] dark:text-[#a5a5b5] mb-1.5">
                  Department / Squad
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-[#9C9CA9] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g. Platform & Reliability"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-sm font-semibold focus:outline-none focus:border-[#6040F0] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Direct Phone Number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#666687] dark:text-[#a5a5b5] mb-1.5">
                Contact Phone / Extension (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#9C9CA9] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5EF] dark:border-[#2e2f41] bg-[#F9F9FB] dark:bg-[#141529] text-[#141529] dark:text-white text-sm font-semibold focus:outline-none focus:border-[#6040F0] transition-colors"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="w-full h-11 rounded-xl bg-[#6040F0] hover:bg-[#5235D6] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile to Neon Database...</span>
                  </>
                ) : (
                  <>
                    <span>Finish Setup & Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
