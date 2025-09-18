# Production Deployment Guide - Spark-Den Healthcare Platform

## 📋 Overview

This guide covers the complete production deployment process for the Spark-Den Healthcare Platform, from infrastructure setup to application deployment and monitoring.

## 🎯 Current Status

✅ **Phase 1 Complete**: Basic infrastructure deployed
- AWS ECS Cluster running
- RDS PostgreSQL database active
- ElastiCache Redis operational
- Application Load Balancer configured
- Simple Express servers deployed as placeholders

## 🚀 Next Deployment Phases

### Phase 2: Deploy Production Applications (Current)

1. **Run Production Deployment Script**
   ```bash
   chmod +x /Users/ikweku/Downloads/spark-den/prod/deploy-production-apps.sh
   ./prod/deploy-production-apps.sh
   ```

   This script will:
   - Build production Docker images for all services
   - Push images to ECR
   - Update ECS services with new images
   - Verify deployment status

### Phase 3: Configure HTTPS & Custom Domain

1. **Prerequisites**
   - Domain name registered in Route53
   - ACM certificate requested and validated

2. **Update Terraform Configuration**
   ```bash
   cd /Users/ikweku/Downloads/spark-den/prod/terraform

   # Edit terraform.tfvars
   echo 'domain_name = "yourdomain.com"' >> terraform.tfvars

   # Apply changes
   terraform plan
   terraform apply
   ```

### Phase 4: Set Up CI/CD Pipeline

1. **Configure GitHub Secrets**
   Add these secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SLACK_WEBHOOK_URL` (optional)

2. **Enable GitHub Actions**
   The workflow file is already created at `.github/workflows/deploy-production.yml`

3. **Test Deployment**
   ```bash
   git add .
   git commit -m "Deploy production applications"
   git push origin main
   ```

### Phase 5: Configure Monitoring & Alerts

1. **CloudWatch Dashboards**
   ```bash
   aws cloudwatch put-dashboard \
     --dashboard-name SparkDenProduction \
     --dashboard-body file://monitoring/dashboard.json
   ```

2. **Set Up Alarms**
   - CPU utilization > 80%
   - Memory utilization > 85%
   - Error rate > 1%
   - Response time > 2 seconds

3. **Enable Container Insights**
   Already configured in Terraform

### Phase 6: Implement Auto-Scaling

1. **Service Auto-Scaling**
   Already configured in Terraform with:
   - Target CPU: 70%
   - Target Memory: 80%
   - Min/Max counts per service

2. **Cluster Auto-Scaling**
   - Min instances: 2
   - Max instances: 6
   - Target capacity: 85%

### Phase 7: Backup & Disaster Recovery

1. **Database Backups**
   - Automated backups: 7-day retention
   - Manual snapshots before major changes

2. **Disaster Recovery Plan**
   ```bash
   # Create backup
   aws rds create-db-snapshot \
     --db-instance-identifier spark-den-db \
     --db-snapshot-identifier spark-den-db-$(date +%Y%m%d)

   # Restore from backup
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier spark-den-db-restored \
     --db-snapshot-identifier spark-den-db-20250918
   ```

## 🛠️ Service Details

| Service | Port | Path | Purpose |
|---------|------|------|---------|
| auth-service | 3002 | /auth/* | Authentication & authorization |
| core-service | 3001 | /api/patients/* | Core business logic |
| ai-ml-service | 3000 | /ai/* | AI/ML processing |
| analytics-service | 3003 | /analytics/* | Analytics & reporting |
| pms-integrations | 3004 | /pms/* | Practice management integrations |
| ehr-frontend | 5173 | / | Main EHR interface |
| pms-frontend | 5174 | /pms-app/* | PMS interface |

## 📊 Monitoring Commands

```bash
# View running services
aws ecs list-services --cluster spark-den-cluster --region us-east-1

# Check service status
aws ecs describe-services \
  --cluster spark-den-cluster \
  --services spark-den-auth-service \
  --region us-east-1

# View logs
aws logs tail /ecs/spark-den/auth-service --follow --region us-east-1

# Check ALB health
curl http://spark-den-alb-1679568472.us-east-1.elb.amazonaws.com/health
```

## 🔒 Security Checklist

- [ ] Enable WAF on ALB
- [ ] Configure security groups (least privilege)
- [ ] Enable VPC Flow Logs
- [ ] Set up AWS GuardDuty
- [ ] Configure AWS Config rules
- [ ] Implement secrets rotation
- [ ] Enable encryption at rest
- [ ] Set up AWS CloudTrail
- [ ] Configure backup encryption
- [ ] Implement network segmentation

## 💰 Cost Optimization

Current estimated monthly costs:
- ECS Instances (t3.large): ~$90
- RDS PostgreSQL (db.m5.large): ~$65
- ElastiCache Redis: ~$13
- Application Load Balancer: ~$25
- NAT Gateway: ~$45
- Storage & Data Transfer: ~$20-30
- **Total**: ~$260/month

## 🚨 Troubleshooting

### Service Not Starting
```bash
# Check task definition
aws ecs describe-task-definition \
  --task-definition spark-den-auth-service \
  --region us-east-1

# Check failed tasks
aws ecs describe-tasks \
  --cluster spark-den-cluster \
  --tasks $(aws ecs list-tasks --cluster spark-den-cluster --service-name spark-den-auth-service --desired-status STOPPED --query 'taskArns[0]' --output text) \
  --region us-east-1
```

### Container Health Check Failures
```bash
# SSH into container instance
aws ecs execute-command \
  --cluster spark-den-cluster \
  --task <task-id> \
  --container auth-service \
  --interactive \
  --command "/bin/sh"

# Test health endpoint
curl http://localhost:3002/health
```

### High Memory/CPU Usage
```bash
# Scale service
aws ecs update-service \
  --cluster spark-den-cluster \
  --service spark-den-auth-service \
  --desired-count 3
```

## 📞 Support Contacts

- DevOps Team: devops@sparkden.health
- AWS Support: Premium support enabled
- On-call rotation: PagerDuty configured

## 📚 Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Application Documentation](./docs/README.md)

## ✅ Deployment Checklist

- [ ] Infrastructure deployed (Terraform)
- [ ] Docker images built and pushed
- [ ] ECS services updated
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Security review completed
- [ ] Load testing performed
- [ ] Documentation updated
- [ ] Team trained

---

*Last Updated: 2025-09-18*
*Version: 1.0.0*