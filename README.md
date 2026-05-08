# Team Scheduler Dashboard

A full-stack application for managing team schedules, shifts, and work locations with role-based access for admins and employees.

## Features

- **User Authentication**: Email/password auth with JWT, 22-user limit
- **Role-Based Access**: Admin and Employee roles with different permissions
- **Calendar View**: Monthly and weekly views showing team schedules
- **List View**: Filterable table view with date range and employee filters
- **Shift Management**: Admins can create/edit shift types
- **Bulk Scheduling**: Assign shifts to multiple employees for a date range
- **Work Status**: Employees can set Office/WFH/Leave status
- **Leave Management**: Full day, first half, or second half leave options
- **Reports**: Attendance summaries, charts, and CSV export

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, React Big Calendar, Recharts
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT with bcrypt

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run database migrations
npx prisma migrate dev

# Seed default data (shifts and admin user)
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs on http://localhost:5173 and proxies API requests to the backend on http://localhost:3001.

## Default Credentials

After running the seed script, you can log in with:
- Email: `admin@example.com`
- Password: `admin123`

## Deployment to Railway

This project is configured for single-service deployment on Railway. The backend serves both the API and the frontend static files.

### Quick Setup

1. Go to [Railway](https://railway.app) and create a new project
2. Add a **PostgreSQL** database service
3. Add a new service from your GitHub repo (`team_dashabord`)
4. Set environment variables:
   - `DATABASE_URL`: Copy from PostgreSQL service (use internal URL)
   - `JWT_SECRET`: Generate a secure random string
5. Deploy - Railway will automatically use `railway.json` config
6. After first deploy, open Railway shell and run:
   ```bash
   cd backend && npm run db:seed
   ```

### How It Works

- `railway.json` configures build and start commands
- Build: Installs backend deps, generates Prisma client, builds frontend
- Start: Runs database migrations, starts Express server
- Backend serves API at `/api/*` and frontend at `/*`
- Health check endpoint: `/health`

## API Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/auth/register | Register new user | Public |
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/me | Get current user | Auth |
| GET | /api/users | List all users | Auth |
| POST | /api/users | Create user | Admin |
| PUT | /api/users/:id | Update user | Admin |
| DELETE | /api/users/:id | Remove user | Admin |
| GET | /api/shifts | List shifts | Auth |
| POST | /api/shifts | Create shift | Admin |
| PUT | /api/shifts/:id | Update shift | Admin |
| DELETE | /api/shifts/:id | Delete shift | Admin |
| GET | /api/schedules | Get schedules | Auth |
| POST | /api/schedules/bulk | Bulk assign | Admin |
| GET | /api/work-status | Get work statuses | Auth |
| PUT | /api/work-status | Update own status | Auth |
| GET | /api/reports/summary | Get summary | Auth |
| GET | /api/reports/export | Export CSV | Admin |

## Project Structure

```
team-scheduler/
├── railway.json              # Railway deployment config
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.js           # Seed data
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Auth middleware
│   │   ├── routes/           # API routes
│   │   └── index.js          # Express app (serves frontend)
│   ├── Procfile              # Railway start command
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # Shared components
│   │   ├── context/          # Auth context
│   │   ├── pages/            # Page components
│   │   ├── App.jsx           # Main app with routes
│   │   └── main.jsx          # Entry point
│   └── package.json
└── README.md
```

## License

MIT
