# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This is part of a larger monorepo with workspaces. Commands should be run from the workstream root unless specified otherwise.

### Core Development
```bash
# Install dependencies
pnpm install

# Start development server for PMS services
pnpm run dev:pms

# Run all tests
pnpm run test:pms-services

# Build the project
pnpm run build

# Run linting
pnpm run lint

# Run type checking
pnpm run type-check
```

### Database Operations
```bash
# Run PMS database migrations
pnpm run migrate:pms
```

### Root Level Commands (run from ../../)
```bash
# Run commands across all workstreams
pnpm run build          # Build all workstreams
pnpm run test           # Test all workstreams
pnpm run lint           # Lint all workstreams
pnpm run type-check     # Type check all workstreams
```

## Architecture Overview

### Workstream Structure
This repository uses a **workstream-based development approach** with 6 parallel development tracks to eliminate merge conflicts:

- **infrastructure/**: TypeScript config, build pipeline, CI/CD
- **database/**: PostgreSQL schema, Drizzle ORM, migrations
- **auth-security/**: JWT, RBAC, security middleware
- **core-services/**: Patient/Lab/Medication APIs
- **integrations/**: FHIR, messaging, wearables
- **pms-core-services/**: Practice Management System (this workstream)
- **testing-monitoring/**: Testing framework, monitoring, observability

### PMS Core Services Mission
Focus on comprehensive Practice Management System services including:
- Patient registration & demographics with AI-enhanced validation
- Insurance verification & eligibility with real-time payer connections
- Appointment scheduling & optimization with ML-powered resource allocation
- Revenue cycle management with automated claims processing
- Medical billing & collections with predictive payment optimization
- Financial analytics & reporting with real-time business intelligence

### Technical Stack
- **Language**: TypeScript with strict mode enabled
- **Package Manager**: pnpm (required, v8+)
- **Database**: PostgreSQL with Drizzle ORM
- **Architecture**: Microservices with clear service boundaries
- **Testing**: Comprehensive test coverage (90%+ target)
- **Security**: HIPAA-compliant, enterprise-grade authentication

### Key Performance Targets
- <100ms API response times for all PMS endpoints
- 99.99% uptime for critical revenue cycle services
- 95%+ automated insurance verification
- 98%+ automated claims submission
- <30 days in accounts receivable

### Integration Dependencies
- **Database Workstream**: For PMS data model extensions
- **Auth/Security Workstream**: For financial data security and HIPAA compliance
- **Core Services Workstream**: For EMR integration and shared business logic
- **AI/ML Services**: For coding automation and predictive analytics

### Development Workflow
1. Each workstream has its own branch to prevent conflicts
2. Regular integration testing via CI/CD
3. TypeScript strict mode compliance required
4. ESLint with zero errors/warnings
5. Security vulnerability scanning
6. Merge to main only after quality gates pass

### File Organization
- PMS services should follow microservice patterns
- Shared types go in `/shared/types/` (requires team approval for changes)
- Shared utilities go in `/shared/utils/` (requires team approval for changes)
- Focus on clean separation between clinical and billing workflows

### Quality Standards
- Zero `any` types in production code
- Comprehensive error handling and validation
- Complete audit trail for all financial transactions
- HIPAA compliance for all PMS data handling
- Real-time data validation and error prevention