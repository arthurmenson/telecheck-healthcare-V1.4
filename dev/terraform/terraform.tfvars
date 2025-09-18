# Core Configuration
project_name = "spark-den"
environment  = "staging"  # Start with staging
aws_region   = "us-east-1"

# Network Configuration
vpc_cidr = "10.0.0.0/16"
public_subnet_cidrs = [
  "10.0.1.0/24",
  "10.0.2.0/24",
  "10.0.3.0/24"
]
private_subnet_cidrs = [
  "10.0.10.0/24",
  "10.0.20.0/24",
  "10.0.30.0/24"
]
database_subnet_cidrs = [
  "10.0.50.0/24",
  "10.0.60.0/24",
  "10.0.70.0/24"
]

# Domain Configuration (Optional - set these if you have a domain)
domain_name     = ""  # e.g., "spark-den.com"
certificate_arn = ""  # e.g., "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"

# Database Configuration
db_instance_class            = "db.t3.micro"     # Free tier for staging
db_allocated_storage         = 100
db_max_allocated_storage     = 1000
db_backup_retention_period   = 30               # 7 days minimum for production
db_backup_window            = "03:00-04:00"
db_maintenance_window       = "Sun:04:00-Sun:05:00"

# Redis Configuration
redis_node_type       = "cache.t3.micro"        # Smaller for staging
redis_num_cache_nodes = 2                       # 2+ for high availability

# Monitoring Configuration
enable_cloudwatch_logs = true
log_retention_in_days  = 30                     # 90+ days for production compliance

# Security Configuration
enable_vpc_flow_logs = true
enable_encryption    = true

# Feature Flags
enable_cloudfront = true                        # Enable CDN for frontend
enable_waf        = true                        # Enable Web Application Firewall
enable_xray       = true                        # Enable X-Ray tracing

# Auto Scaling Configuration
enable_autoscaling       = true
autoscaling_target_cpu   = 70                   # Target CPU utilization percentage
autoscaling_target_memory = 80                  # Target memory utilization percentage

# Environment-specific configurations

# For staging environment:
# environment = "staging"
# db_instance_class = "db.t3.small"
# redis_node_type = "cache.t3.micro"
# redis_num_cache_nodes = 1
# log_retention_in_days = 7
# enable_cloudfront = false
# enable_waf = false

# For production environment:
# environment = "production"
# db_instance_class = "db.r6g.large"
# redis_node_type = "cache.r6g.large"
# redis_num_cache_nodes = 3
# log_retention_in_days = 90
# enable_cloudfront = true
# enable_waf = true