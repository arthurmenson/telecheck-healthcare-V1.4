# Spark Den - Terraform Infrastructure

This directory contains Terraform configuration for deploying the Spark Den healthcare platform on AWS using ECS Fargate.

## 🏗️ Architecture Overview

- **ECS Fargate Cluster** with 6 microservices
- **Application Load Balancer** with SSL termination
- **RDS PostgreSQL** with Multi-AZ deployment
- **ElastiCache Redis** for caching and sessions
- **VPC** with public/private subnet architecture
- **CloudWatch** monitoring and alerting
- **ECR** for container image storage

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Domain name** (optional, but recommended for production)
4. **SSL certificate** in AWS Certificate Manager (optional)

### Initial Setup

1. **Clone and navigate to terraform directory:**
```bash
cd terraform
```

2. **Copy and configure variables:**
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values
```

3. **Configure Terraform backend (recommended for production):**
```bash
# Create S3 bucket and DynamoDB table for state management
aws s3 mb s3://spark-den-terraform-state-$(date +%s)
aws dynamodb create-table \
  --table-name spark-den-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1

# Update backend configuration in main.tf
```

4. **Initialize Terraform:**
```bash
terraform init
```

5. **Plan deployment:**
```bash
terraform plan
```

6. **Apply configuration:**
```bash
terraform apply
```

## 📊 Infrastructure Components

### Networking
- **VPC** with 3 availability zones
- **Public Subnets** for load balancer
- **Private Subnets** for ECS services
- **Database Subnets** for RDS and ElastiCache
- **VPC Endpoints** for AWS services (reduces NAT costs)
- **VPC Flow Logs** for security monitoring

### Compute
- **ECS Fargate Cluster** with container insights
- **Auto Scaling** based on CPU and memory metrics
- **Service Discovery** for inter-service communication
- **Application Load Balancer** with path-based routing

### Data Storage
- **RDS PostgreSQL 16** with encryption and automated backups
- **ElastiCache Redis 7** with encryption and high availability
- **S3 Buckets** for application storage and ALB logs

### Security
- **Security Groups** with least-privilege access
- **IAM Roles** for services and CI/CD
- **Secrets Manager** for sensitive configuration
- **KMS Encryption** for ECS and data at rest

### Monitoring
- **CloudWatch Dashboards** for operational visibility
- **CloudWatch Alarms** for proactive alerting
- **SNS Topics** for alert notifications
- **Lambda Function** for log processing
- **X-Ray Tracing** (optional) for distributed tracing

## 🔧 Configuration

### Environment Variables

Key configuration options in `terraform.tfvars`:

```hcl
# Core settings
project_name = "spark-den"
environment  = "production"  # or "staging"
aws_region   = "us-east-1"

# Domain configuration (optional)
domain_name     = "your-domain.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."

# Database sizing
db_instance_class = "db.t3.medium"    # Scale up for production
redis_node_type   = "cache.t3.medium"

# Feature flags
enable_cloudfront = true
enable_waf        = true
enable_xray       = true
```

### Service Configuration

Services are configured in `main.tf` under `local.services`:

```hcl
"auth-security" = {
  port           = 3002
  cpu            = 512
  memory         = 1024
  desired_count  = 2
  min_capacity   = 1
  max_capacity   = 10
}
```

## 🚀 Deployment Workflows

### Staging Environment
```bash
# Deploy staging
terraform workspace new staging
terraform apply -var="environment=staging"
```

### Production Environment
```bash
# Deploy production
terraform workspace new production
terraform apply -var="environment=production"
```

## 📈 Monitoring and Alerts

### CloudWatch Dashboard
Access the dashboard at: `https://console.aws.amazon.com/cloudwatch/`

### Key Metrics
- **ECS Service** CPU and memory utilization
- **ALB** request count and response times
- **RDS** performance metrics
- **Application Errors** from logs

### Alert Configuration
Alerts are sent to the SNS topic. Configure email subscription:
```bash
aws sns subscribe \
  --topic-arn $(terraform output -raw sns_topic_arn) \
  --protocol email \
  --notification-endpoint your-email@domain.com
```

## 🔒 Security Best Practices

### HIPAA Compliance Features
- ✅ **Encryption at rest** (RDS, EBS, S3)
- ✅ **Encryption in transit** (ALB, Redis)
- ✅ **Network isolation** (private subnets)
- ✅ **Audit logging** (CloudTrail, VPC Flow Logs)
- ✅ **Access controls** (IAM, Security Groups)

### Security Recommendations
1. **Enable GuardDuty** for threat detection
2. **Configure Config Rules** for compliance monitoring
3. **Set up CloudTrail** for API auditing
4. **Use Systems Manager** for patch management
5. **Implement WAF rules** for application protection

## 🔧 Maintenance

### Backup and Recovery
- **RDS automated backups** with 30-day retention
- **Point-in-time recovery** available
- **Cross-region backup replication** (configure manually)

### Updates and Scaling
```bash
# Scale services
terraform apply -var="desired_count=4"

# Update instance types
terraform apply -var="db_instance_class=db.r6g.large"
```

### Cost Optimization
- **Use Spot instances** for non-critical workloads
- **Right-size resources** based on CloudWatch metrics
- **Enable S3 lifecycle policies** for log retention
- **Review unused resources** regularly

## 🛠️ Troubleshooting

### Common Issues

1. **Certificate validation timeout:**
   - Ensure DNS records are properly configured
   - Check domain ownership

2. **ECS service deployment failures:**
   - Check CloudWatch logs for container errors
   - Verify ECR image exists and is accessible

3. **Database connection issues:**
   - Verify security group rules
   - Check secrets in Secrets Manager

### Useful Commands

```bash
# View outputs
terraform output

# Check ECS service status
aws ecs describe-services --cluster $(terraform output -raw ecs_cluster_name)

# View recent logs
aws logs describe-log-groups --log-group-name-prefix "/aws/ecs/spark-den"

# Test database connectivity
aws rds describe-db-instances --db-instance-identifier $(terraform output -raw rds_endpoint)
```

## 📚 Additional Resources

- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [HIPAA on AWS](https://aws.amazon.com/compliance/hipaa-compliance/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Healthcare Architecture on AWS](https://aws.amazon.com/health/)

## 🆘 Support

For infrastructure issues:
1. Check CloudWatch logs and metrics
2. Review Terraform state and plan
3. Consult AWS documentation
4. Contact your AWS support team

---

**Important:** Always test changes in staging before applying to production!