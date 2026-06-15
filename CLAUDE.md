# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Internal tool for scheduling shifts across a 21-person team. The end goal is a **night-shift allowance report** at end of month. Admins (Arun, Ashwin, Manikandan) assign shifts; everyone else has a read-only view. Leave / WFH / office status is **not** managed here — that lives in another system.

## Commands

### Backend (`backend/`)
- `npm run dev` — Start API with nodemon on port 3001
- `npm start` — Run API without watch (production)
- `npm run db:migrate` — Create/apply a Prisma migration locally (`prisma migrate dev`)
- `npm run db:migrate:deploy` — Apply pending migrations (only used by `scripts/migrate.js`)
- `npm run db:generate` — Regenerate the Prisma client after schema changes
- `npm run db:seed` — Run `prisma/seed.js` (seeds default shifts + `admin@example.com / admin123`)
- `npm run build` — `prisma generate` then build the frontend (used by Railway)

### Frontend (`frontend/`)
- `npm run dev` — Vite dev server on port 5173, proxies `/api` → `http://localhost:3001`
- `npm run build` — Production bundle into `frontend/dist/`
- `npm run preview` — Serve the built bundle locally

There is no test suite, no linter, and no formatter configured.

## Architecture

### Single-service deployment
The Express server is the only deployed process. In production it serves both:
1. `/api/*` — JSON API
2. `/*` — static files from `frontend/dist/` (with SPA fallback to `index.html`)

The frontend must be built before the backend starts in production (`Dockerfile` and `backend/package.json`'s `build` script handle this).

**Boot sequence** (both Dockerfile and Procfile go through the same path):
1. `backend/scripts/migrate.js` — inspects the DB state and does one of:
   - Fresh DB → `prisma migrate deploy` from scratch
   - Existing tables but no `_prisma_migrations` table (i.e. created previously via `db push`) → baseline by `prisma migrate resolve --applied 20260602120000_init`, then `prisma migrate deploy`
   - Already migrated → just `prisma migrate deploy`
2. `backend/start.js` — idempotent in-process seed: creates `admin@example.com / admin123` if no admin user exists, seeds default shifts, backfills the `allowed_emails` whitelist on first boot from the legacy hardcoded list, and promotes the three lead admins (Arun, Ashwin, Manikandan) on every boot.
3. `require('./src/index.js')` — boots Express.

Schema changes go through `npx prisma migrate dev --name <name>` locally — commit the generated migration directory and Railway will apply it via `migrate deploy`. **Do not use `prisma db push`** — it bypasses the migration history.

### Auth and authorization
JWT (7-day expiry) issued on login/register, sent as `Authorization: Bearer <token>`. The `authenticate` middleware in `backend/src/middleware/auth.js` loads the user fresh from the DB on every request and rejects inactive users. `requireAdmin` gates admin-only routes.

Authorization layers:
1. **Email whitelist** (`allowed_emails` table) — only emails in this table (or the primary admin) can register. Managed via the Team page UI.
2. **Primary admin** — `arun.s@exotel.com` is hardcoded as `PRIMARY_ADMIN_EMAIL`. Only the primary admin can change other users' roles, and the primary admin cannot be demoted (`userController.updateUser`).
3. **Lead admins** — Ashwin and Manikandan are also admins. They're promoted automatically on every boot by `start.js` (idempotent). They have the same permissions as the primary admin except they cannot change roles.

User deletion is soft — `isActive = false`. `getUsers` filters out inactive users.

### Domain model (`backend/prisma/schema.prisma`)
- `User` ↔ `Schedule` — one shift per user per date (unique constraint `[userId, date]`)
- `Shift` → has many `Schedule`s. `Shift.isNightShift` (boolean) marks shifts that count toward the night-shift allowance report.
- `AllowedEmail` — registration whitelist with a default role (set by admin when adding the email).
- `AuditLog` — append-only log of every destructive op (see Guardrails).

`bulkAssignSchedules` is **upsert-in-transaction**, not delete+insert. There's a hard cap (`MAX_OPS = 1000`) on `users × days` per call to prevent runaway writes.

### API surface
All routes are wired in a single file: `backend/src/routes/index.js`, mounted at `/api`. There are no per-resource route modules — adding a new endpoint means adding one line there plus a controller method. The night-shift allowance report lives at `GET /api/reports/night-shift` (JSON) and `GET /api/reports/night-shift/export` (CSV, admin-only).

### Frontend structure
- `src/api/client.js` — single axios instance; baseURL is `VITE_API_URL` or `/api`. A 401 interceptor clears `localStorage` and hard-redirects to `/login`.
- `src/context/AuthContext.jsx` — persists `token`, `user`, and `viewAsRole` in `localStorage`. Exposes `useAuth()` with `{ user, loading, login, register, logout, isAdmin, effectiveRole, isEffectiveAdmin, isImpersonating, setViewAsRole }`. **Use `isEffectiveAdmin` for gating UI**, not `isAdmin`, so the View-as-Employee toggle works.
- `src/App.jsx` — all routing. `PrivateRoute adminOnly` gates admin pages.
  - Everyone: `/` (Dashboard), `/calendar`, `/list`, `/reports` (night-shift allowance UI — the app's end goal).
  - Admin only: `/employees`, `/shifts`, `/assign`, `/activity`.
- View-as-Employee toggle (top bar + impersonation banner) — purely a UI switch. Backend permissions are unchanged; if an admin really wants to take an admin action, they switch back. Backend routes still check the actual JWT role.

### Data-safety guardrails (read before editing)
- `Schedule.user` and `Schedule.shift` are `onDelete: Restrict`. Hard-deleting a User or Shift that has dependent rows will fail at the DB level. **Don't change these to Cascade** — the whole point is to prevent a single bad DELETE from wiping months of schedules. User and Shift deletes go through soft-delete (`isActive = false`) instead.
- Every destructive operation writes an `AuditLog` row via `backend/src/lib/audit.js`. When you add a new destructive endpoint, call `logAudit(req, { action, entityType, entityId, metadata })`. Audit failures are non-fatal (logged to stderr, the user op still succeeds).
- The Activity page (`/activity`, admin only) surfaces audit_logs with filtering.

### Conventions
- Prisma uses camelCase model fields mapped to snake_case columns via `@map(...)`. Stick to camelCase in JS.
- All `date` columns are `@db.Date` (no time). Controllers construct `new Date(dateString)` — be careful about timezone drift when adding date logic.
- Controllers each instantiate their own `PrismaClient`. Don't introduce a global one without auditing connection pooling.
- `README.md` is partially stale — it still describes work-status / leave management, a 22-user limit, and generic reports/CSV endpoints that were removed in the refocus to shift assignment + night-shift allowance (commit `5f164bf`). Trust this file over `README.md` when they disagree.
