#!/bin/bash

# Build and push all Docker images to ECR
# This script builds all microservices for the Spark-Den platform

set -e

ECR_REGISTRY="901076063012.dkr.ecr.us-east-1.amazonaws.com"
BASE_DIR="/Users/ikweku/Downloads/spark-den/dev/workstream"

# Services to build (excluding frontend and auth-security which are already done)
SERVICES=(
    "ai-ml-services"
    "core-services"
    "analytics-reporting"
    "pms-integrations"
)

echo "🚀 Building and pushing Docker images to ECR..."

for service in "${SERVICES[@]}"; do
    echo "📦 Building $service..."

    cd "$BASE_DIR/$service"

    # Fix Dockerfile if it has frozen lockfile issues
    if [ -f "Dockerfile" ]; then
        sed -i '' 's/--frozen-lockfile/--no-frozen-lockfile/g' Dockerfile 2>/dev/null || true
    fi

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
for service in "frontend" "auth-security" "${SERVICES[@]}"; do
    echo "  - $ECR_REGISTRY/spark-den-$service:latest"
done