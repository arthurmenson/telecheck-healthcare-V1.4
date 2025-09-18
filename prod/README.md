# Spark Den Production Deployment

## Overview

This directory contains all production deployment configurations for the Spark Den Healthcare Platform, including:
- Terraform Infrastructure as Code (IaC) for AWS
- Docker configurations for all services
- CI/CD pipeline configurations
- Deployment scripts and utilities

## Architecture

### Services
- **auth-service** (Port 3002): Authentication and authorization
- **core-service** (Port 3001): Core healthcare functionality
- **ai-ml-service** (Port 3000): AI/ML capabilities
- **analytics-service** (Port 3003): Analytics and reporting
- **pms-integrations** (Port 3004): Practice management integrations
- **ehr-frontend** (Port 5173): Electronic Health Records portal
- **pms-frontend** (Port 5174): Practice Management System portal

### AWS Infrastructure
- **ECS Cluster**: Container orchestration with spot instances
- **RDS PostgreSQL**: Single-AZ database with automated backups
- **ElastiCache Redis**: Single-AZ caching layer
- **Application Load Balancer**: Traffic distribution
- **NAT Instance**: Cost-optimized network address translation
- **VPC with public/private subnets**: Network isolation

## Cost Optimization

Estimated monthly costs: **~$150-200/month**

- ECS with 80% spot instances
- Single-AZ RDS (db.t3.micro)
- Single-AZ ElastiCache (cache.t3.micro)
- NAT Instance instead of NAT Gateway
- Essential CloudWatch metrics only

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured: `aws configure`
3. **Terraform** >= 1.5.0
4. **Docker** and **Docker Compose**
5. **Node.js** 20.x and **pnpm** 8.x

## Quick Start

### 1. Infrastructure Setup

```bash
cd terraform

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply infrastructure
terraform apply
```

### 2. Build and Push Docker Images

```bash
cd scripts
chmod +x build-and-push.sh

# Build and push all services
./build-and-push.sh

# Or build specific service
./build-and-push.sh auth-service
```

### 3. Deploy to ECS

```bash
chmod +x deploy-to-ecs.sh

# Deploy all services
./deploy-to-ecs.sh

# Or deploy specific service
./deploy-to-ecs.sh auth-service
```

## Local Development

Use Docker Compose for local testing:

```bash
cd prod
docker-compose up -d

# Access services:
# EHR Frontend: http://localhost:5173
# PMS Frontend: http://localhost:5174
# Auth API: http://localhost:3002
# Core API: http://localhost:3001
```

## Environment Variables

### Required Secrets (AWS Secrets Manager)
- `DB_PASSWORD`: PostgreSQL password
- `JWT_SECRET`: JWT signing secret

### Service Configuration
```env
NODE_ENV=production
DB_HOST=<rds-endpoint>
DB_PORT=5432
DB_NAME=sparkden
DB_USER=postgres
REDIS_HOST=<elasticache-endpoint>
REDIS_PORT=6379
```

## Monitoring

### CloudWatch Logs
```bash
# View service logs
aws logs tail /ecs/spark-den/<service-name> --follow
```

### ECS Service Status
```bash
# List all services
aws ecs list-services --cluster spark-den-cluster

# Describe specific service
aws ecs describe-services \
  --cluster spark-den-cluster \
  --services spark-den-auth-service
```

### Application Endpoints

After deployment, access your application at:

- **Without domain**: `http://<alb-dns-name>`
- **With domain**: 
  - EHR Portal: `https://ehr.yourdomain.com`
  - PMS Portal: `https://pms.yourdomain.com`
  - Main site: `https://yourdomain.com`

## Deployment Workflow

1. **Development**: Code changes in `/dev` directory
2. **Build**: Docker images built from source
3. **Push**: Images pushed to ECR
4. **Deploy**: ECS services updated with new images
5. **Monitor**: CloudWatch for logs and metrics

## Security Considerations

- All secrets stored in AWS Secrets Manager
- HTTPS encryption with ACM certificates
- VPC network isolation
- Security groups restrict traffic
- Non-root Docker containers
- Regular security updates

## Backup and Recovery

### Database Backups
- Automated daily backups (7-day retention)
- Point-in-time recovery available
- Manual snapshots before major updates

### Disaster Recovery
```bash
# Create manual DB snapshot
aws rds create-db-snapshot \
  --db-instance-identifier spark-den-db \
  --db-snapshot-identifier spark-den-db-manual-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier spark-den-db-restored \
  --db-snapshot-identifier <snapshot-id>
```

## Scaling

### Manual Scaling
```bash
# Scale ECS service
aws ecs update-service \
  --cluster spark-den-cluster \
  --service spark-den-auth-service \
  --desired-count 4
```

### Auto-scaling
Configured in Terraform with:
- Target CPU: 70%
- Target Memory: 80%
- Min/Max instances per service

## Troubleshooting

### Common Issues

1. **Service not starting**
   - Check CloudWatch logs
   - Verify environment variables
   - Check security groups

2. **Database connection issues**
   - Verify RDS security group
   - Check credentials in Secrets Manager
   - Ensure VPC connectivity

3. **High costs**
   - Review CloudWatch metrics
   - Check for unused resources
   - Optimize instance types

### Debug Commands
```bash
# SSH into ECS instance
aws ssm start-session --target <instance-id>

# View container logs
docker logs <container-id>

# Check ECS agent
sudo systemctl status ecs
```

## Maintenance

### Updates
1. Test changes in development
2. Build and push new images
3. Deploy during maintenance window
4. Monitor for issues
5. Rollback if needed

### Rollback
```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster spark-den-cluster \
  --service spark-den-auth-service \
  --task-definition spark-den-auth-service:<previous-revision>
```

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review this documentation
3. Contact the Healthcare Team

## License

Proprietary - Spark Den Healthcare Platform