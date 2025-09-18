# Terraform Outputs

# VPC Outputs
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs of public subnets"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "IDs of private subnets"
}

# ECS Outputs
output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "Name of the ECS cluster"
}

output "ecs_cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "ARN of the ECS cluster"
}

# Service Endpoints
output "service_urls" {
  value = var.domain_name != "" ? {
    ehr_portal     = "https://ehr.${var.domain_name}"
    pms_portal     = "https://pms.${var.domain_name}"
    main_site      = "https://${var.domain_name}"
    auth_api       = "https://${var.domain_name}/auth"
    core_api       = "https://${var.domain_name}/api"
    ai_api         = "https://${var.domain_name}/ai"
    analytics_api  = "https://${var.domain_name}/analytics"
    pms_api        = "https://${var.domain_name}/pms"
  } : {
    alb_endpoint = "http://${aws_lb.main.dns_name}"
    note         = "Configure domain_name variable for HTTPS endpoints"
  }
  description = "Service endpoint URLs"
}

# Deployment Instructions
output "deployment_instructions" {
  value = <<-EOT
    Deployment Steps:
    1. Build and push Docker images:
       aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com
       
       For each service:
       docker build -t ${var.project_name}/<service-name> .
       docker tag ${var.project_name}/<service-name>:latest ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/<service-name>:latest
       docker push ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/<service-name>:latest

    2. Update ECS services to use new images:
       aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service <service-name> --force-new-deployment

    3. Monitor deployment:
       aws ecs describe-services --cluster ${aws_ecs_cluster.main.name} --services <service-name>

    4. Access the application:
       ${var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"}
  EOT
  description = "Instructions for deploying services"
}

# Cost Estimation
output "estimated_monthly_cost" {
  value = <<-EOT
    Estimated Monthly Costs (USD):
    - ECS Instances (t3.medium, mix of spot/on-demand): ~$40-60
    - RDS PostgreSQL (db.t3.micro, Single-AZ): ~$15
    - ElastiCache Redis (cache.t3.micro): ~$13
    - Application Load Balancer: ~$25
    - NAT Instance (t3.nano): ~$4
    - Storage (EBS, S3): ~$10-20
    - Data Transfer: ~$10-30
    - CloudWatch (Essential metrics): ~$5-10
    
    Total Estimated: ~$150-200/month
    
    Note: Actual costs may vary based on usage patterns.
  EOT
  description = "Estimated monthly AWS costs"
}

# Security Group IDs
output "security_group_ids" {
  value = {
    alb            = aws_security_group.alb.id
    ecs            = aws_security_group.ecs.id
    rds            = aws_security_group.rds.id
    redis          = aws_security_group.redis.id
    vpc_endpoints  = aws_security_group.vpc_endpoints.id
  }
  description = "Security group IDs"
  sensitive   = false
}

# Secrets ARNs
output "secret_arns" {
  value = {
    db_password = aws_secretsmanager_secret.db_password.arn
    jwt_secret  = aws_secretsmanager_secret.jwt_secret.arn
  }
  description = "ARNs of secrets in Secrets Manager"
  sensitive   = true
}