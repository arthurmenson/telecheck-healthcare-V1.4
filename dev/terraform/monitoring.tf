# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = local.common_tags
}

# SNS Topic Subscription (replace with your email)
resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "alerts@your-domain.com"  # Replace with your email
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            for service in keys(local.services) : [
              "AWS/ECS",
              "CPUUtilization",
              "ServiceName",
              aws_ecs_service.services[service].name,
              "ClusterName",
              aws_ecs_cluster.main.name
            ]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Service CPU Utilization"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            for service in keys(local.services) : [
              "AWS/ECS",
              "MemoryUtilization",
              "ServiceName",
              aws_ecs_service.services[service].name,
              "ClusterName",
              aws_ecs_cluster.main.name
            ]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ECS Service Memory Utilization"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "TargetResponseTime", ".", "."],
            [".", "HTTPCode_Target_2XX_Count", ".", "."],
            [".", "HTTPCode_Target_4XX_Count", ".", "."],
            [".", "HTTPCode_Target_5XX_Count", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Application Load Balancer Metrics"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.id],
            [".", "DatabaseConnections", ".", "."],
            [".", "FreeableMemory", ".", "."],
            [".", "ReadLatency", ".", "."],
            [".", "WriteLatency", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Metrics"
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6

        properties = {
          query = "SOURCE '/aws/ecs/${var.project_name}-${var.environment}/auth-security'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20"
          region = var.aws_region
          title  = "Recent Error Logs"
        }
      }
    ]
  })
}

# Custom CloudWatch Metrics for Application Health
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  for_each = local.services

  name           = "${var.project_name}-${var.environment}-${each.key}-errors"
  log_group_name = aws_cloudwatch_log_group.services[each.key].name
  pattern        = "[ERROR]"

  metric_transformation {
    name      = "ErrorCount"
    namespace = "${var.project_name}/${var.environment}/${each.key}"
    value     = "1"
  }
}

# CloudWatch Alarms for Custom Metrics
resource "aws_cloudwatch_metric_alarm" "application_errors" {
  for_each = local.services

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorCount"
  namespace           = "${var.project_name}/${var.environment}/${each.key}"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors application error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# AWS X-Ray Tracing (if enabled)
resource "aws_xray_sampling_rule" "main" {
  count = var.enable_xray ? 1 : 0

  rule_name      = "${var.project_name}-${var.environment}-sampling"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  tags = local.common_tags
}

# CloudWatch Composite Alarm for Overall Health
resource "aws_cloudwatch_composite_alarm" "overall_health" {
  alarm_name          = "${var.project_name}-${var.environment}-overall-health"
  alarm_description   = "Overall system health alarm"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  alarm_rule = join(" OR ", [
    for service in keys(local.services) : aws_cloudwatch_metric_alarm.service_cpu[service].alarm_name
  ])

  depends_on = [
    aws_cloudwatch_metric_alarm.service_cpu,
    aws_cloudwatch_metric_alarm.service_memory
  ]

  tags = local.common_tags
}

# CloudWatch Logs Insights Queries (for investigation)
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.project_name}-${var.environment}-error-analysis"

  log_group_names = [
    for service in keys(local.services) : aws_cloudwatch_log_group.services[service].name
  ]

  query_string = <<EOF
fields @timestamp, @message, @logStream
| filter @message like /ERROR/
| stats count() by @logStream
| sort count desc
| limit 20
EOF
}

resource "aws_cloudwatch_query_definition" "performance_analysis" {
  name = "${var.project_name}-${var.environment}-performance-analysis"

  log_group_names = [
    for service in keys(local.services) : aws_cloudwatch_log_group.services[service].name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /response_time/
| parse @message "response_time: * ms" as response_time
| stats avg(response_time), max(response_time), min(response_time) by bin(5m)
| sort @timestamp desc
EOF
}

# CloudWatch Log Subscription Filters (for real-time processing)
resource "aws_cloudwatch_log_subscription_filter" "error_alerts" {
  for_each = local.services

  name            = "${var.project_name}-${var.environment}-${each.key}-error-filter"
  log_group_name  = aws_cloudwatch_log_group.services[each.key].name
  filter_pattern  = "[ERROR]"
  destination_arn = aws_lambda_function.log_processor.arn

  depends_on = [aws_lambda_permission.allow_cloudwatch]
}

# Lambda function for log processing (simplified)
resource "aws_lambda_function" "log_processor" {
  filename         = "log_processor.zip"
  function_name    = "${var.project_name}-${var.environment}-log-processor"
  role            = aws_iam_role.lambda_log_processor.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.log_processor.output_base64sha256
  runtime         = "python3.9"
  timeout         = 60

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.alerts.arn
    }
  }

  tags = local.common_tags
}

# Create a simple log processor Lambda
data "archive_file" "log_processor" {
  type        = "zip"
  output_path = "log_processor.zip"
  source {
    content = <<EOF
import json
import boto3
import gzip
import base64

sns = boto3.client('sns')

def handler(event, context):
    # Process CloudWatch Logs data
    cw_data = event['awslogs']['data']
    compressed_payload = base64.b64decode(cw_data)
    uncompressed_payload = gzip.decompress(compressed_payload)
    log_data = json.loads(uncompressed_payload)

    error_count = 0
    for log_event in log_data['logEvents']:
        if 'ERROR' in log_event['message']:
            error_count += 1

    if error_count > 5:  # Threshold for immediate alert
        sns.publish(
            TopicArn=os.environ['SNS_TOPIC_ARN'],
            Message=f"High error rate detected: {error_count} errors in log group {log_data['logGroup']}",
            Subject=f"Alert: High Error Rate - {log_data['logGroup']}"
        )

    return {'statusCode': 200}
EOF
    filename = "index.py"
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_log_processor" {
  name = "${var.project_name}-${var.environment}-lambda-log-processor"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_log_processor" {
  role       = aws_iam_role.lambda_log_processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_log_processor" {
  name = "${var.project_name}-${var.environment}-lambda-log-processor-policy"
  role = aws_iam_role.lambda_log_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.alerts.arn
      }
    ]
  })
}

# Lambda permission for CloudWatch Logs
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatchLogs"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.log_processor.function_name
  principal     = "logs.amazonaws.com"
  source_arn    = "arn:aws:logs:${var.aws_region}:${local.account_id}:*"
}