import React, { useEffect, useRef } from 'react';

export const GlobalPlusMenu = ({ isOpen, onClose, onActionSelect }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const triggerBtn = document.getElementById('create-action-btn');
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        (!triggerBtn || !triggerBtn.contains(e.target))
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#141529]/20 backdrop-blur-xs flex items-start justify-end pt-18 pr-12 animate-in fade-in duration-150">
      <div
        ref={menuRef}
        className="w-full max-w-xl bg-surface-card rounded-2xl shadow-2xl overflow-hidden border border-border-subtle z-50"
      >
        {/* Header */}
        <div className="px-space-lg py-space-md bg-canvas-lavender/60 flex items-center justify-between border-b border-border-subtle/40">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-lg bg-btn-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-text-primary leading-tight">Quick Create</h3>
              <p className="font-body-sm text-body-sm text-text-secondary leading-tight">
                Create assets and assign operational tasks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-surface-card px-2 py-1 rounded-md shadow-xs border border-border-subtle">
            <span className="font-label-sm text-label-sm text-text-muted uppercase">Shortcuts</span>
            <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-canvas-main font-mono text-text-primary font-bold">
              C + *
            </kbd>
          </div>
        </div>

        {/* Content Action Groups */}
        <div className="p-space-md flex flex-col gap-space-md max-h-[75vh] overflow-y-auto">
          {/* Group 1: Core Work Items */}
          <div className="flex flex-col gap-1">
            <div className="px-space-sm py-1 flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                Group 1: Core Work Items
              </span>
              <span className="font-label-sm text-label-sm text-primary font-semibold">Direct Flow</span>
            </div>
            <div className="space-y-1">
              {/* Action 1: Create Task */}
              <div
                onClick={() => {
                  onActionSelect?.('CREATE_TASK');
                  onClose();
                }}
                className="group flex items-center justify-between p-space-sm rounded-xl hover:bg-canvas-lavender cursor-pointer transition-all"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center group-hover:bg-btn-primary group-hover:text-on-primary transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-primary group-hover:text-primary transition-colors">
                        Create Task
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-status-wip/10 text-status-wip font-label-sm text-[10px] font-bold">
                        Sprint Active
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      Assign tasks, set due dates & story points
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-2 flex-shrink-0">
                  <span className="font-body-sm text-body-sm text-primary-light opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    Opens Modal
                  </span>
                  <kbd className="px-2 py-1 rounded bg-canvas-main text-text-primary font-mono text-[11px] group-hover:bg-surface-card transition-colors border border-border-subtle">
                    C + T
                  </kbd>
                </div>
              </div>

              {/* Action 2: Create Ticket */}
              <div
                onClick={() => {
                  onActionSelect?.('CREATE_TICKET');
                  onClose();
                }}
                className="group flex items-center justify-between p-space-sm rounded-xl hover:bg-canvas-lavender cursor-pointer transition-all bg-canvas-lavender/40"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-severity-blocker/15 text-severity-blocker flex items-center justify-center group-hover:bg-severity-blocker group-hover:text-on-primary transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">assignment_late</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-primary group-hover:text-primary transition-colors">
                        Create Ticket
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-severity-blocker/10 text-severity-blocker font-label-sm text-[10px] font-bold">
                        Dual SLA
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      Log bugs, incidents & customer escalations with SLA timers
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-2 flex-shrink-0">
                  <span className="font-body-sm text-body-sm text-primary-light opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    Opens Modal
                  </span>
                  <kbd className="px-2 py-1 rounded bg-canvas-main text-text-primary font-mono text-[11px] group-hover:bg-surface-card transition-colors border border-border-subtle">
                    C + I
                  </kbd>
                </div>
              </div>

              {/* Action 3: Create Project */}
              <div
                onClick={() => {
                  onActionSelect?.('CREATE_PROJECT');
                  onClose();
                }}
                className="group flex items-center justify-between p-space-sm rounded-xl hover:bg-canvas-lavender cursor-pointer transition-all"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-status-open/15 text-status-open flex items-center justify-center group-hover:bg-status-open group-hover:text-on-primary transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">folder_open</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-primary group-hover:text-primary transition-colors">
                        Create Project
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      Initiate sprints, milestones & multi-tenant roadmaps
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-2 flex-shrink-0">
                  <span className="font-body-sm text-body-sm text-primary-light opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                    Opens Modal
                  </span>
                  <kbd className="px-2 py-1 rounded bg-canvas-main text-text-primary font-mono text-[11px] group-hover:bg-surface-card transition-colors border border-border-subtle">
                    C + P
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-canvas-lavender"></div>

          {/* Group 2: Team & Comms */}
          <div className="flex flex-col gap-1">
            <div className="px-space-sm py-1 flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                Group 2: Team & Comms
              </span>
              <span className="font-label-sm text-label-sm text-text-muted">Squad Operations</span>
            </div>
            <div className="space-y-1">
              {/* Restricted Action: Create Team / Squad */}
              <div className="relative group/restricted flex items-center justify-between p-space-sm rounded-xl opacity-60 bg-canvas-main/70 cursor-not-allowed">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-canvas-lavender text-text-muted flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">group_add</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-muted">Create Team / Squad</span>
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-error-container text-error font-label-sm text-[10px] font-bold">
                        <span className="material-symbols-outlined text-[11px]">lock</span> Restricted
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-muted truncate">
                      Form cross-functional squads and assign domain ownership
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="material-symbols-outlined text-text-muted text-[18px]">lock</span>
                </div>
                {/* Restricted Tooltip */}
                <div className="absolute -top-9 right-4 hidden group-hover/restricted:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-inverse-surface text-inverse-on-surface shadow-xl z-30 font-body-sm text-body-sm whitespace-nowrap">
                  <span className="material-symbols-outlined text-[14px] text-severity-critical">
                    admin_panel_settings
                  </span>
                  <span>Requires Admin Privileges - Acme Technologies</span>
                </div>
              </div>

              {/* Action 5: Invite Member */}
              <div
                onClick={() => {
                  onActionSelect?.('INVITE_MEMBER');
                  onClose();
                }}
                className="group flex items-center justify-between p-space-sm rounded-xl hover:bg-canvas-lavender cursor-pointer transition-all"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary-fixed/60 text-primary flex items-center justify-center group-hover:bg-btn-primary group-hover:text-on-primary transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-primary group-hover:text-primary transition-colors">
                        Invite Member
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      Send email magic link with role assignment
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-2 flex-shrink-0">
                  <kbd className="px-2 py-1 rounded bg-canvas-main text-text-primary font-mono text-[11px] group-hover:bg-surface-card transition-colors border border-border-subtle">
                    C + M
                  </kbd>
                </div>
              </div>

              {/* Action 6: Post Announcement */}
              <div
                onClick={() => {
                  onActionSelect?.('POST_ANNOUNCEMENT');
                  onClose();
                }}
                className="group flex items-center justify-between p-space-sm rounded-xl hover:bg-canvas-lavender cursor-pointer transition-all"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-status-on-hold/15 text-status-on-hold flex items-center justify-center group-hover:bg-status-on-hold group-hover:text-on-primary transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">campaign</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-primary group-hover:text-primary transition-colors">
                        Post Announcement
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      Broadcast priority updates across workspace
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-2 flex-shrink-0">
                  <kbd className="px-2 py-1 rounded bg-canvas-main text-text-primary font-mono text-[11px] group-hover:bg-surface-card transition-colors border border-border-subtle">
                    C + A
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-canvas-lavender"></div>

          {/* Group 3: Assets & Docs */}
          <div className="flex flex-col gap-1">
            <div className="px-space-sm py-1 flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                Group 3: Assets & Docs
              </span>
              <span className="font-label-sm text-label-sm text-text-muted">Repository</span>
            </div>
            <div className="space-y-1">
              <div
                onClick={() => {
                  onActionSelect?.('UPLOAD_DOC');
                  onClose();
                }}
                className="group flex items-center justify-between p-space-sm rounded-xl hover:bg-canvas-lavender cursor-pointer transition-all"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-secondary-container/70 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-lg text-label-lg text-text-primary group-hover:text-primary transition-colors">
                        Upload Document / RCA
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-status-resolved/15 text-status-resolved font-label-sm text-[10px] font-bold">
                        Auto-Parse
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-text-secondary truncate">
                      Attach runbooks, logs, or post-mortem templates
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm pl-2 flex-shrink-0">
                  <kbd className="px-2 py-1 rounded bg-canvas-main text-text-primary font-mono text-[11px] group-hover:bg-surface-card transition-colors border border-border-subtle">
                    C + U
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-space-lg py-2.5 bg-canvas-main/80 flex items-center justify-between border-t border-border-subtle">
          <span className="font-body-sm text-body-sm text-text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            <span>
              Press <kbd className="px-1 bg-surface-card text-text-primary rounded font-mono border border-border-subtle">Esc</kbd> to dismiss this menu
            </span>
          </span>
          <a href="#shortcuts" className="font-label-sm text-label-sm text-primary hover:underline flex items-center gap-1 font-semibold">
            <span>Customize Shortcuts</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlusMenu;
