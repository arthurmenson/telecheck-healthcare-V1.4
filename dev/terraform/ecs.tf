# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  configuration {
    execute_command_configuration {
      kms_key_id = aws_kms_key.ecs.arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

# KMS Key for ECS
resource "aws_kms_key" "ecs" {
  description             = "KMS key for ECS cluster ${var.project_name}-${var.environment}"
  deletion_window_in_days = 7

  tags = local.common_tags
}

resource "aws_kms_alias" "ecs" {
  name          = "alias/${var.project_name}-${var.environment}-ecs"
  target_key_id = aws_kms_key.ecs.key_id
}

# CloudWatch Log Group for ECS Exec
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/${var.project_name}-${var.environment}/exec"
  retention_in_days = var.log_retention_in_days

  tags = local.common_tags
}

# CloudWatch Log Groups for each service
resource "aws_cloudwatch_log_group" "services" {
  for_each = local.services

  name              = "/aws/ecs/${var.project_name}-${var.environment}/${each.key}"
  retention_in_days = var.log_retention_in_days

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "services" {
  for_each = local.services

  family                   = "${var.project_name}-${var.environment}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = each.key
      image = "${aws_ecr_repository.services[each.key].repository_url}:latest"

      portMappings = [
        {
          containerPort = each.value.port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = tostring(each.value.port)
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = concat(
        # Common secrets for all services
        [
          {
            name      = "JWT_SECRET"
            valueFrom = aws_secretsmanager_secret.jwt_secret.arn
          }
        ],
        # Database secrets for backend services
        contains(["auth-security", "ai-ml-services", "core-services", "analytics-reporting", "pms-integrations"], each.key) ? [
          {
            name      = "DB_HOST"
            valueFrom = "${aws_secretsmanager_secret.db_password.arn}:host::"
          },
          {
            name      = "DB_PORT"
            valueFrom = "${aws_secretsmanager_secret.db_password.arn}:port::"
          },
          {
            name      = "DB_NAME"
            valueFrom = "${aws_secretsmanager_secret.db_password.arn}:dbname::"
          },
          {
            name      = "DB_USER"
            valueFrom = "${aws_secretsmanager_secret.db_password.arn}:username::"
          },
          {
            name      = "DB_PASSWORD"
            valueFrom = "${aws_secretsmanager_secret.db_password.arn}:password::"
          }
        ] : [],
        # Redis secrets for services that need caching
        contains(["auth-security", "analytics-reporting"], each.key) ? [
          {
            name      = "REDIS_HOST"
            valueFrom = "${aws_secretsmanager_secret.redis_auth_token.arn}:host::"
          },
          {
            name      = "REDIS_PORT"
            valueFrom = "${aws_secretsmanager_secret.redis_auth_token.arn}:port::"
          },
          {
            name      = "REDIS_AUTH_TOKEN"
            valueFrom = "${aws_secretsmanager_secret.redis_auth_token.arn}:auth_token::"
          }
        ] : []
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.services[each.key].name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = [
          "CMD-SHELL",
          each.key == "frontend" ? "curl -f http://localhost:${each.value.port}/ || exit 1" : "curl -f http://localhost:${each.value.port}/health || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true

      # Resource limits
      memoryReservation = floor(each.value.memory * 0.8)

      # Security
      readonlyRootFilesystem = false  # Set to true if your apps support it
      user                   = "1001"  # Non-root user

      # Enable X-Ray tracing if configured
      dockerLabels = var.enable_xray ? {
        "aws-xray-tracing" = "enabled"
      } : {}
    }
  ])

  # X-Ray sidecar configuration would go here if needed

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# ECS Services
resource "aws_ecs_service" "services" {
  for_each = local.services

  name            = each.key
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  # Deployment configuration removed for now to fix syntax issues

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.services[each.key].arn
    container_name   = each.key
    container_port   = each.value.port
  }

  # Service Connect disabled for now - will enable later

  # Ensure ALB target group is created before service
  depends_on = [aws_lb_listener.http]

  tags = merge(local.common_tags, {
    Service = each.key
  })

  lifecycle {
    ignore_changes = [desired_count]  # Allow auto-scaling to manage this
  }
}

# Service Discovery
resource "aws_service_discovery_http_namespace" "main" {
  name        = "${var.project_name}-${var.environment}"
  description = "Service discovery namespace for ${var.project_name} ${var.environment}"

  tags = local.common_tags
}

# Auto Scaling Targets
resource "aws_appautoscaling_target" "services" {
  for_each = var.enable_autoscaling ? local.services : {}

  max_capacity       = each.value.max_capacity
  min_capacity       = each.value.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.services[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

# Auto Scaling Policies - CPU
resource "aws_appautoscaling_policy" "cpu" {
  for_each = var.enable_autoscaling ? local.services : {}

  name               = "${var.project_name}-${var.environment}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.autoscaling_target_cpu
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

# Auto Scaling Policies - Memory
resource "aws_appautoscaling_policy" "memory" {
  for_each = var.enable_autoscaling ? local.services : {}

  name               = "${var.project_name}-${var.environment}-${each.key}-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.services[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.services[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.services[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.autoscaling_target_memory
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }
}

# CloudWatch Alarms for ECS Services
resource "aws_cloudwatch_metric_alarm" "service_cpu" {
  for_each = local.services

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS service cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.services[each.key].name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = merge(local.common_tags, {
    Service = each.key
  })
}

resource "aws_cloudwatch_metric_alarm" "service_memory" {
  for_each = local.services

  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-memory-utilization"
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
    ServiceName = aws_ecs_service.services[each.key].name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = merge(local.common_tags, {
    Service = each.key
  })
}