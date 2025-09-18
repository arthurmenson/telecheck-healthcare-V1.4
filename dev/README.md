# 🏥 Spark Den Healthcare Platform

A comprehensive, HIPAA-compliant healthcare management platform built with modern microservices architecture.

## 🚀 Quick Start

Get the entire platform running locally in 3 minutes:

```bash
git clone <repository-url>
cd spark-den/dev
./scripts/setup-dev.sh
```

**That's it!** 🎉

- **Frontend**: http://localhost:5173
- **Login**: admin@sparkden.com / password123

## 📋 What's Included

This platform provides a complete healthcare management solution:

### 🌐 Frontend Application
- Modern React/TypeScript interface
- Real-time dashboards and analytics
- Responsive design for all devices
- WCAG accessibility compliance

### ⚡ Backend Services
- **Authentication & Security** (Port 3002) - JWT, RBAC, audit logging
- **AI/ML Services** (Port 3000) - Medical coding, document processing
- **Core Services** (Port 3001) - Patient management, appointments
- **Analytics & Reporting** (Port 3003) - Real-time dashboards, reports
- **PMS Integrations** (Port 3004) - FHIR, EHR connectivity

### 🗄️ Data Layer
- **PostgreSQL** - Primary database with HIPAA compliance
- **Redis** - Caching and session management

## 🛠️ Development

### System Requirements
- Docker & Docker Compose
- Node.js 20+
- 8GB+ RAM recommended

### Quick Commands
```bash
# Setup and start everything
./scripts/setup-dev.sh

# Check health status
./scripts/setup-dev.sh validate

# Monitor services in real-time
tsx scripts/health-monitor.ts monitor

# View logs
./scripts/setup-dev.sh logs [service-name]

# Stop everything
./scripts/setup-dev.sh stop
```

### Development Workflow
1. Services support hot reload
2. Database includes seeded test data
3. All APIs are documented with OpenAPI/Swagger
4. Comprehensive test suites included

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │   Auth Service  │    │   Core Services │
│   (React/Vite)  │────│   (JWT/RBAC)    │────│   (Patients)    │
│     :5173       │    │     :3002       │    │     :3001       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI/ML Services│    │   Analytics     │    │  Integrations   │
│   (Medical AI)  │    │   (Reporting)   │    │   (FHIR/EHR)   │
│     :3000       │    │     :3003       │    │     :3004       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐         ┌─────────────────┐
│   PostgreSQL    │         │      Redis      │
│   (Database)    │         │    (Cache)      │
│     :5432       │         │     :6379       │
└─────────────────┘         └─────────────────┘
```

## 🔒 Security & Compliance

### HIPAA Compliance
- ✅ Audit logging for all data access
- ✅ Encryption at rest and in transit
- ✅ Role-based access control (RBAC)
- ✅ PHI data protection
- ✅ BAA-compliant infrastructure

### Security Features
- JWT-based authentication
- Rate limiting and DDoS protection
- SQL injection prevention
- XSS protection
- CORS policy enforcement

## 📊 Features

### Healthcare Management
- **Patient Records** - Complete EHR with medical history
- **Appointment Scheduling** - Automated scheduling with conflict detection
- **Provider Management** - Staff scheduling and credentialing
- **Billing & Claims** - Automated insurance claims processing
- **Clinical Decision Support** - AI-powered diagnosis assistance

### AI/ML Capabilities
- **Medical Coding** - Automated ICD-10/CPT coding
- **Document Processing** - OCR and NLP for medical documents
- **Predictive Analytics** - Risk assessment and outcome prediction
- **Bias Detection** - Algorithmic fairness monitoring

### Integration & Interoperability
- **FHIR R4** - Full FHIR compliance
- **Epic Integration** - Native Epic MyChart connectivity
- **Cerner Integration** - Cerner PowerChart integration
- **HL7 Messaging** - Standard healthcare data exchange

## 📈 Monitoring & Analytics

### Real-time Dashboards
- Population health metrics
- Financial performance
- Operational efficiency
- Quality measures

### Observability
- Application performance monitoring
- Error tracking and alerting
- Infrastructure metrics
- Custom business intelligence

## 🧪 Testing

### Automated Testing
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# End-to-end testing
pnpm test:e2e
```

### Test Coverage Goals
- Unit tests: >90%
- Integration tests: >80%
- E2E critical paths: 100%

## 📚 Documentation

- **Development Setup**: [DEV_SETUP.md](./DEV_SETUP.md)
- **API Documentation**: Available at each service's `/api-docs` endpoint
- **Architecture Docs**: [WORKSTREAM_ASSIGNMENTS.md](./WORKSTREAM_ASSIGNMENTS.md)
- **Deployment Guide**: [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md)

## 🤝 Contributing

### Development Process
1. Create feature branch
2. Write tests first (TDD approach)
3. Implement feature
4. Validate with health checks
5. Create pull request

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- Comprehensive testing
- Security scanning

## 🎯 Getting Started Checklist

- [ ] Clone repository
- [ ] Run `./scripts/setup-dev.sh`
- [ ] Access http://localhost:5173
- [ ] Login with admin@sparkden.com / password123
- [ ] Explore the patient dashboard
- [ ] Try creating a new appointment
- [ ] Check the analytics dashboard
- [ ] Review API documentation at :3001/api-docs

## 🆘 Support

### Troubleshooting
```bash
# Check service health
./scripts/setup-dev.sh validate

# View logs
./scripts/setup-dev.sh logs

# Reset environment
./scripts/setup-dev.sh clean
./scripts/setup-dev.sh setup
```

### Common Issues
- **Port conflicts**: Check what's running on ports 3000-3004, 5173, 5432, 6379
- **Docker issues**: Ensure Docker Desktop is running
- **Database connection**: PostgreSQL takes ~30 seconds to start

## 📊 Performance

### Development Environment
- **Startup time**: 2-3 minutes
- **Hot reload**: <500ms
- **Memory usage**: ~2GB RAM
- **API response**: <100ms average

### Production Ready
- Kubernetes deployment
- Auto-scaling capabilities
- Load balancing
- Global CDN distribution

## 🏆 Technology Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS + Radix UI
- React Query for state management
- Recharts for visualizations

### Backend
- Node.js + TypeScript
- Express.js framework
- PostgreSQL + Drizzle ORM
- Redis for caching
- JWT authentication
- Winston logging

### Infrastructure
- Docker containers
- Docker Compose orchestration
- PostgreSQL 16
- Redis 7
- Nginx (production)

### AI/ML
- TensorFlow.js
- OpenAI API integration
- Custom NLP models
- Computer vision processing

---

**🎉 Ready to revolutionize healthcare technology?**

Start coding: `./scripts/setup-dev.sh` 🚀