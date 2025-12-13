# TIME Trading Platform - Docker Configuration
# Multi-stage build for optimal size and security

# ===================================
# Stage 1: Build Backend
# ===================================
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build 2>/dev/null || npx tsc

# ===================================
# Stage 2: Build Frontend
# ===================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Build Next.js
RUN npm run build

# ===================================
# Stage 3: Production Backend Image
# ===================================
FROM node:18-alpine AS backend

WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S timeuser && \
    adduser -S timeuser -u 1001

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files
COPY --from=backend-builder /app/dist ./dist

# Copy necessary config files
COPY .env.example ./.env

# Set ownership
RUN chown -R timeuser:timeuser /app

# Switch to non-root user
USER timeuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

# Start server
CMD ["node", "dist/backend/index.js"]

# ===================================
# Stage 4: Production Frontend Image
# ===================================
FROM node:18-alpine AS frontend

WORKDIR /app

# Security: Create non-root user
RUN addgroup -g 1001 -S timeuser && \
    adduser -S timeuser -u 1001

# Copy package files and install
COPY frontend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built Next.js app
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/next.config.js ./

# Set ownership
RUN chown -R timeuser:timeuser /app

# Switch to non-root user
USER timeuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start Next.js
CMD ["npm", "start"]
