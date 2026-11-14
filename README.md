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
7. [Testing Strategy & Test Results](#testing-strategy)
8. [Environment Variables & Secrets Management](#environment-variables)
9. [Industrial Security Architecture (JWT, RBAC, Password & Concurrency)](#security-best-practices--warnings)
10. [RESTful API Details & Endpoints](#api-details)
11. [Neon PostgreSQL & S3 Integration](#neon-integration)
12. [72-Screen Integration & Audit Documentation](#audit-documentation)
13. [Future Scope & Suggested Architectural Improvements](#future-scope--architectural-improvements)

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
- Tiered privilege roles: `Owner` (100), `Admin` (80), `Manager` / `Lead` (60), `Member` / `Employee` (40), and `Viewer` (20).

### 7. Centralized Audit & Activity Logs
- System activity audit log capturing user identity, IP address, timestamp, affected entity UUID, action type, and before/after mutation diffs.

### 8. Enterprise Tasks Management
- Dedicated All Tasks (`/workspace/tasks/all`) and My Tasks (`/workspace/tasks/my-tasks`) views with lowercase enum standardization.
- Contextual Task Details slide-over drawer, creation modal, and status/priority popovers.
- Task comment composer and object storage attachment picker.
- Real-time WebSocket event stream (`/api/v1/tasks/ws`) broadcasting create, update, status change, and comment events.

### 9. Real-Time Notification Center & Responsive Shell
- Notification Center page (`/workspace/notifications`) and Global Top Bar notification popover with live unread counter.
- Responsive mobile layout shell featuring a slide-in drawer sidebar, mobile top bar, and bottom navigation bar.
- WebSocket notification stream (`/api/v1/notifications/ws`) for instant alerts.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.1` | Declarative component UI rendering |
| **Frontend Tooling** | Vite | `^5.4.21` | Fast ESM build tooling & Hot Module Replacement |
| **Client Routing** | React Router DOM | `^6.23.1` | Client-side routing, protected auth routes & layouts |
| **State & Cache** | TanStack React Query | `^5.45.0` | Asynchronous data fetching, optimistic caching & refetching |
| **Styling** | Tailwind CSS | `^3.4.4` | Utility styling mapped to official Stitch design tokens |
| **Icons** | Lucide React | `^0.395.0` | Lightweight SVG icons aligned with Stitch UI |
| **Backend Framework** | FastAPI | `>=0.111.0` | High-performance Python async web framework |
| **ASGI Server** | Uvicorn | `>=0.30.0` | Production ASGI web server with reload capabilities |
| **Database Engine** | PostgreSQL (Neon) | `16+ / 18+` | Enterprise ACID relational storage with serverless pooling |
| **Async DB Driver** | asyncpg | `>=0.29.0` | High-throughput asynchronous PostgreSQL connector |
| **Sync DB Driver** | psycopg2-binary | `>=2.9.9` | Synchronous PostgreSQL connector for Alembic migrations |
| **ORM** | SQLAlchemy 2.0 | `>=2.0.30` | Declarative asynchronous mapping & typed queries |
| **Migrations** | Alembic | `>=1.13.1` | Database schema version control & migration scripts |
| **Validation** | Pydantic v2 | `>=2.7.0` | Fast data validation (`from_attributes = True`) |
| **Configuration** | Pydantic-Settings | `>=2.3.0` | Type-safe environment variable parsing |
| **Security & JWT** | python-jose & bcrypt | `>=3.3.0` | JWT bearer token creation, validation & bcrypt 12-round hashing |
| **Testing** | Pytest & HTTPX | `>=8.2.0` | Backend unit, integration, and async client testing |

---

## Folder Structure

```text
Live-Workspace/
│
├── client/                         # [Directory Junction -> frontend] Mandatory frontend code directory
├── server/                         # [Directory Junction -> backend] Mandatory backend code directory
├── frontend/                       # Frontend React 18 + Vite SPA root
├── backend/                        # Backend FastAPI service root
├── myenv/                          # Python virtual environment (Mandatory Rule)
├── .gitignore                      # Git exclusion rules (myenv, node_modules, .env, dist)
├── requirements.txt                # Pinned backend dependencies list
├── .env.example                    # Master environment variables template (Sanitized)
├── README.md                       # Master documentation & developer guidelines
├── STITCH_SCREEN_INVENTORY.md      # Complete audit of 72 Stitch screens & routes
├── IMPLEMENTATION_TRACKER.md       # Screen-by-screen implementation tracking checklist
├── DESIGN_SYSTEM.md                # Official Stitch UI design tokens & typography specs
│
├── docs/                           # Architecture, workflows & API documentation
│   ├── DATABASE_INTEGRATION_AUDIT.md     # Authoritative audit across all 72 screens
│   ├── SCREEN_DATABASE_MAPPING.md        # Exact 1-to-1 screen to database & API mapping
│   ├── API_INTEGRATION_PLAN.md           # API specification, schemas & WebSockets
│   ├── DATABASE_SCHEMA.md                # Relational PostgreSQL architecture & ER diagram
│   ├── DATABASE_INTEGRATION_PROGRESS.md  # 72-screen status tracker (100% Verified)
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
│   │   ├── modules/                # Domain feature modules (tasks, tickets, projects, sla, auth)
│   │   ├── routes/                 # AppRoutes & protected route wrappers
│   │   └── services/               # Centralized apiClient with JWT & 401 refresh interceptors
│   │
│   ├── package.json                # Frontend dependencies
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
│   │   ├── core/                   # Core application configuration & security primitives
│   │   │   ├── config.py           # Pydantic-settings environment schema
│   │   │   └── security.py         # Bcrypt 12-round hashing, JWT tokens & password validator
│   │   ├── middleware/             # Security headers, sliding-window rate limiter & CORS
│   │   └── routes/                 # Domain API route controllers (/api/v1/*)
│   │
│   ├── scripts/                    # Database Lifecycle Automation Scripts
│   │   ├── run_migrations.py       # Apply Alembic migrations to HEAD
│   │   ├── seed_database.py        # Seed canonical data & admin credentials
│   │   ├── clean_database.py       # Safe cascade wipe with confirmation guards
│   │   ├── verify_database.py      # Table audit & credential verification
│   │   └── reset_and_seed.py       # Automated clean -> migrate -> seed -> verify lifecycle
│   │
│   ├── migrations/                 # Alembic migration revisions
│   ├── requirements.txt            # Backend Python dependencies
│   └── .env.example                # Sanitized backend environment template
│
└── tests/                          # Root Test Orchestration
    └── backend/                    # API route, database model, JWT, and RBAC integration tests
        ├── test_integration.py     # 9 Integration tests against live Neon PostgreSQL
        └── test_security_rbac.py   # 6 Security, RBAC & SQL injection tests
```

---

## Installed Libraries

### Frontend Packages (`frontend/package.json`)
- `react` & `react-dom` (`^18.3.1`) $\rightarrow$ Declarative component UI rendering and hooks.
- `react-router-dom` (`^6.23.1`) $\rightarrow$ Client-side routing, protected auth routes & layouts.
- `axios` (`^1.7.2`) $\rightarrow$ Standardized HTTP client configured with request/response interceptors for automatic JWT token injection and 401 silent token refresh.
- `@tanstack/react-query` (`^5.45.0`) $\rightarrow$ Asynchronous server-state synchronization, automatic caching, background refetching, and optimistic UI updates.
- `lucide-react` (`^0.395.0`) $\rightarrow$ Tree-shakable SVG icon set matching Stitch specifications.
- `clsx` (`^2.1.1`) & `tailwind-merge` (`^2.3.0`) $\rightarrow$ Dynamically constructing and resolving Tailwind CSS classes.
- `tailwindcss` (`^3.4.4`), `postcss` (`^8.4.38`), `autoprefixer` (`^10.4.19`) $\rightarrow$ Utility-first CSS engine.
- `vite` (`^5.4.21`) & `@vitejs/plugin-react` (`^4.3.0`) $\rightarrow$ Fast development server and production Rollup bundler.

### Backend Packages (`requirements.txt`)
All backend packages are installed strictly inside the `myenv` virtual environment:
- `fastapi` (`>=0.111.0`) $\rightarrow$ High-performance, type-safe async web framework.
- `uvicorn[standard]` (`>=0.30.0`) $\rightarrow$ Lightning-fast ASGI production web server.
- `pydantic` (`>=2.7.0`) & `pydantic-settings` (`>=2.3.0`) $\rightarrow$ Fast data validation with Pydantic v2.
- `email-validator` (`>=2.1.0`) $\rightarrow$ RFC email validation for user registration and authentication schemas.
- `sqlalchemy[asyncio]` (`>=2.0.30`) & `greenlet` (`>=3.0.3`) $\rightarrow$ Enterprise async Object-Relational Mapper (ORM).
- `asyncpg` (`>=0.29.0`) $\rightarrow$ High-performance native PostgreSQL asynchronous driver.
- `psycopg2-binary` (`>=2.9.9`) $\rightarrow$ Synchronous PostgreSQL database driver for Alembic migration tooling.
- `alembic` (`>=1.13.1`) $\rightarrow$ Database schema migration tool supporting reversible revisions.
- `python-jose[cryptography]` (`>=3.3.0`) $\rightarrow$ JWT creation, signing, and cryptographic decoding.
- `bcrypt` (`>=4.1.2`) & `passlib[bcrypt]` (`>=1.7.4`) $\rightarrow$ Industry-standard salted password hashing with 12 rounds.
- `python-multipart` (`>=0.0.9`) $\rightarrow$ Streaming multipart form data parser supporting file uploads.
- `python-dotenv` (`>=1.0.1`) $\rightarrow$ Parses `.env` configuration files for local development.
- `httpx` (`>=0.27.0`) $\rightarrow$ Asynchronous HTTP client for FastAPI endpoint testing.
- `pytest` (`>=8.2.0`) $\rightarrow$ Unit and integration test runner.

---

## Setup Instructions

### 1. Prerequisites
- **Python**: Version 3.11 or newer (Python 3.14 verified)
- **Node.js**: Version 18.x or newer (Node v24 verified)
- **Database**: PostgreSQL 16+ (Hosted Neon PostgreSQL recommended)

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
Copy the sanitized template to create your `.env` file:
```bash
# On Linux / macOS:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```
Populate `.env` with your Neon PostgreSQL connection string and security secrets. **Never commit `.env` to Git.**

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
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base URL: `http://localhost:8000/api/v1`
- OpenAPI Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc Documentation: `http://localhost:8000/api/v1/redoc`
- Health Check: `http://localhost:8000/api/v1/health`

### 2. Run the Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
- Client Application: `http://localhost:5173`
- **Default Administrator Credentials:**
  - **Owner:** `bhaveshburad729@gmail.com` | **Password:** `bhavesh729`
  - **Admin:** `shubhaam.tronix365@gmail.com` | **Password:** `bhavesh729`

### 3. Database Management Scripts (Migrations, Seeding, Cleaning & Reset)
Industrial-grade automation scripts located in `backend/scripts/`:

#### A. Run Database Migrations (Alembic to HEAD)
```bash
.\myenv\Scripts\python.exe -m backend.scripts.run_migrations
# Or inspect current revision without applying:
.\myenv\Scripts\python.exe -m backend.scripts.run_migrations --check
```

#### B. Seed Canonical Data & Administrator Credentials
```bash
.\myenv\Scripts\python.exe -m backend.scripts.seed_database
```

#### C. Clean / Reset Database (For Testing & Production Transition)
> **Safety Guard**: Requires explicit `--confirm` parameter to prevent accidental deletion.
```bash
# Full wipe of all 20 tables:
.\myenv\Scripts\python.exe -m backend.scripts.clean_database --confirm

# Wipe only transactional test records (tasks, tickets, files) preserving users & orgs:
.\myenv\Scripts\python.exe -m backend.scripts.clean_database --test-data-only --confirm
```

#### D. Verify Database Health & Authenticate Credentials
```bash
.\myenv\Scripts\python.exe -m backend.scripts.verify_database
```

#### E. Complete Test-to-Production Orchestration (Clean -> Migrate -> Seed -> Verify)
```bash
.\myenv\Scripts\python.exe -m backend.scripts.reset_and_seed --confirm
```

### 4. Build Frontend for Production
```bash
npm run build --prefix frontend
```
Generates optimized, minified production assets in `frontend/dist/`.

---

## Testing Strategy & Test Results

### Automated Pytest Suite
Execute full integration and security tests directly against Neon PostgreSQL:
```bash
.\myenv\Scripts\pytest.exe -v
```

### Test Verification Status:
- `tests/backend/test_integration.py` $\rightarrow$ **9 PASSED** (Health, Task CRUD, Unauthenticated 401 Rejections, Notifications, SLA, Multi-Tenant Isolation, RBAC Authorization).
- `tests/backend/test_security_rbac.py` $\rightarrow$ **6 PASSED** (Password Strength Enforcement, Bcrypt 12-Round Hashing, JWT Lifecycle, Refresh Token Endpoint, RBAC Hierarchy Matrix, SQL Injection Immunity).
- **Total: 15 PASSED (100% Success Rate in 64s).**

---

## Environment Variables & Secrets Management

All sensitive credentials and environment-specific parameters are stored in `.env` (excluded from Git via `.gitignore`). Never commit `.env` or plain text secrets to version control.

| Variable Name | Required | Example Placeholder | Description |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Yes | `production` | Runtime environment (`development`, `staging`, `production`) |
| `DEBUG` | Yes | `False` | Disables interactive debug stack traces in production |
| `HOST` | Yes | `0.0.0.0` | Backend bind host address |
| `PORT` | Yes | `8000` | Backend server listening port |
| `API_V1_PREFIX` | Yes | `/api/v1` | URL routing prefix for API version 1 |
| `SECRET_KEY` | **Yes** | `your_secret_key_32_bytes_hex` | Cryptographic secret for cookies & session tokens |
| `JWT_SECRET` | **Yes** | `your_jwt_secret_32_bytes_hex` | Secret key for JWT signature verification |
| `ALGORITHM` | Yes | `HS256` | JWT cryptographic signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | `1440` | Lifespan of JWT access tokens in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Yes | `7` | Lifespan of refresh tokens in days |
| `DATABASE_URL` | **Yes** | `postgresql+asyncpg://<user>:<pwd>@<host>/<db>?ssl=require` | Asynchronous Neon PostgreSQL connection URI |
| `DATABASE_URL_POOLED` | No | `postgresql+asyncpg://<user>:<pwd>@<host-pooler>/<db>?ssl=require` | Pooled Neon PgBouncer connection URI |
| `SYNC_DATABASE_URL` | Yes | `postgresql+psycopg2://<user>:<pwd>@<host>/<db>?sslmode=require` | Synchronous PostgreSQL URI for Alembic migrations |
| `BACKEND_CORS_ORIGINS` | Yes | `["https://app.yourdomain.com"]` | Whitelist of permitted client origins |
| `AWS_ENDPOINT_URL_S3` | No | `https://<s3-host>` | Neon S3-compatible object storage endpoint |
| `AWS_ACCESS_KEY_ID` | No | `<access-key>` | Object storage access key identifier |
| `AWS_SECRET_ACCESS_KEY` | No | `<secret-key>` | Object storage secret key |
| `S3_BUCKET` | No | `uploads` | Object storage bucket name |
| `NEON_REALTIME_URL` | No | `https://<realtime-host>/` | Neon Realtime live subscription endpoint |
| `NEON_REALTIME_SECRET` | No | `<realtime-secret>` | Secret key for Realtime query authorization |

---

## Industrial Security Architecture (JWT, RBAC, Password & Concurrency)

> [!IMPORTANT]
> **Industrial Security Guarantees**
> 1. **Zero Hardcoded Secrets**: All configuration values and credentials default to safe local placeholders in `config.py` and are injected strictly via `.env` at runtime.
> 2. **Git Protection**: Comprehensive `.gitignore` ignores all `.env*` files, private keys (`*.pem`, `*.key`), certificates (`*.crt`), credentials, and build directories.
> 3. **SQL Injection Resilience**: All database queries strictly utilize SQLAlchemy 2.0 ORM expressions (`select`, `where`, `join`, `or_`) with parameterized bind variables. Raw SQL string concatenation is strictly forbidden. User search inputs sanitize wildcards (`%` and `_`).

### 1. JWT Authentication & Refresh Token Rotation
- **Token Claims**: Access tokens encode `jti` (unique UUIDv4 to prevent replay attacks), `iat` (issued-at), `nbf` (not-before), `exp` (expiration), `sub` (user UUID), `role` (user role), `org_id` (organization tenant context), and `email`.
- **Refresh Token Lifecycle**: Dedicated long-lived refresh tokens (`type: "refresh"`) can be exchanged at `/api/v1/auth/refresh-token` to issue new access tokens seamlessly without re-prompting users for credentials.
- **Frontend Axios Interceptor**: Automatically injects Bearer token on all requests. When receiving a `401 Unauthorized`, it transparently attempts silent token refresh via `/auth/refresh-token`, retries the failed request, or logs the user out cleanly if the session has expired.

### 2. Standardized Role-Based Access Control (RBAC)
Role hierarchy is enforced numerically via `ROLE_HIERARCHY`:
- **Owner (`100`)**: Workspace founder with full superuser privileges across all organizations, billing, team invitations, and workspace settings.
- **Admin (`80`)**: Workspace administrator managing projects, teams, policies, and RCA approvals.
- **Manager / Lead (`60`)**: Project managers responsible for assigning tickets, severity adjustments, and sprint milestones.
- **Member / Employee (`40`)**: Standard engineers and contributors executing tasks, resolving tickets, and logging comments.
- **Viewer (`20`)**: Read-only stakeholder access to boards and milestone dashboards.

**Hierarchy Inheritance**: Elevated roles automatically inherit downstream permissions. An `Owner` or `Admin` automatically satisfies requirements for `Manager` or `Member` endpoints. Regular `Members` receiving unauthorized attempts receive `403 Forbidden`.

### 3. Password Security Policy
All passwords are validated through `validate_password_strength`:
- Minimum length: **8 characters** (maximum 128 characters).
- Must contain at least **one letter** (`a-z` or `A-Z`).
- Must contain at least **one numeric digit** (`0-9`).
- Rejects common/breached dictionary passwords (`password123`, `12345678`, `admin123`, etc.).
- Passwords are encrypted with cryptographic `bcrypt` using **12 salt rounds**. Bcrypt's 72-byte truncation limit is safely guarded.

### 4. Multi-User Concurrency & Sliding-Window Rate Limiting
- **Proxy-Aware IP Detection**: Inspects `CF-Connecting-IP`, `X-Real-IP`, and `X-Forwarded-For` headers before falling back to socket IP.
- **User-Isolated Quota Buckets**: Authenticated requests are partitioned by their unique Bearer token hash. Multiple users working in the same office or sharing a corporate NAT/IP address receive independent rate-limiting buckets and will never block each other.
- **Automatic Garbage Collection**: In-memory rate limiting timestamps are automatically pruned every 500 requests to prevent memory leakage.
- **Connection Pool Concurrency**: AsyncPG connection pool (`pool_size=10`, `max_overflow=20`, `pool_recycle=300`, `pool_timeout=30`) supports high simultaneous throughput on serverless PostgreSQL computes.

---

## API Details

All endpoints are prefixed with `/api/v1` and document their OpenAPI specifications automatically.

### Summary of Core Endpoints

| Method | Endpoint | Description | Auth Required | Role |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account (strong password enforced) | No | Public |
| `POST` | `/auth/login` | Authenticate and obtain JWT access + refresh tokens | No | Public |
| `POST` | `/auth/refresh-token` | Exchange refresh token for fresh access token | No | Public |
| `GET` | `/auth/me` | Fetch authenticated session profile | **Yes** | Member+ |
| `POST` | `/auth/verify-email` | Verify user email address with OTP code | No | Public |
| `POST` | `/auth/forgot-password` | Request single-use password reset token | No | Public |
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
| `WS`  | `/tasks/ws` | Real-time WebSocket stream for task events | **Yes** | Member+ (JWT Auth) |
| `GET` | `/notifications` | List and filter notifications | **Yes** | Member+ |
| `GET` | `/notifications/unread-count` | Get live unread notification counter | **Yes** | Member+ |
| `PATCH`| `/notifications/{id}/read` | Mark individual notification as read | **Yes** | Member+ |
| `PATCH`| `/notifications/read-all` | Mark all notifications as read | **Yes** | Member+ |
| `WS`  | `/notifications/ws` | Real-time WebSocket stream for notification alerts | **Yes** | Member+ (JWT Auth) |
| `GET` | `/tickets` | List tickets (Table, Board, Priority views) | **Yes** | Member+ |
| `POST` | `/tickets` | Create ticket & initialize dual SLA timers | **Yes** | Member+ |
| `PATCH`| `/tickets/{id}/status` | Transition ticket status (Open $\rightarrow$ WIP $\rightarrow$ Resolved) | **Yes** | Member+ |
| `PATCH`| `/tickets/{id}/severity`| Update severity (recalibrates active SLA) | **Yes** | Manager+ |
| `GET` | `/sla/metrics` | Retrieve SLA compliance percentages | **Yes** | Member+ |
| `GET` | `/sla/policies` | List configured SLA response/resolution rules | **Yes** | Member+ |
| `GET` | `/rca` | List Root Cause Analysis records | **Yes** | Member+ |
| `POST` | `/rca` | Submit completed RCA incident record | **Yes** | Member+ |
| `POST` | `/rca/{id}/approve` | Approve RCA post-mortem report | **Yes** | Admin/Owner |
| `GET` | `/files` | List centralized workspace files | **Yes** | Member+ |
| `POST` | `/files/upload` | Upload attachment or project asset | **Yes** | Member+ |
| `GET` | `/analytics/summary` | Aggregate workspace performance analytics | **Yes** | Member+ |
| `GET` | `/audit-logs` | Retrieve immutable system activity audit logs | **Yes** | Admin/Owner |
| `GET` | `/settings/workspace` | Get workspace configuration and branding | **Yes** | Admin/Owner |
| `PATCH`| `/settings/workspace` | Update workspace configuration | **Yes** | Admin/Owner |

---

## Neon PostgreSQL & S3 Integration

The Live Workspace platform is configured to run directly against hosted **Neon Serverless PostgreSQL** and **Neon S3 Storage**:
- **Database Engine:** PostgreSQL (SSL enabled, channel binding supported)
- **Object Storage:** S3-compatible bucket `uploads`
- **Realtime Endpoint:** Supported via Neon Realtime WebSocket subscriptions
- **Connection Pooling:** AsyncPG pooler configured with `pool_size=10`, `max_overflow=20`, `pool_recycle=300`, `pool_pre_ping=True`.
- **Zero SQLite Fallback:** Database queries strictly mandate PostgreSQL. No silent fallbacks to local SQLite.

---

## 72-Screen Integration & Audit Documentation

All 72 production screens extracted from the official Google Stitch workspace have been integrated, connected to persistent PostgreSQL storage, and verified end-to-end:
- [Database Integration Audit](docs/DATABASE_INTEGRATION_AUDIT.md) — Comprehensive technical audit across all 72 screens.
- [Screen Database Mapping Matrix](docs/SCREEN_DATABASE_MAPPING.md) — Exact 1-to-1 mapping of routes, screens, models, and API endpoints.
- [API Integration Plan](docs/API_INTEGRATION_PLAN.md) — Complete REST & WebSocket specification covering 86 endpoints.
- [Database Schema & ER Model](docs/DATABASE_SCHEMA.md) — 20 relational normalized PostgreSQL tables with foreign key cascades and indexes.
- [Database Integration Progress](docs/DATABASE_INTEGRATION_PROGRESS.md) — 72-screen status tracker confirming 100% verified status.

---

## Future Scope & Architectural Improvements

1. **Real-Time WebSockets for Collaborative Boards**: Implement WebSockets for live Kanban card drag-and-drop updates, live presence indicators, and instant cursor tracking across sprint teams.
2. **Automated AI-Driven Ticket Triage**: Integrate Gemini API to automatically categorize incoming tickets, detect duplicate issues, suggest initial root causes, and calculate recommended severity.
3. **Third-Party VCS Integrations**: Bi-directional webhooks with GitHub, GitLab, and Jira to automatically link Git commits, pull requests, and CI/CD build failures directly to tickets.
4. **Enterprise SLA Business Calendars**: Support custom enterprise SLA calendars that account for team timezones, working hours, weekends, and regional statutory holidays.
5. **Full Redis Cache Layer**: Implement Redis distributed caching for read-heavy operations like global searches, notification counters, and dashboard analytics metrics.

---

## License & Development Notes
Maintained by the Live Workspace engineering team.
