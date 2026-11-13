# Live Workspace — Database Migration & Schema Guide

> Comprehensive operational guide for Alembic database migrations, schema evolution, Neon PostgreSQL connection, and SQLite local development.

---

## 1. Architecture Overview

Live Workspace utilizes **SQLAlchemy 2.0 AsyncIO** with **Alembic** for declarative schema migrations.

### Supported Database Engines
* **Production:** PostgreSQL (Hosted on [Neon.tech](https://neon.tech)) using `asyncpg`.
* **Local Development & Testing:** SQLite using `aiosqlite`.

---

## 2. Alembic Configuration

* Root configuration file: [`alembic.ini`](../alembic.ini)
* Migration environment: [`backend/migrations/env.py`](../backend/migrations/env.py)
* Version revisions directory: [`backend/migrations/versions/`](../backend/migrations/versions/)

### Revision Lineage
```
001_initial  (Base schema: organizations, users, projects, tickets, discussions, files)
     │
     ▼
002_tasks    (Sprint task engine: tasks, task_comments, task_attachments)
     │
     ▼
003_saas_features (head) (SaaS models: notifications, workspace_settings, user_invitations, rca_records)
```

---

## 3. Migration Commands

Ensure your virtual environment is active:
```bash
# Windows
myenv\Scripts\activate

# Linux / macOS
source myenv/bin/activate
```

### Inspect Migration Status
```bash
alembic current
alembic heads
```

### Apply Migrations (Upgrade to Latest)
```bash
alembic upgrade head
```

### Roll Back One Revision
```bash
alembic downgrade -1
```

### Generate a New Auto-Migration
After modifying SQLAlchemy models in `backend/app/models.py`:
```bash
alembic revision --autogenerate -m "describe_change"
```

---

## 4. Production Neon PostgreSQL Setup

Set the `DATABASE_URL` environment variable:
```env
DATABASE_URL=postgresql+asyncpg://<USER>:<PASSWORD>@<NEON_HOST>/<DB_NAME>?sslmode=require
```

### Running Migrations against Neon
```bash
alembic upgrade head
```

Alembic will automatically connect via asyncpg, acquire advisory locks, and apply pending migrations in order.

---

## 5. Seed Data Execution

To populate an empty database with default organizations, demo projects, incident tickets, sprint tasks, and users:
```bash
python -m backend.app.seed
```

### Default Demo Accounts
* **Owner:** `aarav@acmetech.io` / `workspace123`
* **Lead:** `neha.p@acmetech.io` / `workspace123`
* **Engineer:** `david.k@acmetech.io` / `workspace123`
