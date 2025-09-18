# Network Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID of the load balancer"
  value       = aws_security_group.alb.id
}

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_names" {
  description = "Names of the ECS services"
  value = {
    for service, config in local.services :
    service => aws_ecs_service.services[service].name
  }
}

output "ecs_task_definition_arns" {
  description = "ARNs of the ECS task definitions"
  value = {
    for service, config in local.services :
    service => aws_ecs_task_definition.services[service].arn
  }
}

# Database Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_security_group_id" {
  description = "Security group ID of the RDS instance"
  value       = aws_security_group.rds.id
}

# ElastiCache Outputs
output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = 6379
}

output "redis_security_group_id" {
  description = "Security group ID of the ElastiCache cluster"
  value       = aws_security_group.elasticache.id
}

# IAM Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions role"
  value       = aws_iam_role.github_actions.arn
}

# Secrets Manager Outputs
output "db_secret_arn" {
  description = "ARN of the database secret"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "redis_secret_arn" {
  description = "ARN of the Redis secret"
  value       = aws_secretsmanager_secret.redis_auth_token.arn
  sensitive   = true
}

output "jwt_secret_arn" {
  description = "ARN of the JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
  sensitive   = true
}

# S3 Outputs
output "app_storage_bucket_name" {
  description = "Name of the application storage S3 bucket"
  value       = aws_s3_bucket.app_storage.id
}

output "alb_logs_bucket_name" {
  description = "Name of the ALB logs S3 bucket"
  value       = aws_s3_bucket.alb_logs.id
}

# Monitoring Outputs
output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

# Target Group Outputs
output "target_group_arns" {
  description = "ARNs of the target groups"
  value = {
    for service, config in local.services :
    service => aws_lb_target_group.services[service].arn
  }
}

# Certificate Output
output "certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = var.certificate_arn != "" ? var.certificate_arn : (var.domain_name != "" ? aws_acm_certificate.main[0].arn : null)
}

# Environment Configuration
output "environment_config" {
  description = "Environment configuration summary"
  value = {
    project_name = var.project_name
    environment  = var.environment
    aws_region   = var.aws_region
    domain_name  = var.domain_name

    # Service configuration
    services = {
      for service, config in local.services :
      service => {
        port = config.port
        cpu  = config.cpu
        memory = config.memory
        desired_count = config.desired_count
        ecr_repository = aws_ecr_repository.services[service].repository_url
      }
    }

    # Infrastructure endpoints
    endpoints = {
      load_balancer = aws_lb.main.dns_name
      database     = aws_db_instance.main.endpoint
      redis        = aws_elasticache_replication_group.main.primary_endpoint_address
    }
  }
  sensitive = true
}

# Deployment Information
output "deployment_info" {
  description = "Information needed for CI/CD deployment"
  value = {
    cluster_name = aws_ecs_cluster.main.name
    task_execution_role_arn = aws_iam_role.ecs_task_execution.arn
    task_role_arn = aws_iam_role.ecs_task.arn

    ecr_repositories = {
      for service, config in local.services :
      service => aws_ecr_repository.services[service].repository_url
    }

    subnets = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]

    target_groups = {
      for service, config in local.services :
      service => aws_lb_target_group.services[service].arn
    }
  }
}