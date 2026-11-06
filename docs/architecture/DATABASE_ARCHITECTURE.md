# Live Workspace — Database Architecture & Schema Specification

## 1. Engine & Database Strategy

- **Database**: PostgreSQL 16+
- **Driver**: `asyncpg` (Asynchronous driver for high throughput)
- **ORM**: SQLAlchemy 2.0 (Declarative Mapping)
- **Migrations**: Alembic

---

## 2. Entity-Relationship Model

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : contains
    ORGANIZATIONS ||--o{ PROJECTS : owns
    ORGANIZATIONS ||--o{ SLA_POLICIES : defines
    PROJECTS ||--o{ TICKETS : tracks
    PROJECTS ||--o{ TASKS : schedules
    TICKETS ||--o{ TICKET_COMMENTS : has
    TICKETS ||--o| ROOT_CAUSE_ANALYSIS : generates
    TICKETS }|--|| SLA_POLICIES : adheres_to
    USERS ||--o{ ACTIVITY_LOGS : triggers

    ORGANIZATIONS {
        uuid id PK
        string name
        string slug UK
        timestamp created_at
    }

    USERS {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        string role
        boolean is_active
        uuid organization_id FK
        timestamp created_at
    }

    PROJECTS {
        uuid id PK
        string name
        text description
        string status
        uuid organization_id FK
        timestamp created_at
    }

    TICKETS {
        uuid id PK
        string ticket_number UK
        string title
        text description
        string severity
        string status
        uuid project_id FK
        uuid assigned_to FK
        timestamp created_at
        timestamp first_responded_at
        timestamp resolved_at
    }

    SLA_POLICIES {
        uuid id PK
        string severity UK
        int response_time_minutes
        int resolution_time_minutes
        uuid organization_id FK
    }

    ROOT_CAUSE_ANALYSIS {
        uuid id PK
        uuid ticket_id FK
        text summary
        text root_cause
        text preventive_actions
        string status
        timestamp submitted_at
    }
```

---

## 3. Indexing Strategy

1. **Composite Indexes**:
   - `(organization_id, status)` on `tickets` and `projects` for fast filtered listing.
   - `(ticket_id, created_at DESC)` on `ticket_comments` and `activity_logs`.
2. **Unique Indexes**:
   - `organizations.slug`
   - `users.email`
   - `tickets.ticket_number`
3. **Foreign Key Performance**:
   - All foreign keys are indexed explicitly to optimize joins.
