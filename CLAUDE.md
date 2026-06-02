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

This means **the frontend must be built before the backend starts in production** (`Dockerfile` and `backend/package.json`'s `build` script handle this). Two boot paths exist and they are not interchangeable:
- `backend/start.js` (used by Dockerfile via `node start.js`) — runs an idempotent inline seed for `admin@example.com` if missing, then requires `src/index.js`. Assumes schema is already pushed via `prisma db push`.
- `npm start` directly (used by Railway via `Procfile`) — runs `prisma migrate deploy` first, then `node src/index.js`. **No auto-seed.** A manual `npm run db:seed` is required after first deploy.

There are no committed Prisma migrations in `backend/prisma/migrations/`, so `migrate deploy` will be a no-op on a fresh DB — schema currently relies on `db push`. If you add a migration, generate it locally with `db:migrate` and commit the `migrations/` folder.

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

### Conventions
- Prisma uses camelCase model fields mapped to snake_case columns via `@map(...)`. Stick to camelCase in JS.
- All `date` columns are `@db.Date` (no time). Controllers construct `new Date(dateString)` — be careful about timezone drift when adding date logic.
- Controllers each instantiate their own `PrismaClient`. Don't introduce a global one without auditing connection pooling.
