# PMS Portal Separation Architecture

## System Architecture Overview

### Current Monolithic Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Spark Den Platform                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Clinical  │ │    Admin    │ │     Business/PMS        │ │
│  │     EHR     │ │  Features   │ │      Features           │ │
│  │             │ │             │ │                         │ │
│  │ • Patients  │ │ • Users     │ │ • Scheduling            │ │
│  │ • Charts    │ │ • Settings  │ │ • Billing               │ │
│  │ • Orders    │ │ • Reports   │ │ • Revenue Cycle         │ │
│  │ • Results   │ │ • Audit     │ │ • Practice Admin        │ │
│  │ • Notes     │ │             │ │ • Financial Reports     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│                                                             │
│              Shared Database & Infrastructure               │
└─────────────────────────────────────────────────────────────┘
```

### Target Separated Architecture
```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│        Clinical EHR Portal      │    │       PMS Business Portal       │
│                                 │    │                                 │
│  ┌─────────────────────────────┐ │    │  ┌─────────────────────────────┐ │
│  │      Clinical Features      │ │    │  │      Business Features     │ │
│  │                             │ │    │  │                             │ │
│  │ • Patient Clinical Records  │ │    │  │ • Patient Demographics     │ │
│  │ • Clinical Documentation   │ │    │  │ • Appointment Scheduling   │ │
│  │ • Order Management         │ │    │  │ • Billing & Claims         │ │
│  │ • Lab/Imaging Results      │ │    │  │ • Payment Processing       │ │
│  │ • Medication Management    │ │    │  │ • Insurance Management     │ │
│  │ • Care Plans               │ │    │  │ • Financial Reporting      │ │
│  │ • Clinical Decision Support│ │    │  │ • Practice Administration  │ │
│  │ • Telehealth               │ │    │  │ • Revenue Cycle Analytics  │ │
│  └─────────────────────────────┘ │    │  └─────────────────────────────┘ │
│                                 │    │                                 │
│  ┌─────────────────────────────┐ │    │  ┌─────────────────────────────┐ │
│  │      Clinical Database      │ │    │  │      Business Database     │ │
│  │                             │ │    │  │                             │ │
│  │ • Clinical Data             │ │    │  │ • Financial Data            │ │
│  │ • Medical Records           │ │    │  │ • Billing Information      │ │
│  │ • Provider Notes            │ │    │  │ • Insurance Data            │ │
│  │ • Orders & Results          │ │    │  │ • Payment Records           │ │
│  └─────────────────────────────┘ │    │  │ • Practice Management      │ │
└─────────────────────────────────┘    │  └─────────────────────────────┘ │
                                       └─────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │      Integration Layer         │
                    │                                 │
                    │ • FHIR APIs                     │
                    │ • Real-time Data Sync           │
                    │ • Event-driven Communication    │
                    │ • Shared Authentication         │
                    │ • Cross-portal Navigation       │
                    └─────────────────────────────────┘
```

---

## Domain Separation Strategy

### Clinical EHR Portal (Port 5173)
**Primary Users:** Doctors, Nurses, Clinical Staff, Patients
**Focus:** Clinical care delivery and patient health management

```
Core Modules:
├─ 🏥 Clinical Dashboard
│  ├─ Patient census and assignments
│  ├─ Clinical alerts and notifications
│  ├─ Today's clinical tasks
│  └─ Clinical quality metrics
│
├─ 👤 Patient Clinical Management
│  ├─ Medical records and history
│  ├─ Current medications and allergies
│  ├─ Clinical assessments and plans
│  ├─ Vital signs and observations
│  └─ Care coordination
│
├─ 📋 Clinical Documentation
│  ├─ SOAP notes and progress notes
│  ├─ Assessment and plan documentation
│  ├─ Clinical forms and templates
│  ├─ Voice-to-text documentation
│  └─ Clinical workflow automation
│
├─ 🔬 Orders & Results Management
│  ├─ Laboratory order management
│  ├─ Imaging order management
│  ├─ Medication prescribing
│  ├─ Result review and follow-up
│  └─ Critical value management
│
├─ 💊 Medication Management
│  ├─ E-prescribing
│  ├─ Medication reconciliation
│  ├─ Drug interaction checking
│  ├─ Allergy management
│  └─ Adherence monitoring
│
├─ 🎯 Clinical Decision Support
│  ├─ Evidence-based guidelines
│  ├─ Risk assessment tools
│  ├─ Clinical alerts and reminders
│  ├─ Quality measure tracking
│  └─ Care gap identification
│
├─ 📹 Telehealth Platform
│  ├─ Video consultations
│  ├─ Remote patient monitoring
│  ├─ Virtual care coordination
│  ├─ Digital health tools
│  └─ Patient engagement
│
└─ 📊 Clinical Analytics
   ├─ Clinical quality metrics
   ├─ Patient outcome tracking
   ├─ Population health analytics
   ├─ Clinical research data
   └─ Provider performance metrics
