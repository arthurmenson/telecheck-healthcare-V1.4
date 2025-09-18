# Spark Den Healthcare Platform - Development Setup

Welcome to the Spark Den Healthcare Platform development environment! This guide will help you get the entire platform running locally in just a few minutes.

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (required)
- **Node.js 20+** (required)
- **pnpm** (will be installed automatically)
- **Git** (required)

### One-Command Setup

```bash
# Clone and setup the entire development environment
cd dev
./scripts/setup-dev.sh
```

That's it! The script will:
1. ✅ Check all requirements
2. ✅ Generate environment files
3. ✅ Start PostgreSQL and Redis
4. ✅ Run database migrations and seeding
5. ✅ Start all backend services
6. ✅ Start the frontend application
7. ✅ Validate everything is working

## 🌐 Access the Application

Once setup is complete:

- **Frontend Application**: http://localhost:5173
- **Login Credentials**:
  - **Email**: `admin@sparkden.com`
  - **Password**: `password123`

## 🏗️ Architecture Overview

The platform consists of 6 microservices plus frontend:

| Service | Port | Purpose |
|---------|------|---------|
| **Frontend** | 5173 | React/Vite application |
| **Auth Security** | 3002 | JWT authentication, RBAC |
| **AI/ML Services** | 3000 | Medical coding, document processing |
| **Core Services** | 3001 | Patient management, appointments |
| **Analytics Reporting** | 3003 | Real-time dashboards, reporting |
| **PMS Integrations** | 3004 | FHIR, EHR integrations |
| **PostgreSQL** | 5432 | Main database |
| **Redis** | 6379 | Caching, sessions |

## 🔧 Development Commands

### Service Management

```bash
# Start all services
./scripts/setup-dev.sh start

# Stop all services
./scripts/setup-dev.sh stop

# Restart all services
./scripts/setup-dev.sh restart

# View service status
./scripts/setup-dev.sh status

# Clean everything (removes data!)
./scripts/setup-dev.sh clean
```

### Health Monitoring

```bash
# Check health of all services once
tsx scripts/health-monitor.ts check

# Continuously monitor (updates every 30s)
tsx scripts/health-monitor.ts monitor

# Monitor with custom interval (15 seconds)
tsx scripts/health-monitor.ts monitor 15
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-security
docker-compose logs -f frontend
```

### Individual Service Development

```bash
# Work on a specific service
cd workstream/[service-name]
pnpm install
pnpm run dev
```

## 🗄️ Database Access

### Connection Details
- **Host**: localhost
- **Port**: 5432
- **Database**: spark_den_dev
- **Username**: postgres
- **Password**: password

### Pre-seeded Data
The development database includes:
- 3 healthcare providers (doctors)
- 3 sample patients
- 3 appointments
- Authentication users for testing

### Database Commands

```bash
# Re-run migrations
tsx scripts/setup-database.ts

# Access PostgreSQL directly
docker exec -it spark-den-postgres psql -U postgres -d spark_den_dev

# View database schema
docker exec -it spark-den-postgres psql -U postgres -d spark_den_dev -c "\\dt spark_den.*"
```

## 🔐 Authentication & Users

### Development Users

| Email | Password | Role |
|-------|----------|------|
| admin@sparkden.com | password123 | Admin |
| john.smith@sparkden.com | password123 | Doctor |
| sarah.johnson@sparkden.com | password123 | Doctor |
| michael.brown@sparkden.com | password123 | Doctor |

### API Authentication

All API endpoints require JWT authentication:

```bash
# Get JWT token
curl -X POST http://localhost:3002/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "admin@sparkden.com", "password": "password123"}'

# Use token in requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  http://localhost:3001/api/patients
```

## 🧪 Testing

### Run Tests for All Services

```bash
# From root directory
pnpm run test
```

### Run Tests for Specific Service

```bash
cd workstream/[service-name]
pnpm test                    # Run once
pnpm test:watch             # Watch mode
pnpm test:coverage          # With coverage
```

### End-to-End Testing

```bash
# Make sure all services are running first
./scripts/setup-dev.sh status

# Run E2E tests
cd workstream/frontend
pnpm test:e2e
```

## 🛠️ Development Tools

### Hot Reload

All services support hot reload:
- **Frontend**: Automatic (Vite)
- **Backend Services**: `pnpm run dev` uses tsx watch mode

