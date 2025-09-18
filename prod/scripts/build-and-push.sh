#!/bin/bash

# Build and Push Docker Images to ECR
# Usage: ./build-and-push.sh [service-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
PROJECT_NAME="spark-den"

# Services to build
SERVICES=(
    "auth-service"
    "core-service"
    "ai-ml-service"
    "analytics-service"
    "pms-integrations"
    "ehr-frontend"
    "pms-frontend"
)

echo -e "${GREEN}=== Spark Den Docker Build & Push ===${NC}"
echo -e "AWS Account: ${AWS_ACCOUNT_ID}"
echo -e "AWS Region: ${AWS_REGION}"
echo -e "ECR Registry: ${ECR_REGISTRY}"
echo ""

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Function to build and push a service
build_and_push() {
    local service=$1
    echo -e "\n${YELLOW}Building ${service}...${NC}"
    
    # Determine the Dockerfile path
    DOCKERFILE="prod/docker/services/${service}.Dockerfile"
    
    if [ ! -f "../${DOCKERFILE}" ]; then
        echo -e "${RED}Error: Dockerfile not found at ${DOCKERFILE}${NC}"
        return 1
    fi
    
    # Build the image
    docker build \
        -t ${PROJECT_NAME}/${service}:latest \
        -f ../${DOCKERFILE} \
        ../
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Built ${service}${NC}"
    else
        echo -e "${RED}✗ Failed to build ${service}${NC}"
        return 1
    fi
    
    # Tag the image
    docker tag ${PROJECT_NAME}/${service}:latest ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:latest
    docker tag ${PROJECT_NAME}/${service}:latest ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:$(date +%Y%m%d-%H%M%S)
    
    # Push the image
    echo -e "${YELLOW}Pushing ${service} to ECR...${NC}"
    docker push ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:latest
    docker push ${ECR_REGISTRY}/${PROJECT_NAME}/${service}:$(date +%Y%m%d-%H%M%S)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Pushed ${service} to ECR${NC}"
    else
        echo -e "${RED}✗ Failed to push ${service}${NC}"
        return 1
    fi
}

# Check if a specific service was provided
if [ $# -eq 1 ]; then
    SERVICE_NAME=$1
    if [[ " ${SERVICES[@]} " =~ " ${SERVICE_NAME} " ]]; then
        build_and_push ${SERVICE_NAME}
    else
        echo -e "${RED}Error: Unknown service '${SERVICE_NAME}'${NC}"
        echo "Available services:"
        printf '%s\n' "${SERVICES[@]}"
        exit 1
    fi
else
    # Build all services
    for service in "${SERVICES[@]}"; do
        build_and_push ${service}
        if [ $? -ne 0 ]; then
            echo -e "${RED}Build failed for ${service}. Stopping.${NC}"
            exit 1
        fi
    done
fi

echo -e "\n${GREEN}=== Build & Push Complete ===${NC}"
echo -e "${GREEN}All images have been pushed to ECR.${NC}"
echo -e "\nTo deploy to ECS, run:"
echo -e "  ${YELLOW}./deploy-to-ecs.sh${NC}"