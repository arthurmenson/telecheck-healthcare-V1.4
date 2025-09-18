# Production Dockerfile for Auth Service
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from the workstream directory
COPY workstream/auth-security/package*.json ./
COPY workstream/auth-security/pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY workstream/auth-security/src ./src
COPY workstream/auth-security/tsconfig.json ./

# Build the application
RUN pnpm run build || npx tsc

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and install production dependencies
COPY workstream/auth-security/package*.json ./
COPY workstream/auth-security/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

# Start the application
CMD ["node", "dist/index.js"]