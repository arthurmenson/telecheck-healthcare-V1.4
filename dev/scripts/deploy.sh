#!/bin/bash

# Spark Den - Production Deployment Script
# Usage: ./scripts/deploy.sh [staging|production] [service-name|all] [version]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="spark-den"
AWS_REGION="us-east-1"

# Services array
SERVICES=("auth-security" "ai-ml-services" "core-services" "analytics-reporting" "pms-integrations" "frontend")

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

show_usage() {
    echo "Usage: $0 [environment] [service] [version]"
    echo ""
    echo "Arguments:"
    echo "  environment  : staging | production"
    echo "  service      : all | auth-security | ai-ml-services | core-services | analytics-reporting | pms-integrations | frontend"
    echo "  version      : version tag (optional, defaults to latest)"
    echo ""
    echo "Examples:"
    echo "  $0 staging all                    # Deploy all services to staging"
    echo "  $0 production auth-security v1.2.3 # Deploy specific service with version"
    echo "  $0 staging frontend               # Deploy frontend to staging"
}

validate_environment() {
    local env=$1
    if [[ "$env" != "staging" && "$env" != "production" ]]; then
        log_error "Invalid environment: $env. Must be 'staging' or 'production'"
    fi
}

validate_service() {
    local service=$1
    if [[ "$service" == "all" ]]; then
        return 0
    fi

    for valid_service in "${SERVICES[@]}"; do
        if [[ "$service" == "$valid_service" ]]; then
            return 0
        fi
    done

    log_error "Invalid service: $service. Must be one of: all, ${SERVICES[*]}"
}

check_aws_auth() {
    log_info "Checking AWS authentication..."
    if ! aws sts get-caller-identity &>/dev/null; then
        log_error "AWS authentication failed. Please configure AWS CLI or check your credentials."
    fi
    log_success "AWS authentication verified"
}

check_terraform_state() {
    local env=$1
    log_info "Checking Terraform state for $env environment..."

    cd "$PROJECT_DIR/terraform"
    if ! terraform workspace list | grep -q "$env"; then
        log_error "Terraform workspace '$env' not found. Please run 'terraform workspace new $env' first."
    fi

    terraform workspace select "$env"
    log_success "Terraform workspace '$env' selected"
}

get_infrastructure_outputs() {
    local env=$1
    log_info "Getting infrastructure outputs..."

    cd "$PROJECT_DIR/terraform"

    # Get ECS cluster name
    ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "${PROJECT_NAME}-${env}")

    # Get ECR repository base URL
    ECR_REGISTRY=$(terraform output -raw ecr_repositories 2>/dev/null | jq -r '.["auth-security"]' | cut -d':' -f1 || echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com")

    # Get AWS Account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

    export ECS_CLUSTER ECR_REGISTRY AWS_ACCOUNT_ID
    log_success "Infrastructure outputs retrieved"
}

build_and_push_image() {
    local service=$1
    local env=$2
    local version=$3

    log_info "Building and pushing $service image..."

    local service_dir="$PROJECT_DIR/workstream/$service"
    if [[ ! -d "$service_dir" ]]; then
        log_error "Service directory not found: $service_dir"
    fi

    cd "$service_dir"

    # Build image
    local image_tag="${ECR_REGISTRY}/${PROJECT_NAME}-${service}:${env}-${version}"
    local latest_tag="${ECR_REGISTRY}/${PROJECT_NAME}-${service}:${env}-latest"

    log_info "Building Docker image: $image_tag"
    docker build -f Dockerfile.production -t "$image_tag" -t "$latest_tag" .

    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

    # Push image
    log_info "Pushing Docker image: $image_tag"
    docker push "$image_tag"
    docker push "$latest_tag"

    log_success "Image pushed: $image_tag"
}

