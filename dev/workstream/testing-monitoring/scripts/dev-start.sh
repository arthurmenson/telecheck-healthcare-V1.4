#!/bin/bash

echo "🚀 Starting Testing & Monitoring Development Environment"
echo "======================================================="

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Start monitoring stack
echo "🐳 Starting monitoring stack..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Run health check
echo "🔍 Running health check..."
./scripts/health-check.sh

echo ""
echo "🎯 Development environment ready!"
echo ""
echo "Next steps:"
echo "1. Start the application: pnpm run dev"
echo "2. Run tests: pnpm run test"
echo "3. View Grafana dashboards: http://localhost:3002"
echo ""
echo "Use 'pnpm run dev' in another terminal to start the application."