```

### PMS Business Portal (Port 5174)
**Primary Users:** Practice Managers, Billing Staff, Administrators, Front Desk
**Focus:** Business operations and financial management

```
Core Modules:
├─ 📊 Business Dashboard
│  ├─ Financial performance metrics
│  ├─ Operational efficiency indicators
│  ├─ Revenue cycle status
│  ├─ Appointment and schedule overview
│  └─ Key business alerts
│
├─ 👥 Patient Business Management
│  ├─ Patient registration and demographics
│  ├─ Insurance verification and benefits
│  ├─ Financial responsibility and estimates
│  ├─ Patient communication preferences
│  └─ Portal access management
│
├─ 📅 Advanced Scheduling System
│  ├─ Multi-provider scheduling
│  ├─ Resource and room management
│  ├─ Appointment types and templates
│  ├─ Waitlist and cancellation management
│  ├─ Online scheduling portal
│  └─ Schedule optimization
│
├─ 💰 Revenue Cycle Management
│  ├─ Charge capture and coding
│  ├─ Claims generation and submission
│  ├─ Payment processing and posting
│  ├─ Denial management and appeals
│  ├─ Collections and bad debt
│  └─ Financial reporting
│
├─ 🏢 Practice Administration
│  ├─ Provider management and credentialing
│  ├─ Staff scheduling and management
│  ├─ Facility and equipment management
│  ├─ Vendor and contract management
│  ├─ Compliance and risk management
│  └─ Policy and procedure management
│
├─ 📈 Business Intelligence & Analytics
│  ├─ Financial performance analytics
│  ├─ Operational efficiency metrics
│  ├─ Payer performance analysis
│  ├─ Practice benchmarking
│  ├─ Predictive analytics
│  └─ Executive dashboards
│
├─ ⚙️ System Administration
│  ├─ User management and permissions
│  ├─ System configuration
│  ├─ Integration management
│  ├─ Audit logs and monitoring
│  └─ Data backup and recovery
│
└─ 🔗 Third-party Integrations
   ├─ Clearinghouse connections
   ├─ Payer portal integrations
   ├─ Banking and payment processing
   ├─ Accounting system integration
   ├─ Communication platforms
   └─ Business intelligence tools
```

---

## Data Architecture

### Database Separation Strategy
```
Clinical Database (PostgreSQL - Primary):
├─ Patients (clinical subset)
│  ├─ Medical record numbers
│  ├─ Clinical demographics
│  ├─ Emergency contacts
│  └─ Care team assignments
│
├─ Clinical Documentation
│  ├─ Encounters and visits
│  ├─ Progress notes and assessments
│  ├─ Clinical orders and results
│  ├─ Medication records
│  └─ Care plans and goals
│
├─ Clinical References
│  ├─ Drug databases and interactions
│  ├─ Clinical decision rules
│  ├─ Quality measures
│  ├─ Clinical templates
│  └─ Provider clinical data
│
└─ Clinical Analytics
   ├─ Quality metrics
   ├─ Outcome measures
   ├─ Risk scores
   └─ Clinical research data

Business Database (PostgreSQL - Secondary):
├─ Patients (business subset)
│  ├─ Registration information
│  ├─ Insurance and benefits
│  ├─ Financial responsibility
│  ├─ Communication preferences
│  └─ Portal access credentials
│
├─ Financial Management
│  ├─ Charges and billing codes
│  ├─ Claims and payments
│  ├─ Insurance information
│  ├─ Patient financial data
│  └─ Revenue cycle tracking
│
├─ Operational Management
│  ├─ Schedules and appointments
│  ├─ Provider and staff data
│  ├─ Facility and resource management
│  ├─ Contracts and agreements
│  └─ Compliance tracking
│
└─ Business Analytics
   ├─ Financial performance data
   ├─ Operational metrics
   ├─ Payer analytics
   └─ Business intelligence
```

### Shared Data Elements
```
Master Patient Index (MPI):
├─ Unique patient identifiers
├─ Cross-reference between systems
├─ Patient matching algorithms
├─ Duplicate detection and resolution
└─ Identity verification

Synchronized Data:
├─ Basic patient demographics
├─ Appointment schedules
├─ Provider information
├─ Insurance eligibility status
├─ Clinical encounter dates
└─ Billing episode linkage
```

---

## Integration Architecture

### Real-time Data Synchronization
```
Event-Driven Architecture:
├─ Apache Kafka Message Broker
│  ├─ Patient registration events
│  ├─ Appointment scheduling events
│  ├─ Clinical encounter events
│  ├─ Billing status events
│  └─ Insurance verification events
│
├─ Microservices Integration
│  ├─ Patient sync service
│  ├─ Appointment sync service
│  ├─ Provider sync service
│  ├─ Insurance sync service
│  └─ Audit sync service
│
└─ Data Consistency Management
   ├─ Eventual consistency patterns
   ├─ Conflict resolution strategies
   ├─ Data validation and verification
   ├─ Rollback and recovery procedures
   └─ Monitoring and alerting
