import React, { useEffect } from 'react';

/**
 * KeyboardShortcutsModal
 * Interactive cheatsheet of all productivity shortcuts in Live Workspace
 */
export const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Global Navigation & Search',
      items: [
        { keys: ['⌘', 'K'], desc: 'Open Command Palette & Global Search' },
        { keys: ['G', 'D'], desc: 'Go to Workspace Dashboard' },
        { keys: ['G', 'P'], desc: 'Go to Projects Workspace' },
        { keys: ['G', 'T'], desc: 'Go to Tasks Board' },
        { keys: ['G', 'I'], desc: 'Go to Tickets & Incidents' },
        { keys: ['Esc'], desc: 'Dismiss active dialog or overlay' },
      ],
    },
    {
      category: 'Creation & Action Shortcuts',
      items: [
        { keys: ['C', 'T'], desc: 'Quick-create a new Task' },
        { keys: ['C', 'I'], desc: 'Report an Incident / Ticket' },
        { keys: ['C', 'P'], desc: 'Provision a new Project Workspace' },
        { keys: ['C', 'D'], desc: 'Start a Team Discussion Thread' },
        { keys: ['C', 'U'], desc: 'Upload Central Asset or Attachment' },
      ],
    },
    {
      category: 'Data & Workflow Views',
      items: [
        { keys: ['?', ''], desc: 'Show this keyboard shortcuts guide' },
        { keys: ['F'], desc: 'Toggle filters and search focus' },
        { keys: ['R'], desc: 'Refresh live status and SLA countdowns' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-xl bg-surface-card rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-container/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-btn-primary/10 text-btn-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">keyboard</span>
            </div>
            <div>
              <h3 id="shortcuts-title" className="text-base font-bold text-text-primary font-['Plus_Jakarta_Sans']">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-text-secondary">Accelerate your daily engineering and SLA workflow</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-canvas-lavender text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-2.5">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {group.category}
              </h4>
              <div className="bg-canvas-main rounded-xl border border-border-subtle/60 divide-y divide-border-subtle/40">
                {group.items.map((item, idx) => (
                  <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-text-primary font-medium">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.filter(Boolean).map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 min-w-[24px] text-center bg-surface-card rounded font-mono font-bold text-text-primary shadow-xs border border-border-subtle text-[11px]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-surface-container/40 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <span>Tip: Shortcuts are enabled across all workspace modules</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-semibold transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
