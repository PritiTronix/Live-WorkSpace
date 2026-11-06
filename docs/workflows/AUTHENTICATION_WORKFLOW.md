# Live Workspace — Authentication & Onboarding Workflow

## 1. Overview

The authentication lifecycle covers registration, email verification, organization creation or invitation joining, password recovery, session management via JWT, and profile completion.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as React Client
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB

    Note over User, DB: User Registration & Onboarding Flow
    User->>Web: Submits Registration Form
    Web->>API: POST /api/v1/auth/register
    API->>DB: Check unique email & Hash password (bcrypt)
    DB-->>API: User Record Created (is_active=False)
    API-->>Web: 201 Created (Verification Token sent)
    User->>Web: Enters 6-digit verification code
    Web->>API: POST /api/v1/auth/verify-email
    API->>DB: Activate User (is_active=True)
    API-->>Web: Success & Redirect to Organization Choice
    
    alt User creates new organization
        User->>Web: Fill Organization Name & Slug
        Web->>API: POST /api/v1/organizations (Role: Owner)
    else User joins via invite link
        User->>Web: Enter invite code
        Web->>API: POST /api/v1/organizations/join (Role: Member)
    end
    API-->>Web: JWT Access Token & Refresh Cookie
    Web->>User: Enters /workspace/dashboard
```

---

## 2. Token Specification & Security Policies

- **Access Token**: JWT containing `sub` (User UUID), `org_id`, `role`, and expiration (`exp`: 60 minutes).
- **Refresh Strategy**: Sliding window refresh with 7-day TTL stored in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie.
- **Password Requirements**: Minimum 8 characters, uppercase, lowercase, number, and special character.