```

### API Integration Points
```
Clinical to PMS APIs:
├─ POST /pms/api/v1/patients/demographics    # Patient registration updates
├─ POST /pms/api/v1/appointments/clinical    # Clinical encounter notifications
├─ POST /pms/api/v1/billing/charges          # Clinical charge capture
├─ GET  /pms/api/v1/patients/{id}/insurance  # Insurance verification status
└─ POST /pms/api/v1/providers/schedule       # Provider availability updates

PMS to Clinical APIs:
├─ POST /ehr/api/v1/patients/registration    # New patient registrations
├─ POST /ehr/api/v1/appointments/scheduled   # Appointment confirmations
├─ POST /ehr/api/v1/insurance/verification   # Insurance status updates
├─ GET  /ehr/api/v1/providers/{id}/schedule  # Provider schedule queries
└─ POST /ehr/api/v1/encounters/billing       # Billing-related encounter data

Shared Services APIs:
├─ Authentication Service (:3002)
├─ Notification Service (:3003)
├─ Document Management Service (:3004)
├─ Integration Hub Service (:3005)
└─ Audit and Logging Service (:3006)
```

### Single Sign-On (SSO) Implementation
```
Shared Authentication:
├─ Central Identity Provider (Keycloak/Auth0)
├─ OAuth 2.0 / OpenID Connect
├─ JWT token sharing between portals
├─ Role-based access control (RBAC)
├─ Cross-portal navigation with seamless auth
└─ Session management and timeout policies

Portal-Specific Permissions:
├─ Clinical Portal Roles:
│  ├─ Attending Physician
│  ├─ Resident/Fellow
│  ├─ Nurse Practitioner
│  ├─ Registered Nurse
│  ├─ Clinical Assistant
│  └─ Patient (Portal Access)
│
└─ PMS Portal Roles:
   ├─ Practice Administrator
   ├─ Practice Manager
   ├─ Billing Manager
   ├─ Front Desk Coordinator
   ├─ Financial Counselor
   └─ Business Analyst
```

---

## Development Workflow Updates

### Parallel Development Tracks
```
Track 1: Clinical EHR Portal Development
├─ Repository: spark-den-clinical-portal
├─ Port: 5173 (Development), 443 (Production)
├─ Team: 8-12 developers (clinical focus)
├─ Timeline: 12 months for full implementation
└─ Focus: Clinical workflows and patient care

Track 2: PMS Business Portal Development
├─ Repository: spark-den-pms-portal
├─ Port: 5174 (Development), 443 (Production)
├─ Team: 6-10 developers (business focus)
├─ Timeline: 10 months for full implementation
└─ Focus: Business operations and financial management

Track 3: Shared Services Development
├─ Repository: spark-den-shared-services
├─ Ports: 3002-3006 (Various microservices)
├─ Team: 4-6 developers (platform focus)
├─ Timeline: Ongoing throughout both tracks
└─ Focus: Integration, authentication, and shared functionality
```

### Updated Sprint Planning
```
Sprint Structure (2-week sprints):
├─ Week 1: Development and feature implementation
├─ Week 2: Testing, integration, and deployment
├─ Cross-portal testing every 2 sprints
├─ Integration testing every 4 sprints
└─ End-to-end testing every 8 sprints

Milestone Dependencies:
├─ Month 1-2: Shared authentication and basic infrastructure
├─ Month 3-4: Basic patient management in both portals
├─ Month 5-6: Appointment scheduling integration
├─ Month 7-8: Clinical documentation and billing integration
├─ Month 9-10: Advanced features and workflow optimization
├─ Month 11-12: Full integration testing and go-live preparation
└─ Month 13+: Post-launch optimization and feature enhancement
```

### Deployment Strategy
```
Infrastructure Setup:
├─ Clinical Portal:
│  ├─ ALB: spark-den-clinical-alb
│  ├─ ECS Service: spark-den-clinical-service
│  ├─ Database: spark-den-clinical-db
│  └─ Domain: clinical.sparkden.com
│
├─ PMS Portal:
│  ├─ ALB: spark-den-pms-alb
│  ├─ ECS Service: spark-den-pms-service
│  ├─ Database: spark-den-pms-db
│  └─ Domain: pms.sparkden.com
│
└─ Shared Services:
   ├─ ALB: spark-den-services-alb
   ├─ ECS Services: Multiple microservices
   ├─ Message Broker: Kafka/SQS
   └─ Domain: api.sparkden.com

Cross-Portal Navigation:
├─ Universal header with portal switcher
├─ Seamless authentication between portals
├─ Context preservation during navigation
├─ Deep linking between related features
└─ Consistent user experience design
```

This architectural separation provides clear boundaries between clinical and business functions while maintaining necessary integration points for seamless healthcare operations.