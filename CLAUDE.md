# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`backend/`)
- `npm run dev` — Start API with nodemon on port 3001
- `npm start` — Run API without watch (production)
- `npm run db:migrate` — Create/apply a Prisma migration locally (`prisma migrate dev`)
- `npm run db:migrate:deploy` — Apply pending migrations (used in Procfile on Railway)
- `npm run db:push` — Push schema without creating a migration (used in `Dockerfile`)
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

This means **the frontend must be built before the backend starts in production** (`Dockerfile` and `backend/package.json`'s `build` script handle this).

**Boot sequence** (both Dockerfile and Procfile now go through the same path):
1. `backend/scripts/migrate.js` — inspects the DB state and does one of:
   - Fresh DB → `prisma migrate deploy` from scratch
   - Existing tables but no `_prisma_migrations` table (i.e. created previously via `db push`) → baseline by `prisma migrate resolve --applied 20260602120000_init`, then `prisma migrate deploy`
   - Already migrated → just `prisma migrate deploy`
2. `backend/start.js` — idempotent in-process seed (creates `admin@example.com / admin123` if no admin user exists, seeds default shifts, and backfills the `allowed_emails` whitelist on first boot from the legacy hardcoded list).
3. `require('./src/index.js')` — boots Express.

The init migration `prisma/migrations/20260602120000_init/migration.sql` captures the schema as of the cascade-restrict + audit-log change. Future schema edits should go through `npx prisma migrate dev --name <name>` locally, commit the generated migration directory, and Railway will pick it up via `migrate deploy`. **Do not use `prisma db push` for schema changes** — it bypasses the migration history and the bootstrap script would then treat the DB as un-migrated.

### Auth and authorization
JWT (7-day expiry) issued on login/register, sent as `Authorization: Bearer <token>`. The `authenticate` middleware in `backend/src/middleware/auth.js` loads the user fresh from the DB on every request and rejects inactive users. `requireAdmin` gates admin-only routes.

Three layered authorization rules to be aware of when editing auth:
1. **Email whitelist** (`backend/src/controllers/authController.js`) — `ALLOWED_EMAILS` is the hard list of who can register. New teammates must be added here.
2. **Primary admin** — `arun.s@exotel.com` is hardcoded as `PRIMARY_ADMIN_EMAIL`. Only the primary admin can change other users' roles, and the primary admin cannot be demoted (`userController.updateUser`).
3. **MAX_USERS** is defined in two places: `authController.js` (registration cap, set to `ALLOWED_EMAILS.length`) and `userController.js` (admin-create cap, hardcoded `21`). If you change the team size, update both.

User deletion is soft — `isActive = false`. `getUsers` filters out inactive users.

### Domain model (`backend/prisma/schema.prisma`)
- `User` ↔ `Schedule` (many) — one shift per user per date (unique constraint `[userId, date]`)
- `User` ↔ `WorkStatus` (many) — one status per user per date (unique constraint `[userId, date]`)
- `Shift` → has many `Schedule`s
- `WorkStatus.status` ∈ `office | home | leave`; `leaveType` ∈ `full | first_half | second_half` and is **required iff status is `leave`** (enforced in `workStatusController.js`, not at the DB level)

`bulkAssignSchedules` deletes all existing schedules in the date range for the given users before inserting — this is destructive overwrite behavior, not a merge.

Admins can update *another* user's work status by passing `userId` in the body of `PUT /api/work-status` (or the bulk variant); employees can only update their own.

### Frontend structure
- `src/api/client.js` — single axios instance; baseURL is `VITE_API_URL` or `/api`. A 401 interceptor clears `localStorage` and hard-redirects to `/login`.
- `src/context/AuthContext.jsx` — persists `token` and `user` in `localStorage`, exposes `useAuth()` with `{ user, loading, login, register, logout, isAdmin }`.
- `src/App.jsx` — all routing. `PrivateRoute` and `PrivateRoute adminOnly` wrap the protected routes; the admin-only pages are `/employees`, `/shifts`, `/assign`.
- `src/pages/` — one component per route; no shared state beyond `AuthContext`. Pages call the API directly via `src/api/client.js`.

### Data-safety guardrails (read before editing)
- `Schedule.user` / `Schedule.shift` / `WorkStatus.user` are `onDelete: Restrict`. Hard-deleting a User or Shift that has dependent rows will fail at the DB level. **Don't change these to Cascade** without an audit — the whole point is to prevent a single bad DELETE from wiping months of schedules. User and Shift deletes go through soft-delete (`isActive = false`) instead.
- Every destructive operation writes an `AuditLog` row via `backend/src/lib/audit.js`. When you add a new destructive endpoint, call `logAudit(req, { action, entityType, entityId, metadata })`. Audit failures are non-fatal (logged to stderr, the user op still succeeds).
- `bulkAssignSchedules` is **upsert-in-transaction**, not delete+insert. There's a hard cap (`MAX_OPS = 1000`) on `users × days` per call to prevent runaway writes. If you need to lift it, also reconsider transaction size.
- Schema deploy currently uses `prisma db push` (Dockerfile). `db push` refuses destructive changes by default — but it bypasses migration history, so there's no rollback. Switching to committed migrations + `migrate deploy` is a separate planned change; baselining the existing production DB requires `prisma migrate resolve --applied <name>` before the first `migrate deploy`.

### Conventions
- Prisma uses camelCase model fields mapped to snake_case columns via `@map(...)`. Stick to camelCase in JS.
- All `date` columns are `@db.Date` (no time). Controllers construct `new Date(dateString)` — be careful about timezone drift when adding date logic.
- Controllers each instantiate their own `PrismaClient`. Don't introduce a global one without auditing connection pooling.
