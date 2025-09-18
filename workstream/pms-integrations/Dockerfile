FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile || npm install

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm run build || npx tsc || echo "No TypeScript build needed"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod || npm install --production

# Copy built app from builder stage (if exists) or source files
COPY --from=builder /app/dist ./dist 2>/dev/null || COPY --from=builder /app/src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3004/health || exit 1

# Try built JS first, fallback to TypeScript
CMD ["sh", "-c", "node dist/index.js 2>/dev/null || npx tsx src/index.ts"]
