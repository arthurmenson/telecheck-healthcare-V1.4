# ElastiCache Redis Configuration

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.project_name}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = {
    Name = "${var.project_name}-redis-params"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project_name}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  # Single-AZ for cost optimization
  az_mode                      = "single-az"
  preferred_availability_zones = [data.aws_availability_zones.available.names[0]]

  # Maintenance window
  maintenance_window = "sun:05:00-sun:06:00"

  # Snapshot configuration (daily backups)
  snapshot_window          = "03:00-04:00"
  snapshot_retention_limit = 3

  # Enable logs if monitoring is enabled
  log_delivery_configuration {
    destination      = var.enable_monitoring ? aws_cloudwatch_log_group.redis[0].name : null
    destination_type = var.enable_monitoring ? "cloudwatch-logs" : null
    log_format       = var.enable_monitoring ? "json" : null
    log_type         = var.enable_monitoring ? "slow-log" : null
  }

  tags = {
    Name        = "${var.project_name}-redis"
    Environment = var.environment
  }
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis" {
  count = var.enable_monitoring ? 1 : 0

  name              = "/aws/elasticache/${var.project_name}-redis"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-redis-logs"
  }
}

# CloudWatch Alarms for Redis
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors Redis CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors Redis memory usage"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.redis.id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  count = var.enable_monitoring ? 1 : 0

  alarm_name          = "${var.project_name}-redis-high-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = "100"
  alarm_description   = "This metric monitors Redis evictions"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.redis.id
  }
}

# Output Redis endpoint
output "redis_endpoint" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "Redis cluster primary endpoint"
}

output "redis_port" {
  value       = aws_elasticache_cluster.redis.port
  description = "Redis cluster port"
}