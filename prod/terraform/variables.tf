# Terraform Variables for Spark Den Production

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "spark-den"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# ECS Configuration
variable "ecs_instance_type" {
  description = "EC2 instance type for ECS cluster"
  type        = string
  default     = "t3.large"
}

variable "ecs_min_size" {
  description = "Minimum number of ECS instances"
  type        = number
  default     = 2
}

variable "ecs_max_size" {
  description = "Maximum number of ECS instances"
  type        = number
  default     = 6
}

variable "ecs_desired_capacity" {
  description = "Desired number of ECS instances"
  type        = number
  default     = 3
}

# RDS Configuration
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.m5.large"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "db_backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.small"
}

variable "redis_num_nodes" {
  description = "Number of ElastiCache Redis nodes"
  type        = number
  default     = 1
}

# Service Configuration
variable "services" {
  description = "Service configurations"
  type = map(object({
    cpu                    = number
    memory                 = number
    desired_count          = number
    min_count              = number
    max_count              = number
    port                   = number
    health_check_path      = string
    health_check_interval  = number
    health_check_timeout   = number
    scale_target_cpu       = number
    scale_target_memory    = number
  }))
  default = {
    auth-service = {
      cpu                    = 512
      memory                 = 1024
      desired_count          = 2
      min_count              = 2
      max_count              = 4
      port                   = 3002
      health_check_path      = "/health"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
    core-service = {
      cpu                    = 512
      memory                 = 1024
      desired_count          = 2
      min_count              = 2
      max_count              = 4
      port                   = 3001
      health_check_path      = "/health"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
    ai-ml-service = {
      cpu                    = 1024
      memory                 = 2048
      desired_count          = 1
      min_count              = 1
      max_count              = 3
      port                   = 3000
      health_check_path      = "/health"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
    analytics-service = {
      cpu                    = 512
      memory                 = 1024
      desired_count          = 1
      min_count              = 1
      max_count              = 3
      port                   = 3003
      health_check_path      = "/health"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
    pms-integrations = {
      cpu                    = 512
      memory                 = 1024
      desired_count          = 1
      min_count              = 1
      max_count              = 3
      port                   = 3004
      health_check_path      = "/health"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
    ehr-frontend = {
      cpu                    = 256
      memory                 = 512
      desired_count          = 2
      min_count              = 2
      max_count              = 4
      port                   = 5173
      health_check_path      = "/"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
    pms-frontend = {
      cpu                    = 256
      memory                 = 512
      desired_count          = 2
      min_count              = 2
      max_count              = 4
      port                   = 5174
      health_check_path      = "/"
      health_check_interval  = 30
      health_check_timeout   = 5
      scale_target_cpu       = 70
      scale_target_memory    = 80
    }
  }
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "sparkden.health"  # Change this to your actual domain
}

variable "create_route53_zone" {
  description = "Whether to create a new Route53 hosted zone"
  type        = bool
  default     = true
}

variable "route53_zone_id" {
  description = "Existing Route53 zone ID (if not creating new)"
  type        = string
  default     = ""
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = ""
}

# Cost Optimization
variable "use_spot_instances" {
  description = "Use EC2 Spot instances for ECS"
  type        = bool
  default     = false
}

variable "spot_instance_percentage" {
  description = "Percentage of spot instances in ECS cluster"
  type        = number
  default     = 0
}

# Tags
variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default = {
    Owner       = "Healthcare Team"
    Environment = "production"
    Compliance  = "HIPAA"
  }
}