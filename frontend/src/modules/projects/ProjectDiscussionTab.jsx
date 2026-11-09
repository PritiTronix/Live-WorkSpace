import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import projectsService from '../../services/projectsService';

/**
 * Screen 43: Project Discussion Tab
 * Visual Reference: Stitch Screen 43 (`60fb1d6906c54fa8b96c7748f1c9c577`)
 * Route: `/workspace/projects/:id/discussions`
 */
export const ProjectDiscussionTab = () => {
  const { id } = useParams();
  const context = useOutletContext();
  const project = context?.project;

  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  // New discussion modal state (Rule 2: empty by default)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active reply state
  const [replyTextMap, setReplyTextMap] = useState({});
  const [submittingReply, setSubmittingReply] = useState(false);

  const categories = [
    { key: 'all', label: 'All Discussions', icon: 'chat' },
    { key: 'announcement', label: 'Announcements', icon: 'campaign' },
    { key: 'rfc', label: 'Technical RFCs', icon: 'code_blocks' },
    { key: 'question', label: 'Questions', icon: 'help' },
    { key: 'resolved', label: 'Resolved', icon: 'check_circle' },
  ];

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const data = await projectsService.getDiscussions(id, {
        category: activeCategory !== 'all' ? activeCategory : undefined,
        search: search.trim() || undefined,
      });
      setDiscussions(data);
    } catch (err) {
      console.error('Failed to load discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, [id, activeCategory]);

  const handleCreateDiscussion = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setSubmitting(true);
      const created = await projectsService.createDiscussion(id, {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        is_pinned: isPinned,
      });
      setDiscussions((prev) => [created, ...prev]);
      // Reset form (Rule 2)
      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setIsPinned(false);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create discussion:', err);
      alert('Failed to post discussion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (discussionId) => {
    const text = replyTextMap[discussionId];
    if (!text || !text.trim()) return;

    try {
      setSubmittingReply(true);
      const comment = await projectsService.addDiscussionComment(discussionId, { content: text.trim() });
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === discussionId
            ? { ...d, comments: [...(d.comments || []), comment] }
            : d
        )
      );
      setReplyTextMap((prev) => ({ ...prev, [discussionId]: '' }));
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to post comment');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Category Filter Pills & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-btn-primary text-on-primary shadow-sm font-bold'
                  : 'bg-surface-card hover:bg-canvas-lavender text-text-secondary border border-border-subtle'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search & New Discussion Action */}
        <div className="flex items-center gap-space-sm">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchDiscussions()}
              placeholder="Search discussions..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-card border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-3.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add_comment</span>
            <span>+ New Discussion</span>
          </button>
        </div>
      </div>

      {/* Main Discussions Layout (12 columns: 8 left feed, 4 right sidebar guidelines) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Column: Discussions Thread Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-space-lg">
          {loading ? (
            <div className="flex items-center justify-center p-12 bg-surface-card rounded-xl border border-border-subtle">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 font-body-md text-text-secondary">Loading discussions...</span>
            </div>
          ) : discussions.length === 0 ? (
            <div className="bg-surface-card rounded-xl p-space-2xl text-center border border-border-subtle">
              <span className="material-symbols-outlined text-[48px] text-text-muted mb-2">forum</span>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">No discussions found</h3>
              <p className="font-body-sm text-text-secondary mt-1">Start a conversation or announcement for this project.</p>
            </div>
          ) : (
            discussions.map((d) => {
              const reactionsObj = typeof d.reactions === 'string' ? JSON.parse(d.reactions || '{}') : (d.reactions || {});

              return (
                <article
                  key={d.id}
                  className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/60 flex flex-col gap-space-md"
                >
                  {/* Discussion Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-space-sm">
                      <img
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-border-subtle"
                        src={d.author?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBnY9OXem7tY-WC7GGIxR_JEkjBZZxyuBB-0mDqrUE6lOeiD0P2SWK26K-s-lUh0dGTZQxOlxTGW32Ij8iX-yKRMXgzDt0JPxqs-W4ENCsT_-YF18QAkuRBiF1NWi2xyCndsZyOaB-aGeYQAJAQDzEst5nV9N0oxnz6Rvo0NjCyG9e7INBNDHklHz4AE2P5GSv5kMzjbQLQU9LlePz0mmrDeSZ-Q7RXH6M0-8zNYTNg"}
                        alt={d.author?.full_name || 'Author'}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-headline-sm text-[14px] font-bold text-text-primary">
                            {d.author?.full_name || 'Project Member'}
                          </span>
                          <span className="font-body-sm text-[11px] text-text-muted">
                            {d.author?.title || 'Engineer'}
                          </span>
                        </div>
                        <span className="font-body-sm text-[11px] text-text-muted block">
                          Posted recently • {d.category.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {d.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-[11px] font-bold">
                          <span className="material-symbols-outlined text-[13px]">push_pin</span>
                          PINNED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <div>
                    <h2 className="font-headline-md text-headline-md text-text-primary tracking-tight">
                      {d.title}
                    </h2>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mt-2 whitespace-pre-line">
                      {d.content}
                    </p>
                  </div>

                  {/* Reaction Badges & Counts */}
                  <div className="flex items-center gap-space-sm pt-space-xs border-t border-border-subtle/50">
                    {Object.entries(reactionsObj).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-canvas-main hover:bg-canvas-lavender text-text-primary font-body-sm text-body-sm flex items-center gap-1.5 border border-border-subtle"
                      >
                        <span>{emoji}</span>
                        <span className="font-bold text-[12px]">{count}</span>
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1 text-text-muted font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
                      <span>{d.comments?.length || 0} Replies</span>
                    </div>
                  </div>

                  {/* Thread Replies */}
                  {d.comments && d.comments.length > 0 && (
                    <div className="flex flex-col gap-space-sm pl-space-md border-l-2 border-primary-fixed mt-space-xs">
                      {d.comments.map((c) => (
                        <div key={c.id} className="p-space-sm rounded-lg bg-canvas-main border border-border-subtle/40">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-label-sm text-label-sm font-bold text-text-primary">
                              {c.author?.full_name || 'Member'}
                            </span>
                            <span className="font-body-sm text-[10px] text-text-muted">Reply</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-text-secondary">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Reply Form */}
                  <div className="flex items-center gap-2 pt-space-xs">
                    <input
                      type="text"
                      value={replyTextMap[d.id] || ''}
                      onChange={(e) => setReplyTextMap({ ...replyTextMap, [d.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(d.id)}
                      placeholder="Write a reply..."
                      className="flex-1 h-9 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      disabled={submittingReply || !replyTextMap[d.id]?.trim()}
                      onClick={() => handleAddComment(d.id)}
                      className="h-9 px-3.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-xs transition-all disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Discussion Guidelines & Channel Metas (4 cols) */}
        <aside className="lg:col-span-4 space-y-space-lg">
          <div className="bg-surface-card rounded-xl p-space-lg shadow-sm border border-border-subtle/60 flex flex-col gap-space-md">
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="material-symbols-outlined text-[20px]">info</span>
              <h4 className="font-headline-sm text-headline-sm text-text-primary">Workspace Guidelines</h4>
            </div>
            <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
              Use this discussion feed for architectural proposals (RFCs), sprint milestones, cross-team announcements, and blocker resolutions.
            </p>
            <ul className="font-body-sm text-body-sm text-text-secondary space-y-2 list-disc pl-4">
              <li>Tag code branches and PR numbers directly.</li>
              <li>Mark resolved architectural threads once implemented.</li>
              <li>SLA critical incidents should be filed as Tickets.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* New Discussion Modal (Rule 2: empty by default) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-surface-card rounded-2xl shadow-2xl border border-border-subtle p-space-xl flex flex-col gap-space-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-lg text-headline-lg text-text-primary">New Discussion</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDiscussion} className="flex flex-col gap-space-md">
              <div>
                <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. RFC: Deprecating Legacy Session Cookies"
                  className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-md text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                  Topic Content *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe the context, technical specs, or sprint announcement..."
                  className="w-full p-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md items-center">
                <div>
                  <label className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-canvas-main border border-border-subtle font-body-sm text-body-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="general">General</option>
                    <option value="announcement">Announcement</option>
                    <option value="rfc">Technical RFC</option>
                    <option value="question">Question</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="pin-chk"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="pin-chk" className="font-label-sm text-label-sm text-text-primary cursor-pointer">
                    Pin to Top
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-border-subtle mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-canvas-lavender text-text-secondary font-label-md text-label-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTitle.trim() || !newContent.trim()}
                  className="px-5 py-2 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDiscussionTab;

