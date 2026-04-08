# Implementation

## Per-user wells and dashboards

Wells are scoped by **login email** (frontend `localStorage.auth` → HTTP header `X-User-Email`). Each user only sees and manages wells they own.

- **New users** start with an empty well list until they **Create Well**.
- **Existing SQLite DBs**: after upgrading, wells may have `owner_email` NULL until assigned. Options:
  1. Create new wells while signed in (recommended).
  2. **Claim** an unowned well: use **Create Well** with the same `well_id` while logged in — the API assigns you as owner.
  3. **Dev / one-time**: set env `BOOTSTRAP_WELL_OWNER_EMAIL=you@example.com` before starting the backend once; all wells with NULL `owner_email` are assigned to that email.

**Note:** Email/password auth is client-side only; the header identifies the user to the API. For production, use real auth (JWT) and map to user IDs on the server.

## Testing

**Backend (pytest):** From `Implementation/backend`, install deps (`pip install -r requirements.txt`) and run `python -m pytest tests/ -v`.

Tests cover auth scoping, ingestion and `insert_operations`, PDF parser helpers, AI rule-based segment severity, column/header utilities (skipped automatically if NumPy/pandas cannot load, e.g. blocked DLLs), and a FastAPI root smoke test.

**Frontend (Vitest):** From `Implementation/frontend`, run `npm run test` (or `npm run test:watch` during development). Covers `segmentEventType` and `severityDisplay` helpers.
