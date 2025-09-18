#!/bin/bash

# Spark Den - Health Check Script
# Usage: ./scripts/health-check.sh [staging|production|local] [service-name|all]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
}

show_usage() {
    echo "Usage: $0 [environment] [service]"
    echo ""
    echo "Arguments:"
    echo "  environment  : local | staging | production"
    echo "  service      : all | auth-security | ai-ml-services | core-services | analytics-reporting | pms-integrations | frontend"
    echo ""
    echo "Examples:"
    echo "  $0 production all              # Check all services in production"
    echo "  $0 staging auth-security       # Check auth service in staging"
    echo "  $0 local frontend              # Check frontend locally"
}

validate_environment() {
    local env=$1
    if [[ "$env" != "local" && "$env" != "staging" && "$env" != "production" ]]; then
        log_error "Invalid environment: $env. Must be 'local', 'staging', or 'production'"
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

get_base_url() {
    local env=$1

    case "$env" in
        "local")
            BASE_URL="http://localhost"
            ;;
        "staging")
            # Try to get ALB DNS from AWS
            if command -v aws &> /dev/null; then
                local alb_dns=$(aws elbv2 describe-load-balancers \
                    --names "${PROJECT_NAME}-staging-alb" \
                    --query 'LoadBalancers[0].DNSName' \
                    --output text 2>/dev/null || echo "")
                if [[ -n "$alb_dns" && "$alb_dns" != "None" ]]; then
                    BASE_URL="https://$alb_dns"
                else
                    BASE_URL="https://staging.spark-den.com"
                fi
            else
                BASE_URL="https://staging.spark-den.com"
            fi
            ;;
        "production")
            # Try to get ALB DNS from AWS
            if command -v aws &> /dev/null; then
                local alb_dns=$(aws elbv2 describe-load-balancers \
                    --names "${PROJECT_NAME}-production-alb" \
                    --query 'LoadBalancers[0].DNSName' \
                    --output text 2>/dev/null || echo "")
                if [[ -n "$alb_dns" && "$alb_dns" != "None" ]]; then
                    BASE_URL="https://$alb_dns"
                else
                    BASE_URL="https://app.spark-den.com"
                fi
            else
                BASE_URL="https://app.spark-den.com"
            fi
            ;;
    esac

    export BASE_URL
}

get_service_ports() {
    declare -A SERVICE_PORTS
    SERVICE_PORTS[auth-security]=3002
    SERVICE_PORTS[ai-ml-services]=3000
    SERVICE_PORTS[core-services]=3001
    SERVICE_PORTS[analytics-reporting]=3003
    SERVICE_PORTS[pms-integrations]=3004
    SERVICE_PORTS[frontend]=5173

    echo "${SERVICE_PORTS[$1]}"
}

check_http_endpoint() {
    local url=$1
    local timeout=${2:-10}
    local description=${3:-"endpoint"}

    log_info "Checking $description: $url"

    if curl -f -s -m "$timeout" "$url" >/dev/null 2>&1; then
        log_success "✓ $description is healthy"
        return 0
    else
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" -m "$timeout" "$url" 2>/dev/null || echo "000")
        log_error "✗ $description failed (HTTP $status_code)"
        return 1
    fi
}

check_service_health() {
    local service=$1
    local env=$2

    log_info "Checking health for $service in $env environment"

    local failed_checks=0

    if [[ "$env" == "local" ]]; then
        # Local environment checks
        local port=$(get_service_ports "$service")
        local service_url="http://localhost:$port"

        if [[ "$service" == "frontend" ]]; then
            check_http_endpoint "$service_url" 10 "Frontend" || ((failed_checks++))
        else
            check_http_endpoint "$service_url/health" 10 "Health endpoint" || ((failed_checks++))
        fi
    else
        # Cloud environment checks
        case "$service" in
            "frontend")
                check_http_endpoint "$BASE_URL/" 15 "Frontend" || ((failed_checks++))
                ;;
            "auth-security")
                check_http_endpoint "$BASE_URL/api/auth/health" 15 "Auth service" || ((failed_checks++))
                ;;
            "core-services")
                check_http_endpoint "$BASE_URL/api/patients/health" 15 "Core service" || ((failed_checks++))
                ;;
            "ai-ml-services")
                check_http_endpoint "$BASE_URL/api/ai/health" 15 "AI/ML service" || ((failed_checks++))
                ;;
            "analytics-reporting")
                check_http_endpoint "$BASE_URL/api/analytics/health" 15 "Analytics service" || ((failed_checks++))
                ;;
            "pms-integrations")
                check_http_endpoint "$BASE_URL/api/integrations/health" 15 "PMS integrations" || ((failed_checks++))
                ;;
        esac
    fi

    return $failed_checks
}

