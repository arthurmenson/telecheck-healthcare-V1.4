#!/bin/bash

# Rebuild all Docker images for AMD64 platform
set -e

ECR_REGISTRY="901076063012.dkr.ecr.us-east-1.amazonaws.com"
BASE_DIR="/Users/ikweku/Downloads/spark-den/dev/workstream"

# Services to rebuild
SERVICES=(
    "auth-security"
    "ai-ml-services"
    "core-services"
    "analytics-reporting"
    "pms-integrations"
)

echo "🚀 Rebuilding all Docker images for AMD64 platform..."

for service in "${SERVICES[@]}"; do
    echo "📦 Rebuilding $service for AMD64..."

    cd "$BASE_DIR/$service"

    # Build for AMD64 platform and push
    docker build --platform linux/amd64 -t "spark-den-$service" .
    docker tag "spark-den-$service:latest" "$ECR_REGISTRY/spark-den-$service:latest"
    docker push "$ECR_REGISTRY/spark-den-$service:latest"

    echo "✅ Successfully rebuilt and pushed $service"
    echo ""
done

echo "🎉 All images rebuilt for AMD64 and pushed successfully!"