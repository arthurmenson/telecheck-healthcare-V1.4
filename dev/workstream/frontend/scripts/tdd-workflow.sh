#!/bin/bash

# TDD Workflow Script for Telecheck Healthcare Platform
# Implements Red-Green-Refactor cycle with coverage tracking

set -e

echo "🏥 Telecheck TDD Workflow - Healthcare-Grade Development"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display workflow step
show_step() {
    echo -e "\n${BLUE}📋 Step: $1${NC}"
    echo "================================================"
}

# Function to display TDD phase
show_phase() {
    local phase=$1
    local color=$2
    echo -e "\n${color}🔄 TDD Phase: $phase${NC}"
    echo "------------------------------------------------"
}

# Function to run tests and check results
run_tests() {
    local phase=$1
    echo "Running tests for $phase phase..."

    if npm run test:run > test_output.log 2>&1; then
        echo -e "${GREEN}✅ Tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Tests failed${NC}"
        cat test_output.log
        return 1
    fi
}

# Function to run coverage
run_coverage() {
    echo "📊 Running coverage analysis..."
    npm run test:coverage
}

# Function to check coverage thresholds
check_coverage_thresholds() {
    echo "🎯 Checking coverage thresholds..."

    # Extract coverage data (simplified version)
    if npm run test:coverage > coverage_output.log 2>&1; then
        echo -e "${GREEN}✅ Coverage thresholds met${NC}"
        return 0
    else
        echo -e "${RED}❌ Coverage thresholds not met${NC}"
        tail -20 coverage_output.log
        return 1
    fi
}

# Main TDD Workflow
main() {
    show_step "Starting TDD Workflow"

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ Error: Not in project root directory${NC}"
        exit 1
    fi

    # Phase 1: RED - Write failing test
    show_phase "RED - Write Failing Test" $RED
    echo "1. Write a failing test for your new feature"
    echo "2. Ensure the test fails for the right reason"
    echo "3. Press Enter when you've written your failing test..."
    read -p ""

    if run_tests "RED"; then
        echo -e "${YELLOW}⚠️  Warning: Test should fail in RED phase${NC}"
        echo "Make sure your test is properly testing unimplemented functionality"
    else
        echo -e "${GREEN}✅ Good! Test fails as expected in RED phase${NC}"
    fi

    # Phase 2: GREEN - Make test pass
    show_phase "GREEN - Make Test Pass" $GREEN
    echo "1. Write the minimal code to make the test pass"
    echo "2. Don't worry about code quality yet"
    echo "3. Press Enter when you've implemented the feature..."
    read -p ""

    if run_tests "GREEN"; then
        echo -e "${GREEN}✅ Great! Tests are passing${NC}"
    else
        echo -e "${RED}❌ Tests still failing. Keep working on the implementation${NC}"
        exit 1
    fi

    # Phase 3: REFACTOR - Improve code quality
    show_phase "REFACTOR - Improve Code Quality" $YELLOW
    echo "1. Refactor your code for better design"
    echo "2. Ensure tests still pass after each change"
    echo "3. Press Enter when you've finished refactoring..."
    read -p ""

    if run_tests "REFACTOR"; then
        echo -e "${GREEN}✅ Excellent! Tests still passing after refactor${NC}"
    else
        echo -e "${RED}❌ Refactoring broke tests. Revert and try again${NC}"
        exit 1
    fi

    # Final coverage check
    show_step "Coverage Analysis"
    run_coverage

    if check_coverage_thresholds; then
        echo -e "\n${GREEN}🎉 TDD Cycle Complete! Healthcare-grade quality achieved${NC}"
        echo "✅ All tests passing"
        echo "✅ Coverage thresholds met"
        echo "✅ Ready for patient safety validation"
    else
        echo -e "\n${YELLOW}⚠️  TDD Cycle complete but coverage needs improvement${NC}"
        echo "Consider adding more test cases for edge cases and error conditions"
    fi

    # Cleanup
    rm -f test_output.log coverage_output.log
}

# Run the workflow
main "$@"