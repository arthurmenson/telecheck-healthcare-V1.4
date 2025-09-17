#!/bin/bash

# Build and push Docker images with simple runtime approach
set -e

ECR_REGISTRY="901076063012.dkr.ecr.us-east-1.amazonaws.com"
BASE_DIR="/Users/ikweku/Downloads/spark-den/dev/workstream"

# Services to build (excluding frontend and auth-security which are already done)
SERVICES=(
    "ai-ml-services:3000"
    "core-services:3001"
    "analytics-reporting:3003"
    "pms-integrations:3004"
)

# Simple Dockerfile template
create_simple_dockerfile() {
    local service_name=$1
    local port=$2
    local main_file=$3

    cat > "$BASE_DIR/$service_name/Dockerfile" << EOF
FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE $port

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:$port/health || exit 1

# Run with tsx directly (no build needed)
CMD ["npx", "tsx", "$main_file"]
EOF
}

echo "🚀 Building Docker images with simple runtime approach..."

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_info"
    echo "📦 Building $service..."

    # Determine main file
    case $service in
        "ai-ml-services")
            main_file="src/index.ts"
            ;;
        "core-services")
            main_file="src/index.ts"
            ;;
        "analytics-reporting")
            main_file="src/server.ts"
            ;;
        "pms-integrations")
            main_file="src/server/index.ts"
            ;;
    esac

    # Create simple Dockerfile
    create_simple_dockerfile "$service" "$port" "$main_file"

    cd "$BASE_DIR/$service"

    # Build and tag the image
    docker build -t "spark-den-$service" .
    docker tag "spark-den-$service:latest" "$ECR_REGISTRY/spark-den-$service:latest"

    # Push to ECR
    echo "🔄 Pushing $service to ECR..."
    docker push "$ECR_REGISTRY/spark-den-$service:latest"

    echo "✅ Successfully pushed $service"
    echo ""
done

echo "🎉 All images built and pushed successfully!"
echo ""
echo "📋 Images available in ECR:"
for service_info in "frontend:80" "auth-security:3002" "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_info"
    echo "  - $ECR_REGISTRY/spark-den-$service:latest"
done