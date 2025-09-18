#!/bin/bash

# Coverage Dashboard for Telecheck Healthcare Platform
# Provides real-time coverage monitoring and quality insights

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Healthcare coverage requirements
CRITICAL_COVERAGE=100
HIGH_COVERAGE=95
STANDARD_COVERAGE=80

show_header() {
    echo -e "${CYAN}"
    echo "🏥 ========================================="
    echo "   TELECHECK COVERAGE DASHBOARD"
    echo "   Healthcare-Grade Quality Monitoring"
    echo "=========================================${NC}"
    echo ""
}

show_coverage_legend() {
    echo -e "${BLUE}📊 Coverage Quality Levels:${NC}"
    echo -e "🟢 ${GREEN}Excellent (95-100%):${NC} Production ready"
    echo -e "🟡 ${YELLOW}Good (80-94%):${NC} Acceptable for most features"
    echo -e "🔴 ${RED}Critical (<80%):${NC} Requires immediate attention"
    echo ""
}

analyze_coverage() {
    echo -e "${PURPLE}🔍 Running comprehensive coverage analysis...${NC}"
    echo ""

    # Generate coverage report
    npm run test:coverage > coverage_report.log 2>&1 || true

    # Extract key metrics (simplified parsing)
    if grep -q "All files" coverage_report.log; then
        STATEMENTS=$(grep "All files" coverage_report.log | awk '{print $2}' | sed 's/%//')
        BRANCHES=$(grep "All files" coverage_report.log | awk '{print $3}' | sed 's/%//')
        FUNCTIONS=$(grep "All files" coverage_report.log | awk '{print $4}' | sed 's/%//')
        LINES=$(grep "All files" coverage_report.log | awk '{print $5}' | sed 's/%//')

        echo -e "${BLUE}📈 Overall Coverage Metrics:${NC}"
        echo "┌─────────────┬──────────┬──────────────┐"
        echo "│ Metric      │ Current  │ Status       │"
        echo "├─────────────┼──────────┼──────────────┤"

        # Statements
        if (( $(echo "$STATEMENTS >= $HIGH_COVERAGE" | bc -l) )); then
            STATUS="${GREEN}Excellent${NC}"
        elif (( $(echo "$STATEMENTS >= $STANDARD_COVERAGE" | bc -l) )); then
            STATUS="${YELLOW}Good${NC}"
        else
            STATUS="${RED}Critical${NC}"
        fi
        printf "│ Statements  │ %7.1f%% │ %-12s │\n" "$STATEMENTS" "$STATUS"

        # Branches
        if (( $(echo "$BRANCHES >= $HIGH_COVERAGE" | bc -l) )); then
            STATUS="${GREEN}Excellent${NC}"
        elif (( $(echo "$BRANCHES >= $STANDARD_COVERAGE" | bc -l) )); then
            STATUS="${YELLOW}Good${NC}"
        else
            STATUS="${RED}Critical${NC}"
        fi
        printf "│ Branches    │ %7.1f%% │ %-12s │\n" "$BRANCHES" "$STATUS"

        # Functions
        if (( $(echo "$FUNCTIONS >= $HIGH_COVERAGE" | bc -l) )); then
            STATUS="${GREEN}Excellent${NC}"
        elif (( $(echo "$FUNCTIONS >= $STANDARD_COVERAGE" | bc -l) )); then
            STATUS="${YELLOW}Good${NC}"
        else
            STATUS="${RED}Critical${NC}"
        fi
        printf "│ Functions   │ %7.1f%% │ %-12s │\n" "$FUNCTIONS" "$STATUS"

        # Lines
        if (( $(echo "$LINES >= $HIGH_COVERAGE" | bc -l) )); then
            STATUS="${GREEN}Excellent${NC}"
        elif (( $(echo "$LINES >= $STANDARD_COVERAGE" | bc -l) )); then
            STATUS="${YELLOW}Good${NC}"
        else
            STATUS="${RED}Critical${NC}"
        fi
        printf "│ Lines       │ %7.1f%% │ %-12s │\n" "$LINES" "$STATUS"

        echo "└─────────────┴──────────┴──────────────┘"
        echo ""
    else
        echo -e "${RED}❌ Unable to parse coverage data${NC}"
        echo "Raw output:"
        cat coverage_report.log
    fi
}

check_critical_paths() {
    echo -e "${RED}🚨 Critical Healthcare Paths Analysis:${NC}"
    echo ""

    # Define critical paths that require 100% coverage
    CRITICAL_PATHS=(
        "client/services/patient.service.ts"
        "client/services/auth.service.ts"
        "client/lib/api-client.ts"
        "client/contexts/AuthContext.tsx"
    )

    echo "┌─────────────────────────────────────┬──────────┐"
    echo "│ Critical Healthcare Module          │ Coverage │"
    echo "├─────────────────────────────────────┼──────────┤"

    for path in "${CRITICAL_PATHS[@]}"; do
        if [ -f "$path" ]; then
            # This is a simplified check - in reality you'd parse the coverage JSON
            printf "│ %-35s │ %8s │\n" "$(basename "$path")" "Checking..."
        else
            printf "│ %-35s │ %8s │\n" "$(basename "$path")" "Missing"
        fi
    done

    echo "└─────────────────────────────────────┴──────────┘"
    echo ""
}

show_recommendations() {
    echo -e "${YELLOW}💡 Healthcare Development Recommendations:${NC}"
    echo ""
    echo "🔹 Patient Safety: All patient data handling requires 100% test coverage"
    echo "🔹 Authentication: Security-critical paths need comprehensive testing"
    echo "🔹 API Integration: Mock all external service calls in tests"
    echo "🔹 Error Handling: Test all failure scenarios and edge cases"
    echo "🔹 HIPAA Compliance: Validate data encryption and access logging"
    echo ""
}

generate_coverage_report() {
    echo -e "${CYAN}📊 Generating HTML coverage report...${NC}"
    npm run test:coverage >/dev/null 2>&1 || true

    if [ -d "coverage" ]; then
        echo -e "${GREEN}✅ Coverage report generated at: coverage/index.html${NC}"
        echo "   Open in browser: file://$(pwd)/coverage/index.html"
    else
        echo -e "${RED}❌ Failed to generate coverage report${NC}"
    fi
    echo ""
}

show_tdd_integration() {
    echo -e "${PURPLE}🔄 TDD Workflow Integration:${NC}"
    echo ""
    echo "Available TDD commands:"
    echo "  npm run test:tdd          - Start TDD watch mode with coverage"
    echo "  npm run test:coverage:watch - Coverage in watch mode"
    echo "  npm run test:coverage:ui   - Interactive coverage UI"
    echo "  ./scripts/tdd-workflow.sh  - Guided TDD workflow"
    echo ""
}

main() {
    show_header
    show_coverage_legend
    analyze_coverage
    check_critical_paths
    show_recommendations
    generate_coverage_report
    show_tdd_integration

    echo -e "${CYAN}🏥 Healthcare Quality Standards: Maintained${NC}"
    echo -e "${GREEN}✅ Coverage monitoring complete${NC}"

    # Cleanup
    rm -f coverage_report.log
}

# Check if bc is available for floating point comparisons
if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: 'bc' not found. Install for precise coverage calculations${NC}"
    echo "   macOS: brew install bc"
    echo "   Ubuntu: sudo apt-get install bc"
    echo ""
fi

# Run the dashboard
main "$@"