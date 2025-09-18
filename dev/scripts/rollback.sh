#!/bin/bash

# Spark Den - Production Rollback Script
# Usage: ./scripts/rollback.sh [staging|production] [service-name|all] [revision]

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
    echo "Usage: $0 [environment] [service] [revision]"
    echo ""
    echo "Arguments:"
    echo "  environment  : staging | production"
    echo "  service      : all | auth-security | ai-ml-services | core-services | analytics-reporting | pms-integrations | frontend"
    echo "  revision     : task definition revision number (optional, defaults to previous)"
    echo ""
    echo "Examples:"
    echo "  $0 production all                 # Rollback all services to previous revision"
    echo "  $0 staging auth-security 5        # Rollback auth-security to revision 5"
    echo "  $0 production frontend            # Rollback frontend to previous revision"
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

get_ecs_cluster() {
    local env=$1
    ECS_CLUSTER="${PROJECT_NAME}-${env}"

    # Verify cluster exists
    if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --query 'clusters[0].status' --output text | grep -q "ACTIVE"; then
        log_error "ECS cluster '$ECS_CLUSTER' not found or not active"
    fi

    log_success "ECS cluster verified: $ECS_CLUSTER"
}

get_current_revision() {
    local service=$1
    local env=$2

    local task_family="${PROJECT_NAME}-${env}-${service}"

    # Get current task definition revision
    local current_revision=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service" \
        --query 'services[0].taskDefinition' \
        --output text | awk -F: '{print $NF}')

    if [[ -z "$current_revision" ]] || [[ "$current_revision" == "None" ]]; then
        log_error "Could not determine current revision for service $service"
    fi

    echo "$current_revision"
}

get_previous_revision() {
    local service=$1
    local env=$2
    local current_revision=$3

    local task_family="${PROJECT_NAME}-${env}-${service}"

    # Get all task definition revisions
    local revisions=$(aws ecs list-task-definitions \
        --family-prefix "$task_family" \
        --status ACTIVE \
        --sort DESC \
        --query 'taskDefinitionArns' \
        --output text)

    # Find previous revision
    local previous_revision=""
    for arn in $revisions; do
        local revision=$(echo "$arn" | awk -F: '{print $NF}')
        if [[ "$revision" -lt "$current_revision" ]]; then
            previous_revision="$revision"
            break
        fi
    done

    if [[ -z "$previous_revision" ]]; then
        log_error "No previous revision found for service $service (current: $current_revision)"
    fi

    echo "$previous_revision"
}

show_revision_history() {
    local service=$1
    local env=$2

    local task_family="${PROJECT_NAME}-${env}-${service}"

    log_info "Revision history for $service:"

    # Get task definition revisions with details
    local revisions=$(aws ecs list-task-definitions \
        --family-prefix "$task_family" \
        --status ACTIVE \
        --sort DESC \
        --max-items 10 \
        --query 'taskDefinitionArns' \
        --output text)

    for arn in $revisions; do
        local revision=$(echo "$arn" | awk -F: '{print $NF}')
        local created_date=$(aws ecs describe-task-definition \
            --task-definition "$arn" \
            --query 'taskDefinition.registeredAt' \
            --output text)

        echo "  Revision $revision - Created: $created_date"
    done
}

confirm_rollback() {
    local service=$1
    local env=$2
    local current_revision=$3
    local target_revision=$4

    log_warning "🚨 ROLLBACK CONFIRMATION 🚨"
    echo ""
    echo "Environment: $env"
    echo "Service: $service"
    echo "Current Revision: $current_revision"
    echo "Target Revision: $target_revision"
    echo ""

    if [[ "$env" == "production" ]]; then
        log_warning "⚠️  This is a PRODUCTION rollback!"
        echo ""
    fi

    read -p "Are you sure you want to proceed? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
}

