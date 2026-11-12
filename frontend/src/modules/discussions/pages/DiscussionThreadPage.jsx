import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { discussionsService } from '../../../services/discussionsService';
import { DEFAULT_USER } from '../../../services/api';

export const DiscussionThreadPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [reactions, setReactions] = useState({});

  useEffect(() => {
    loadThread();
  }, [id]);

  const loadThread = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await discussionsService.getDiscussion(id);
      setDiscussion(data);
      try {
        setReactions(JSON.parse(data.reactions || '{}'));
      } catch {
        setReactions({});
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load discussion thread');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReaction = async (emoji) => {
    try {
      const res = await discussionsService.toggleReaction(id, emoji);
      if (res?.reactions) {
        setReactions(res.reactions);
      } else {
        setReactions((prev) => ({
          ...prev,
          [emoji]: (prev[emoji] || 0) + 1,
        }));
      }
    } catch {
      // optimistic update
      setReactions((prev) => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + 1,
      }));
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setIsPostingReply(true);
      const newComment = await discussionsService.addComment(id, { content: replyText.trim() });
      setDiscussion((prev) => ({
        ...prev,
        comments: [...(prev.comments || []), newComment],
      }));
      setReplyText('');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to post reply');
    } finally {
      setIsPostingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-text-secondary font-label-md">
          <span className="w-5 h-5 border-2 border-btn-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading discussion thread...</span>
        </div>
      </div>
    );
  }

  if (error || !discussion) {
    return (
      <div className="p-8 bg-surface-card rounded-2xl shadow-sm border border-border-subtle text-center">
        <span className="material-symbols-outlined text-[48px] text-severity-blocker">error</span>
        <h2 className="font-headline-md text-headline-md text-text-primary mt-2">Thread Not Found</h2>
        <p className="font-body-md text-body-md text-text-secondary mt-1">{error || 'Unable to retrieve this discussion'}</p>
        <button
          onClick={() => navigate('/workspace/discussions')}
          className="mt-4 px-4 py-2 bg-btn-primary text-on-primary rounded-lg font-label-md"
        >
          Return to Discussions
        </button>
      </div>
    );
  }

  const author = discussion.author || {
    full_name: 'Dr. Elena Chen',
    title: 'Lead Architect',
    avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCKZkjlUzdakR8zSJONe4nd58FOjcocnDo5hJSj61HfQ4u9ilprlBAmLMMSZgqOSRJFgkdNLSVBbxtB1GreNe3GrNenlEawfsAK31jG5j58m4tXDUX5ZXQaARFgeQ98V2xVjVYwaa3FASqyLnVnjlDbhMDAI7PkuvNf8AhBfkeNXQqHUtF3FCg_8HnFmVtbh5gcWB2kjkzLHzxQ0hnu_J2zA86K0uKdtOnCcnO-m88',
  };

  const comments = discussion.comments || [];

  return (
    <div className="w-full flex flex-col gap-space-lg">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm tracking-wide uppercase">
              Ops Hub Communication
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
            <span className="font-label-sm text-label-sm text-text-secondary">Sync Engine v4.8</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
            Team Comms & Incident Threads
          </h1>
          <p className="font-body-md text-body-md text-text-secondary mt-1">
            Real-time multi-team engineering threads, architectural RFCs, and decision records.
          </p>
        </div>
        <Link
          to="/workspace/discussions"
          className="px-4 py-2 bg-surface-card hover:bg-canvas-lavender text-text-primary border border-border-subtle rounded-lg font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Feed</span>
        </Link>
      </div>

      {/* Main Discussion Thread Container */}
      <article className="bg-surface-card rounded-2xl shadow-sm border border-border-subtle p-space-lg flex flex-col gap-space-md">
        {/* Breadcrumbs & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-border-subtle pb-space-sm">
          <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-text-muted">
            <Link to="/workspace/discussions" className="hover:text-primary transition-colors">
              Discussions
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="capitalize">{discussion.category || 'General'}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-text-secondary truncate max-w-[200px]">{discussion.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {discussion.is_pinned && (
              <span className="px-2.5 py-1 rounded-full bg-severity-critical/15 text-severity-critical font-label-sm text-label-sm flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[14px]">push_pin</span>
                <span>Pinned Announcement</span>
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-status-wip/15 text-status-wip font-label-sm text-label-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-wip" />
              <span>In Flight Ops</span>
            </span>
          </div>
        </div>

        {/* Original Post Hero Section */}
        <div className="flex flex-col gap-space-md">
          {/* Post Author Header */}
          <div className="flex items-start justify-between gap-space-md">
            <div className="flex items-center gap-3">
              <img
                src={author.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCKZkjlUzdakR8zSJONe4nd58FOjcocnDo5hJSj61HfQ4u9ilprlBAmLMMSZgqOSRJFgkdNLSVBbxtB1GreNe3GrNenlEawfsAK31jG5j58m4tXDUX5ZXQaARFgeQ98V2xVjVYwaa3FASqyLnVnjlDbhMDAI7PkuvNf8AhBfkeNXQqHUtF3FCg_8HnFmVtbh5gcWB2kjkzLHzxQ0hnu_J2zA86K0uKdtOnCcnO-m88'}
                alt={author.full_name}
                className="w-12 h-12 rounded-xl object-cover shadow-sm ring-2 ring-primary-fixed"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-text-primary">{author.full_name}</span>
                  <span className="material-symbols-outlined text-[16px] text-status-open" title="Verified Staff">
                    verified
                  </span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-medium">
                    {author.title || 'Architect'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-text-muted font-body-sm text-body-sm">
                  <span>
                    Posted {discussion.created_at ? new Date(discussion.created_at).toLocaleDateString() : 'Recently'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Maintenance Window: 120 mins</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-canvas-lavender text-text-secondary font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[16px] text-primary">public</span>
              <span>All Engineering & SRE</span>
            </div>
          </div>

          {/* Thread Title */}
          <h1 className="font-headline-lg text-headline-lg text-text-primary leading-tight">
            {discussion.title}
          </h1>

          {/* Thread Body Text */}
          <div className="text-text-secondary font-body-md text-body-md space-y-3 leading-relaxed whitespace-pre-wrap">
            {discussion.content}
          </div>

          {/* Quick Highlight Card / Safeguards */}
          <div className="p-4 bg-canvas-lavender rounded-xl flex flex-col md:flex-row gap-4 my-2 border border-border-subtle">
            <div className="flex items-start gap-3 flex-1">
              <span className="material-symbols-outlined text-[20px] text-status-resolved mt-0.5">verified_user</span>
              <div>
                <h4 className="font-label-lg text-label-lg text-text-primary font-semibold">Safety Mitigation</h4>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  Automated snapshot capture with active standby replica synched for safe fallback.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 flex-1">
              <span className="material-symbols-outlined text-[20px] text-status-open mt-0.5">ring_volume</span>
              <div>
                <h4 className="font-label-lg text-label-lg text-text-primary font-semibold">Incident Bridge</h4>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  War room bridge active in Discord voice #eng-war-room with live telemetry monitoring.
                </p>
              </div>
            </div>
          </div>

          {/* Downloadable Attachment Card */}
          <div className="p-3.5 bg-canvas-main rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm border border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-severity-blocker/10 text-severity-blocker flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
              </div>
              <div>
                <p className="font-label-lg text-label-lg text-text-primary font-semibold">aurora-v3-migration-plan.pdf</p>
                <div className="flex items-center gap-2 font-body-sm text-body-sm text-text-muted mt-0.5">
                  <span>2.4 MB</span>
                  <span>•</span>
                  <span>Architectural Specification</span>
                  <span>•</span>
                  <span className="text-status-resolved flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">security</span> Verified Clean
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-btn-primary font-label-md text-label-md flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Reactions Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['🚀', '👀', '👍', '❤️', '🙌'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAddReaction(emoji)}
                  className="px-2.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm flex items-center gap-1 hover:bg-surface-container-high transition-colors"
                >
                  <span>{emoji}</span>
                  <span className="font-semibold text-text-secondary">{reactions[emoji] || 0}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-text-muted font-body-sm text-body-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>142 views</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-primary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px]">bookmark_border</span>
                <span>Saved</span>
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border-subtle my-2" />

        {/* Replies Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-headline-sm text-headline-sm text-text-primary">Discussion Replies</h3>
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-semibold">
              {comments.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-body-sm text-body-sm text-text-muted hidden sm:inline">Sort:</span>
            <span className="px-3 py-1.5 bg-canvas-lavender rounded-lg font-label-md text-label-md text-text-primary">
              Chronological • Oldest First
            </span>
          </div>
        </div>

        {/* Replies List */}
        <div className="space-y-space-md">
          {comments.map((comment) => {
            const commentAuthor = comment.author || {
              full_name: 'Engineering Contributor',
              title: 'Member',
              avatar_url: DEFAULT_USER.avatar_url,
            };
            return (
              <div
                key={comment.id}
                className="p-4 rounded-xl bg-canvas-main hover:bg-canvas-lavender/40 border border-border-subtle transition-colors flex gap-3.5"
              >
                <img
                  src={commentAuthor.avatar_url || DEFAULT_USER.avatar_url}
                  alt={commentAuthor.full_name}
                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                />
                <div className="flex flex-col flex-1">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-label-md text-label-md text-text-primary font-bold">
                        {commentAuthor.full_name}
                      </span>
                      <span className="px-2 py-0.2 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                        {commentAuthor.title || 'Engineer'}
                      </span>
                      <span className="text-text-muted text-label-sm">•</span>
                      <span className="font-body-sm text-body-sm text-text-muted">
                        {comment.created_at ? new Date(comment.created_at).toLocaleTimeString() : 'Recently'}
                      </span>
                    </div>
                  </div>
                  <p className="font-body-md text-body-md text-text-secondary mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })}

          {comments.length === 0 && (
            <div className="py-8 text-center text-text-muted font-body-md">
              <span className="material-symbols-outlined text-[32px] text-text-muted mb-1 block">forum</span>
              No replies yet. Start the conversation below!
            </div>
          )}
        </div>

        {/* Reply Composer */}
        <form onSubmit={handlePostReply} className="mt-4 pt-4 border-t border-border-subtle flex flex-col gap-2">
          <label className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
            Add Your Reply
          </label>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder="Share insights, propose mitigations, or drop questions..."
            className="w-full p-3.5 bg-canvas-main border border-border-subtle rounded-xl font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-card resize-none"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="font-body-sm text-body-sm text-text-muted">
              Press Enter or click Post to send to thread
            </span>
            <button
              type="submit"
              disabled={isPostingReply || !replyText.trim()}
              className="px-5 py-2 bg-btn-primary hover:bg-primary-hover text-on-primary rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{isPostingReply ? 'Posting...' : 'Post Reply'}</span>
            </button>
          </div>
        </form>
      </article>
    </div>
  );
};

export default DiscussionThreadPage;

