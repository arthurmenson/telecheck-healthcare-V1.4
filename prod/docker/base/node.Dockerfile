# Base Node.js Dockerfile for all services
FROM node:20-alpine AS base

# Install necessary packages
RUN apk add --no-cache \
    curl \
    bash \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Development stage
FROM base AS development
RUN pnpm install --frozen-lockfile
COPY . .
CMD ["pnpm", "run", "dev"]

# Build stage
FROM base AS builder
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Production dependencies
FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --prod

# Production stage
FROM node:20-alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy production dependencies and built application
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port (will be overridden by service-specific Dockerfiles)
EXPOSE 3000

# Health check (will be overridden by service-specific Dockerfiles)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["node", "dist/index.js"]