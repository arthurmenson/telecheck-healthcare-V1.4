#!/bin/bash

# Deploy Services to ECS
# Usage: ./deploy-to-ecs.sh [service-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
CLUSTER_NAME="spark-den-cluster"
PROJECT_NAME="spark-den"

# Services to deploy
SERVICES=(
    "auth-service"
    "core-service"
    "ai-ml-service"
    "analytics-service"
    "pms-integrations"
    "ehr-frontend"
    "pms-frontend"
)

echo -e "${GREEN}=== Spark Den ECS Deployment ===${NC}"
echo -e "Cluster: ${CLUSTER_NAME}"
echo -e "Region: ${AWS_REGION}"
echo ""

# Function to deploy a service
deploy_service() {
    local service=$1
    local service_name="${PROJECT_NAME}-${service}"
    
    echo -e "\n${YELLOW}Deploying ${service}...${NC}"
    
    # Force new deployment
    aws ecs update-service \
        --cluster ${CLUSTER_NAME} \
        --service ${service_name} \
        --force-new-deployment \
        --region ${AWS_REGION} \
        --output json > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Deployment initiated for ${service}${NC}"
    else
        echo -e "${RED}✗ Failed to deploy ${service}${NC}"
        return 1
    fi
    
    # Wait for service to stabilize (optional)
    echo -e "${YELLOW}Waiting for ${service} to stabilize...${NC}"
    aws ecs wait services-stable \
        --cluster ${CLUSTER_NAME} \
        --services ${service_name} \
        --region ${AWS_REGION} 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} is stable${NC}"
    else
        echo -e "${YELLOW}⚠ ${service} stabilization timed out (service may still be deploying)${NC}"
    fi
    
    # Get deployment status
    RUNNING_COUNT=$(aws ecs describe-services \
        --cluster ${CLUSTER_NAME} \
        --services ${service_name} \
        --region ${AWS_REGION} \
        --query "services[0].runningCount" \
        --output text)
    
    DESIRED_COUNT=$(aws ecs describe-services \
        --cluster ${CLUSTER_NAME} \
        --services ${service_name} \
        --region ${AWS_REGION} \
        --query "services[0].desiredCount" \
        --output text)
    
    echo -e "  Running: ${RUNNING_COUNT}/${DESIRED_COUNT} tasks"
}

# Check if a specific service was provided
if [ $# -eq 1 ]; then
    SERVICE_NAME=$1
    if [[ " ${SERVICES[@]} " =~ " ${SERVICE_NAME} " ]]; then
        deploy_service ${SERVICE_NAME}
    else
        echo -e "${RED}Error: Unknown service '${SERVICE_NAME}'${NC}"
        echo "Available services:"
        printf '%s\n' "${SERVICES[@]}"
        exit 1
    fi
else
    # Deploy all services
    for service in "${SERVICES[@]}"; do
        deploy_service ${service}
        if [ $? -ne 0 ]; then
            echo -e "${RED}Deployment failed for ${service}.${NC}"
        fi
    done
fi

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "\nTo check service status:"
echo -e "  ${YELLOW}aws ecs list-services --cluster ${CLUSTER_NAME}${NC}"
echo -e "\nTo view logs:"
echo -e "  ${YELLOW}aws logs tail /ecs/${PROJECT_NAME}/<service-name> --follow${NC}"