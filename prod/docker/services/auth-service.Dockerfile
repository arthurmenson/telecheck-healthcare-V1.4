# Auth Service Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm and dependencies
RUN npm install -g pnpm@8.15.1 && \
    apk add --no-cache curl bash

# Copy package files
COPY workstream/auth-security/package*.json workstream/auth-security/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY workstream/auth-security/ .
COPY shared/ ../shared/

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./
COPY --from=base /shared ../shared

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]