check_infrastructure() {
    local env=$1

    if [[ "$env" == "local" ]]; then
        log_info "Checking local infrastructure..."

        # Check Docker containers
        if command -v docker &> /dev/null; then
            log_info "Checking Docker containers..."

            local postgres_status=$(docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}" | tail -n +2 || echo "")
            if [[ -n "$postgres_status" ]]; then
                log_success "✓ PostgreSQL container: $postgres_status"
            else
                log_error "✗ PostgreSQL container not running"
            fi

            local redis_status=$(docker ps --filter "name=redis" --format "table {{.Names}}\t{{.Status}}" | tail -n +2 || echo "")
            if [[ -n "$redis_status" ]]; then
                log_success "✓ Redis container: $redis_status"
            else
                log_error "✗ Redis container not running"
            fi
        fi
    else
        # Cloud infrastructure checks
        if command -v aws &> /dev/null; then
            log_info "Checking AWS infrastructure for $env..."

            # Check ECS cluster
            local cluster_status=$(aws ecs describe-clusters \
                --clusters "${PROJECT_NAME}-${env}" \
                --query 'clusters[0].status' \
                --output text 2>/dev/null || echo "NOTFOUND")

            if [[ "$cluster_status" == "ACTIVE" ]]; then
                log_success "✓ ECS cluster is active"
            else
                log_error "✗ ECS cluster not active (status: $cluster_status)"
            fi

            # Check RDS instance
            local rds_status=$(aws rds describe-db-instances \
                --db-instance-identifier "${PROJECT_NAME}-${env}-db" \
                --query 'DBInstances[0].DBInstanceStatus' \
                --output text 2>/dev/null || echo "NOTFOUND")

            if [[ "$rds_status" == "available" ]]; then
                log_success "✓ RDS instance is available"
            else
                log_error "✗ RDS instance not available (status: $rds_status)"
            fi

            # Check ElastiCache
            local redis_status=$(aws elasticache describe-replication-groups \
                --replication-group-id "${PROJECT_NAME}-${env}-redis" \
                --query 'ReplicationGroups[0].Status' \
                --output text 2>/dev/null || echo "NOTFOUND")

            if [[ "$redis_status" == "available" ]]; then
                log_success "✓ ElastiCache Redis is available"
            else
                log_error "✗ ElastiCache Redis not available (status: $redis_status)"
            fi
        else
            log_warning "AWS CLI not available, skipping infrastructure checks"
        fi
    fi
}

check_ecs_services() {
    local env=$1

    if [[ "$env" == "local" ]]; then
        return 0
    fi

    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not available, skipping ECS service checks"
        return 0
    fi

    log_info "Checking ECS services for $env environment..."

    local cluster_name="${PROJECT_NAME}-${env}"

    for service in "${SERVICES[@]}"; do
        local service_status=$(aws ecs describe-services \
            --cluster "$cluster_name" \
            --services "$service" \
            --query 'services[0].status' \
            --output text 2>/dev/null || echo "NOTFOUND")

        local running_count=$(aws ecs describe-services \
            --cluster "$cluster_name" \
            --services "$service" \
            --query 'services[0].runningCount' \
            --output text 2>/dev/null || echo "0")

        local desired_count=$(aws ecs describe-services \
            --cluster "$cluster_name" \
            --services "$service" \
            --query 'services[0].desiredCount' \
            --output text 2>/dev/null || echo "0")

        if [[ "$service_status" == "ACTIVE" ]] && [[ "$running_count" == "$desired_count" ]] && [[ "$running_count" -gt 0 ]]; then
            log_success "✓ $service: $running_count/$desired_count tasks running"
        else
            log_error "✗ $service: $running_count/$desired_count tasks running (status: $service_status)"
        fi
    done
}

generate_health_report() {
    local env=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="health-report-${env}-$(date +%Y%m%d-%H%M%S).txt"

    echo "Spark Den Health Check Report" > "$report_file"
    echo "=============================" >> "$report_file"
    echo "Environment: $env" >> "$report_file"
    echo "Timestamp: $timestamp" >> "$report_file"
    echo "Base URL: $BASE_URL" >> "$report_file"
    echo "" >> "$report_file"

    log_info "Health report saved to: $report_file"
}

main() {
    # Parse arguments
    if [[ $# -lt 1 ]]; then
        show_usage
        exit 1
    fi

    local environment=$1
    local service=${2:-"all"}

    # Validate inputs
    validate_environment "$environment"
    validate_service "$service"

    log_info "🏥 Spark Den Health Check"
    log_info "Environment: $environment"
    log_info "Service: $service"
    echo ""

    # Get base URL for environment
    get_base_url "$environment"
    log_info "Base URL: $BASE_URL"
    echo ""

    local total_failures=0

    # Check infrastructure
    check_infrastructure "$environment"
    echo ""

    # Check ECS services (if applicable)
    if [[ "$environment" != "local" ]]; then
        check_ecs_services "$environment"
        echo ""
    fi

    # Check service health
    if [[ "$service" == "all" ]]; then
        for svc in "${SERVICES[@]}"; do
            check_service_health "$svc" "$environment"
            local result=$?
            ((total_failures += result))
            echo ""
        done
    else
        check_service_health "$service" "$environment"
        total_failures=$?
        echo ""
    fi

    # Summary
    echo "==============================================="
    if [[ $total_failures -eq 0 ]]; then
        log_success "🎉 All health checks passed!"
    else
        log_error "❌ Health check failures detected: $total_failures"
        echo ""
        log_warning "Recommended actions:"
        log_warning "1. Check service logs for errors"
        log_warning "2. Verify network connectivity"
        log_warning "3. Check resource utilization"
        log_warning "4. Review recent deployments"
    fi

    # Generate report
    generate_health_report "$environment"

    exit $total_failures
}

# Run main function
main "$@"