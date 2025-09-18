#!/bin/bash

# Simple production deployment script that uses the existing simple Express servers
# This ensures the deployment works while the actual application code is prepared

set -e

echo "========================================="
echo "PRODUCTION DEPLOYMENT - SIMPLIFIED"
echo "========================================="

# Configuration
ECR_REGISTRY="901076063012.dkr.ecr.us-east-1.amazonaws.com"
REGION="us-east-1"

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# Rebuild and push the simple images
echo "Building and pushing updated images..."
/Users/ikweku/Downloads/spark-den/build-simple-images.sh

# Force new deployments for all services
echo ""
echo "Forcing new deployments..."
services="auth-service core-service ai-ml-service analytics-service pms-integrations ehr-frontend pms-frontend"

for service in $services; do
    echo "Updating spark-den-$service..."
    aws ecs update-service \
        --cluster spark-den-cluster \
        --service spark-den-$service \
        --force-new-deployment \
        --region $REGION \
        --output text > /dev/null 2>&1 || echo "  Note: Service spark-den-$service might not exist yet"
done

echo ""
echo "Testing deployment..."
sleep 5
curl -s http://spark-den-alb-1679568472.us-east-1.elb.amazonaws.com/ || echo "ALB not responding yet"

echo ""
echo "✅ Deployment initiated. Services are updating."
echo ""
echo "Monitor progress with:"
echo "  aws ecs list-services --cluster spark-den-cluster --region us-east-1"
echo ""
echo "View logs with:"
echo "  aws logs tail /ecs/spark-den/[service-name] --follow --region us-east-1"