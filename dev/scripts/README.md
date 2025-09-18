# Deployment Scripts and Tools

This directory contains deployment scripts and maintenance tools for the Spark Den healthcare platform.

## 🚀 Available Scripts

### `deploy.sh` - Production Deployment
Deploy services to staging or production environments.

```bash
# Deploy all services to staging
./scripts/deploy.sh staging all

# Deploy specific service to production
./scripts/deploy.sh production auth-security v1.2.3

# Deploy frontend to staging
./scripts/deploy.sh staging frontend
```

**Features:**
- ✅ Build and push Docker images to ECR
- ✅ Update ECS task definitions and services
- ✅ Wait for deployment completion
- ✅ Verify deployment health
- ✅ Comprehensive health checks
- ✅ Rollback on failure

### `rollback.sh` - Emergency Rollback
Quickly rollback services to previous versions.

```bash
# Rollback all services to previous revision
./scripts/rollback.sh production all

# Rollback specific service to specific revision
./scripts/rollback.sh staging auth-security 5

# Rollback frontend to previous revision
./scripts/rollback.sh production frontend
```

**Features:**
- ✅ Show revision history
- ✅ Automatic previous revision detection
- ✅ Confirmation prompts for safety
- ✅ Service health verification
- ✅ Post-rollback health checks

### `health-check.sh` - System Health Monitoring
Monitor the health of all services and infrastructure.

```bash
# Check all services in production
./scripts/health-check.sh production all

# Check specific service in staging
./scripts/health-check.sh staging auth-security

# Check local development environment
./scripts/health-check.sh local all
```

**Features:**
- ✅ HTTP endpoint health checks
- ✅ Infrastructure status monitoring
- ✅ ECS service status verification
- ✅ Detailed health reports
- ✅ Environment-specific checks

## 🛠️ Prerequisites

### Required Tools
- **AWS CLI** - Configured with appropriate credentials
- **Docker** - For building and pushing images
- **jq** - JSON processing
- **curl** - HTTP health checks

### AWS Permissions
The scripts require the following AWS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecs:*",
        "elbv2:DescribeLoadBalancers",
        "rds:DescribeDBInstances",
        "elasticache:DescribeReplicationGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

## 📋 Usage Guide

### 1. First-Time Setup

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Configure AWS CLI
aws configure

# Verify Terraform infrastructure is deployed
cd terraform
terraform output
```

### 2. Staging Deployment

```bash
# Deploy to staging (triggered by push to develop branch)
git push origin develop

# Or deploy manually
./scripts/deploy.sh staging all
```

### 3. Production Deployment

```bash
# Deploy to production (requires manual approval in GitHub Actions)
git push origin main

# Or deploy manually
./scripts/deploy.sh production all v1.0.0
```

### 4. Emergency Procedures

```bash
# Emergency rollback
./scripts/rollback.sh production all

# Check system health
./scripts/health-check.sh production all

# Check specific service
./scripts/health-check.sh production auth-security
```

## 🔒 Security Features

### Production Safety
- **Confirmation prompts** for destructive operations
- **Revision history** display before rollbacks
- **Health checks** after all deployments
- **Automatic rollback** on deployment failures

### HIPAA Compliance
- **Audit logging** of all deployment activities
- **Encrypted communications** with AWS services
- **Access controls** via IAM roles
- **Data protection** during deployments

## 📊 Monitoring Integration

### CloudWatch Integration
Scripts automatically integrate with CloudWatch for:
- Deployment metrics
- Health check results
- Error tracking
- Performance monitoring

### Alerting
Failed deployments and health checks trigger:
- CloudWatch alarms
- SNS notifications
- Slack/Discord alerts (configurable)

## 🔧 Customization

### Environment Variables

```bash
# Override default AWS region
export AWS_REGION=us-west-2

# Override project name
export PROJECT_NAME=my-project

# Override health check timeout
export HEALTH_CHECK_TIMEOUT=30
```

### Custom Health Checks

Add custom health checks by modifying `health-check.sh`:

```bash
# Add custom endpoint check
check_http_endpoint "$BASE_URL/api/custom/health" 10 "Custom service"
```

## 🐛 Troubleshooting

### Common Issues

1. **AWS Authentication Errors**
   ```bash
   # Check AWS credentials
   aws sts get-caller-identity

   # Reconfigure if needed
   aws configure
   ```

2. **Docker Build Failures**
   ```bash
   # Check Docker daemon
   docker info

   # Clean up Docker cache
   docker system prune -f
   ```

3. **ECS Deployment Timeouts**
   ```bash
   # Check ECS service events
   aws ecs describe-services --cluster spark-den-production --services auth-security

   # Check CloudWatch logs
   aws logs describe-log-groups --log-group-name-prefix "/aws/ecs/spark-den"
   ```

### Debug Mode

Enable debug mode for verbose output:

```bash
# Enable debug mode
export DEBUG=1
./scripts/deploy.sh staging all
```

### Log Files

Scripts generate detailed logs:
- `deployment-$(date).log` - Deployment logs
- `health-report-$(date).txt` - Health check reports
- `rollback-$(date).log` - Rollback logs

## 🚨 Emergency Procedures

### Production Outage Response

1. **Immediate Assessment**
   ```bash
   ./scripts/health-check.sh production all
   ```

2. **Quick Rollback**
   ```bash
   ./scripts/rollback.sh production all
   ```

3. **Monitor Recovery**
   ```bash
   ./scripts/health-check.sh production all
   ```

### Partial Service Failures

1. **Identify Failed Service**
   ```bash
   ./scripts/health-check.sh production all
   ```

2. **Rollback Specific Service**
   ```bash
   ./scripts/rollback.sh production [service-name]
   ```

3. **Verify Recovery**
   ```bash
   ./scripts/health-check.sh production [service-name]
   ```

## 📈 Performance Optimization

### Deployment Speed
- **Parallel builds** using Docker Buildx
- **Layer caching** for faster builds
- **Image optimization** with multi-stage builds

### Health Check Efficiency
- **Concurrent checks** for multiple services
- **Timeout optimization** per service type
- **Early failure detection**

## 🔄 CI/CD Integration

### GitHub Actions
Scripts are integrated with GitHub Actions workflows:
- Automatic deployment on branch pushes
- Manual deployment triggers
- Rollback on deployment failures

### Monitoring Integration
- CloudWatch metrics collection
- Custom deployment metrics
- Performance tracking

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [HIPAA Compliance Guide](https://aws.amazon.com/compliance/hipaa-compliance/)
- [Healthcare Architecture Patterns](https://aws.amazon.com/health/)

## 🆘 Support

For deployment issues:
1. Check script logs and error messages
2. Review CloudWatch logs and metrics
3. Verify AWS service status
4. Contact DevOps team if issues persist

---

**Remember:** Always test deployments in staging before production!