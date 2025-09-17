# Spark Den - Production Deployment Guide

## 🚀 Deployment Overview

Complete healthcare platform deployed on AWS using ECS Fargate with a robust CI/CD pipeline.

### Architecture
- **Container Orchestration**: AWS ECS Fargate
- **Load Balancing**: Application Load Balancer (ALB)
- **Database**: RDS PostgreSQL with Multi-AZ
- **Caching**: ElastiCache Redis
- **Container Registry**: Amazon ECR
- **Infrastructure**: Terraform
- **CI/CD**: GitHub Actions

---

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** with Actions enabled
3. **AWS CLI** configured locally
4. **Docker** installed
5. **Terraform** >= 1.0

---

## 🏗️ Infrastructure Deployment

### Current Staging Environment

**Application URL**: http://spark-den-staging-alb-1661305982.us-east-1.elb.amazonaws.com

**Deployed Services**:
- ✅ **auth-security** (2/2 running)
- ✅ **analytics-reporting** (running)
- ✅ **ai-ml-services** (deploying)
- ✅ **core-services** (deploying)
- ✅ **pms-integrations** (deploying)
- ✅ **frontend** (deploying)

---

## 🔧 Manual Deployment Steps

### 1. Deploy Infrastructure

```bash
cd dev/terraform
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply
```

### 2. Build and Push Docker Images

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 901076063012.dkr.ecr.us-east-1.amazonaws.com

# Build and push each service
for service in auth-security ai-ml-services core-services analytics-reporting pms-integrations frontend; do
  cd dev/workstream/$service
  docker build --platform linux/amd64 -t spark-den-$service .
  docker tag spark-den-$service:latest 901076063012.dkr.ecr.us-east-1.amazonaws.com/spark-den-$service:latest
  docker push 901076063012.dkr.ecr.us-east-1.amazonaws.com/spark-den-$service:latest
  cd ../../../
done
```

### 3. Configure Secrets

```bash
# Database secrets (already configured)
aws secretsmanager put-secret-value --secret-id spark-den-staging-db-password --secret-string '{
  "host": "spark-den-staging-db.ckl6gs44yvky.us-east-1.rds.amazonaws.com",
  "port": "5432",
  "dbname": "sparkden",
  "username": "sparkden",
  "password": "dev-password-change-in-production"
}'

# Redis secrets (already configured)
aws secretsmanager put-secret-value --secret-id spark-den-staging-redis-auth-token --secret-string '{
  "host": "master.spark-den-staging-redis.l71oy0.use1.cache.amazonaws.com",
  "port": "6379",
  "auth_token": ""
}'

# JWT secret (already configured)
aws secretsmanager put-secret-value --secret-id spark-den-staging-jwt-secret --secret-string "dev-jwt-secret-key-change-in-production"
```

---

## 🔄 CI/CD Pipeline

### GitHub Secrets Required

Set these in `Repository Settings → Secrets and variables → Actions`:

```
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_REGION=us-east-1
ECR_REGISTRY=901076063012.dkr.ecr.us-east-1.amazonaws.com
ECS_CLUSTER=spark-den-staging
```

### Pipeline Features

- ✅ **Multi-service testing** (linting, type-checking, tests)
- ✅ **Security scanning** with Trivy
- ✅ **Automated builds** for AMD64 platform
- ✅ **Blue-green deployments** with zero downtime
- ✅ **Infrastructure management** with Terraform
- ✅ **Deployment notifications**

### Triggering Deployments

```bash
# Regular deployment (main branch)
git push origin main

# Infrastructure changes (include in commit message)
git commit -m "Update infrastructure [deploy-infra]"
git push origin main

# Pull request (runs tests + security scan only)
git checkout -b feature/my-feature
git push origin feature/my-feature
# Create PR to main
```

---

## 🔍 Service Endpoints

### Load Balancer Routes

- **Frontend**: `/`, `/static/*`, `/assets/*`
- **Auth Service**: `/api/auth/*`, `/api/security/*`
- **AI/ML Service**: `/api/ai/*`, `/api/ml/*`
- **Core Service**: `/api/patients/*`, `/api/appointments/*`, `/api/providers/*`
- **Analytics**: `/api/analytics/*`, `/api/reports/*`
- **PMS Integrations**: `/api/integrations/*`, `/api/fhir/*`

### Health Checks

Each service has health check configured on the main port. The ALB performs health checks and routes traffic only to healthy instances.

---

## 📊 Monitoring & Observability

### CloudWatch Resources

- **ECS Container Insights** enabled
- **ALB Access Logs** stored in S3
- **Service CPU/Memory alarms** configured
- **Auto-scaling** based on CPU/Memory thresholds

### Key Metrics

- Service task counts (desired vs running)
- ALB response times and error rates
- Database connections and performance
- Redis cache hit rates

---

## 🛡️ Security Features

- **VPC** with private subnets for services
- **Security Groups** with least-privilege access
- **IAM roles** with minimal permissions
- **Secrets Manager** for sensitive data
- **ALB** with security headers
- **Container** running as non-root user

---

## 🚨 Troubleshooting

### Common Issues

1. **503 Errors**: Services not healthy
   ```bash
   aws ecs describe-services --cluster spark-den-staging --services <service-name>
   ```

2. **Platform Mismatch**: Ensure AMD64 builds
   ```bash
   docker build --platform linux/amd64 -t <image> .
   ```

3. **Secret Access**: Check IAM permissions
   ```bash
   aws secretsmanager get-secret-value --secret-id <secret-name>
   ```

### Service Logs

```bash
# View service logs
aws logs tail /aws/ecs/spark-den-staging/<service-name> --follow

# Check task status
aws ecs describe-tasks --cluster spark-den-staging --tasks <task-arn>
```

---

## 📈 Production Readiness

### Current Status: ✅ **STAGING DEPLOYED**

- Infrastructure: Fully deployed and operational
- Services: Running with proper health checks
- Load Balancer: Accessible and routing correctly
- Database: Connected and operational
- Cache: Redis configured and available
- Secrets: Properly configured in AWS Secrets Manager
- CI/CD: Complete pipeline ready

### Next Steps for Production

1. Update `terraform.tfvars` for production environment
2. Configure domain name and SSL certificate
3. Enable HTTPS listener on ALB
4. Update security groups for production
5. Configure backup strategies
6. Set up monitoring dashboards
7. Configure alerting rules

---

## 🔗 Links

- **Application**: http://spark-den-staging-alb-1661305982.us-east-1.elb.amazonaws.com
- **AWS Console**: https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/spark-den-staging
- **ECR Registry**: https://console.aws.amazon.com/ecr/repositories?region=us-east-1