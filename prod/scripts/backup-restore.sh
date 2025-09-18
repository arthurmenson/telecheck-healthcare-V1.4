#!/bin/bash

# Backup and Restore Script for Spark-Den Healthcare Platform
# This script provides backup and restore functionality for the production environment

set -e

# Configuration
AWS_REGION="us-east-1"
RDS_INSTANCE="spark-den-db"
S3_BACKUP_BUCKET="spark-den-backups-$(date +%Y)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Create S3 bucket for backups if it doesn't exist
create_backup_bucket() {
    echo "Checking S3 backup bucket..."
    if aws s3 ls "s3://${S3_BACKUP_BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
        echo "Creating backup bucket..."
        aws s3 mb "s3://${S3_BACKUP_BUCKET}" --region ${AWS_REGION}

        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket ${S3_BACKUP_BUCKET} \
            --versioning-configuration Status=Enabled

        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket ${S3_BACKUP_BUCKET} \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'

        print_status "Backup bucket created and configured"
    else
        print_status "Backup bucket exists"
    fi
}

# Backup RDS Database
backup_database() {
    echo ""
    echo "========================================="
    echo "DATABASE BACKUP"
    echo "========================================="

    SNAPSHOT_ID="spark-den-db-backup-${TIMESTAMP}"

    echo "Creating RDS snapshot: ${SNAPSHOT_ID}"
    aws rds create-db-snapshot \
        --db-instance-identifier ${RDS_INSTANCE} \
        --db-snapshot-identifier ${SNAPSHOT_ID} \
        --region ${AWS_REGION}

    echo "Waiting for snapshot to complete..."
    aws rds wait db-snapshot-completed \
        --db-snapshot-identifier ${SNAPSHOT_ID} \
        --region ${AWS_REGION}

    print_status "Database snapshot created: ${SNAPSHOT_ID}"

    # Export snapshot metadata to S3
    aws rds describe-db-snapshots \
        --db-snapshot-identifier ${SNAPSHOT_ID} \
        --region ${AWS_REGION} \
        > /tmp/snapshot-metadata.json

    aws s3 cp /tmp/snapshot-metadata.json \
        "s3://${S3_BACKUP_BUCKET}/database/snapshots/${SNAPSHOT_ID}-metadata.json"

    print_status "Snapshot metadata saved to S3"
}

# Backup ECS Task Definitions
backup_ecs_definitions() {
    echo ""
    echo "========================================="
    echo "ECS TASK DEFINITIONS BACKUP"
    echo "========================================="

    SERVICES=(
        "spark-den-auth-service"
        "spark-den-core-service"
        "spark-den-ai-ml-service"
        "spark-den-analytics-service"
        "spark-den-pms-integrations"
        "spark-den-ehr-frontend"
        "spark-den-pms-frontend"
    )

    for SERVICE in "${SERVICES[@]}"; do
        echo "Backing up task definition for ${SERVICE}..."

        # Get the current task definition
        TASK_DEF=$(aws ecs describe-services \
            --cluster spark-den-cluster \
            --services ${SERVICE} \
            --region ${AWS_REGION} \
            --query 'services[0].taskDefinition' \
            --output text)

        if [ ! -z "$TASK_DEF" ]; then
            aws ecs describe-task-definition \
                --task-definition ${TASK_DEF} \
                --region ${AWS_REGION} \
                > /tmp/${SERVICE}-task-definition.json

            aws s3 cp /tmp/${SERVICE}-task-definition.json \
                "s3://${S3_BACKUP_BUCKET}/ecs/task-definitions/${TIMESTAMP}/${SERVICE}.json"

            print_status "Backed up ${SERVICE}"
        else
            print_warning "Could not find task definition for ${SERVICE}"
        fi
    done
}

