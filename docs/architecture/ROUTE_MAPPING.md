# Live Workspace — Complete Route Mapping Matrix

This document maps all application routes across Frontend React pages, Layout structures, and Backend FastAPI REST endpoints.

---

## 1. Public & Authentication Routes

| Frontend Route | Layout | Page Component | Backend Endpoint | HTTP Method | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `MainLayout` | `LandingPage.jsx` | Static / Health Check | `GET` | Public |
| `/auth/login` | `AuthLayout` | `LoginPage.jsx` | `/api/v1/auth/login` | `POST` | Public |
| `/auth/register` | `AuthLayout` | `RegisterPage.jsx` | `/api/v1/auth/register` | `POST` | Public |
| `/auth/verify-email` | `AuthLayout` | `VerifyEmailPage.jsx` | `/api/v1/auth/verify-email` | `POST` | Public |
| `/auth/forgot-password` | `AuthLayout` | `ForgotPasswordPage.jsx` | `/api/v1/auth/forgot-password` | `POST` | Public |
| `/auth/reset-password` | `AuthLayout` | `ResetPasswordPage.jsx` | `/api/v1/auth/reset-password` | `POST` | Public |
| `/onboarding/create-org`| `AuthLayout` | `CreateOrgPage.jsx` | `/api/v1/organizations` | `POST` | Authenticated |
| `/onboarding/join-org` | `AuthLayout` | `JoinOrgPage.jsx` | `/api/v1/organizations/join` | `POST` | Authenticated |
| `/onboarding/profile` | `AuthLayout` | `CompleteProfilePage.jsx` | `/api/v1/users/me` | `PATCH` | Authenticated |

---

## 2. Workspace & Dashboard Routes

| Frontend Route | Layout | Page Component | Backend Endpoint | HTTP Method | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/workspace/dashboard` | `DashboardLayout` | `DashboardOverviewPage.jsx` | `/api/v1/analytics/summary` | `GET` | Member+ |
| `/workspace/notifications` | `DashboardLayout` | `NotificationCenterPage.jsx` | `/api/v1/notifications` | `GET` | Member+ |
| `/workspace/search` | Modal Overlay | `SearchOverlay.jsx` | `/api/v1/search` | `GET` | Member+ |

---

## 3. Projects Module

| Frontend Route | Layout | Page Component | Backend Endpoint | HTTP Method | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/workspace/projects` | `DashboardLayout` | `ProjectsListPage.jsx` | `/api/v1/projects` | `GET` | Member+ |
| `/workspace/projects/new` | Modal | `CreateProjectModal.jsx` | `/api/v1/projects` | `POST` | Manager+ |
| `/workspace/projects/:id` | `DashboardLayout` | `ProjectOverviewTab.jsx` | `/api/v1/projects/:id` | `GET` | Member+ |
| `/workspace/projects/:id/board` | `DashboardLayout` | `ProjectKanbanTab.jsx` | `/api/v1/projects/:id/tasks` | `GET` | Member+ |
| `/workspace/projects/:id/timeline` | `DashboardLayout` | `ProjectTimelineTab.jsx` | `/api/v1/projects/:id/timeline` | `GET` | Member+ |
| `/workspace/projects/:id/discussions` | `DashboardLayout` | `ProjectDiscussionTab.jsx` | `/api/v1/projects/:id/discussions` | `GET` | Member+ |
| `/workspace/projects/:id/files` | `DashboardLayout` | `ProjectFilesTab.jsx` | `/api/v1/projects/:id/files` | `GET` | Member+ |
| `/workspace/projects/:id/activity` | `DashboardLayout` | `ProjectActivityTab.jsx` | `/api/v1/projects/:id/activity` | `GET` | Member+ |

---

## 4. Tasks Module

| Frontend Route | Layout | Page Component | Backend Endpoint | HTTP Method | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/workspace/tasks` | `DashboardLayout` | `AllTasksPage.jsx` | `/api/v1/tasks` | `GET` | Member+ |
| `/workspace/tasks/my-tasks`| `DashboardLayout` | `MyTasksPage.jsx` | `/api/v1/tasks?assigned_to=me` | `GET` | Member+ |
| `/workspace/tasks/:id` | Right Drawer | `TaskDetailDrawer.jsx` | `/api/v1/tasks/:id` | `GET` | Member+ |

---

## 5. Tickets & SLA Module

| Frontend Route | Layout | Page Component | Backend Endpoint | HTTP Method | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/workspace/tickets` | `DashboardLayout` | `TicketDashboardPage.jsx` | `/api/v1/tickets` | `GET` | Member+ |
| `/workspace/tickets/board` | `DashboardLayout` | `TicketBoardPage.jsx` | `/api/v1/tickets?view=board` | `GET` | Member+ |
| `/workspace/tickets/priority` | `DashboardLayout` | `TicketPriorityPage.jsx` | `/api/v1/tickets?view=priority`| `GET` | Member+ |
| `/workspace/tickets/:id` | `DashboardLayout` | `TicketDetailsPage.jsx` | `/api/v1/tickets/:id` | `GET` | Member+ |
| `/workspace/tickets/:id/rca`| `DashboardLayout` | `RcaDetailsPage.jsx` | `/api/v1/rca/ticket/:id` | `GET` | Member+ |
| `/workspace/sla` | `DashboardLayout` | `SlaOverviewPage.jsx` | `/api/v1/sla/metrics` | `GET` | Manager+ |

---

## 6. Collaboration, Team & Settings

| Frontend Route | Layout | Page Component | Backend Endpoint | HTTP Method | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/workspace/discussions` | `DashboardLayout` | `DiscussionsPage.jsx` | `/api/v1/discussions` | `GET` | Member+ |
| `/workspace/files` | `DashboardLayout` | `FilesManagerPage.jsx` | `/api/v1/files` | `GET` | Member+ |
| `/workspace/analytics` | `DashboardLayout` | `AnalyticsDashboardPage.jsx` | `/api/v1/analytics/summary` | `GET` | Manager+ |
| `/workspace/members` | `DashboardLayout` | `TeamMembersPage.jsx` | `/api/v1/users` | `GET` | Member+ |
| `/workspace/audit-logs` | `DashboardLayout` | `SystemActivityLogsPage.jsx`| `/api/v1/audit-logs` | `GET` | Admin+ |
| `/workspace/settings/profile` | `DashboardLayout` | `UserProfilePage.jsx` | `/api/v1/users/me` | `GET/PATCH` | Member+ |
| `/workspace/settings/workspace` | `DashboardLayout` | `WorkspaceSettingsPage.jsx`| `/api/v1/settings/workspace` | `GET/PATCH` | Admin/Owner |
| `/workspace/settings/sla` | `DashboardLayout` | `SlaConfigPage.jsx` | `/api/v1/sla/policies` | `GET/PUT` | Admin/Owner |
