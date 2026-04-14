-- Add columns for account auto-cleanup of unused accounts
-- Run this to add the necessary tracking columns

-- Add columns to track first login expiration and last login
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_login_expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) UNIQUE NULL;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_first_login_expires 
ON users(first_login_expires_at);

-- Create index for last login tracking
CREATE INDEX IF NOT EXISTS idx_users_last_login 
ON users(last_login_at);
