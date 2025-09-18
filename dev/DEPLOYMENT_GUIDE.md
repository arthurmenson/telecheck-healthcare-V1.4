# 🚀 Spark Den - Production Deployment Guide

Complete guide for deploying the Spark Den healthcare platform to AWS using ECS Fargate with CI/CD automation.

## 📋 Quick Start Checklist

- [ ] AWS Account with appropriate permissions
- [ ] Domain name and SSL certificate
- [ ] GitHub repository with secrets configured
- [ ] Terraform deployed infrastructure
- [ ] Environment configurations reviewed
- [ ] Security compliance validated

## 🏗️ Infrastructure Overview

### AWS Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Internet Gateway                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Application Load Balancer                    │
│              (SSL Termination + WAF)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   ECS Fargate Cluster                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │Auth Service │ │Core Service │ │  AI/ML + Analytics +    ││
│  │   :3002     │ │   :3001     │ │  PMS + Frontend         ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  RDS PostgreSQL + ElastiCache Redis (Private Subnets)     │
└─────────────────────────────────────────────────────────────┘
```

### Service Configuration
- **6 Microservices** in ECS Fargate
- **Auto-scaling** based on CPU/memory
- **Blue-green deployments** with health checks
- **Private networking** with security groups
- **Encrypted data** at rest and in transit

## 🔧 Prerequisites Setup

### 1. AWS Account Setup

#### Required AWS Services
- ECS Fargate
- RDS PostgreSQL
- ElastiCache Redis
- Application Load Balancer
- Route 53 (optional)
- Certificate Manager
- Secrets Manager
- CloudWatch

#### IAM Permissions
Create an IAM user/role with policies for:
- ECS full access
- ECR full access
- RDS management
- ElastiCache management
- Load Balancer management
- CloudWatch access
- Secrets Manager access

### 2. Domain and SSL Setup (Optional)

```bash
# If using custom domain, configure in Route 53
aws route53 list-hosted-zones

# Create/import SSL certificate in ACM
aws acm request-certificate \
  --domain-name spark-den.com \
  --subject-alternative-names *.spark-den.com \
  --validation-method DNS
```

### 3. GitHub Repository Setup

#### Required Secrets
Configure in GitHub Repository Settings > Secrets:

```
AWS_ACCOUNT_ID=123456789012
AWS_STAGING_ROLE_ARN=arn:aws:iam::123456789012:role/github-actions-staging
AWS_PRODUCTION_ROLE_ARN=arn:aws:iam::123456789012:role/github-actions-production
SNYK_TOKEN=your-snyk-token (optional)
```

## 🏗️ Infrastructure Deployment

### 1. Deploy with Terraform

```bash
# Clone repository
git clone https://github.com/your-username/spark-den.git
cd spark-den/terraform

# Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Deploy staging environment
terraform workspace new staging
terraform init
terraform plan
terraform apply

# Deploy production environment
terraform workspace new production
terraform plan -var="environment=production"
terraform apply -var="environment=production"
```

### 2. Configure Environment Variables

```bash
# Update environment files
cp environments/staging.env.example environments/staging.env
cp environments/production.env.example environments/production.env

# Edit with your specific values:
# - Domain names
# - AWS Account ID
# - Feature flags
# - Third-party API keys
```

## 🚀 Deployment Process

### Automated Deployment (Recommended)

#### Staging Deployment
```bash
# Push to develop branch triggers automatic staging deployment
git checkout develop
git push origin develop

# Monitor deployment in GitHub Actions
# https://github.com/your-username/spark-den/actions
```

#### Production Deployment
```bash
# Push to main branch triggers production deployment with approval
git checkout main
git merge develop
git push origin main

# Approve deployment in GitHub Actions when ready
```

### Manual Deployment

#### Using Deployment Scripts
```bash
# Deploy to staging
./scripts/deploy.sh staging all

# Deploy to production (with confirmation)
./scripts/deploy.sh production all v1.0.0

# Deploy specific service
./scripts/deploy.sh production auth-security v1.0.1
```

#### Using AWS CLI
```bash
# Build and push image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

docker build -t spark-den-auth-security workstream/auth-security/
docker tag spark-den-auth-security:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/spark-den-auth-security:v1.0.0
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/spark-den-auth-security:v1.0.0

# Update ECS service
aws ecs update-service \
  --cluster spark-den-production \
  --service auth-security \
  --force-new-deployment
```

## 🔍 Verification and Testing

### Health Checks
```bash
# Check all services
./scripts/health-check.sh production all

# Check specific service
./scripts/health-check.sh production auth-security

# Manual health check
curl -f https://your-domain.com/api/auth/health
```

### Monitoring Dashboard
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/
- **ECS Console**: https://console.aws.amazon.com/ecs/
- **ALB Console**: https://console.aws.amazon.com/ec2/v2/home#LoadBalancers

### Log Analysis
```bash
# View service logs
aws logs describe-log-groups --log-group-name-prefix "/aws/ecs/spark-den"

