-- Migration script to add user_id column and migrate existing data
-- Run this after schema_v2.sql if you have existing data

-- Step 1: Add user_id column to existing users table (if migrating from old schema)
-- ALTER TABLE users ADD COLUMN user_id CHAR(36) NULL;
-- UPDATE users SET user_id = UUID() WHERE user_id IS NULL;
-- ALTER TABLE users MODIFY user_id CHAR(36) NOT NULL PRIMARY KEY;
-- ALTER TABLE users DROP PRIMARY KEY;
-- ALTER TABLE users ADD PRIMARY KEY (user_id);
-- ALTER TABLE users MODIFY id_number VARCHAR(100) UNIQUE NOT NULL;

-- Step 2: Add user_id columns to all related tables
-- Note: This requires mapping id_number to user_id for existing records

-- For new installations with schema_v2.sql, this is not needed
-- This script is for data migration only

-- If you need to migrate existing data, you would run:
-- 1. Backup your database first!
-- 2. Add user_id columns to all tables
-- 3. Populate user_id based on id_number mappings
-- 4. Update foreign key constraints

-- Example migration helper:
-- UPDATE orders o 
-- JOIN users u ON o.user_id = u.id_number 
-- SET o.user_id = u.user_id;

-- Then drop the old FKs and create new ones referencing user_id
