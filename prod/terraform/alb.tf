# Application Load Balancer Configuration

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# ALB Target Groups for each service
resource "aws_lb_target_group" "service" {
  for_each = var.services

  name                 = "${var.project_name}-${each.key}-tg"
  port                 = each.value.port
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  target_type          = "ip"
  deregistration_delay = 30

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = each.value.health_check_timeout
    interval            = each.value.health_check_interval
    path                = each.value.health_check_path
    matcher             = "200-299"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  tags = {
    Name    = "${var.project_name}-${each.key}-tg"
    Service = each.key
  }
}

# HTTP Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ehr-frontend"].arn
  }
}

# HTTP Listener Rules for routing to services
resource "aws_lb_listener_rule" "http_auth_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["auth-service"].arn
  }

  condition {
    path_pattern {
      values = ["/auth/*", "/api/auth/*", "/health"]
    }
  }
}

resource "aws_lb_listener_rule" "http_core_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["core-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/patients/*", "/api/appointments/*", "/api/providers/*", "/core/*"]
    }
  }
}

resource "aws_lb_listener_rule" "http_ai_ml_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 102

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ai-ml-service"].arn
  }

  condition {
    path_pattern {
      values = ["/ai/*", "/api/ai/*", "/ml/*"]
    }
  }
}

resource "aws_lb_listener_rule" "http_analytics_service" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 103

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["analytics-service"].arn
  }

  condition {
    path_pattern {
      values = ["/analytics/*", "/api/analytics/*", "/reports/*"]
    }
  }
}

resource "aws_lb_listener_rule" "http_pms_integrations" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 104

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["pms-integrations"].arn
  }

  condition {
    path_pattern {
      values = ["/pms/*", "/api/pms/*", "/integrations/*"]
    }
  }
}

resource "aws_lb_listener_rule" "http_pms_frontend" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 105

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["pms-frontend"].arn
  }

  condition {
    path_pattern {
      values = ["/pms-app/*"]
    }
  }
}

# HTTPS Listener (requires SSL certificate)
resource "aws_lb_listener" "https" {
  count = var.domain_name != "" ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main[0].arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Service not found"
      status_code  = "404"
    }
  }

  depends_on = [
    aws_acm_certificate_validation.main[0]
  ]
}

# Listener Rules for routing to services
resource "aws_lb_listener_rule" "auth_service" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["auth-service"].arn
  }

  condition {
    path_pattern {
      values = ["/auth/*", "/api/auth/*"]
    }
  }
}

resource "aws_lb_listener_rule" "core_service" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["core-service"].arn
  }

  condition {
    path_pattern {
      values = ["/api/patients/*", "/api/appointments/*", "/api/providers/*"]
    }
  }
}

resource "aws_lb_listener_rule" "ai_ml_service" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 102

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ai-ml-service"].arn
  }

  condition {
    path_pattern {
      values = ["/ai/*", "/api/ai/*", "/ml/*"]
    }
  }
}

resource "aws_lb_listener_rule" "analytics_service" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 103

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["analytics-service"].arn
  }

  condition {
    path_pattern {
      values = ["/analytics/*", "/api/analytics/*", "/reports/*"]
    }
  }
}

resource "aws_lb_listener_rule" "pms_integrations" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 104

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["pms-integrations"].arn
  }

  condition {
    path_pattern {
      values = ["/pms/*", "/api/pms/*", "/integrations/*"]
    }
  }
}

resource "aws_lb_listener_rule" "ehr_frontend" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 105

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ehr-frontend"].arn
  }

  condition {
    host_header {
      values = ["ehr.${var.domain_name}"]
    }
  }
}

resource "aws_lb_listener_rule" "pms_frontend" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 106

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["pms-frontend"].arn
  }

  condition {
    host_header {
      values = ["pms.${var.domain_name}"]
    }
  }
}

# Default frontend routing
resource "aws_lb_listener_rule" "default_frontend" {
  count = var.domain_name != "" ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 999

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service["ehr-frontend"].arn
  }

  condition {
    host_header {
      values = [var.domain_name, "www.${var.domain_name}"]
    }
  }
}

# ACM Certificate for HTTPS
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" ? 1 : 0

  domain_name               = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
    "www.${var.domain_name}",
    "ehr.${var.domain_name}",
    "pms.${var.domain_name}"
  ]
  validation_method = "DNS"

  tags = {
    Name = "${var.project_name}-certificate"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Route53 Hosted Zone data source (assumes zone already exists)
data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0

  name         = var.domain_name
  private_zone = false
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 A records for the domain
resource "aws_route53_record" "main" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "ehr" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "ehr.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "pms" {
  count = var.domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "pms.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  count = var.enable_monitoring ? 1 : 0

  name = "${var.project_name}-alerts"

  tags = {
    Name = "${var.project_name}-alerts"
  }
}

# Output ALB DNS
output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "Zone ID of the Application Load Balancer"
}