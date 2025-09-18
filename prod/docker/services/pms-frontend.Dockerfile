# PMS Frontend Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.1

# Copy package files
COPY dev/pms-portal/package*.json dev/pms-portal/pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY dev/pms-portal/ .

# Build the application
RUN pnpm run build

# Production stage - nginx
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder
COPY --from=base /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY prod/docker/configs/nginx-pms.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 5174

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5174/ || exit 1

CMD ["nginx", "-g", "daemon off;"]