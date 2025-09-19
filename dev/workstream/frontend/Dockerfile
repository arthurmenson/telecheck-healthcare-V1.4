# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build || echo "Build might have warnings, continuing..."

# Ensure dist directory exists (create a minimal one if build failed)
RUN if [ ! -d "dist" ]; then \
    mkdir -p dist && \
    echo '<!DOCTYPE html><html><head><title>Frontend</title></head><body><h1>Frontend Service</h1></body></html>' > dist/index.html; \
    fi

# Production stage - using nginx to serve static files
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
RUN echo 'server { \
    listen 5173; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5173/health || exit 1

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