# Backup Application Configuration
backup_configuration() {
    echo ""
    echo "========================================="
    echo "CONFIGURATION BACKUP"
    echo "========================================="

    # Backup Terraform state
    if [ -f "terraform.tfstate" ]; then
        echo "Backing up Terraform state..."
        aws s3 cp terraform.tfstate \
            "s3://${S3_BACKUP_BUCKET}/terraform/state/${TIMESTAMP}/terraform.tfstate"
        print_status "Terraform state backed up"
    fi

    # Backup environment variables from Parameter Store
    echo "Backing up Parameter Store values..."
    aws ssm describe-parameters \
        --region ${AWS_REGION} \
        --query 'Parameters[?starts_with(Name, `/spark-den/`)]' \
        > /tmp/parameter-store-backup.json

    aws s3 cp /tmp/parameter-store-backup.json \
        "s3://${S3_BACKUP_BUCKET}/config/parameter-store/${TIMESTAMP}/parameters.json"

    print_status "Parameter Store values backed up"
}

# List available backups
list_backups() {
    echo ""
    echo "========================================="
    echo "AVAILABLE BACKUPS"
    echo "========================================="

    echo ""
    echo "Database Snapshots:"
    aws rds describe-db-snapshots \
        --db-instance-identifier ${RDS_INSTANCE} \
        --region ${AWS_REGION} \
        --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
        --output table

    echo ""
    echo "S3 Backup Contents:"
    aws s3 ls "s3://${S3_BACKUP_BUCKET}/" --recursive --summarize | tail -10
}

# Restore from backup
restore_database() {
    echo ""
    echo "========================================="
    echo "DATABASE RESTORE"
    echo "========================================="

    if [ -z "$1" ]; then
        echo "Please provide snapshot ID to restore from"
        echo "Usage: $0 restore-db <snapshot-id>"
        exit 1
    fi

    SNAPSHOT_ID=$1
    RESTORED_INSTANCE="${RDS_INSTANCE}-restored-${TIMESTAMP}"

    echo "Restoring database from snapshot: ${SNAPSHOT_ID}"
    echo "New instance name: ${RESTORED_INSTANCE}"

    aws rds restore-db-instance-from-db-snapshot \
        --db-instance-identifier ${RESTORED_INSTANCE} \
        --db-snapshot-identifier ${SNAPSHOT_ID} \
        --region ${AWS_REGION}

    echo "Waiting for database restore to complete..."
    aws rds wait db-instance-available \
        --db-instance-identifier ${RESTORED_INSTANCE} \
        --region ${AWS_REGION}

    print_status "Database restored to: ${RESTORED_INSTANCE}"

    echo ""
    echo "To switch to the restored database:"
    echo "1. Update the database endpoint in your application configuration"
    echo "2. Test the restored database"
    echo "3. Switch traffic to the new instance"
    echo "4. Delete the old instance if everything works"
}

# Disaster Recovery Test
test_disaster_recovery() {
    echo ""
    echo "========================================="
    echo "DISASTER RECOVERY TEST"
    echo "========================================="

    echo "This will perform a non-destructive DR test:"
    echo "1. Create a backup of current state"
    echo "2. Restore to a test environment"
    echo "3. Verify the restore"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create backup
        backup_database
        backup_ecs_definitions
        backup_configuration

        print_status "Backup phase complete"

        echo ""
        echo "To complete the DR test:"
        echo "1. Restore database to test instance"
        echo "2. Deploy services to test ECS cluster"
        echo "3. Verify application functionality"
        echo "4. Document RTO and RPO metrics"
    fi
}

# Main script logic
case "$1" in
    backup)
        create_backup_bucket
        backup_database
        backup_ecs_definitions
        backup_configuration
        print_status "Backup completed successfully"
        ;;

    backup-db)
        create_backup_bucket
        backup_database
        ;;

    backup-config)
        create_backup_bucket
        backup_configuration
        ;;

    list)
        list_backups
        ;;

    restore-db)
        restore_database "$2"
        ;;

    test-dr)
        test_disaster_recovery
        ;;

    *)
        echo "Spark-Den Backup and Restore Script"
        echo ""
        echo "Usage: $0 {backup|backup-db|backup-config|list|restore-db|test-dr}"
        echo ""
        echo "Commands:"
        echo "  backup        - Full backup (database, ECS, config)"
        echo "  backup-db     - Backup database only"
        echo "  backup-config - Backup configuration only"
        echo "  list          - List available backups"
        echo "  restore-db    - Restore database from snapshot"
        echo "  test-dr       - Test disaster recovery process"
        echo ""
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 restore-db spark-den-db-backup-20250918-123456"
        echo "  $0 test-dr"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "Operation completed at $(date)"
echo "========================================="