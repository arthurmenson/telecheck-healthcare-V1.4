-- Create schemas and audit infrastructure
CREATE SCHEMA IF NOT EXISTS spark_den;
CREATE SCHEMA IF NOT EXISTS audit;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create audit log table
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create indexes for audit log
CREATE INDEX audit_log_table_name_idx ON audit.audit_log(table_name);
CREATE INDEX audit_log_timestamp_idx ON audit.audit_log(timestamp);
CREATE INDEX audit_log_user_idx ON audit.audit_log(user_id);
CREATE INDEX audit_log_operation_idx ON audit.audit_log(operation);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit.create_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            new_values,
            user_id,
            timestamp
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(NEW),
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            old_values,
            new_values,
            user_id,
            timestamp
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW),
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_log (
            table_name,
            operation,
            old_values,
            user_id,
            timestamp
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            row_to_json(OLD),
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ROLLBACK --

-- Drop audit trigger function
DROP FUNCTION IF EXISTS audit.create_audit_trigger();

-- Drop audit log table and indexes
DROP INDEX IF EXISTS audit.audit_log_operation_idx;
DROP INDEX IF EXISTS audit.audit_log_user_idx;
DROP INDEX IF EXISTS audit.audit_log_timestamp_idx;
DROP INDEX IF EXISTS audit.audit_log_table_name_idx;
DROP TABLE IF EXISTS audit.audit_log;

-- Drop extensions (only if no other objects depend on them)
-- Note: Be careful with extensions in rollback as other objects might depend on them
-- DROP EXTENSION IF EXISTS "pg_stat_statements";
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- Drop schemas
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS spark_den CASCADE;