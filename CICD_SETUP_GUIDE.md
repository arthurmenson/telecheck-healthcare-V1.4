# CI/CD Pipeline Setup Guide - Spark-Den Healthcare Platform

## 📋 Overview

This guide will help you configure automated deployments using GitHub Actions for the Spark-Den Healthcare Platform.

## 🔑 Step 1: Configure GitHub Secrets

Navigate to your GitHub repository settings and add the following secrets:

### Required Secrets:
```
Settings → Secrets and variables → Actions → New repository secret
```

Add these secrets:

1. **AWS_ACCESS_KEY_ID**
   - Your AWS access key ID
   - Required for AWS authentication

2. **AWS_SECRET_ACCESS_KEY**
   - Your AWS secret access key
   - Required for AWS authentication

3. **SLACK_WEBHOOK_URL** (Optional)
   - Slack webhook for deployment notifications
   - Format: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

## 📁 Step 2: GitHub Actions Workflow

The workflow file is already created at `.github/workflows/deploy-production.yml`

### Workflow Features:
- ✅ Automatic deployment on push to `main` or `production` branches
- ✅ Manual deployment trigger with service selection
- ✅ Docker image building and pushing to ECR
- ✅ ECS service updates with new images
- ✅ Health checks after deployment
- ✅ Slack notifications (optional)

## 🚀 Step 3: Enable GitHub Actions

1. **Push the workflow to GitHub:**
   ```bash
   git add .github/workflows/deploy-production.yml
   git commit -m "Add CI/CD pipeline for automated deployments"
   git push origin main
   ```

2. **Verify workflow is enabled:**
   - Go to GitHub repository → Actions tab
   - You should see "Deploy to Production" workflow

## 📊 Step 4: Test the Pipeline

### Automatic Deployment (on push):
```bash
# Make a change to any service
echo "// Test change" >> workstream/auth-security/src/index.ts

# Commit and push
git add .
git commit -m "Test CI/CD pipeline"
git push origin main
```

### Manual Deployment:
1. Go to GitHub → Actions → Deploy to Production
2. Click "Run workflow"
3. Select branch: `main`
4. Select service (or leave as "all")
5. Click "Run workflow"

## 🔍 Step 5: Monitor Deployments

### GitHub Actions:
- View real-time logs in Actions tab
- Check job status and duration
- Review any error messages

### AWS Console:
```bash
# View ECS service status
aws ecs describe-services \
  --cluster spark-den-cluster \
  --services spark-den-auth-service \
  --region us-east-1

# View CloudWatch logs
aws logs tail /ecs/spark-den/auth-service --follow --region us-east-1
```

### Application Health:
```bash
# Check application endpoints
curl http://spark-den-alb-1679568472.us-east-1.elb.amazonaws.com/health
```

## 🛠️ Customization Options

### Branch Protection Rules:
```
Settings → Branches → Add rule
- Branch name pattern: main
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
```

### Environment-Specific Deployments:
Create separate workflows for different environments:
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

### Service-Specific Deployment:
The workflow supports deploying individual services:
```yaml
workflow_dispatch:
  inputs:
    service:
      type: choice
      options:
        - all
        - auth-service
        - core-service
        - ai-ml-service
```

## 📈 Deployment Metrics

### Success Indicators:
- ✅ GitHub Actions workflow shows green checkmark
- ✅ ECS services show "ACTIVE" status
- ✅ Health checks return 200 OK
- ✅ CloudWatch logs show no errors
- ✅ Application accessible via ALB

### Common Issues and Solutions:

**Issue: AWS credentials error**
```
Solution: Verify GitHub secrets are correctly set
```

**Issue: Docker build fails**
```
Solution: Check Dockerfile syntax and dependencies
```

**Issue: ECS service fails to start**
```
Solution: Check CloudWatch logs for container errors
```

**Issue: Health check failures**
```
Solution: Verify health endpoint is implemented and returning 200
```

## 🔄 Rollback Procedure

If deployment fails:

1. **Automatic Rollback:**
   - ECS automatically maintains previous task definition
   - Failed deployments won't affect running services

2. **Manual Rollback:**
   ```bash
   # Get previous task definition
   aws ecs describe-services \
     --cluster spark-den-cluster \
     --services spark-den-auth-service \
     --query 'services[0].taskDefinition'

   # Update service with previous version
   aws ecs update-service \
     --cluster spark-den-cluster \
     --service spark-den-auth-service \
     --task-definition <previous-task-def-arn>
   ```

## 📝 Best Practices

1. **Test Locally First:**
   ```bash
   docker build -t test-image .
   docker run -p 3000:3000 test-image
   ```

2. **Use Feature Branches:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   # Create pull request
   ```

3. **Monitor Resource Usage:**
   - Check ECS task CPU/memory metrics
   - Review CloudWatch dashboards
   - Set up alarms for anomalies

4. **Security Scanning:**
   - Enable AWS ECR image scanning
   - Use GitHub security alerts
   - Regularly update dependencies

## 🎯 Next Steps

1. **Set up staging environment** for testing before production
2. **Configure auto-scaling** based on metrics
3. **Implement blue-green deployments** for zero-downtime updates
4. **Add integration tests** to the pipeline
5. **Set up monitoring dashboards** in CloudWatch

## 📞 Support

- GitHub Actions Documentation: https://docs.github.com/actions
- AWS ECS Documentation: https://docs.aws.amazon.com/ecs/
- Slack: #devops-support

---

*Last Updated: 2025-09-18*
*Version: 1.0.0*