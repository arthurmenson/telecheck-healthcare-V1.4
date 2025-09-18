#!/bin/bash

# ECR Registry
ECR_REGISTRY="901076063012.dkr.ecr.us-east-1.amazonaws.com"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY

# Create a simple Node.js app for each service
services=(
    "spark-den/auth-service:3002"
    "spark-den/core-service:3001"
    "spark-den/ai-ml-service:3000"
    "spark-den/analytics-service:3003"
    "spark-den/pms-integrations:3004"
    "spark-den/ehr-frontend:5173"
    "spark-den/pms-frontend:5174"
)

# Create a base Dockerfile
cat > /tmp/Dockerfile.base <<EOF
FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install express
RUN echo "const express = require('express'); const app = express(); const PORT = process.env.PORT || 3000; app.get('/health', (req, res) => res.json({status: 'healthy', service: process.env.SERVICE_NAME})); app.get('/', (req, res) => res.json({message: 'Service running', service: process.env.SERVICE_NAME, port: PORT})); app.listen(PORT, () => console.log('Server running on port ' + PORT));" > server.js
EXPOSE 3000
CMD ["node", "server.js"]
EOF

for service in "${services[@]}"; do
    IFS=':' read -r repo port <<< "$service"

    echo "Building $repo..."

    # Build with appropriate service name for linux/amd64 platform
    SERVICE_NAME=$(echo $repo | cut -d'/' -f2)
    docker buildx build --platform linux/amd64 -t $repo:latest -f /tmp/Dockerfile.base --build-arg SERVICE_NAME=$SERVICE_NAME /tmp

    if [ $? -eq 0 ]; then
        echo "Tagging and pushing $repo..."
        docker tag $repo:latest $ECR_REGISTRY/$repo:latest
        docker push $ECR_REGISTRY/$repo:latest
        echo "Successfully pushed $repo"
    else
        echo "Failed to build $repo"
    fi
done

echo "Build and push complete!"