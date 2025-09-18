#!/bin/bash

echo "🚀 Setting up Testing & Monitoring Workstream..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    echo "   npm install -g pnpm"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup git hooks
echo "🔧 Setting up git hooks..."
pnpm run prepare

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p coverage test-results playwright-report

# Start monitoring stack
echo "🐳 Starting monitoring stack..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Run initial tests
echo "🧪 Running initial test suite..."
pnpm run test:coverage

# Generate coverage report
echo "📊 Generating coverage report..."
npx tsx scripts/coverage-report.ts

echo "✅ Setup completed successfully!"
echo ""
echo "🌐 Available services:"
echo "   Application:     http://localhost:3000"
echo "   Grafana:         http://localhost:3001 (admin/admin)"
echo "   Prometheus:      http://localhost:9090"
echo "   Alertmanager:    http://localhost:9093"
echo "   Node Exporter:   http://localhost:9100"
echo "   cAdvisor:        http://localhost:8080"
echo "   Jaeger:          http://localhost:16686"
echo ""
echo "📋 Next steps:"
echo "   1. Start the application: pnpm run dev"
echo "   2. Run E2E tests: pnpm run test:e2e"
echo "   3. Run load tests: pnpm run test:load"
echo "   4. View monitoring: http://localhost:3001"