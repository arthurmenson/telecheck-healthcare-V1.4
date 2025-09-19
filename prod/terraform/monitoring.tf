# CloudWatch Monitoring and Alerts Configuration

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "spark-den-production"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            ["AWS/ECS", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Resource Utilization"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "Average" }],
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Application Load Balancer Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { stat = "Average" }],
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Database Performance"
        }
      }
    ]
  })
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "spark-den-alerts"

  tags = {
    Name        = "spark-den-alerts"
    Environment = var.environment
    Project     = "spark-den"
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ECS Service CPU Alarm
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  for_each = toset([
    "auth-service",
    "core-service",
    "ai-ml-service",
    "analytics-service",
    "pms-integrations",
    "ehr-frontend",
    "pms-frontend"
  ])

  alarm_name          = "spark-den-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS service CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = "spark-den-${each.key}"
  }

  tags = {
    Name        = "spark-den-${each.key}-cpu-alarm"
    Environment = var.environment
    Service     = each.key
  }
}

# ECS Service Memory Alarm
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  for_each = toset([
    "auth-service",
    "core-service",
    "ai-ml-service",
    "analytics-service",
    "pms-integrations",
    "ehr-frontend",
    "pms-frontend"
  ])

  alarm_name          = "spark-den-${each.key}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS service memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = "spark-den-${each.key}"
  }

  tags = {
    Name        = "spark-den-${each.key}-memory-alarm"
    Environment = var.environment
    Service     = each.key
  }
}

# ALB Target Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "alb_response_time_high" {
  alarm_name          = "spark-den-alb-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2"
  alarm_description   = "This metric monitors ALB target response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name        = "spark-den-alb-response-time-alarm"
    Environment = var.environment
  }
}

# ALB Unhealthy Host Count Alarm
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "spark-den-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors unhealthy ALB targets"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name        = "spark-den-alb-unhealthy-hosts-alarm"
    Environment = var.environment
  }
}

# RDS CPU Alarm
resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "spark-den-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "75"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = {
    Name        = "spark-den-rds-cpu-alarm"
    Environment = var.environment
  }
}

# RDS Connection Count Alarm
resource "aws_cloudwatch_metric_alarm" "rds_connection_high" {
  alarm_name          = "spark-den-rds-connection-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS connection count"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = {
    Name        = "spark-den-rds-connection-alarm"
    Environment = var.environment
  }
}

# RDS Free Storage Space Alarm
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "spark-den-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10737418240" # 10 GB in bytes
  alarm_description   = "This metric monitors RDS free storage"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = {
    Name        = "spark-den-rds-storage-alarm"
    Environment = var.environment
  }
}

# ElastiCache CPU Alarm
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "spark-den-redis-cpu-high"
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

  tags = {
    Name        = "spark-den-redis-cpu-alarm"
    Environment = var.environment
  }
}

# Application Error Rate Alarm (based on ALB 5xx errors)
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "spark-den-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5xx errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name        = "spark-den-alb-5xx-alarm"
    Environment = var.environment
  }
}

# CloudWatch Log Groups for each service
resource "aws_cloudwatch_log_metric_filter" "error_logs" {
  for_each = toset([
    "auth-service",
    "core-service",
    "ai-ml-service",
    "analytics-service",
    "pms-integrations",
    "ehr-frontend",
    "pms-frontend"
  ])

  name           = "${each.key}-error-filter"
  pattern        = "[ERROR]"
  log_group_name = aws_cloudwatch_log_group.ecs[each.key].name

  metric_transformation {
    name      = "${each.key}-error-count"
    namespace = "SparkDen/Application"
    value     = "1"
  }
}

# Application Error Log Alarm
resource "aws_cloudwatch_metric_alarm" "application_errors" {
  for_each = toset([
    "auth-service",
    "core-service",
    "ai-ml-service",
    "analytics-service",
    "pms-integrations",
    "ehr-frontend",
    "pms-frontend"
  ])

  alarm_name          = "spark-den-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "${each.key}-error-count"
  namespace           = "SparkDen/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors application error logs"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = {
    Name        = "spark-den-${each.key}-error-alarm"
    Environment = var.environment
    Service     = each.key
  }
}

# Outputs
output "dashboard_url" {
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=spark-den-production"
  description = "CloudWatch Dashboard URL"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "SNS Topic ARN for alerts"
}

output "monitoring_status" {
  value = {
    dashboard     = "Configured"
    alarms        = "Active"
    log_filters   = "Enabled"
    sns_topic     = aws_sns_topic.alerts.name
    metrics_count = length(aws_cloudwatch_metric_alarm.ecs_cpu_high) + length(aws_cloudwatch_metric_alarm.ecs_memory_high) + 7
  }
  description = "Monitoring configuration status"
}