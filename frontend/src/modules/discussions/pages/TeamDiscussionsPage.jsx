import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { discussionsService } from '../../../services/discussionsService';
import CreateDiscussionModal from '../components/CreateDiscussionModal';
import { DEFAULT_USER } from '../../../services/api';

export const TeamDiscussionsPage = () => {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTopic, setActiveTopic] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickPostContent, setQuickPostContent] = useState('');
  const [isQuickPosting, setIsQuickPosting] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, [activeCategory, searchQuery]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeCategory !== 'all') {
        params.category = activeCategory;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const data = await discussionsService.listDiscussions(params);
      setDiscussions(data);
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPublish = async () => {
    if (!quickPostContent.trim()) return;
    try {
      setIsQuickPosting(true);
      const newDisc = await discussionsService.createDiscussion({
        title: quickPostContent.slice(0, 60) + (quickPostContent.length > 60 ? '...' : ''),
        content: quickPostContent.trim(),
        category: 'general',
      });
      setDiscussions((prev) => [newDisc, ...prev]);
      setQuickPostContent('');
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to publish post');
    } finally {
      setIsQuickPosting(false);
    }
  };

  const handleDiscussionCreated = (newDisc) => {
    setDiscussions((prev) => [newDisc, ...prev]);
  };

  const handleReaction = async (e, discId, emoji) => {
    e.stopPropagation();
    try {
      const res = await discussionsService.toggleReaction(discId, emoji);
      setDiscussions((prev) =>
        prev.map((d) => {
          if (d.id === discId) {
            return {
              ...d,
              reactions: JSON.stringify(res.reactions),
            };
          }
          return d;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const getReactionsCount = (reactionsStr, emoji) => {
    try {
      const obj = JSON.parse(reactionsStr || '{}');
      return obj[emoji] || 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Header & Context Banner */}
      <div className="mb-space-lg flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-btn-primary bg-surface-container px-2 py-0.5 rounded-full font-semibold">
              Company Wide Feed
            </span>
            <span className="text-text-muted text-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-text-muted">Tronix365 Engineering & Product</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">Team Discussions</h1>
          <p className="font-body-md text-body-md text-text-secondary mt-1 max-w-3xl">
            Company-wide announcements, engineering inquiries, and cross-team collaboration feeds. Discussions are
            preserved separately from incident audit logs and ticket-specific commentary.
          </p>
        </div>

        {/* Right Quick Action */}
        <div className="flex items-center gap-space-sm shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-space-md bg-btn-primary hover:bg-primary-hover text-on-primary rounded-lg font-label-md text-label-md flex items-center gap-space-xs shadow-sm transition-all duration-150 active:scale-[0.98]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>New Discussion</span>
          </button>
        </div>
      </div>

      {/* Search, Feed Nav Tabs & Topic Chips Header Stack */}
      <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle p-space-md mb-space-lg flex flex-col gap-space-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          {/* Search Input Container */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-text-muted">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions, announcements, topics, tags..."
              className="w-full h-10 pl-10 pr-space-md bg-canvas-main rounded-lg font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-card border border-transparent focus:border-border-subtle transition-all"
            />
          </div>

          {/* Feed Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setActiveCategory('all')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-label-md text-label-md shrink-0 transition-colors ${
                activeCategory === 'all'
                  ? 'bg-surface-container text-btn-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-container-low'
              }`}
            >
              <span>All Discussions</span>
              <span className="px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-btn-primary text-on-primary">
                {discussions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('announcement')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-label-md text-label-md shrink-0 transition-colors ${
                activeCategory === 'announcement'
                  ? 'bg-surface-container text-btn-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-container-low'
              }`}
            >
              <span>Announcements</span>
              <span className="px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-severity-critical text-white">
                1 New
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('question')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-label-md text-label-md shrink-0 transition-colors ${
                activeCategory === 'question'
                  ? 'bg-surface-container text-btn-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-container-low'
              }`}
            >
              <span>Questions & Help</span>
              <span className="px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-canvas-lavender text-text-secondary">
                14
              </span>
            </button>
            <button
              onClick={() => setActiveCategory('rfc')}
              type="button"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-label-md text-label-md shrink-0 transition-colors ${
                activeCategory === 'rfc'
                  ? 'bg-surface-container text-btn-primary font-semibold'
                  : 'text-text-secondary hover:bg-surface-container-low'
              }`}
            >
              <span>Architecture RFCs</span>
              <span className="px-1.5 py-0.5 rounded-full text-label-sm font-label-sm bg-canvas-lavender text-text-secondary">
                12
              </span>
            </button>
          </div>
        </div>

        {/* Topic Filter Chips */}
        <div className="flex items-center gap-space-xs flex-wrap pt-2 border-t border-border-subtle">
          <span className="font-label-sm text-label-sm text-text-muted uppercase mr-1">Topics:</span>
          {['all', 'infrastructure', 'releases', 'frontend', 'security', 'general'].map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setActiveTopic(topic)}
              className={`px-3 py-1 rounded-full font-label-sm text-label-sm transition-transform active:scale-95 capitalize ${
                activeTopic === topic
                  ? 'bg-btn-primary text-on-primary font-semibold'
                  : 'bg-canvas-main hover:bg-surface-container text-text-secondary hover:text-text-primary'
              }`}
            >
              {topic === 'all' ? 'All Topics' : `#${topic}`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Feed Grid with Right-hand Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column: Quick Composer & Feed Stream */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Inline Quick Post Composer */}
          <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle p-space-md">
            <div className="flex items-start gap-space-sm">
              <img
                src={DEFAULT_USER.avatar_url}
                alt="Alex Rivera"
                className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
              />
              <div className="flex-1 flex flex-col gap-space-sm">
                <textarea
                  value={quickPostContent}
                  onChange={(e) => setQuickPostContent(e.target.value)}
                  placeholder="Share an update, announcement, or ask a question across the workspace..."
                  rows={2}
                  className="w-full bg-canvas-main rounded-lg p-space-sm font-body-md text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-surface-card resize-none border border-transparent focus:border-border-subtle"
                />
                <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="p-2 text-text-muted hover:text-btn-primary hover:bg-surface-container rounded-lg transition-colors"
                      title="Attach File"
                    >
                      <span className="material-symbols-outlined text-[18px]">attach_file</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPostContent((prev) => prev + '`code`')}
                      className="p-2 text-text-muted hover:text-btn-primary hover:bg-surface-container rounded-lg transition-colors"
                      title="Code Block"
                    >
                      <span className="material-symbols-outlined text-[18px]">code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPostContent((prev) => prev + '**bold**')}
                      className="p-2 text-text-muted hover:text-btn-primary hover:bg-surface-container rounded-lg transition-colors"
                      title="Formatting triggers"
                    >
                      <span className="material-symbols-outlined text-[18px]">format_bold</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPostContent((prev) => prev + ' #topic')}
                      className="p-2 text-text-muted hover:text-btn-primary hover:bg-surface-container rounded-lg transition-colors"
                      title="Add Tag"
                    >
                      <span className="material-symbols-outlined text-[18px]">tag</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-canvas-lavender text-text-secondary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px] text-text-muted">public</span>
                      <span>Visible to: Entire Workspace</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickPublish}
                      disabled={isQuickPosting || !quickPostContent.trim()}
                      className="h-9 px-space-md bg-btn-primary hover:bg-primary-hover text-on-primary rounded-lg font-label-md text-label-md font-semibold transition-all disabled:opacity-50"
                    >
                      {isQuickPosting ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feed Stream */}
          {loading ? (
            <div className="p-8 text-center text-text-muted flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-btn-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading discussions...</span>
            </div>
          ) : discussions.length === 0 ? (
            <div className="p-12 bg-surface-card rounded-xl border border-border-subtle text-center text-text-muted">
              <span className="material-symbols-outlined text-[40px] text-text-muted mb-2 block">forum</span>
              <p className="font-headline-sm text-text-primary">No discussions found</p>
              <p className="font-body-md text-body-md text-text-secondary mt-1">
                Be the first to share an update, RFC, or question with the workspace!
              </p>
            </div>
          ) : (
            discussions.map((disc) => {
              const author = disc.author || {
                full_name: 'Dr. Elena Chen',
                title: 'Lead Architect',
                avatar_url: DEFAULT_USER.avatar_url,
              };
              const commentsCount = (disc.comments || []).length;

              return (
                <article
                  key={disc.id}
                  onClick={() => navigate(`/workspace/discussions/${disc.id}`)}
                  className="bg-surface-card rounded-xl shadow-sm border border-border-subtle p-space-lg flex flex-col gap-space-md hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer group"
                >
                  {/* Pinned top accent strip */}
                  {disc.is_pinned && <div className="absolute top-0 left-0 right-0 h-1 bg-btn-primary" />}

                  <div className="flex items-start justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <img
                        src={author.avatar_url || DEFAULT_USER.avatar_url}
                        alt={author.full_name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span className="font-label-lg text-label-lg text-text-primary font-semibold">
                            {author.full_name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-btn-primary font-label-sm text-label-sm font-medium">
                            {author.title || 'Engineer'}
                          </span>
                          <span className="text-text-muted text-label-sm">•</span>
                          <span className="font-body-sm text-body-sm text-text-muted">
                            {disc.created_at ? new Date(disc.created_at).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-text-muted font-label-sm text-label-sm mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">groups</span>
                          <span>Audience: All Workspace</span>
                        </div>
                      </div>
                    </div>
                    {disc.is_pinned && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low text-status-wip font-label-sm text-label-sm font-semibold shrink-0">
                        <span className="material-symbols-outlined text-[16px]">keep</span>
                        <span>PINNED ANNOUNCEMENT</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight mb-2 group-hover:text-btn-primary transition-colors">
                      {disc.title}
                    </h2>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed line-clamp-3">
                      {disc.content}
                    </p>
                  </div>

                  {/* Attachment Pill */}
                  <div className="flex items-center gap-space-sm">
                    <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-canvas-main hover:bg-canvas-lavender transition-colors max-w-fit border border-border-subtle">
                      <span className="material-symbols-outlined text-severity-blocker text-[24px]">
                        picture_as_pdf
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-text-primary font-semibold">
                          migration-spec.pdf
                        </span>
                        <span className="font-body-sm text-body-sm text-text-muted">2.4 MB • Architecture PDF</span>
                      </div>
                      <span className="material-symbols-outlined text-text-muted ml-2 text-[18px]">download</span>
                    </div>
                  </div>

                  {/* Interaction Bar */}
                  <div className="flex items-center justify-between pt-space-xs mt-1 border-t border-border-subtle">
                    <div className="flex items-center gap-space-sm">
                      {['👍', '🚀', '❤️'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={(e) => handleReaction(e, disc.id, emoji)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-canvas-main hover:bg-surface-container text-text-primary font-label-sm text-label-sm transition-colors"
                        >
                          <span>{emoji}</span>
                          <span className="font-semibold text-text-secondary">
                            {getReactionsCount(disc.reactions, emoji)}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-space-md">
                      <button
                        type="button"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container text-btn-primary hover:bg-surface-container-high font-label-md text-label-md transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">forum</span>
                        <span>{commentsCount} {commentsCount === 1 ? 'Reply' : 'Replies'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right-Hand Context Sidebar Widgets Column */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {/* Widget 1: Pinned Announcements Quick Links */}
          <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle p-space-lg">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-status-wip text-[20px]">push_pin</span>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">Pinned Notices</h3>
              </div>
              <span className="font-label-sm text-label-sm text-text-muted font-semibold">3 Active</span>
            </div>
            <div className="flex flex-col gap-space-sm divide-y divide-border-subtle">
              <div className="pt-2 flex flex-col cursor-pointer hover:text-btn-primary transition-colors">
                <span className="font-label-md text-label-md text-text-primary font-semibold">
                  Aurora v3 Storage Migration Plan
                </span>
                <span className="font-body-sm text-body-sm text-text-muted mt-0.5">Updated 3h ago • Infrastructure</span>
              </div>
              <div className="pt-2 flex flex-col cursor-pointer hover:text-btn-primary transition-colors">
                <span className="font-label-md text-label-md text-text-primary font-semibold">
                  Q3 Engineering All-Hands Recording & Deck
                </span>
                <span className="font-body-sm text-body-sm text-text-muted mt-0.5">Posted 4d ago • Leadership</span>
              </div>
              <div className="pt-2 flex flex-col cursor-pointer hover:text-btn-primary transition-colors">
                <span className="font-label-md text-label-md text-text-primary font-semibold">
                  SOC2 Type II Audit Window Kickoff
                </span>
                <span className="font-body-sm text-body-sm text-text-muted mt-0.5">Posted Sep 12 • Compliance</span>
              </div>
            </div>
          </div>

          {/* Widget 2: Trending Discussion Topics */}
          <div className="bg-surface-card rounded-xl shadow-sm border border-border-subtle p-space-lg">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-btn-primary text-[20px]">trending_up</span>
                <h3 className="font-headline-sm text-headline-sm text-text-primary">Trending Topics</h3>
              </div>
              <span className="font-label-sm text-label-sm text-text-muted font-semibold">Past 7 days</span>
            </div>
            <div className="space-y-space-sm">
              <div className="p-space-sm rounded-lg bg-canvas-main hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between border border-border-subtle">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-text-primary font-semibold">#migration</span>
                  <span className="font-body-sm text-body-sm text-text-muted">42 contributions this week</span>
                </div>
                <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
              </div>
              <div className="p-space-sm rounded-lg bg-canvas-main hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between border border-border-subtle">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-text-primary font-semibold">#design-system</span>
                  <span className="font-body-sm text-body-sm text-text-muted">28 active threads</span>
                </div>
                <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
              </div>
              <div className="p-space-sm rounded-lg bg-canvas-main hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between border border-border-subtle">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-text-primary font-semibold">#incident-1025</span>
                  <span className="font-body-sm text-body-sm text-text-muted">Follow-up post-mortem notes</span>
                </div>
                <span className="material-symbols-outlined text-text-muted text-[18px]">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Discussion Modal */}
      <CreateDiscussionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDiscussionCreated={handleDiscussionCreated}
      />
    </div>
  );
};

export default TeamDiscussionsPage;

