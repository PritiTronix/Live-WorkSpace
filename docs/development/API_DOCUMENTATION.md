# Live Workspace — RESTful API Documentation

## 1. Base URL & Protocol

- **Development Base URL**: `http://localhost:8000/api/v1`
- **Interactive OpenAPI Documentation (Swagger)**: `http://localhost:8000/api/v1/docs`
- **ReDoc Documentation**: `http://localhost:8000/api/v1/redoc`

---

## 2. Global Response Conventions

All API responses follow consistent HTTP status semantics:

| HTTP Code | Description |
| :--- | :--- |
| `200 OK` | Request succeeded, returning requested payload |
| `201 Created` | Resource successfully persisted |
| `400 Bad Request` | Malformed parameters or business rule violation |
| `401 Unauthorized` | Missing, expired, or invalid JWT Bearer token |
| `403 Forbidden` | Insufficient RBAC privileges for workspace resource |
| `404 Not Found` | Requested resource UUID does not exist |
| `422 Unprocessable` | Pydantic schema validation error |
| `500 Server Error` | Unexpected server exception |

---

## 3. Core API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` — Register user account
- `POST /auth/login` — Authenticate and obtain JWT access token
- `POST /auth/verify-email` — Verify account email with token
- `POST /auth/forgot-password` — Dispatch password reset link
- `POST /auth/reset-password` — Finalize password reset

### Organizations (`/organizations`)
- `POST /organizations` — Provision new organization workspace
- `POST /organizations/join` — Join organization via invite code

### Projects (`/projects`)
- `GET /projects` — List organization projects
- `POST /projects` — Create project
- `GET /projects/{id}` — Retrieve project metadata and tabs

### Tickets (`/tickets`)
- `GET /tickets` — List and filter tickets (table, board, priority)
- `POST /tickets` — Ingest ticket with automated SLA timers
- `PATCH /tickets/{id}/status` — Transition workflow status
- `PATCH /tickets/{id}/severity` — Update severity and recalibrate SLA

### SLA Management (`/sla`)
- `GET /sla/metrics` — Aggregate SLA compliance percentages
- `GET /sla/policies` — List configured SLA response/resolution rules

### Root Cause Analysis (`/rca`)
- `GET /rca/ticket/{id}` — Fetch ticket RCA documentation
- `POST /rca/ticket/{id}` — Submit completed RCA incident record
