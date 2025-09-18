#!/bin/bash

echo "🧪 Running Complete Test Suite"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_TESTS=0

run_test() {
    local test_name=$1
    local test_command=$2

    echo ""
    echo -e "${YELLOW}📋 Running: $test_name${NC}"
    echo "----------------------------------------"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Start with linting and type checking
run_test "Linting" "pnpm run lint"
run_test "Type Checking" "pnpm run typecheck"

# Run unit and integration tests
run_test "Unit & Integration Tests" "pnpm run test:coverage"

# Check if application is running for E2E tests
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    run_test "End-to-End Tests" "pnpm run test:e2e"
else
    echo -e "${YELLOW}⚠️  Skipping E2E tests - application not running${NC}"
    echo "   Start the application with: pnpm run dev"
fi

# Check if k6 is available for load tests
if command -v k6 &> /dev/null; then
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        run_test "Load Tests" "pnpm run test:load"
    else
        echo -e "${YELLOW}⚠️  Skipping load tests - application not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping load tests - k6 not installed${NC}"
    echo "   Install k6: https://k6.io/docs/getting-started/installation/"
fi

# Generate coverage report
echo ""
echo -e "${YELLOW}📊 Generating coverage report...${NC}"
pnpm run coverage:report

echo ""
echo "==============================="
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! ($FAILED_TESTS failed)${NC}"
    exit 0
else
    echo -e "${RED}💥 $FAILED_TESTS test(s) failed!${NC}"
    exit 1
fi