update_ecs_service() {
    local service=$1
    local env=$2
    local version=$3

    log_info "Updating ECS service: $service"

    local task_family="${PROJECT_NAME}-${env}-${service}"
    local image_uri="${ECR_REGISTRY}/${PROJECT_NAME}-${service}:${env}-${version}"

    # Get current task definition
    local task_def=$(aws ecs describe-task-definition \
        --task-definition "$task_family" \
        --query 'taskDefinition' \
        --output json)

    # Update image in task definition
    local new_task_def=$(echo "$task_def" | jq \
        --arg IMAGE "$image_uri" \
        '.containerDefinitions[0].image = $IMAGE |
         del(.taskDefinitionArn) |
         del(.revision) |
         del(.status) |
         del(.requiresAttributes) |
         del(.placementConstraints) |
         del(.compatibilities) |
         del(.registeredAt) |
         del(.registeredBy)')

    # Register new task definition
    log_info "Registering new task definition..."
    local new_revision=$(echo "$new_task_def" | aws ecs register-task-definition \
        --cli-input-json file:///dev/stdin \
        --query 'taskDefinition.revision' \
        --output text)

    # Update ECS service
    log_info "Updating ECS service to revision $new_revision..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$service" \
        --task-definition "${task_family}:${new_revision}" \
        --output table

    log_success "ECS service $service updated to revision $new_revision"
}

wait_for_deployment() {
    local service=$1
    local env=$2

    log_info "Waiting for deployment to complete for $service..."

    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$service" \
        --max-attempts 20 \
        --delay 30

    log_success "Deployment completed for $service"
}

verify_deployment() {
    local service=$1
    local env=$2

    log_info "Verifying deployment for $service..."

    # Check service status
    local running_count=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service" \
        --query 'services[0].runningCount' \
        --output text)

    local desired_count=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service" \
        --query 'services[0].desiredCount' \
        --output text)

    if [[ "$running_count" == "$desired_count" ]] && [[ "$running_count" -gt 0 ]]; then
        log_success "Service $service is healthy ($running_count/$desired_count tasks running)"
    else
        log_error "Service $service is unhealthy ($running_count/$desired_count tasks running)"
    fi
}

perform_health_check() {
    local env=$1

    log_info "Performing health checks..."

    # Get ALB DNS name
    local alb_dns=$(aws elbv2 describe-load-balancers \
        --names "${PROJECT_NAME}-${env}-alb" \
        --query 'LoadBalancers[0].DNSName' \
        --output text 2>/dev/null || echo "")

    if [[ -z "$alb_dns" ]]; then
        log_warning "ALB DNS not found, skipping health checks"
        return 0
    fi

    local base_url="https://$alb_dns"

    # Wait for ALB to be ready
    log_info "Waiting for ALB to be ready..."
    sleep 60

    # Health check endpoints
    local health_checks=(
        "$base_url/"
        "$base_url/api/auth/health"
        "$base_url/api/patients/health"
        "$base_url/api/ai/health"
        "$base_url/api/analytics/health"
        "$base_url/api/integrations/health"
    )

    for endpoint in "${health_checks[@]}"; do
        log_info "Checking: $endpoint"
        if curl -f -s -m 30 "$endpoint" >/dev/null; then
            log_success "✓ $endpoint"
        else
            log_warning "✗ $endpoint (may not be critical)"
        fi
    done
}

deploy_service() {
    local service=$1
    local env=$2
    local version=$3

    log_info "Deploying $service to $env environment (version: $version)"

    # Build and push image
    build_and_push_image "$service" "$env" "$version"

    # Update ECS service
    update_ecs_service "$service" "$env" "$version"

    # Wait for deployment
    wait_for_deployment "$service" "$env"

    # Verify deployment
    verify_deployment "$service" "$env"

    log_success "Successfully deployed $service to $env"
}

main() {
    # Parse arguments
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi

    local environment=$1
    local service=$2
    local version=${3:-"$(date +%Y%m%d-%H%M%S)"}

    # Validate inputs
    validate_environment "$environment"
    validate_service "$service"

    log_info "Starting deployment to $environment environment"
    log_info "Service: $service"
    log_info "Version: $version"

    # Pre-deployment checks
    check_aws_auth
    check_terraform_state "$environment"
    get_infrastructure_outputs "$environment"

    # Deploy services
    if [[ "$service" == "all" ]]; then
        for svc in "${SERVICES[@]}"; do
            deploy_service "$svc" "$environment" "$version"
        done
    else
        deploy_service "$service" "$environment" "$version"
    fi

    # Post-deployment health checks
    perform_health_check "$environment"

    log_success "🎉 Deployment completed successfully!"
    log_info "Environment: $environment"
    log_info "Version: $version"

    if [[ "$environment" == "production" ]]; then
        log_warning "🔔 Don't forget to:"
        log_warning "  1. Update monitoring dashboards"
        log_warning "  2. Notify stakeholders"
        log_warning "  3. Monitor logs and metrics"
        log_warning "  4. Update deployment documentation"
    fi
}

# Run main function
main "$@"