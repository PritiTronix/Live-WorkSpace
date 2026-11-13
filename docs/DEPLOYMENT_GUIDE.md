# Live Workspace — Production Deployment Guide

> Step-by-step production deployment manual for Render, Docker, Neon PostgreSQL, and CDN frontend hosting.

---

## 1. Prerequisites & Stack Overview

- **Backend:** Python 3.11+ / FastAPI / Uvicorn / SQLAlchemy AsyncIO
- **Database:** Neon.tech Managed Serverless PostgreSQL
- **Frontend:** Node.js 18+ / React 18 / Vite / Tailwind CSS
- **Target Hosting:** Render (Web Service + Static Site) or Docker

---

## 2. Environment Variables

### Backend Configuration (`.env`)
```env
# Application
PROJECT_NAME="Live Workspace API"
ENVIRONMENT="production"
DEBUG=False

# Database
DATABASE_URL="postgresql+asyncpg://<NEON_USER>:<NEON_PASSWORD>@<NEON_HOST>/<NEON_DB>?sslmode=require"

# Security & Tokens
JWT_SECRET="<SECURE_RANDOM_64_CHAR_HEX_SECRET>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Storage
FILES_DIR="uploads"

# CORS Allowlist
BACKEND_CORS_ORIGINS='["https://live-workspace.onrender.com", "https://yourcustomdomain.com"]'
```

### Frontend Configuration (`frontend/.env.production`)
```env
VITE_API_BASE_URL="https://your-backend-api.onrender.com/api/v1"
```

---

## 3. Render Deployment Setup

### A. Deploy Backend Web Service
1. Create a **Web Service** connected to your repository.
2. Configure settings:
   - **Environment:** `Python 3`
   - **Root Directory:** Leave empty (root of repo)
   - **Build Command:** `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 2`
3. Add Environment Variables specified in Section 2.
4. Add Disk Mount (Optional): Mount `/uploads` if storing uploads locally, or configure S3 bucket storage.

### B. Deploy Frontend Static Site
1. Create a **Static Site** connected to the repository.
2. Configure settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Add Redirect/Rewrite Rule for SPA Routing:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`

---

## 4. Docker Deployment (Optional)

### Run with Docker Compose
```bash
docker-compose up --build -d
```

### Multi-stage Build Commands
```bash
# Build Backend
docker build -t live-workspace-backend -f Dockerfile.backend .

# Build Frontend
docker build -t live-workspace-frontend -f Dockerfile.frontend ./frontend
```

---

## 5. Post-Deployment Verification Checklist

1. [ ] Health check endpoint returns HTTP 200: `GET /health`
2. [ ] Alembic migrations report head revision: `alembic current`
3. [ ] Seed database if initial setup: `python -m backend.app.seed`
4. [ ] Login with test credentials on frontend URL
5. [ ] Verify WebSocket connection over WSS in browser DevTools network tab
6. [ ] Confirm CORS headers match frontend production domain
