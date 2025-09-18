# Multi-stage build for healthcare infrastructure
FROM node:20-alpine AS base

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S healthcare -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with security focus
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
ENV NODE_ENV=development

# Install all dependencies including dev
RUN npm ci

# Copy source code
COPY --chown=healthcare:nodejs . .

# Build the application
RUN npm run build

# Run as non-root user
USER healthcare

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy built application
COPY --chown=healthcare:nodejs --from=development /app/dist ./dist
COPY --chown=healthcare:nodejs --from=development /app/package*.json ./

# Security hardening
RUN apk --no-cache add dumb-init

# Run as non-root user
USER healthcare

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Testing stage
FROM development AS testing
ENV NODE_ENV=test

# Run tests
CMD ["npm", "test"]