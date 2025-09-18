FROM node:20-alpine

WORKDIR /app

# Install dependencies and runtime tools
RUN apk add --no-cache python3 make g++ curl
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run with tsx (TypeScript runtime)
CMD ["npx", "tsx", "src/simple-server.ts"]
