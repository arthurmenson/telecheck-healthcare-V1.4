#!/bin/sh

# Replace placeholders in config.js with actual environment values
# Use the ALB URL with /api path for backend services
API_URL="${API_URL:-http://spark-den-alb-1679568472.us-east-1.elb.amazonaws.com/api}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Create config.js with actual values
cat > /usr/share/nginx/html/config.js <<EOF
window.APP_CONFIG = {
  API_URL: '${API_URL}',
  AI_ML_API_URL: '${API_URL}',
  PMS_CORE_API_URL: '${API_URL}',
  ANALYTICS_API_URL: '${API_URL}',
  INTEGRATIONS_API_URL: '${API_URL}',
  ENVIRONMENT: '${ENVIRONMENT}'
};
EOF

echo "Frontend configured with API_URL: ${API_URL}"

# Start nginx
nginx -g 'daemon off;'