### Code Quality

```bash
# Lint all services
pnpm run lint

# Format all code
pnpm run format

# Type checking
pnpm run typecheck
```

### Debugging

1. **Frontend**: Use browser dev tools
2. **Backend**: Attach debugger to Node.js process
3. **Database**: Use pgAdmin or your favorite PostgreSQL client

## 📊 Monitoring & Observability

### Health Checks

Each service exposes health endpoints:
- http://localhost:3000/health (AI/ML Services)
- http://localhost:3001/health (Core Services)
- http://localhost:3002/health (Auth Security)
- http://localhost:3003/health (Analytics)
- http://localhost:3004/health (Integrations)

### Metrics

```bash
# View Prometheus metrics
curl http://localhost:3000/metrics
curl http://localhost:3003/metrics
```

### Logs

Structured logging is available for all services:

```bash
# View aggregated logs
docker-compose logs -f --tail=100

# Filter by service
docker-compose logs -f auth-security
```

## 🚨 Troubleshooting

### Common Issues

1. **"Port already in use"**
   ```bash
   # Check what's using the port
   lsof -i :5432
   # Kill the process or use different ports
   ```

2. **"Docker daemon not running"**
   ```bash
   # Start Docker Desktop or Docker daemon
   # On macOS: Start Docker Desktop app
   # On Linux: sudo systemctl start docker
   ```

3. **"Database connection failed"**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   # Restart database
   docker-compose restart postgres
   ```

4. **"Service unhealthy"**
   ```bash
   # Check service logs
   docker-compose logs [service-name]
   # Restart specific service
   docker-compose restart [service-name]
   ```

### Getting Help

```bash
# View setup script help
./scripts/setup-dev.sh help

# View health monitor help
tsx scripts/health-monitor.ts help

# Check service status
./scripts/setup-dev.sh status
```

### Reset Everything

If something goes wrong, you can reset the entire environment:

```bash
# Nuclear option - removes everything
./scripts/setup-dev.sh clean

# Then setup again
./scripts/setup-dev.sh setup
```

## 🔄 Workflow

### Typical Development Flow

1. **Start Development**
   ```bash
   ./scripts/setup-dev.sh start
   tsx scripts/health-monitor.ts check
   ```

2. **Make Changes**
   - Edit code (hot reload active)
   - Write tests
   - Run tests: `pnpm test`

3. **Test Integration**
   - Check health: `tsx scripts/health-monitor.ts check`
   - Test in browser: http://localhost:5173

4. **End of Day**
   ```bash
   ./scripts/setup-dev.sh stop
   ```

### Contributing

1. Work in feature branches
2. Write tests for new functionality
3. Ensure all health checks pass
4. Run full test suite
5. Create pull request

## 📈 Performance

### Development Mode Specifications

- **Memory Usage**: ~2GB RAM for all services
- **Startup Time**: 2-3 minutes for complete setup
- **Hot Reload**: <500ms for most changes
- **Database**: SQLite for development, PostgreSQL for integration

### Production Considerations

This setup is optimized for development. Production deployment uses:
- Kubernetes orchestration
- Separate database instances
- Load balancing
- SSL/TLS encryption
- Enhanced security measures

## 🔒 Security Notes

### Development Security

- Uses development JWT secrets (change for production)
- Database passwords are simple (change for production)
- CORS is permissive (restrict for production)
- All services run on localhost (secure by default)

### HIPAA Compliance

Even in development:
- All database changes are audited
- Patient data is encrypted at rest
- Access logs are maintained
- Test data is synthetic

## 📝 API Documentation

### Service Endpoints

- **Auth**: http://localhost:3002/api-docs
- **Core**: http://localhost:3001/api-docs
- **AI/ML**: http://localhost:3000/api-docs
- **Analytics**: http://localhost:3003/api-docs
- **Integrations**: http://localhost:3004/api-docs

### Example API Calls

```bash
# Get all patients
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:3001/api/patients

# Create new appointment
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"patientId": "123", "providerId": "456", "date": "2024-09-20"}' \\
  http://localhost:3001/api/appointments

# AI document processing
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -F "document=@medical-record.pdf" \\
  http://localhost:3000/api/documents/process
```

---

🎉 **You're all set!** The Spark Den Healthcare Platform is now running locally.

Happy coding! 🏥💻