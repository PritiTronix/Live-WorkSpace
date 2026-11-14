# Live Workspace — Full-Stack API Integration Plan & Specification

> **Base URL:** `http://localhost:8000/api/v1` (or production hostname)  
> **Documentation:** `/api/v1/docs` (Swagger UI) & `/api/v1/redoc` (ReDoc)  
> **Serialization Engine:** Pydantic V2  
> **Persistence Engine:** SQLAlchemy 2.0 Async Session over Neon PostgreSQL  

---

## 1. Architectural Overview

The backend API follows clean modular layered architecture:
```
Request -> FastAPI Router -> Dependencies (Auth & Tenant Extraction) -> Service Layer -> Repository / SQLAlchemy ORM -> Neon PostgreSQL
```

### 1.1 Universal Request Headers
All protected API endpoints mandate:
```http
Authorization: Bearer <signed_jwt_token>
Content-Type: application/json
```

### 1.2 Multi-Tenant Cryptographic Boundaries
The user's tenant identifier (`organization_id`) is extracted exclusively from verified JWT claims (`current_user.organization_id`). Clients cannot override or supply another tenant's ID in query parameters or request bodies.

---

## 2. API Domain Catalog & Endpoints

### 2.1 Authentication & Profile (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/login` — Authenticates credentials, returns signed bearer JWT and user profile.
- `POST /api/v1/auth/register` — Creates user and workspace organization atomically.
- `POST /api/v1/auth/verify-email` — Confirms email address using cryptographic token.
- `POST /api/v1/auth/forgot-password` — Dispatches password reset token.
- `POST /api/v1/auth/reset-password` — Validates token and applies new hashed password.
- `GET /api/v1/users/me` — Retrieves current authenticated profile, role, and tenant metadata.
- `PATCH /api/v1/users/me` — Updates profile attributes (full name, title, department, avatar, presence).
- `POST /api/v1/users/change-password` — Verifies current password and updates to new password.
- `GET /api/v1/users` — Lists organization team members with search, department filtering, and pagination.
- `POST /api/v1/users/invite` — Sends organization workspace invitation to team email.

### 2.2 Organizations & Workspaces (`/api/v1/organizations`)
- `GET /api/v1/organizations` — Lists organizations user belongs to.
- `POST /api/v1/organizations` — Provisions new tenant workspace.
- `POST /api/v1/organizations/join` — Claims team invitation and joins existing organization.

### 2.3 Projects Module (`/api/v1/projects`)
- `GET /api/v1/projects` — Lists projects with computed progress, task counts, and lead avatars.
- `POST /api/v1/projects` — Creates new project with key, description, lead assignment, and dates.
- `GET /api/v1/projects/{project_id}` — Retrieves project header details, members, and settings.
- `PATCH /api/v1/projects/{project_id}` — Edits project details (status, description, target date).
- `DELETE /api/v1/projects/{project_id}` — Soft-deletes project and archives linked items.
- `GET /api/v1/projects/{project_id}/overview` — Aggregates burn-down, recent activities, open tickets, and tasks.
- `GET /api/v1/projects/{project_id}/members` — Lists project contributors with roles and access scopes.
- `POST /api/v1/projects/{project_id}/members` — Assigns user to project team.
- `DELETE /api/v1/projects/{project_id}/members/{member_id}` — Removes project contributor.
- `POST /api/v1/projects/{project_id}/archive` — Toggles project archive status.

### 2.4 Tasks & Kanban Module (`/api/v1/tasks`)
- `GET /api/v1/tasks` — Lists tasks with filtering by `project_id`, `status` (todo, in_progress, in_review, done), `priority`, and search query.
- `GET /api/v1/tasks/my` — Retrieves tasks assigned to `current_user.id`.
- `POST /api/v1/tasks` — Creates new Kanban task with title, priority, assignee, due date, and story points.
- `GET /api/v1/tasks/{task_id}` — Retrieves detailed task information, comments, and attachments.
- `PATCH /api/v1/tasks/{task_id}` — Updates task fields (title, description, priority, estimated hours).
- `PATCH /api/v1/tasks/{task_id}/status` — Transitions task status across Kanban columns.
- `DELETE /api/v1/tasks/{task_id}` — Deletes task and dependent comments.
- `GET /api/v1/tasks/{task_id}/comments` — Lists threaded comments for task.
- `POST /api/v1/tasks/{task_id}/comments` — Adds markdown comment with user mention support.
- `POST /api/v1/tasks/{task_id}/attachments` — Uploads attachment to Neon S3 storage.

### 2.5 Tickets & Incident Management (`/api/v1/tickets`)
- `GET /api/v1/tickets` — Lists tickets with multi-filter (status, severity, project, assignee).
- `GET /api/v1/tickets/stats` — Computes live aggregate distribution of tickets by severity and status.
- `GET /api/v1/tickets/board` — Groups tickets by status for Kanban view.
- `GET /api/v1/tickets/priority` — Orders tickets by urgency and remaining SLA timer.
- `GET /api/v1/tickets/critical` — Filters P1 (CRITICAL) incidents with breach alerts.
- `POST /api/v1/tickets` — Provisions new ticket with auto-generated key (e.g., `TKT-1041`) and initializes SLA timers.
- `GET /api/v1/tickets/{ticket_id}` — Fetches complete ticket dossier with dual SLA timer states, activities, and attachments.
- `PATCH /api/v1/tickets/{ticket_id}` — Modifies ticket title or description.
- `PATCH /api/v1/tickets/{ticket_id}/status` — Updates status (`open`, `investigating`, `mitigated`, `resolved`, `closed`).
- `PATCH /api/v1/tickets/{ticket_id}/severity` — Escalates or de-escalates severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- `PATCH /api/v1/tickets/{ticket_id}/assignee` — Reassigns ticket ownership to another engineer.
- `PATCH /api/v1/tickets/{ticket_id}/deadline` — Modifies target SLA resolution deadline with justification.
- `POST /api/v1/tickets/{ticket_id}/close` — Closes ticket and stamps final resolution latency.
- `POST /api/v1/tickets/{ticket_id}/reopen` — Reopens ticket with reason log.
- `POST /api/v1/tickets/{ticket_id}/comments` — Posts internal discussion or customer-facing note.
- `POST /api/v1/tickets/{ticket_id}/attachments` — Uploads diagnostic logs or screenshots.

### 2.6 Dual-Timer SLA Engine (`/api/v1/sla`)
- `GET /api/v1/sla/metrics` — Computes tenant-wide SLA compliance percentage, average first response, and resolution times.
- `GET /api/v1/sla/policies` — Fetches active SLA thresholds (P1: 15m/2h, P2: 30m/8h, P3: 2h/24h, P4: 8h/72h).

### 2.7 Root Cause Analysis (RCA) (`/api/v1/rca`)
- `GET /api/v1/rca` — Lists post-incident post-mortems with status (`DRAFT`, `SUBMITTED`, `APPROVED`).
- `POST /api/v1/rca` — Submits new 5-Whys analysis, immediate mitigations, and preventative action items.
- `GET /api/v1/rca/ticket/{ticket_id}` — Fetches RCA document linked to incident ticket.
- `POST /api/v1/rca/{rca_id}/approve` — Signs off RCA report (restricted to SRE Lead, Admin, Owner).

### 2.8 Collaboration & Team Discussions (`/api/v1/discussions`)
- `GET /api/v1/discussions` — Lists discussion threads filtered by project or tag.
- `POST /api/v1/discussions` — Initiates discussion thread with markdown content.
- `GET /api/v1/discussions/{discussion_id}` — Retrieves full thread with comment tree.
- `POST /api/v1/discussions/{discussion_id}/comments` — Adds response to discussion.
- `POST /api/v1/discussions/{discussion_id}/reactions` — Toggles emoji reactions (`thumbs_up`, `heart`, `rocket`).

### 2.9 Central Files & Object Storage (`/api/v1/files`)
- `GET /api/v1/files` — Lists uploaded files across projects with file size, MIME type, and uploader.
- `POST /api/v1/files/upload` — Multipart upload routed directly to Neon S3 storage.
- `GET /api/v1/files/{file_id}/download` — Streams authorized file or returns signed S3 download URL.
- `DELETE /api/v1/files/{file_id}` — Deletes file object from S3 and metadata from PostgreSQL.

### 2.10 Dashboard & Analytics (`/api/v1/dashboard`, `/api/v1/analytics`)
- `GET /api/v1/dashboard/metrics` — Computes active projects, open tickets, completed tasks, and SLA health.
- `GET /api/v1/dashboard/activity-timeline` — Chronological stream of project and ticket events.
- `GET /api/v1/analytics/dashboard` — Aggregated monthly throughput, velocity, and incident burn-down metrics.
- `POST /api/v1/analytics/export` — Generates CSV or PDF export payload.

### 2.11 Audit Logs & Governance (`/api/v1/audit-logs`)
- `GET /api/v1/audit-logs/` — Paginated system security and operational activity log.
- `GET /api/v1/audit-logs/actors` — Distinct user list for audit filtering.
- `POST /api/v1/audit-logs/export` — Exports audit log to compliance archive.

### 2.12 Notifications (`/api/v1/notifications`)
- `GET /api/v1/notifications` — Fetches user's notification feed.
- `GET /api/v1/notifications/unread-count` — Returns integer count for top bar badge.
- `PATCH /api/v1/notifications/{notification_id}/read` — Marks single notification as read.
- `PATCH /api/v1/notifications/read-all` — Marks entire inbox as read.

### 2.13 Workspace Settings & RBAC (`/api/v1/settings`)
- `GET /api/v1/settings/workspace` — Retrieves organization name, domain whitelist, and RBAC matrix.
- `PATCH /api/v1/settings/workspace` — Updates workspace policies.
- `GET /api/v1/settings/sla` — Fetches configurable SLA tier thresholds.
- `PATCH /api/v1/settings/sla` — Modifies SLA response/resolution target minutes.
- `GET /api/v1/settings/notifications` — Fetches email/push notification preferences.
- `PATCH /api/v1/settings/notifications` — Updates notification rules.

---

## 3. Real-Time WebSocket Infrastructure

### 3.1 WebSocket Endpoint
```
ws://localhost:8000/api/v1/ws?token=<bearer_jwt_token>
```
Handshake validates token and registers connection into tenant room (`org_{organization_id}`).

### 3.2 Broadcast Event Types
- `TASK_STATUS_CHANGED`: Card dragged across Kanban board.
- `TICKET_SEVERITY_ESCALATED`: P1 incident flagged.
- `SLA_BREACH_ALERT`: Countdown expired on active ticket.
- `NEW_NOTIFICATION`: Task assignment or comment mention.
- `USER_PRESENCE_UPDATED`: User joined or changed status.
