FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci
RUN cd frontend && npm ci

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Generate Prisma client and build frontend
RUN cd backend && npx prisma generate
RUN cd frontend && npm run build

# Expose port
EXPOSE 3001

# Start command - migrate (with safe baselining for existing DBs) and run with auto-seed
CMD ["sh", "-c", "cd backend && node scripts/migrate.js && node start.js"]
