# Live Workspace — Cloudflare Pages + Render + Neon DB Deployment Guide

This guide details the complete, production-grade deployment process for **Live Workspace**:
1. **Neon Serverless PostgreSQL:** Managed cloud database with connection pooling.
2. **Render Web Service:** Automated deployment of the FastAPI backend via `render.yaml` Blueprint with automatic Alembic migrations.
3. **Cloudflare Pages:** Global Edge CDN hosting for the Vite/React Single-Page Application (SPA) with automatic SPA rewrite routing.

---

## Architecture Topology

```
┌─────────────────────────────────┐
│        User Web Browser         │
└───────┬─────────────────┬───────┘
        │ (HTTPS)         │ (HTTPS / WSS)
        ▼                 ▼
┌─────────────────┐ ┌──────────────────────────────────────────┐
│ Cloudflare Pages│ │ Render Web Service (FastAPI / Uvicorn)   │
│  (React + Vite) │ │ (render.yaml Blueprint, Singapore Region)│
└─────────────────┘ └─────────────────────┬────────────────────┘
                                          │ (Postgres SSL / asyncpg)
                                          ▼
                               ┌────────────────────────────────┐
                               │ Neon Serverless PostgreSQL     │
                               │ (aws-ap-southeast-1 Singapore) │
                               └────────────────────────────────┘
```

---

## 1. Neon Database Setup

### Step 1.1: Retrieve Connection String from Neon Console
In your [Neon Console](https://console.neon.tech/):
1. Navigate to your project (e.g. `bhaveshdb` or `turf` in `aws-ap-southeast-1`).
2. On the **Dashboard**, locate the **Connection Details** widget.
3. Copy the **connection string** (either Pooled or Direct):
   ```text
   postgresql://<user>:<password>@<endpoint-id>.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

> [!NOTE]
> **Single Database URL Architecture**: You only need to share or configure this **one single URL** (`DATABASE_URL`). The backend automatically parses and derives asyncpg, psycopg2, and Alembic migration connection parameters at runtime.

---

## 2. Render Backend Deployment (Using `render.yaml`)

We have provided a native `render.yaml` Blueprint at the repository root. This automates service configuration, dependency installation, database migrations, and health checks.

### Step 2.1: Deploy via Render Blueprint
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Blueprint**.
3. Connect your GitHub/GitLab repository containing the project.
4. Render will detect `render.yaml` automatically and display the `live-workspace-api` service.
5. In the environment variables configuration prompt:
   - `DATABASE_URL`: Paste your **Neon connection string** (that's the only DB URL needed!).
   - `BACKEND_CORS_ORIGINS`: Set your Cloudflare Pages domain (e.g. `["https://live-workspace.pages.dev", "http://localhost:5173"]`). If you don't know your Cloudflare Pages domain yet, you can set `["*"]` or update it right after deploying Cloudflare Pages.
   - Render automatically generates cryptographically secure values for `SECRET_KEY` and `JWT_SECRET`.
6. Click **Apply Blueprint**.

### Step 2.2: How the Render Pipeline Works
- **Build Phase:** `pip install -r requirements.txt` installs all pinned backend dependencies.
- **Start Phase:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 2` starts the production ASGI server.
- **Zero Database Mutation:** The application connects directly to your existing database. No migrations, no seeding scripts, and no account provisioning steps are run during deployment.
- **Health Check:** Render monitors `/health` to verify service readiness.

Your API backend will be available at:
`https://live-workspace-api.onrender.com` (or your chosen Render service name).

---

## 3. Cloudflare Pages Frontend Deployment

Cloudflare Pages provides global edge CDN distribution with sub-50ms latency worldwide.

### Step 3.1: Connect Repository to Cloudflare Pages
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **Workers & Pages** $\rightarrow$ **Create Application** $\rightarrow$ **Pages** tab.
3. Select **Connect to Git** and choose your repository.

### Step 3.2: Configure Build Settings
Fill in the deployment configuration:
- **Project name:** `live-workspace` (or any custom name)
- **Production branch:** `main`
- **Framework preset:** `Vite` (or `None`)
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

### Step 3.3: Set Environment Variables in Cloudflare Pages
Under **Environment variables (Advanced)**, add:
| Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://live-workspace-api.onrender.com/api/v1` | Your Render backend API URL with `/api/v1` prefix |
| `VITE_WS_URL` | `wss://live-workspace-api.onrender.com` | Secure WebSocket URL pointing to Render backend |
| `NODE_VERSION` | `20` | Pins modern LTS Node runtime for Vite |

### Step 3.4: Deploy Site
1. Click **Save and Deploy**.
2. Cloudflare Pages will clone the repo, install Node dependencies, execute `npm run build`, and publish the assets to the global edge network.
3. Your frontend will be available at: `https://<project-name>.pages.dev`.

### Step 3.5: SPA Routing & Security Header Support
We have pre-configured:
- `frontend/public/_redirects`: Contains `/*  /index.html  200` to guarantee client-side React Router navigation works properly on deep links and page reloads without 404 errors.
- `frontend/public/_headers`: Enforces OWASP security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`) and enables immutable caching for `/assets/*`.

---

## 4. Final Cross-Origin (CORS) Synchronization

Once Cloudflare Pages deploys and generates your domain (e.g. `https://live-workspace.pages.dev`):
1. Go back to [Render Dashboard](https://dashboard.render.com/) $\rightarrow$ your `live-workspace-api` service $\rightarrow$ **Environment**.
2. Update `BACKEND_CORS_ORIGINS`:
   ```json
   ["https://live-workspace.pages.dev", "http://localhost:5173"]
   ```
3. Save changes. Render will quickly perform a zero-downtime rolling reload.

---

## 5. Verification & Health Audit

Verify your production setup using the following endpoints:

1. **Backend Health Check:**
   ```bash
   curl -i https://live-workspace-api.onrender.com/health
   ```
   *Expected Response:*
   ```json
   {"status":"healthy","environment":"production","version":"1.0.0","database":"PostgreSQL (Neon)"}
   ```

2. **Database Connectivity Check:**
   ```bash
   curl -i https://live-workspace-api.onrender.com/health/db
   ```
   *Expected Response:*
   ```json
   {"database_status":"connected","check":1,"dialect":"postgresql"}
   ```

3. **Frontend Application Access:**
   - Open `https://<your-project>.pages.dev` in your browser.
   - Log in using `bhaveshburad729@gmail.com` / `bhavesh729`.
   - Verify that projects, tasks, tickets, and metrics load seamlessly without CORS errors.
