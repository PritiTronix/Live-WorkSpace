import React, { useState } from 'react';
import { discussionsService } from '../../../services/discussionsService';

export const CreateDiscussionModal = ({ isOpen, onClose, onDiscussionCreated }) => {
  const [discussionType, setDiscussionType] = useState('discussion'); // announcement, discussion, question
  const [audienceScope, setAudienceScope] = useState('All Engineering & SRE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = files.map((f) => ({
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        progress: 100,
      }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a discussion title.');
      return;
    }
    if (!content.trim()) {
      setError('Please provide specification or message content.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category: discussionType,
        is_pinned: isPinned,
      };
      const created = await discussionsService.createDiscussion(payload);
      if (onDiscussionCreated) {
        onDiscussionCreated(created);
      }
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create discussion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-surface-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border-subtle overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Accent Banner */}
        <div className="h-1.5 bg-gradient-to-r from-btn-primary via-primary-light to-secondary-container" />

        {/* Header */}
        <div className="p-space-lg flex items-start justify-between pb-space-md border-b border-border-subtle">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">forum</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md text-text-primary">Create Discussion</h2>
                <span className="px-2 py-0.5 rounded-md bg-canvas-lavender text-text-secondary font-label-sm text-label-sm">
                  Prompt 62
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                Broadcast architecture decisions, updates, or query engineers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas-lavender flex items-center justify-center transition-colors"
            title="Close dialog"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mx-space-lg mt-space-md p-3 rounded-lg bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-space-lg space-y-space-md py-space-md">
          {/* Segmented Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Discussion Type
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-canvas-lavender rounded-xl">
              <button
                type="button"
                onClick={() => setDiscussionType('announcement')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-label-md text-label-md transition-all ${
                  discussionType === 'announcement'
                    ? 'bg-surface-card text-btn-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-severity-critical">campaign</span>
                <span className="truncate">Announcement</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscussionType('discussion')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-label-md text-label-md transition-all ${
                  discussionType === 'discussion'
                    ? 'bg-surface-card text-btn-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-primary">forum</span>
                <span className="truncate">Discussion</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscussionType('question')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-label-md text-label-md transition-all ${
                  discussionType === 'question'
                    ? 'bg-surface-card text-btn-primary shadow-sm font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-status-open">help</span>
                <span className="truncate">Question</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-text-muted text-[11px] px-1">
              {discussionType === 'announcement' && '📢 Broadcast high-priority notices and maintenance windows to the team.'}
              {discussionType === 'discussion' && '💬 General ideation, tech design proposals, and asynchronous team feedback.'}
              {discussionType === 'question' && '❓ Pose technical questions and crowdsource solutions from engineers.'}
            </p>
          </div>

          {/* Audience Context Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Target Audience Scope
            </label>
            <div className="relative">
              <select
                value={audienceScope}
                onChange={(e) => setAudienceScope(e.target.value)}
                className="w-full h-10 px-3.5 bg-canvas-main border border-border-subtle rounded-lg text-text-primary font-label-md text-label-md appearance-none focus:outline-none focus:ring-2 focus:ring-btn-primary/20"
              >
                <option value="All Engineering & SRE">All Engineering & SRE (36 members)</option>
                <option value="Entire Workspace">Entire Workspace (48 members)</option>
                <option value="Product & Design">Product & Design (12 members)</option>
                <option value="Infrastructure Core">Infrastructure Core (10 members)</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-muted pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Title Field */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
                Discussion Title <span className="text-severity-blocker">*</span>
              </label>
              <span className="font-body-sm text-body-sm text-text-muted">{title.length} / 120</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RFC: Implementing WebSocket Health Heartbeats in Gateway v4"
              maxLength={120}
              className="w-full h-11 px-3.5 bg-surface-card border border-border-subtle rounded-lg font-label-lg text-label-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-btn-primary/20 placeholder:text-text-muted shadow-sm transition-all"
            />
          </div>

          {/* Rich Text Editor Container */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Specification & Message <span className="text-severity-blocker">*</span>
            </label>
            <div className="rounded-xl overflow-hidden border border-border-subtle bg-surface-card shadow-sm">
              {/* Formatting Toolbar */}
              <div className="flex items-center flex-wrap gap-0.5 p-1.5 bg-canvas-lavender/60 border-b border-border-subtle">
                <button
                  type="button"
                  onClick={() => setContent((prev) => prev + '**bold text**')}
                  className="p-1.5 rounded hover:bg-surface-card text-text-secondary hover:text-text-primary transition-colors"
                  title="Bold"
                >
                  <span className="material-symbols-outlined text-[18px]">format_bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContent((prev) => prev + '*italic text*')}
                  className="p-1.5 rounded hover:bg-surface-card text-text-secondary hover:text-text-primary transition-colors"
                  title="Italic"
                >
                  <span className="material-symbols-outlined text-[18px]">format_italic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContent((prev) => prev + '`inline code`')}
                  className="p-1.5 rounded hover:bg-surface-card text-text-secondary hover:text-text-primary transition-colors"
                  title="Inline Code"
                >
                  <span className="material-symbols-outlined text-[18px]">code</span>
                </button>
                <span className="w-px h-4 bg-border-subtle mx-1" />
                <button
                  type="button"
                  onClick={() => setContent((prev) => prev + '\n- List item')}
                  className="p-1.5 rounded hover:bg-surface-card text-text-secondary hover:text-text-primary transition-colors"
                  title="Bullet List"
                >
                  <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContent((prev) => prev + '\n```\n// code block\n```\n')}
                  className="p-1.5 rounded hover:bg-surface-card text-text-secondary hover:text-text-primary transition-colors"
                  title="Code Block"
                >
                  <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
                </button>
                <div className="ml-auto flex items-center gap-1 text-text-muted text-[11px] pr-1.5">
                  <span className="material-symbols-outlined text-[14px]">markdown</span>
                  <span>Markdown Supported</span>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Detail proposal objectives, risks, benchmark comparisons, and questions for reviewer feedback..."
                className="w-full p-3.5 bg-surface-card font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
                Attached Artifacts
              </span>
              <label className="text-primary hover:text-primary-hover font-label-sm text-label-sm flex items-center gap-1 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Add Attachment</span>
                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="p-3 bg-canvas-lavender/50 rounded-xl flex flex-col gap-2 border border-border-subtle">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                          <span className="material-symbols-outlined text-[18px]">description</span>
                        </div>
                        <div className="truncate">
                          <p className="font-label-md text-label-md text-text-primary truncate">{file.name}</p>
                          <p className="font-body-sm text-body-sm text-text-muted">{file.size} • Uploaded</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-status-resolved/15 text-status-resolved font-label-sm text-label-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          <span>100% Ready</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-1 rounded text-text-muted hover:text-severity-blocker transition-colors"
                          title="Remove attachment"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Flags */}
          <div className="p-3.5 bg-canvas-lavender/40 rounded-xl space-y-2.5 border border-border-subtle">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-btn-primary focus:ring-btn-primary"
              />
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-severity-critical">push_pin</span>
                <span className="font-label-md text-label-md text-text-primary">
                  Pin this discussion to the top of the feed
                </span>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="w-4 h-4 rounded text-btn-primary focus:ring-btn-primary"
              />
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-text-secondary">notifications_active</span>
                <span className="font-label-md text-label-md text-text-primary">
                  Send instant notification to channel members (Slack & Email)
                </span>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-space-sm flex items-center justify-between border-t border-border-subtle">
            <div className="flex items-center gap-2 text-text-muted font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              <span>Draft autosaved</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-label-md text-label-md text-text-secondary hover:text-text-primary hover:bg-canvas-lavender transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>{isSubmitting ? 'Publishing...' : 'Publish Discussion'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDiscussionModal;