# Stream real-time logs
aws logs tail /aws/ecs/spark-den-production/auth-security --follow
```

## 🔐 Security Configuration

### HIPAA Compliance Checklist
- [ ] Encryption at rest enabled (RDS, EBS)
- [ ] Encryption in transit enabled (ALB, Redis)
- [ ] VPC private subnets configured
- [ ] Security groups with least privilege
- [ ] Audit logging enabled (CloudTrail)
- [ ] Access controls implemented (IAM)
- [ ] Data backup configured
- [ ] Incident response plan in place

### Security Scanning
```bash
# Run security scan
git push origin main  # Triggers security workflow

# Manual security scan
./scripts/security-scan.sh
```

## 🔄 Maintenance and Operations

### Regular Maintenance Tasks

#### Weekly
- [ ] Review CloudWatch metrics and alarms
- [ ] Check for security updates
- [ ] Verify backup completion
- [ ] Review access logs

#### Monthly
- [ ] Update dependencies
- [ ] Review and rotate secrets
- [ ] Performance optimization review
- [ ] Cost optimization analysis

#### Quarterly
- [ ] Security assessment
- [ ] Disaster recovery testing
- [ ] Compliance audit
- [ ] Architecture review

### Update Procedures

#### Application Updates
```bash
# Update staging
git checkout develop
# Make changes
git push origin develop

# Test in staging
./scripts/health-check.sh staging all

# Promote to production
git checkout main
git merge develop
git push origin main
```

#### Infrastructure Updates
```bash
# Update Terraform configuration
cd terraform
terraform plan
terraform apply

# Verify changes
./scripts/health-check.sh production all
```

### Backup and Recovery

#### Database Backups
- **Automated**: 30-day retention via RDS
- **Manual**: Create snapshot before major changes
- **Cross-region**: Configure for disaster recovery

#### Application Recovery
```bash
# Emergency rollback
./scripts/rollback.sh production all

# Specific service rollback
./scripts/rollback.sh production auth-security 5
```

## 🚨 Troubleshooting

### Common Issues

#### Deployment Failures
```bash
# Check ECS service events
aws ecs describe-services --cluster spark-den-production --services auth-security

# Check task failures
aws ecs describe-tasks --cluster spark-den-production --tasks task-id

# Review CloudWatch logs
aws logs tail /aws/ecs/spark-den-production/auth-security --since 1h
```

#### Health Check Failures
```bash
# Debug health checks
./scripts/health-check.sh production auth-security

# Check service status
aws ecs describe-services --cluster spark-den-production --services auth-security

# Test endpoints manually
curl -v https://your-domain.com/api/auth/health
```

#### Performance Issues
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=auth-security \
  --start-time 2023-01-01T00:00:00Z \
  --end-time 2023-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### Emergency Procedures

#### Service Outage
1. **Immediate Response**
   ```bash
   ./scripts/health-check.sh production all
   ./scripts/rollback.sh production all
   ```

2. **Communication**
   - Notify stakeholders
   - Update status page
   - Document incident

3. **Investigation**
   - Analyze logs and metrics
   - Identify root cause
   - Plan remediation

#### Data Recovery
1. **Assess Impact**
   - Identify affected data
   - Determine recovery point

2. **Restore Process**
   ```bash
   # Restore RDS from snapshot
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier spark-den-restored \
     --db-snapshot-identifier spark-den-backup-timestamp
   ```

## 📊 Cost Optimization

### Resource Sizing
- **ECS Tasks**: Right-size CPU/memory based on metrics
- **RDS Instance**: Monitor utilization and adjust
- **ElastiCache**: Optimize node types and clusters

### Cost Monitoring
```bash
# Enable AWS Cost Explorer
# Set up billing alerts
aws budgets create-budget --account-id 123456789012 --budget file://budget.json
```

## 📚 Additional Resources

### Documentation
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [HIPAA on AWS](https://aws.amazon.com/compliance/hipaa-compliance/)
- [Healthcare Architecture](https://aws.amazon.com/health/)

### Support Contacts
- **Technical Issues**: DevOps team
- **Security Issues**: Security team
- **AWS Support**: Enterprise support case

## 🔄 Continuous Improvement

### Performance Monitoring
- Set up CloudWatch dashboards
- Configure alerting rules
- Regular performance reviews

### Security Updates
- Enable automatic security updates
- Regular vulnerability scanning
- Security audit schedules

### Cost Optimization
- Monthly cost reviews
- Resource optimization recommendations
- Reserved instance planning

---

## 🎯 Success Metrics

### Deployment Success
- **Zero-downtime**: 99.9% uptime target
- **Deployment time**: < 15 minutes
- **Rollback time**: < 5 minutes
- **Health check pass rate**: 100%

### Security Compliance
- **HIPAA audit**: Pass quarterly audits
- **Vulnerability scan**: Zero critical findings
- **Access reviews**: Monthly completion
- **Incident response**: < 1 hour detection

### Performance Targets
- **API response time**: < 200ms average
- **Frontend load time**: < 3 seconds
- **Database queries**: < 100ms average
- **Resource utilization**: 60-80% target

---

**🚀 Ready for production deployment!**

Follow this guide step-by-step for a successful, secure, and compliant deployment of your healthcare platform.