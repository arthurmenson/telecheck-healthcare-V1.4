# Production Configuration for Spark-Den Healthcare Platform

# Domain Configuration
# Update this with your actual domain name
domain_name = ""  # Leave empty for HTTP-only access via ALB DNS

# If you already have a Route53 hosted zone, set this to false
# and provide the zone_id below
create_route53_zone = true
# route53_zone_id = "Z1234567890ABC"  # Uncomment and set if using existing zone

# Environment
environment = "production"

# Enable production features
enable_monitoring = true
log_retention_days = 30

# Tags for all resources
tags = {
  Environment = "production"
  Project     = "spark-den"
  ManagedBy   = "terraform"
  Owner       = "Healthcare Team"
  Compliance  = "HIPAA"
}