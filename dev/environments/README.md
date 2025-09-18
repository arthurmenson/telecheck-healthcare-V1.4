# Environment Configuration

This directory contains environment-specific configuration files for the Spark Den healthcare platform.

## 📁 Environment Files

### `local.env`
- **Purpose**: Local development environment
- **Database**: Local PostgreSQL/Redis containers
- **Security**: Relaxed for development
- **Features**: All debugging and development tools enabled

### `staging.env`
- **Purpose**: Staging/testing environment
- **Database**: AWS RDS/ElastiCache staging instances
- **Security**: Production-like security with debugging enabled
- **Features**: All features enabled for testing

### `production.env`
- **Purpose**: Production environment
- **Database**: AWS RDS/ElastiCache production instances
- **Security**: Full HIPAA compliance and security
- **Features**: Production-optimized settings

## 🔧 Usage

### Local Development
```bash
# Copy local environment file
cp environments/local.env .env

# Start local services
docker-compose up -d
```

### Staging Deployment
Environment variables are automatically injected by ECS from:
- AWS Secrets Manager (sensitive values)
- Environment file configuration (non-sensitive values)

### Production Deployment
Same as staging but with production-specific values and enhanced security.

## 🔐 Security Configuration

### Secret Management
Sensitive values are managed through AWS Secrets Manager:
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret
- `REDIS_AUTH_TOKEN` - Redis authentication token
- API keys and tokens

### Non-Sensitive Configuration
Regular configuration is stored in environment files:
- Service ports and URLs
- Feature flags
- Performance settings
- Logging configuration

## 🏥 HIPAA Compliance

### Production Environment
- ✅ **Encryption at rest**: All databases encrypted
- ✅ **Encryption in transit**: TLS for all communications
- ✅ **Audit logging**: All access logged
- ✅ **Access controls**: Role-based permissions
- ✅ **Data retention**: Configurable retention policies

### Development Environment
- ⚠️ **Relaxed security**: For development convenience
- ⚠️ **Mock data**: No real PHI
- ⚠️ **Local storage**: Files stored locally

## 🚀 Service Configuration

### Backend Services
- **auth-security**: Port 3002 - Authentication and security
- **core-services**: Port 3001 - Core healthcare services
- **ai-ml-services**: Port 3000 - AI/ML processing
- **analytics-reporting**: Port 3003 - Analytics and reporting
- **pms-integrations**: Port 3004 - PMS/EHR integrations

### Frontend Service
- **frontend**: Port 5173 (dev) / 80 (production) - React application

## 🔄 Environment Variables Reference

### Core Configuration
```bash
NODE_ENV=production|staging|development
AWS_REGION=us-east-1
API_VERSION=v1
```

### Database Configuration
```bash
DB_HOST=<database-endpoint>
DB_PORT=5432
DB_NAME=sparkden
DB_USER=sparkden
DB_PASSWORD=<from-secrets-manager>
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=25
```

### Security Configuration
```bash
JWT_SECRET=<from-secrets-manager>
JWT_EXPIRES_IN=12h
BCRYPT_ROUNDS=14
CORS_ORIGIN=https://app.spark-den.com
```

### Feature Flags
```bash
ENABLE_AI_FEATURES=true
ENABLE_ANALYTICS=true
ENABLE_BILLING=true
ENABLE_INTEGRATIONS=true
ENABLE_DEBUG_MODE=false
```

### Healthcare Compliance
```bash
HIPAA_MODE=true
AUDIT_LOGGING=true
ENCRYPTION_AT_REST=true
ENCRYPTION_IN_TRANSIT=true
```

## 📝 Configuration Best Practices

### 1. Secret Management
- Never commit secrets to git
- Use AWS Secrets Manager for sensitive data
- Rotate secrets regularly
- Use different secrets per environment

### 2. Environment Separation
- Keep environments isolated
- Use different AWS accounts for production
- Implement proper IAM policies
- Monitor cross-environment access

### 3. Configuration Validation
- Validate all environment variables on startup
- Provide clear error messages for missing config
- Use default values where appropriate
- Document all configuration options

### 4. Compliance Requirements
- Enable audit logging in production
- Encrypt all sensitive data
- Implement proper access controls
- Regular security assessments

## 🛠️ Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```bash
   # Check required variables are set
   node -e "console.log(process.env.DB_HOST || 'DB_HOST not set')"
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

3. **Redis Connection Issues**
   ```bash
   # Test Redis connectivity
   redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
   ```

### Environment-Specific Debugging

#### Local Development
- Check Docker containers are running
- Verify port mappings
- Check local DNS resolution

#### Staging/Production
- Verify AWS Secrets Manager access
- Check ECS task definition
- Review CloudWatch logs
- Validate security group rules

## 📋 Deployment Checklist

### Before Deployment
- [ ] All required environment variables configured
- [ ] Secrets properly stored in AWS Secrets Manager
- [ ] Database migrations ready
- [ ] Health checks configured
- [ ] Monitoring and alerting set up

### After Deployment
- [ ] Health checks passing
- [ ] All services responding
- [ ] Database connections working
- [ ] Logs appearing in CloudWatch
- [ ] Monitoring metrics available

## 🔍 Monitoring Configuration

### CloudWatch Integration
```bash
CLOUDWATCH_REGION=us-east-1
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_REQUEST_LOGGING=true
```

### Performance Monitoring
```bash
ENABLE_PERFORMANCE_TRACKING=true
NEWRELIC_LICENSE_KEY=<optional>
DATADOG_API_KEY=<optional>
SENTRY_DSN=<optional>
```

### Health Checks
```bash
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_INTERVAL=30000
```