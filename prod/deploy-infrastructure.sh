#!/bin/bash

# Deploy Full Infrastructure Script
# This script deploys the complete infrastructure for Spark Den

set -e

echo "========================================"
echo "Spark Den Infrastructure Deployment"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to terraform directory
cd "$(dirname "$0")/terraform"

echo -e "${YELLOW}Step 1: Initializing Terraform...${NC}"
terraform init

echo -e "${YELLOW}Step 2: Validating Terraform configuration...${NC}"
terraform validate

echo -e "${YELLOW}Step 3: Creating terraform.tfvars if it doesn't exist...${NC}"
if [ ! -f terraform.tfvars ]; then
    echo -e "${GREEN}Creating terraform.tfvars from example...${NC}"
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${RED}Please edit terraform.tfvars with your specific values${NC}"
    echo "Key variables to update:"
    echo "  - domain_name (leave empty for HTTP-only via ALB)"
    echo "  - alert_email (for CloudWatch alerts)"
    exit 1
fi

echo -e "${YELLOW}Step 4: Planning infrastructure deployment...${NC}"
terraform plan -out=tfplan

echo -e "${YELLOW}Step 5: Review the plan above. Deploy? (yes/no)${NC}"
read -r response
if [[ "$response" != "yes" ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo -e "${YELLOW}Step 6: Applying infrastructure...${NC}"
terraform apply tfplan

echo -e "${GREEN}========================================"
echo "Infrastructure Deployment Complete!"
echo "========================================"
echo ""
echo "Important Outputs:"
terraform output -json | jq -r '
    "ALB URL: " + .alb_dns_name.value,
    "ECR Registry: " + .ecr_registry_url.value,
    "RDS Endpoint: " + .rds_endpoint.value
'

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update GitHub Secrets with these values:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo ""
echo "2. Push code to main branch to trigger deployment"
echo ""
echo "3. Access your application at:"
terraform output -raw alb_dns_name
echo ""
echo -e "${GREEN}Deployment complete!${NC}"