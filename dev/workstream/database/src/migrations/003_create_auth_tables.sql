-- Migration 003: Create authentication and user management tables
-- This migration adds user authentication, email verification, and session management

-- Create users table
CREATE TABLE IF NOT EXISTS spark_den.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'patient',
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS users_email_idx ON spark_den.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON spark_den.users(role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON spark_den.users(is_active);

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS spark_den.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset', etc.
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_tokens_user_fk FOREIGN KEY (user_id) REFERENCES spark_den.users(id) ON DELETE CASCADE
);

-- Create indexes for email verification tokens table
CREATE INDEX IF NOT EXISTS email_tokens_token_idx ON spark_den.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS email_tokens_user_idx ON spark_den.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS email_tokens_type_idx ON spark_den.email_verification_tokens(type);
CREATE INDEX IF NOT EXISTS email_tokens_expires_at_idx ON spark_den.email_verification_tokens(expires_at);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS spark_den.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES spark_den.users(id) ON DELETE CASCADE
);

-- Create indexes for user sessions table
CREATE INDEX IF NOT EXISTS sessions_session_token_idx ON spark_den.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS sessions_refresh_token_idx ON spark_den.user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON spark_den.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON spark_den.user_sessions(expires_at);

-- Create a trigger to automatically update the updated_at column for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON spark_den.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON spark_den.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON spark_den.users TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON spark_den.email_verification_tokens TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON spark_den.user_sessions TO postgres;

-- Insert some sample users for development
INSERT INTO spark_den.users (email, password_hash, first_name, last_name, role, is_email_verified) VALUES
('admin@sparkden.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJkOLVP1eQqVqzC', 'Admin', 'User', 'admin', true),
('john.smith@sparkden.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJkOLVP1eQqVqzC', 'John', 'Smith', 'doctor', true),
('sarah.johnson@sparkden.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJkOLVP1eQqVqzC', 'Sarah', 'Johnson', 'doctor', true),
('michael.brown@sparkden.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJkOLVP1eQqVqzC', 'Michael', 'Brown', 'doctor', true)
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE spark_den.users IS 'User accounts for authentication and authorization';
COMMENT ON TABLE spark_den.email_verification_tokens IS 'Tokens for email verification and password reset flows';
COMMENT ON TABLE spark_den.user_sessions IS 'Active user sessions with JWT tokens';