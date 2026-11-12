import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Save, Plus, Trash2, Clock } from 'lucide-react';
import { slaService } from '../../../services/api';
import { SLA_PRIORITY, SLA_TIER, ESCALATION_TIER } from '../constants/slaConstants';

/**
 * SLARuleEditorDrawer
 * Contextual Right Drawer for SLA Policy & Rule Configuration (Prompt 76/78)
 * Every field starts EMPTY in create mode; populated only in edit mode.
 */
export const SLARuleEditorDrawer = ({
  isOpen = false,
  policy = null, // null = create mode; object = edit mode
  onClose,
  onSaved,
}) => {
  const isEditMode = !!policy;

  // Form states initialize strictly empty for create mode
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState('');
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Default rule configuration rows
  const [rules, setRules] = useState([
    { priority: SLA_PRIORITY.BLOCKER, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_1 },
    { priority: SLA_PRIORITY.CRITICAL, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_1 },
    { priority: SLA_PRIORITY.MAJOR, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_2 },
    { priority: SLA_PRIORITY.MINOR, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_2 },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Populate form only when editing an existing policy
  useEffect(() => {
    if (policy) {
      setName(policy.name || '');
      setDescription(policy.description || '');
      setTier(policy.tier || SLA_TIER.STANDARD);
      setBusinessHoursOnly(!!policy.business_hours_only);
      setIsActive(policy.is_active !== false);

      if (policy.rules && policy.rules.length > 0) {
        setRules(
          policy.rules.map((r) => ({
            id: r.id,
            priority: r.priority || SLA_PRIORITY.MEDIUM,
            response_time_minutes: r.response_time_minutes ?? '',
            resolution_time_minutes: r.resolution_time_minutes ?? '',
            escalation_tier: r.escalation_tier || ESCALATION_TIER.TIER_1,
          }))
        );
      }
    } else {
      // Empty create mode
      setName('');
      setDescription('');
      setTier(SLA_TIER.STANDARD);
      setBusinessHoursOnly(false);
      setIsActive(true);
      setRules([
        { priority: SLA_PRIORITY.BLOCKER, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_1 },
        { priority: SLA_PRIORITY.CRITICAL, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_1 },
        { priority: SLA_PRIORITY.MAJOR, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_2 },
        { priority: SLA_PRIORITY.MINOR, response_time_minutes: '', resolution_time_minutes: '', escalation_tier: ESCALATION_TIER.TIER_2 },
      ]);
    }
    setErrorMessage(null);
  }, [policy, isOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRuleChange = (index, field, value) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Policy Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedRules = rules.map((r) => ({
        priority: r.priority,
        response_time_minutes: parseInt(r.response_time_minutes, 10) || 30,
        resolution_time_minutes: parseInt(r.resolution_time_minutes, 10) || 240,
        escalation_tier: r.escalation_tier,
      }));

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        tier: tier || SLA_TIER.STANDARD,
        business_hours_only: businessHoursOnly,
        is_active: isActive,
        rules: formattedRules,
      };

      let result;
      if (isEditMode) {
        result = await slaService.updatePolicy(policy.id, payload);
      } else {
        result = await slaService.createPolicy(payload);
      }

      if (onSaved) onSaved(result);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save SLA policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#191a2b]/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl bg-surface-card h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-border-subtle"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-text-primary">
                {isEditMode ? 'Edit SLA Policy' : 'Create SLA Policy'}
              </h2>
              <p className="text-xs text-text-secondary">
                Configure response thresholds, target calendar, and escalation paths.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas-lavender"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Policy Name */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Policy Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Critical Production SLA Tier 1"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20 focus:border-btn-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe scope, customer tiers, and operational coverage..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-subtle bg-surface-card text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-btn-primary/20 focus:border-btn-primary resize-none"
            />
          </div>

          {/* Tier and Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Service Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border-subtle bg-surface-card text-text-primary focus:outline-none focus:ring-2 focus:ring-btn-primary/20 focus:border-btn-primary"
              >
                <option value={SLA_TIER.STANDARD}>Standard Tier</option>
                <option value={SLA_TIER.TIER_1}>Tier 1 (Enterprise Mission Critical)</option>
                <option value={SLA_TIER.TIER_2}>Tier 2 (Production Support)</option>
                <option value={SLA_TIER.TIER_3}>Tier 3 (Standard SaaS)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessHoursOnly}
                  onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                  className="rounded border-border-subtle text-btn-primary focus:ring-btn-primary/30 h-4 w-4"
                />
                <span className="text-xs text-text-secondary select-none">Business hours only (9am-6pm)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border-subtle text-btn-primary focus:ring-btn-primary/30 h-4 w-4"
                />
                <span className="text-xs text-text-secondary select-none">Policy is active</span>
              </label>
            </div>
          </div>

          {/* Severity Threshold Rules Table */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-primary">
                Response & Resolution Thresholds
              </label>
              <span className="text-[11px] text-text-muted">Targets in minutes</span>
            </div>

            <div className="border border-border-subtle rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-main text-text-secondary border-b border-border-subtle">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Priority</th>
                    <th className="py-2.5 px-3 font-semibold">First Response</th>
                    <th className="py-2.5 px-3 font-semibold">Resolution</th>
                    <th className="py-2.5 px-3 font-semibold">Escalation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50">
                  {rules.map((rule, idx) => (
                    <tr key={rule.priority} className="hover:bg-canvas-lavender/40">
                      <td className="py-2.5 px-3 font-semibold capitalize text-text-primary">
                        {rule.priority}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="mins"
                          value={rule.response_time_minutes}
                          onChange={(e) => handleRuleChange(idx, 'response_time_minutes', e.target.value)}
                          className="w-20 px-2 py-1 text-xs rounded border border-border-subtle bg-surface-card"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="mins"
                          value={rule.resolution_time_minutes}
                          onChange={(e) => handleRuleChange(idx, 'resolution_time_minutes', e.target.value)}
                          className="w-20 px-2 py-1 text-xs rounded border border-border-subtle bg-surface-card"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={rule.escalation_tier}
                          onChange={(e) => handleRuleChange(idx, 'escalation_tier', e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-border-subtle bg-surface-card"
                        >
                          <option value={ESCALATION_TIER.TIER_1}>Tier 1</option>
                          <option value={ESCALATION_TIER.TIER_2}>Tier 2</option>
                          <option value={ESCALATION_TIER.EXECUTIVE}>Executive</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border-subtle flex items-center justify-end gap-3 bg-canvas-main/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-lg hover:bg-canvas-lavender"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-btn-primary hover:bg-primary-hover active:bg-[#471ac8] text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving Policy...' : isEditMode ? 'Update Policy' : 'Save Policy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SLARuleEditorDrawer;
