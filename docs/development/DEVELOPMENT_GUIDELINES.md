# Live Workspace — Development Guidelines & Code Standards

## 1. Code Quality & Standards

- **Python (Backend)**:
  - PEP8 compliance enforced via Flake8 / Ruff.
  - Strict type hints on all function parameters and return values.
  - Pydantic v2 schemas for all request/response models.
  - SQLAlchemy async queries with `select()` and explicit relationship loading (`selectinload`).
- **JavaScript / React (Frontend)**:
  - Functional components with React Hooks.
  - Tailwind CSS classes utilizing official theme tokens (`text-[#141529]`, `bg-[#6848E8]`, etc.).
  - Centralized UI components from `src/components/` must be preferred over bespoke controls.
  - DRY (Don't Repeat Yourself) principle across all modules.

---

## 2. Directory Separation Rules

- **Frontend Code**: Resides strictly inside `frontend/` (or mapped client root).
- **Backend Code**: Resides strictly inside `backend/` (or server root).
- Never place backend business logic inside frontend handlers.
- Never hardcode API tokens or database secrets in client code.

---

## 3. Git Commit Message Standards

Conventional commits are strictly enforced:
- `feat: add dual-timer SLA counter in ticket drawer`
- `fix: resolve race condition in token refresh rotation`
- `docs: update route mapping matrix for RCA forms`
- `refactor: extract shared modal backdrop into common library`