rollback_service() {
    local service=$1
    local env=$2
    local target_revision=$3

    log_info "Rolling back $service to revision $target_revision..."

    local task_family="${PROJECT_NAME}-${env}-${service}"
    local current_revision=$(get_current_revision "$service" "$env")

    # Confirm rollback
    confirm_rollback "$service" "$env" "$current_revision" "$target_revision"

    # Update ECS service to target revision
    log_info "Updating ECS service to revision $target_revision..."
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$service" \
        --task-definition "${task_family}:${target_revision}" \
        --output table

    # Wait for deployment to complete
    log_info "Waiting for rollback to complete..."
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$service" \
        --max-attempts 20 \
        --delay 30

    # Verify rollback
    local new_revision=$(get_current_revision "$service" "$env")
    if [[ "$new_revision" == "$target_revision" ]]; then
        log_success "✅ Successfully rolled back $service to revision $target_revision"
    else
        log_error "❌ Rollback failed! Current revision: $new_revision, Expected: $target_revision"
    fi

    # Check service health
    verify_service_health "$service"
}

verify_service_health() {
    local service=$1

    log_info "Verifying service health for $service..."

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
        log_warning "Service $service may be unhealthy ($running_count/$desired_count tasks running)"
    fi

    # Check for recent deployment events
    log_info "Recent deployment events:"
    aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$service" \
        --query 'services[0].events[0:3].[createdAt,message]' \
        --output table
}

perform_health_check() {
    local env=$1

    log_info "Performing application health checks..."

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

    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 60

    # Health check endpoints
    local health_checks=(
        "$base_url/"
        "$base_url/api/auth/health"
        "$base_url/api/patients/health"
    )

    local failed_checks=0
    for endpoint in "${health_checks[@]}"; do
        log_info "Checking: $endpoint"
        if curl -f -s -m 30 "$endpoint" >/dev/null; then
            log_success "✓ $endpoint"
        else
            log_warning "✗ $endpoint"
            ((failed_checks++))
        fi
    done

    if [[ $failed_checks -gt 0 ]]; then
        log_warning "Some health checks failed. Please investigate."
    else
        log_success "All health checks passed!"
    fi
}

main() {
    # Parse arguments
    if [[ $# -lt 2 ]]; then
        show_usage
        exit 1
    fi

    local environment=$1
    local service=$2
    local target_revision=${3:-""}

    # Validate inputs
    validate_environment "$environment"
    validate_service "$service"

    log_info "Starting rollback for $environment environment"
    log_info "Service: $service"

    # Pre-rollback checks
    check_aws_auth
    get_ecs_cluster "$environment"

    # Rollback services
    if [[ "$service" == "all" ]]; then
        log_warning "Rolling back ALL services. This is a significant operation!"
        read -p "Continue with rollback of all services? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi

        for svc in "${SERVICES[@]}"; do
            local current_rev=$(get_current_revision "$svc" "$environment")
            local previous_rev=$(get_previous_revision "$svc" "$environment" "$current_rev")

            log_info "Service: $svc, Current: $current_rev, Rolling back to: $previous_rev"
            rollback_service "$svc" "$environment" "$previous_rev"
        done
    else
        # Single service rollback
        if [[ -z "$target_revision" ]]; then
            # Show revision history
            show_revision_history "$service" "$environment"

            # Get previous revision automatically
            local current_rev=$(get_current_revision "$service" "$environment")
            target_revision=$(get_previous_revision "$service" "$environment" "$current_rev")

            log_info "Auto-selected previous revision: $target_revision"
        fi

        rollback_service "$service" "$environment" "$target_revision"
    fi

    # Post-rollback health checks
    perform_health_check "$environment"

    log_success "🔄 Rollback completed!"
    log_info "Environment: $environment"
    log_info "Service(s): $service"

    if [[ "$environment" == "production" ]]; then
        log_warning "🔔 Post-rollback actions:"
        log_warning "  1. Monitor application logs"
        log_warning "  2. Check monitoring dashboards"
        log_warning "  3. Notify stakeholders"
        log_warning "  4. Document the rollback reason"
        log_warning "  5. Plan fix for the rolled-back issue"
    fi
}

# Run main function
main "$@"