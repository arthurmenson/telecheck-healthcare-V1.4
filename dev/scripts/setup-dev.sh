#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            print_success "$service_name is ready!"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "$service_name failed to start after $max_attempts attempts"
    return 1
}

# Function to check Docker
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi

    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are available"
}

# Function to check required tools
check_requirements() {
    print_status "Checking requirements..."

    check_docker

    if ! command_exists pnpm; then
        print_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi

    if ! command_exists nc; then
        print_warning "netcat is not available. Service health checks may not work properly."
    fi
}

# Function to generate environment files
generate_env_files() {
    print_status "Generating environment files..."

    # Database workstream
    cat > workstream/database/.env << 'EOF'
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=spark_den_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_URL=postgresql://postgres:password@localhost:5432/spark_den_dev
EOF

    # Auth Security workstream
    cat > workstream/auth-security/.env << 'EOF'
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spark_den_dev
DB_USER=postgres
DB_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-jwt-secret-key-change-in-production-very-long-and-secure
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
EOF

    # AI/ML Services workstream
    cat > workstream/ai-ml-services/.env << 'EOF'
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spark_den_dev
DB_USER=postgres
DB_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
AUTH_SERVICE_URL=http://localhost:3002
CORS_ORIGINS=http://localhost:5173
EOF

    # Core Services workstream
    cat > workstream/core-services/.env << 'EOF'
NODE_ENV=development
PORT=3001
DB_PATH=./data/patients.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spark_den_dev
DB_USER=postgres
DB_PASSWORD=password
AUTH_SERVICE_URL=http://localhost:3002
CORS_ORIGINS=http://localhost:5173
EOF

    # Analytics Reporting workstream
    cat > workstream/analytics-reporting/.env << 'EOF'
NODE_ENV=development
PORT=3003
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spark_den_dev
DB_USER=postgres
DB_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
AUTH_SERVICE_URL=http://localhost:3002
CORS_ORIGINS=http://localhost:5173
METRICS_PORT=9090
EOF

    # PMS Integrations workstream
    cat > workstream/pms-integrations/.env << 'EOF'
NODE_ENV=development
PORT=3004
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spark_den_dev
DB_USER=postgres
DB_PASSWORD=password
REDIS_HOST=localhost
REDIS_PORT=6379
AUTH_SERVICE_URL=http://localhost:3002
CORS_ORIGINS=http://localhost:5173
FHIR_SERVER_URL=http://localhost:8080/fhir
EOF

    print_success "Environment files generated"
}

# Function to start infrastructure services
start_infrastructure() {
    print_status "Starting infrastructure services (PostgreSQL, Redis)..."

    docker-compose up -d postgres redis

    wait_for_service localhost 5432 "PostgreSQL"
    wait_for_service localhost 6379 "Redis"

    print_success "Infrastructure services are running"
}

# Function to run database setup
setup_database() {
    print_status "Setting up database..."

    # Install dependencies for database workstream
    cd workstream/database
    pnpm install
    cd ../..

    # Run database setup
    if command_exists tsx; then
        tsx scripts/setup-database.ts
    else
        print_warning "tsx not found, installing..."
        npx tsx scripts/setup-database.ts
    fi

    print_success "Database setup completed"
}

# Function to start all services
start_services() {
    print_status "Starting all services..."

    # Start backend services
    docker-compose up -d auth-security ai-ml-services core-services analytics-reporting pms-integrations

    # Wait for backend services
    sleep 10

    print_status "Waiting for backend services to be ready..."
    wait_for_service localhost 3002 "Auth Security Service"
    wait_for_service localhost 3000 "AI/ML Services"
    wait_for_service localhost 3001 "Core Services"
    wait_for_service localhost 3003 "Analytics Reporting"
    wait_for_service localhost 3004 "PMS Integrations"

    # Start frontend
    print_status "Starting frontend..."
    docker-compose up -d frontend

    # Wait for frontend
    sleep 5
    wait_for_service localhost 5173 "Frontend"

    print_success "All services are running"
}

# Function to validate setup
validate_setup() {
    print_status "Validating setup..."

    if command_exists tsx; then
        tsx scripts/validate-setup.ts
    else
        print_warning "tsx not found, installing..."
        npx tsx scripts/validate-setup.ts
    fi
}

# Function to show status
show_status() {
    print_status "Service Status:"
    echo ""
    echo "🗄️  Database Services:"
    echo "   PostgreSQL:  http://localhost:5432 (postgres/password)"
    echo "   Redis:       http://localhost:6379"
    echo ""
    echo "⚡ Backend Services:"
    echo "   Auth Security:    http://localhost:3002/health"
    echo "   AI/ML Services:   http://localhost:3000/health"
    echo "   Core Services:    http://localhost:3001/health"
    echo "   Analytics:        http://localhost:3003/health"
    echo "   Integrations:     http://localhost:3004/health"
    echo ""
    echo "🌐 Frontend:"
    echo "   Application:      http://localhost:5173"
    echo ""
    echo "👤 Login Credentials:"
    echo "   Email:            admin@sparkden.com"
    echo "   Password:         password123"
    echo ""
    echo "🔧 Development Commands:"
    echo "   View logs:        docker-compose logs -f [service-name]"
    echo "   Stop all:         docker-compose down"
    echo "   Restart:          docker-compose restart [service-name]"
    echo "   Health monitor:   tsx scripts/health-monitor.ts monitor"
    echo "   Validate setup:   tsx scripts/validate-setup.ts"
    echo ""
}

# Main execution
main() {
    echo "🚀 Spark Den Healthcare Platform - Development Setup"
    echo "=================================================="
    echo ""

    check_requirements
    generate_env_files
    start_infrastructure
    setup_database
    start_services

    # Validate everything is working
    sleep 5
    validate_setup

    echo ""
    print_success "🎉 Development environment is ready!"
    echo ""
    show_status
}

# Handle script arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    start)
        print_status "Starting existing services..."
        docker-compose up -d
        show_status
        ;;
    stop)
        print_status "Stopping all services..."
        docker-compose down
        print_success "All services stopped"
        ;;
    restart)
        print_status "Restarting all services..."
        docker-compose restart
        show_status
        ;;
    logs)
        if [ -n "$2" ]; then
            docker-compose logs -f "$2"
        else
            docker-compose logs -f
        fi
        ;;
    status)
        show_status
        ;;
    validate)
        validate_setup
        ;;
    clean)
        print_warning "This will remove all containers, volumes, and data. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            docker-compose down -v --remove-orphans
            docker system prune -f
            print_success "Environment cleaned"
        else
            print_status "Clean operation cancelled"
        fi
        ;;
    help|--help|-h)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup     Set up and start the development environment (default)"
        echo "  start     Start existing services"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  logs      Show logs (optionally specify service name)"
        echo "  status    Show service status and connection info"
        echo "  validate  Validate that all services are working correctly"
        echo "  clean     Remove all containers and volumes"
        echo "  help      Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac