#!/bin/bash

echo "🔍 Testing & Monitoring Health Check"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected_pattern=${3:-"HTTP/1.1 200"}

    printf "%-20s" "$name:"
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✅ HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}❌ UNHEALTHY${NC}"
        return 1
    fi
}

# Check application services
echo "📊 Application Services:"
check_service "Application" "http://localhost:3000/health"

echo ""
echo "🐳 Monitoring Stack:"
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Grafana" "http://localhost:3002/api/health"
check_service "Alertmanager" "http://localhost:9093/-/healthy"
check_service "Node Exporter" "http://localhost:9100/metrics"
check_service "Redis Exporter" "http://localhost:9121/metrics"
check_service "Postgres Exporter" "http://localhost:9187/metrics"
check_service "cAdvisor" "http://localhost:8080/healthz"
check_service "Jaeger" "http://localhost:16686"

echo ""
echo "💾 Databases:"
check_service "Redis" "http://localhost:6379" || echo "Redis connection test (expected to fail with HTTP)"
check_service "PostgreSQL" "http://localhost:5432" || echo "PostgreSQL connection test (expected to fail with HTTP)"

echo ""
echo "🚀 Quick Access URLs:"
echo "   Application:     http://localhost:3000"
echo "   Grafana:         http://localhost:3002 (admin/admin)"
echo "   Prometheus:      http://localhost:9090"
echo "   Alertmanager:    http://localhost:9093"
echo "   Jaeger:          http://localhost:16686"
echo "   Node Exporter:   http://localhost:9100"
echo "   cAdvisor:        http://localhost:8080"

echo ""
echo "🧪 Run Tests:"
echo "   pnpm run test           # Unit & Integration tests"
echo "   pnpm run test:e2e       # End-to-end tests"
echo "   pnpm run test:load      # Load tests"
echo "   pnpm run test:coverage  # Coverage report"

echo ""
echo "✅ Health check completed!"