#!/bin/bash

# ECR Registry
ECR_REGISTRY="891377354307.dkr.ecr.us-east-1.amazonaws.com"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

# Build and push each service
services=(
    "auth-security:spark-den/auth-service:3002"
    "core-services:spark-den/core-service:3001"
    "ai-ml-services:spark-den/ai-ml-service:3000"
    "analytics-reporting:spark-den/analytics-service:3003"
    "pms-integrations:spark-den/pms-integrations:3004"
    "frontend:spark-den/ehr-frontend:5173"
)

for service in "${services[@]}"; do
    IFS=':' read -r dir repo port <<< "$service"

    echo "Building $dir..."
    cd /Users/ikweku/Downloads/spark-den/workstream/$dir

    # Build the Docker image
    docker build -t $repo:latest .

    if [ $? -eq 0 ]; then
        echo "Tagging and pushing $repo..."
        docker tag $repo:latest $ECR_REGISTRY/$repo:latest
        docker push $ECR_REGISTRY/$repo:latest
        echo "Successfully pushed $repo"
    else
        echo "Failed to build $dir"
    fi
done

echo "Build and push complete!"