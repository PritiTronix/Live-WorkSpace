# Live Workspace — Enterprise SaaS Engineering Operations Platform

An enterprise-grade SaaS engineering operations and incident management platform designed to unify project tracking, task execution, and operational ticketing with dual-timer Service Level Agreement (SLA) guarantees, root cause analysis (RCA), and organization-level workspace isolation.

Engineered using modern clean architecture, strict client-server decoupling, and visual specifications directly extracted from the **Google Stitch Design System** (72 production screens audited in `STITCH_SCREEN_INVENTORY.md`).

---

## Table of Contents
1. [Project Overview & Key Features](#features)
2. [Tech Stack](#tech-stack)
3. [Folder Structure & Architecture Explanation](#folder-structure)
4. [Installed Libraries & Usage Justification](#installed-libraries)
5. [Setup Instructions (Virtual Environment & Client)](#setup-instructions)
6. [Run & Development Commands](#run-commands)
7. [Testing Strategy](#testing-strategy)
8. [Environment Variables & Secrets Management](#environment-variables)
9. [Security Best Practices & Critical Warnings](#security-best-practices--warnings)
10. [RESTful API Details & Endpoints](#api-details)
11. [Future Scope & Suggested Architectural Improvements](#future-scope--architectural-improvements)

---

## Features

### 1. Multi-View Project Workspaces
- Project workspace shell with contextual breadcrumbs, team member avatars, and tab switching.
- **Overview Tab**: High-level milestone health, active blocker counters, and progress indicators.
- **Kanban Board Tab**: Drag-and-drop task workflow boards grouped by state.
- **Timeline / Gantt Tab**: Schedule estimation, deadlines, and milestone dependencies.
- **Discussions Tab**: Contextual thread-based engineering discussions.
- **Files & Specs Tab**: Centralized project assets, attachments, and design links.
- **Activity Stream Tab**: Immutable timeline of commits, status updates, and milestone events.

### 2. Dual-Timer SLA Management Engine
- **First-Response Timer**: Tracks latency between ticket ingestion and first human triage note.
- **Resolution Timer**: Tracks duration from ingestion until final deployment/verification.
- **Dynamic Visual States**: Normal (Neutral Charcoal), Warning (Amber Alert at <25% remaining), Breached (Blocker Red at 0%).
- Automated manager notification and Slack/webhook dispatch upon SLA breach.

### 3. Strict Severity vs Status Separation
- **Severity (Impact)**: Blocker (`#F55354`), Critical (`#F8A040`), Major (`#F8C048`).
- **Status (Workflow Stage)**: Open (`#3888F8`), WIP (`#6848E8`), On Hold (`#F8A040`), Resolved (`#28C078`), Closed (`#9C9CA9`).
- Status and severity operate on independent state machines, preventing priority dilution.

### 4. Contextual Right Drawers & Centered Modals
- 560px contextual slide-over drawers for tasks, tickets, and member details, maintaining view context on list and board views.
- Centered backdrop dialogs for fast entity creation (`Create Task`, `Create Ticket`, `Create Project`, `Invite Member`).
- Global Top Bar Quick-Action (+) button for instant creation from any workspace view.

### 5. Root Cause Analysis (RCA) Incident Framework
- Structured post-incident workflow triggered on Blocker/Critical tickets.
- 5-Whys root cause investigation form, contributing factors, remediation checklists, and versioned sign-off approvals.

### 6. Role-Based Access Control (RBAC) & Multi-Tenancy
- Strict organization-level data segregation (multi-tenant tenant isolation).
- Tiered privilege roles: `Owner`, `Admin`, `Manager`, `Member`, and `Viewer`.

### 7. Centralized Audit & Activity Logs
- System activity audit log capturing user identity, IP address, timestamp, affected entity UUID, action type, and before/after mutation diffs.

### 8. Enterprise Tasks Management (Batch 3)
- Dedicated All Tasks (`/workspace/tasks/all`) and My Tasks (`/workspace/tasks/my-tasks`) views with lowercase enum standardization.
- Contextual Task Details slide-over drawer, creation modal, and status/priority popovers.
- Task comment composer and object storage attachment picker.
- Real-time WebSocket event stream (`/api/v1/tasks/ws`) broadcasting create, update, status change, and comment events.

### 9. Real-Time Notification Center & Responsive Shell (Batch 2)
- Notification Center page (`/workspace/notifications`) and Global Top Bar notification popover with live unread counter.
- Responsive mobile layout shell featuring a slide-in drawer sidebar, mobile top bar, and bottom navigation bar.
- WebSocket notification stream (`/api/v1/notifications/ws`) for instant alerts.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | Declarative component UI rendering |
| **Frontend Tooling** | Vite | `^5.2.13` | Fast ESM build tooling & Hot Module Replacement |
| **Client Routing** | React Router DOM | `^6.23.1` | Client-side routing, protected auth routes & layouts |
| **State & Cache** | TanStack React Query | `^5.45.0` | Asynchronous data fetching, optimistic caching & refetching |
| **Styling** | Tailwind CSS | `^3.4.4` | Utility styling mapped to official Stitch design tokens |
| **Icons** | Lucide React | `^0.395.0` | Lightweight SVG icons aligned with Stitch UI |
| **Backend Framework** | FastAPI | `>=0.111.0` | High-performance Python async web framework |
| **ASGI Server** | Uvicorn | `>=0.30.0` | Production ASGI web server with reload capabilities |
| **Database Engine** | PostgreSQL | `15+ / 16+` | Enterprise ACID relational storage |
| **Async DB Driver** | asyncpg | `>=0.29.0` | High-throughput asynchronous PostgreSQL connector |
| **ORM** | SQLAlchemy 2.0 | `>=2.0.30` | Declarative asynchronous mapping & typed queries |
| **Migrations** | Alembic | `>=1.13.1` | Database schema version control & migration scripts |
| **Validation** | Pydantic v2 | `>=2.7.0` | Fast data validation (`from_attributes = True`) |
| **Configuration** | Pydantic-Settings | `>=2.3.0` | Type-safe environment variable parsing |
| **Security & JWT** | python-jose & passlib | `>=3.3.0` | JWT bearer token creation, validation & bcrypt hashing |
| **Testing** | Pytest & HTTPX | `>=8.2.0` | Backend unit, integration, and async client testing |

---

## Folder Structure

```text
Live-Workspace/
│
├── STITCH_SCREEN_INVENTORY.md      # Complete audit of 72 Stitch screens & routes
├── IMPLEMENTATION_TRACKER.md       # Screen-by-screen implementation tracking checklist
├── DESIGN_SYSTEM.md                # Official Stitch UI design tokens & typography specs
├── README.md                       # Master documentation & developer guidelines
├── requirements.txt                # Pinned backend dependencies list
├── .env.example                    # Master environment variables template
├── .gitignore                      # Git exclusion rules (myenv, node_modules, .env, dist)
├── myenv/                          # Python virtual environment (Rule 2 Mandatory)
│
├── docs/                           # Architecture, workflows & API documentation
│   ├── architecture/
│   │   ├── APPLICATION_ARCHITECTURE.md  # High-level architecture, module boundaries & data flow
│   │   ├── DATABASE_ARCHITECTURE.md     # PostgreSQL schemas, ER diagram, keys & indexes
│   │   └── ROUTE_MAPPING.md             # Complete frontend-to-backend route matrix
│   │
│   ├── workflows/
│   │   ├── AUTHENTICATION_WORKFLOW.md   # JWT lifecycle, onboarding, password recovery
│   │   ├── PROJECT_WORKFLOW.md          # Multi-tab project workspace lifecycle
│   │   ├── TASK_WORKFLOW.md             # Task board execution, drawers, status popovers
│   │   ├── TICKET_WORKFLOW.md           # Defect triage, severity matrix & closing rules
│   │   └── SLA_WORKFLOW.md              # Dual-timer SLA rules, warning thresholds & breaches
│   │
│   └── development/
│       ├── DEVELOPMENT_GUIDELINES.md    # PEP8, DRY, ESLint, Git commit standards
│       └── API_DOCUMENTATION.md         # REST API conventions & payload contracts
│
├── frontend/                       # Frontend React Client
│   ├── public/
│   │   ├── icons/                  # Static vector icons
│   │   ├── images/                 # Public media assets
│   │   └── logos/                  # Brand SVG logos
│   │
│   ├── src/
│   │   ├── assets/                 # Embedded fonts, icons, illustrations, images
│   │   ├── components/             # Reusable UI library (buttons, tables, cards, modals, drawers)
│   │   │   ├── buttons/            # Primary, Secondary, Outline, Danger buttons
│   │   │   ├── cards/              # MetricCards, StatusCards, TicketTiles
│   │   │   ├── common/             # Badges, Tooltips, Avatars, Dividers
│   │   │   ├── drawers/            # Slide-over drawers (Right contextual panel)
│   │   │   ├── feedback/           # Alerts, Empty states, Skeleton loaders
│   │   │   ├── forms/              # Input fields, Selectors, Checkboxes, Datepickers
│   │   │   ├── modals/             # Centered backdrop creation dialogs
│   │   │   ├── navigation/         # Tabs, Breadcrumbs, Pagination
│   │   │   ├── notifications/      # Toast notifications, In-app notification cards
│   │   │   └── tables/             # Data tables with sorting, filtering & selection
│   │   │
│   │   ├── layouts/                # Base layout templates
│   │   │   ├── MainLayout.jsx      # Public landing & documentation layout
│   │   │   ├── AuthLayout.jsx      # Authentication & onboarding centered card layout
│   │   │   ├── DashboardLayout.jsx # Collapsible sidebar, sticky TopBar & main canvas
│   │   │   └── components/         # Sidebar, TopBar, QuickCreateMenu, SearchOverlay
│   │   │
│   │   ├── modules/                # 16 Encapsulated Feature Modules
│   │   │   ├── analytics/          # Dashboards, SLA performance charts, export dialogs
│   │   │   ├── announcements/      # Organization-wide banners & notices
│   │   │   ├── audit-logs/         # System activity logs, log detail drawers
│   │   │   ├── authentication/     # Login, Signup, Verify Email, Forgot/Reset Password
│   │   │   ├── collaboration/      # Team discussions, thread details, reply composer
│   │   │   ├── dashboard/          # Home dashboard, quick metrics, widget grid
│   │   │   ├── files/              # Central file browser, upload modal, preview drawer
│   │   │   ├── notifications/      # Notification center page, dropdown menu
│   │   │   ├── organization/       # Organization provisioning, onboarding wizard
│   │   │   ├── projects/           # Projects list, Kanban, Timeline, Files, Activity
│   │   │   ├── rca/                # 5-Whys RCA form, version history, sign-offs
│   │   │   ├── roles-permissions/  # RBAC permission matrix, role management
│   │   │   ├── settings/           # Workspace settings, appearance, SLA configs
│   │   │   ├── sla/                # Dual-timer components, warning matrix, breach alerts
│   │   │   ├── tasks/              # All tasks, My tasks, create modal, task drawer
│   │   │   └── users/              # Team member directory, user profile, password change
│   │   │
│   │   ├── pages/                  # Central page route re-exports
│   │   ├── routes/                 # Central route orchestrator (`index.jsx`)
│   │   ├── services/               # Axios API client, interceptors & auth helpers
│   │   ├── hooks/                  # Custom React hooks (`useAuth`, `useTheme`, etc.)
│   │   ├── context/                # Context providers (`AuthContext`, `ThemeContext`)
│   │   ├── store/                  # Client-side store slices
│   │   ├── styles/                 # Tailwind base directives & `globals.css`
│   │   ├── constants/              # Route constants, design tokens, status enums
│   │   ├── config/                 # Environment variables and client config
│   │   ├── types/                  # Type definitions & API contracts
│   │   ├── utils/                  # Date formatting, validation, string helpers
│   │   ├── App.jsx                 # Top-level React application shell
│   │   └── main.jsx                # DOM mount & browser router initialization
│   │
│   ├── index.html                  # HTML entry with Plus Jakarta Sans & Inter
│   ├── package.json                # Frontend package manifest
│   ├── postcss.config.js           # PostCSS configuration
│   ├── tailwind.config.js          # Tailwind theme tokens matching Stitch specs
│   └── vite.config.js              # Vite server & build configuration
│
├── backend/                        # Backend FastAPI Server
│   ├── app/
│   │   ├── main.py                 # FastAPI application instance, CORS, routers & health
│   │   ├── database.py             # SQLAlchemy async engine, sessionmaker & Base
│   │   ├── models.py               # Declarative ORM models (Org, User, Project, Ticket)
│   │   ├── schemas.py              # Pydantic v2 schemas (`from_attributes = True`)
│   │   ├── dependencies.py         # DB session generator & JWT authentication guards
│   │   │
│   │   ├── core/                   # Core application configuration & security primitives
│   │   │   ├── config.py           # Pydantic-settings environment schema
│   │   │   └── security.py         # Passlib bcrypt hashing & JWT token generators
│   │   │
│   │   ├── routes/                 # Domain API route controllers (/api/v1/*)
│   │   │   ├── analytics.py        # Analytics summary & report export endpoints
│   │   │   ├── audit_logs.py       # Activity logs query endpoints
│   │   │   ├── auth.py             # Register, login, email verification, password reset
│   │   │   ├── files.py            # Central file uploads & presigned URLs
│   │   │   ├── organizations.py    # Organization workspace provisioning & invites
│   │   │   ├── projects.py         # Project workspace CRUD & tab endpoints
│   │   │   ├── rca.py              # RCA submission & history endpoints
│   │   │   ├── settings.py         # Workspace settings & preference endpoints
│   │   │   ├── sla.py              # SLA metrics & policy configuration endpoints
│   │   │   ├── tasks.py            # Task creation, assignment & filtering
│   │   │   ├── tickets.py          # Ticket ingestion, severity & status transition
│   │   │   └── users.py            # Team directory & profile endpoints
│   │   │
│   │   ├── services/               # Business logic, SLA calculations & state machines
│   │   ├── repositories/           # SQLAlchemy query encapsulation & persistence
│   │   ├── middleware/             # Error handling, request logging & CORS
│   │   ├── utils/                  # Datetime helpers, pagination & hashing
│   │   └── integrations/           # File storage, email & webhook dispatchers
│   │
│   ├── tests/                      # Backend pytest test suites
│   ├── requirements.txt            # Backend Python dependencies
│   └── .env.example                # Backend environment template
│
└── tests/                          # Root Test Orchestration
    ├── frontend/                   # React component & layout unit tests
    ├── backend/                    # API route & database model integration tests
    ├── integration/                # Full-stack API contract & integration tests
    └── e2e/                        # End-to-end user journey automation tests
```

### Folder Structure Explanation & Architectural Principles
1. **Strict Client-Server Isolation**: Frontend assets and dependencies are completely self-contained in `frontend/`, while backend services and Python logic reside strictly in `backend/`. This ensures clean deployment boundaries and eliminates dependency pollution.
2. **Feature-Based Modular Frontend**: Business capabilities (such as `tickets`, `projects`, `sla`) are isolated inside `src/modules/<feature>/` with their own components, hooks, services, and pages. Reusable UI primitives (buttons, tables, modals) are centralized in `src/components/` to prevent component duplication.
3. **Layered Backend Architecture**: The backend strictly follows a layered design: **Routes** (HTTP handling) $\rightarrow$ **Services** (business rules & SLA timers) $\rightarrow$ **Repositories** (database queries) $\rightarrow$ **Models/Database** (SQLAlchemy persistence). Business logic never leaks into route controllers.

---

## Installed Libraries

### Frontend Packages (`frontend/package.json`)
Every installed npm package serves a deliberate architectural role:

- `react` & `react-dom` (`^18.3.1`) $\rightarrow$ Core declarative UI framework supporting concurrent rendering and hooks.
- `react-router-dom` (`^6.23.1`) $\rightarrow$ Client-side declarative routing, nested layouts (`MainLayout`, `AuthLayout`, `DashboardLayout`), and route protection guards.
- `axios` (`^1.7.2`) $\rightarrow$ Standardized HTTP client configured with request/response interceptors for automatic JWT token injection and 401 refresh handling.
- `@tanstack/react-query` (`^5.45.0`) $\rightarrow$ Asynchronous server-state synchronization, automatic caching, background refetching, and optimistic UI updates for task/ticket state changes.
- `lucide-react` (`^0.395.0`) $\rightarrow$ Tree-shakable SVG icon set with consistent line weighting matching Google Stitch design specifications.
- `clsx` (`^2.1.1`) & `tailwind-merge` (`^2.3.0`) $\rightarrow$ Utility functions for dynamically constructing and resolving conflicting Tailwind CSS classes.
- `tailwindcss` (`^3.4.4`), `postcss` (`^8.4.38`), `autoprefixer` (`^10.4.19`) $\rightarrow$ Modern utility-first CSS engine configured with official Stitch theme tokens.
- `vite` (`^5.2.13`) & `@vitejs/plugin-react` (`^4.3.0`) $\rightarrow$ High-speed development server with Hot Module Replacement (HMR) and optimized Rollup production bundler.

### Backend Packages (`requirements.txt` & `backend/requirements.txt`)
All backend packages are pinned and installed strictly inside the dedicated `myenv` virtual environment:

- `fastapi` (`>=0.111.0`) $\rightarrow$ High-performance, type-safe async web framework providing automatic OpenAPI/Swagger generation.
- `uvicorn[standard]` (`>=0.30.0`) $\rightarrow$ Lightning-fast ASGI production web server with uvloop and httptools.
- `pydantic` (`>=2.7.0`) & `pydantic-settings` (`>=2.3.0`) $\rightarrow$ Robust data validation using Python type annotations with Pydantic v2 conventions (`model_config = ConfigDict(from_attributes=True)`).
- `email-validator` (`>=2.1.0`) $\rightarrow$ Standard compliant RFC email validation for user registration and authentication schemas.
- `sqlalchemy[asyncio]` (`>=2.0.30`) & `greenlet` (`>=3.0.3`) $\rightarrow$ Enterprise async Object-Relational Mapper (ORM) powering type-safe database queries.
- `asyncpg` (`>=0.29.0`) $\rightarrow$ High-performance native PostgreSQL asynchronous driver for maximum concurrent throughput.
- `psycopg2-binary` (`>=2.9.9`) $\rightarrow$ Synchronous PostgreSQL database driver for Alembic migration commands and tooling.
- `alembic` (`>=1.13.1`) $\rightarrow$ Database schema migration tool supporting reversible schema revisions.
- `python-jose[cryptography]` (`>=3.3.0`) $\rightarrow$ JWT (JSON Web Token) creation, signing, and cryptographic decoding for bearer authentication.
- `passlib[bcrypt]` (`>=1.7.4`) & `bcrypt` (`>=4.1.2`) $\rightarrow$ Industry-standard one-way salted password hashing.
- `python-multipart` (`>=0.0.9`) $\rightarrow$ Streaming multipart form data parser supporting file uploads in files and ticket modules.
- `python-dotenv` (`>=1.0.1`) $\rightarrow$ Parses `.env` configuration files for local development.
- `httpx` (`>=0.27.0`) $\rightarrow$ Asynchronous HTTP client for external service integration and FastAPI endpoint testing.
- `pytest` (`>=8.2.0`) $\rightarrow$ Unit and integration test runner for test automation.

---

## Setup Instructions

### 1. Prerequisites
- **Python**: Version 3.11 or newer (Python 3.14 verified)
- **Node.js**: Version 18.x or newer (Node v24 verified)
- **Package Manager**: npm 9+
- **Database**: PostgreSQL 15 or 16 installed and running locally or via Docker

---

### 2. Backend Setup (Virtual Environment — Mandatory Rule)
> **Strict Rule**: Backend dependencies must **never** be installed globally. Always use the dedicated virtual environment `myenv`.

#### Step 1: Create Virtual Environment
From the workspace root directory:
```bash
python -m venv myenv
```

#### Step 2: Activate the Virtual Environment
- **Windows (PowerShell):**
  ```powershell
  .\myenv\Scripts\activate
  ```
- **Windows (Command Prompt):**
  ```cmd
  myenv\Scripts\activate.bat
  ```
- **Linux / macOS:**
  ```bash
  source myenv/bin/activate
  ```

#### Step 3: Install Backend Dependencies
Ensure `requirements.txt` is up-to-date, then install inside `myenv`:
```bash
pip install -r requirements.txt
```

#### Step 4: Environment Configuration
Copy the template to create your `.env` file:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

---

### 3. Frontend Setup
Navigate into the `frontend/` directory and install npm packages:
```bash
cd frontend
npm install
cd ..
```

---

## Run Commands

### 1. Run the Backend API Server
Ensure `myenv` is activated and run from the workspace root:
```bash
# Windows / Linux / macOS
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base URL: `http://localhost:8000/api/v1`
- Interactive OpenAPI Docs (Swagger UI): `http://localhost:8000/api/v1/docs`
- ReDoc Documentation: `http://localhost:8000/api/v1/redoc`
- Health Check: `http://localhost:8000/api/v1/health`

### 2. Run the Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Application Client: `http://localhost:3000` (proxies `/api` requests to backend port 8000)

### 3. Build Frontend for Production
```bash
cd frontend
npm run build
```
Generates optimized, minified production assets in `frontend/dist/`.

---

## Testing Strategy

### Backend Tests (Pytest)
Run unit and route tests using pytest inside `myenv`:
```bash
# From workspace root with myenv activated
pytest backend/tests/ -v
```

### Frontend Tests
Run component and routing tests:
```bash
cd frontend
npm test
```

---

## Environment Variables

All sensitive credentials and environment-specific parameters are stored in `.env` (which is excluded from Git via `.gitignore`). Never commit `.env` to version control.

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Yes | `development` | Runtime environment (`development`, `staging`, `production`) |
| `DEBUG` | Yes | `True` | Enables debug logging and interactive error pages (Set `False` in prod) |
| `HOST` | Yes | `0.0.0.0` | Backend bind host address |
| `PORT` | Yes | `8000` | Backend server listening port |
| `API_V1_PREFIX` | Yes | `/api/v1` | URL routing prefix for API version 1 |
| `SECRET_KEY` | **Yes** | *Change in Prod* | Secret key for cryptographic signing (use `openssl rand -hex 32`) |
| `JWT_SECRET` | **Yes** | *Change in Prod* | Secret key for JWT signature verification |
| `ALGORITHM` | Yes | `HS256` | JWT cryptographic algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | `60` | Lifespan of JWT access tokens in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Yes | `7` | Lifespan of refresh tokens in days |
| `DATABASE_URL` | **Yes** | `postgresql+asyncpg://...` | Asynchronous PostgreSQL connection URI |
| `SYNC_DATABASE_URL` | Yes | `postgresql://...` | Synchronous PostgreSQL URI for Alembic migrations |
| `BACKEND_CORS_ORIGINS` | Yes | `["http://localhost:3000"]` | Whitelist of permitted client origins |
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000/api/v1` | Client endpoint for backend REST API |
| `STORAGE_PROVIDER` | Yes | `local` | File storage driver (`local`, `s3`, `gcs`) |
| `UPLOAD_DIR` | Yes | `./uploads` | Directory for uploaded ticket and task attachments |

---

## Security Best Practices & Warnings

> [!WARNING]
> **Production Security Checklist**
> 1. **Never Hardcode Secrets**: Always populate `SECRET_KEY` and `JWT_SECRET` via environment variables. Never commit actual secret keys to source repositories.
> 2. **Disable Debug in Production**: Always set `DEBUG=False` in production environments to avoid leaking stack traces, database schema details, or environment variables.
> 3. **Rotate Secrets Regularly**: Employ secret rotation schedules for JWT keys and database passwords.

### Security Implementations Built Into Live Workspace:
- **Password Security**: All user passwords are automatically hashed with salted `bcrypt` via Passlib prior to database persistence. Plain text passwords are never logged or stored.
- **Input Validation**: Pydantic v2 schemas rigorously validate and sanitize all payload inputs, preventing parameter injection and type coercion vulnerabilities.
- **SQL Injection Prevention**: SQLAlchemy 2.0 uses parameterized query binding by default; raw SQL concatenation is strictly forbidden.
- **CORS Protection**: CORS middleware (`CORSMiddleware`) restricts cross-origin resource sharing strictly to configured frontend origins.
- **Role-Based Authorization (RBAC)**: Protected routes utilize FastAPI dependency injection to verify caller role (`Owner`, `Admin`, `Manager`, `Member`) before granting resource access.
- **Secure Cookie & HTTPS Readiness**: Authentication tokens support `HttpOnly`, `SameSite=Strict/Lax`, and `Secure` cookie transport over HTTPS.

---

## API Details

All endpoints are prefixed with `/api/v1` and document their OpenAPI specifications automatically.

### Summary of Core Endpoints

| Method | Endpoint | Description | Auth Required | Role |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account | No | Public |
| `POST` | `/auth/login` | Authenticate and obtain JWT access token | No | Public |
| `POST` | `/auth/verify-email` | Verify user email address with OTP code | No | Public |
| `POST` | `/auth/forgot-password` | Request password reset token | No | Public |
| `POST` | `/auth/reset-password` | Reset password using verified token | No | Public |
| `GET` | `/users/me` | Fetch authenticated user profile | **Yes** | Member+ |
| `GET` | `/users` | List organization team members | **Yes** | Member+ |
| `POST` | `/organizations` | Provision new organization workspace | **Yes** | Authenticated |
| `POST` | `/organizations/join` | Join organization via invitation code | **Yes** | Authenticated |
| `GET` | `/projects` | List projects in current workspace | **Yes** | Member+ |
| `POST` | `/projects` | Create a new project workspace | **Yes** | Manager+ |
| `GET` | `/projects/{id}` | Retrieve project details and tab data | **Yes** | Member+ |
| `GET` | `/tasks` | List and filter workspace tasks (paginated) | **Yes** | Member+ |
| `POST` | `/tasks` | Create task and broadcast real-time event | **Yes** | Member+ |
| `GET` | `/tasks/my` | List tasks assigned to current authenticated user | **Yes** | Member+ |
| `GET` | `/tasks/meta/enums` | Get status, priority, and task_type enum options | No | Public |
| `GET` | `/tasks/{id}` | Retrieve single task with comments & attachments | **Yes** | Member+ |
| `PATCH`| `/tasks/{id}` | Update task title, description, priority, assignee | **Yes** | Member+ |
| `PATCH`| `/tasks/{id}/status` | Update task workflow status | **Yes** | Member+ |
| `DELETE`| `/tasks/{id}` | Delete task and broadcast deletion event | **Yes** | Member+ |
| `GET` | `/tasks/{id}/comments` | List task comments | **Yes** | Member+ |
| `POST` | `/tasks/{id}/comments` | Add new task comment | **Yes** | Member+ |
| `GET` | `/tasks/{id}/attachments`| List task attachment metadata | **Yes** | Member+ |
| `POST` | `/tasks/{id}/attachments`| Register uploaded file metadata | **Yes** | Member+ |
| `WS`  | `/tasks/ws` | Real-time WebSocket stream for task events | No | Public |
| `GET` | `/notifications` | List and filter notifications | **Yes** | Member+ |
| `GET` | `/notifications/unread-count` | Get live unread notification counter | **Yes** | Member+ |
| `PATCH`| `/notifications/{id}/read` | Mark individual notification as read | **Yes** | Member+ |
| `PATCH`| `/notifications/read-all` | Mark all notifications as read | **Yes** | Member+ |
| `WS`  | `/notifications/ws` | Real-time WebSocket stream for notification alerts | No | Public |
| `GET` | `/tickets` | List tickets (Table, Board, Priority views) | **Yes** | Member+ |
| `POST` | `/tickets` | Create ticket & initialize dual SLA timers | **Yes** | Member+ |
| `PATCH`| `/tickets/{id}/status` | Transition ticket status (Open $\rightarrow$ WIP $\rightarrow$ Resolved) | **Yes** | Member+ |
| `PATCH`| `/tickets/{id}/severity`| Update severity (recalibrates active SLA) | **Yes** | Manager+ |
| `GET` | `/sla/metrics` | Retrieve SLA compliance percentages | **Yes** | Manager+ |
| `GET` | `/sla/policies` | List configured SLA response/resolution rules | **Yes** | Member+ |
| `GET` | `/rca/ticket/{id}` | Retrieve Root Cause Analysis document | **Yes** | Member+ |
| `POST` | `/rca/ticket/{id}` | Submit completed RCA incident record | **Yes** | Member+ |
| `GET` | `/files` | List centralized workspace files | **Yes** | Member+ |
| `POST` | `/files/upload` | Upload attachment or project asset | **Yes** | Member+ |
| `GET` | `/analytics/summary` | Aggregate workspace performance analytics | **Yes** | Manager+ |
| `GET` | `/audit-logs` | Retrieve immutable system activity audit logs | **Yes** | Admin/Owner |
| `GET` | `/settings/workspace` | Get workspace configuration and branding | **Yes** | Admin/Owner |

---

## Future Scope & Architectural Improvements

1. **Real-Time WebSockets for Collaborative Boards**: Implement WebSockets for live Kanban card drag-and-drop updates, live presence indicators, and instant cursor tracking across sprint teams.
2. **Automated AI-Driven Ticket Triage**: Integrate Gemini API to automatically categorize incoming tickets, detect duplicate issues, suggest initial root causes, and calculate recommended severity.
3. **Third-Party VCS Integrations**: Bi-directional webhooks with GitHub, GitLab, and Jira to automatically link Git commits, pull requests, and CI/CD build failures directly to tickets.
4. **Enterprise SLA Business Calendars**: Support custom enterprise SLA calendars that account for team timezones, working hours, weekends, and regional statutory holidays.
5. **Full Redis Cache Layer**: Implement Redis distributed caching for read-heavy operations like global searches, notification counters, and dashboard analytics metrics.

---

## License & Development Notes
Maintained by the Live Workspace engineering team. Refer to `DESIGN_SYSTEM.md` and `STITCH_SCREEN_INVENTORY.md` for complete UI design fidelity specifications before implementing page templates.
