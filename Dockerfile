FROM node:20-alpine

WORKDIR /app

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

# Start command
CMD ["sh", "-c", "cd backend && npm run db:migrate:deploy && npm start"]
