# Live Workspace — Task Execution Workflow

## 1. Overview

Tasks represent discrete engineering actions assigned to individuals or teams with explicit deadlines, priorities, checklist items, and contextual discussion threads.

```mermaid
stateDiagram-v2
    [*] --> Todo: Task Created
    Todo --> InProgress: Assignee Starts Work
    InProgress --> InReview: PR Submitted / Peer Review
    InReview --> InProgress: Changes Requested
    InReview --> Done: Review Approved
    Done --> [*]: Archived in Sprint
```

---

## 2. Interaction Patterns

- **Right Drawer Quick View**: Clicking any task in the task list or Kanban board immediately expands the 560px contextual slide-over drawer without leaving the view.
- **Inline Status Popover**: Clicking the status pill triggers an inline dropdown popover for zero-latency stage transition.
- **Rich Comments & Attachments**: Integrated WYSIWYG comment composer supporting markdown, file attachments, and user `@mentions`.
