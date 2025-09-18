# GitHub Actions Pipeline Troubleshooting Guide

## Common Issues and Solutions

### 1. Test Stage Issues
**Symptoms**: Tests failing or hanging
```bash
# Check if still happening after our fix:
- Vitest hanging in watch mode → FIXED with 'vitest run'
- Jest not exiting → FIXED with '--watchAll=false'
- Missing dependencies → Check pnpm install output
```

### 2. Build Stage Issues

#### Docker Build Failures
**Common errors**:
```
Error: Cannot find module
Error: COPY failed: no source files
Error: buildx not available
```

**Solutions**:
- Ensure Dockerfile paths are correct
- Check if all source files are committed to Git
- Platform specification for AMD64

#### ECR Login Issues
**Error**: "Error: Cannot perform an interactive login from a non TTY device"

**Check**:
- AWS_ACCESS_KEY_ID secret is set
- AWS_SECRET_ACCESS_KEY secret is set
- AWS_REGION is set to us-east-1

### 3. Deploy Stage Issues

#### ECS Update Failures
**Common errors**:
```
Error: Unable to update service
Error: Task definition not found
Error: Invalid task definition
```

**Check**:
- Service names match exactly
- Task definitions exist in ECS
- Container names in task definition match

#### Secrets Manager Access
**Error**: "ResourceNotFoundException: Secrets Manager can't find the specified secret"

**Already fixed**:
- Database secrets populated ✓
- Redis secrets populated ✓
- JWT secret populated ✓

### 4. Permission Issues

#### IAM Permission Errors
**Common missing permissions**:
```
ecr:GetAuthorizationToken
ecr:BatchCheckLayerAvailability
ecr:PutImage
ecs:UpdateService
ecs:DescribeServices
secretsmanager:GetSecretValue
```

### 5. Timeout Issues
**If jobs are timing out**:
- Default GitHub Actions timeout: 6 hours
- Individual step timeout: 360 minutes
- Consider adding step-level timeouts

## Quick Diagnostic Commands

### Check Current Service Status
```bash
aws ecs describe-services \
  --cluster spark-den-staging \
  --services frontend auth-security ai-ml-services analytics-reporting core-services pms-integrations \
  --region us-east-1 \
  --query 'services[*].{Name:serviceName,Status:status,Running:runningCount}' \
  --output table
```

### Check Recent ECS Events
```bash
aws ecs describe-services \
  --cluster spark-den-staging \
  --services auth-security \
  --region us-east-1 \
  --query 'services[0].events[0:5]' \
  --output json
```

### Verify ECR Images
```bash
aws ecr describe-images \
  --repository-name spark-den-auth-security \
  --region us-east-1 \
  --query 'imageDetails[0:3].{Tags:imageTags,Pushed:imagePushedAt}' \
  --output table
```

### Check Secret Values (without exposing)
```bash
aws secretsmanager list-secrets \
  --region us-east-1 \
  --query 'SecretList[?contains(Name, `spark-den-staging`)].{Name:Name,LastChanged:LastChangedDate}' \
  --output table
```

## Most Likely Issues Based on Our Setup

1. **SMTP Credentials** - Make sure you added these GitHub Secrets:
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASS (with NEW rotated password)
   - EMAIL_FROM

2. **AWS Credentials** - Verify these are in GitHub Secrets:
   - AWS_ACCESS_KEY_ID (should be new, rotated credentials)
   - AWS_SECRET_ACCESS_KEY (should be new, rotated credentials)

3. **Build Context** - All services now have:
   - ✓ Dockerfiles in place
   - ✓ Source code committed
   - ✓ package.json files present

4. **Test Scripts** - Fixed to exit properly:
   - ✓ test:ci scripts added
   - ✓ CI=true environment variable
   - ✓ Timeout fallback

## Check Specific Pipeline Stage

Look for these patterns in the logs:

### If Test Stage Failed:
```
Look for:
- "npm ERR!" or "pnpm ERR!"
- "Cannot find module"
- "Test failed"
- Timeout after 60 seconds
```

### If Build Stage Failed:
```
Look for:
- "docker build" errors
- "no such file or directory"
- "COPY failed"
- "denied: requested access to the resource is denied" (ECR push)
```

### If Deploy Stage Failed:
```
Look for:
- "AccessDeniedException"
- "Service not found"
- "Invalid task definition"
- "ECS service update failed"
```

## Next Steps

1. Share the specific error from GitHub Actions logs
2. I'll provide targeted fix for that exact issue
3. We'll update the workflow/configuration accordingly