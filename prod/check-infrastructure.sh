#!/bin/bash

# Check Infrastructure Status Script
# This script checks the current status of the Spark Den infrastructure

set -e

echo "========================================"
echo "Checking Spark Den Infrastructure Status"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is configured
echo -e "${YELLOW}Checking AWS Configuration...${NC}"
aws sts get-caller-identity || {
    echo -e "${RED}AWS CLI not configured. Please configure with: aws configure${NC}"
    exit 1
}

REGION=${AWS_REGION:-us-east-1}
echo -e "${GREEN}Using region: $REGION${NC}"

echo ""
echo -e "${YELLOW}Checking ECS Cluster...${NC}"
aws ecs list-clusters --region $REGION | grep spark-den || echo "No spark-den cluster found"

echo ""
echo -e "${YELLOW}Checking ECS Services...${NC}"
CLUSTER_NAME="spark-den-staging"
aws ecs list-services --cluster $CLUSTER_NAME --region $REGION 2>/dev/null || echo "Cluster not found or no services"

echo ""
echo -e "${YELLOW}Checking Load Balancers...${NC}"
aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[?contains(LoadBalancerName, `spark-den`)].[LoadBalancerName,DNSName,State.Code]' --output table 2>/dev/null || echo "No load balancers found"

echo ""
echo -e "${YELLOW}Checking ECR Repositories...${NC}"
aws ecr describe-repositories --region $REGION --query 'repositories[?contains(repositoryName, `spark-den`)].[repositoryName,repositoryUri]' --output table 2>/dev/null || echo "No ECR repositories found"

echo ""
echo -e "${YELLOW}Checking RDS Instances...${NC}"
aws rds describe-db-instances --region $REGION --query 'DBInstances[?contains(DBInstanceIdentifier, `spark-den`)].[DBInstanceIdentifier,Endpoint.Address,DBInstanceStatus]' --output table 2>/dev/null || echo "No RDS instances found"

echo ""
echo -e "${YELLOW}Checking VPCs...${NC}"
aws ec2 describe-vpcs --region $REGION --filters "Name=tag:Name,Values=*spark-den*" --query 'Vpcs[*].[VpcId,CidrBlock,Tags[?Key==`Name`].Value|[0]]' --output table 2>/dev/null || echo "No VPCs found"

echo ""
echo -e "${GREEN}========================================"
echo "Infrastructure Check Complete"
echo "========================================${NC}"
echo ""
echo "If infrastructure is missing, run:"
echo "  cd terraform && terraform init && terraform apply"