-- ============================================
-- MIGRATION: Convert id_number PK to user_id PK
-- For your specific schema with existing user_id column
-- ============================================
-- WARNING: BACKUP YOUR DATABASE FIRST!
-- ============================================

-- Step 0: Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: Populate missing user_id values in users table
UPDATE users SET user_id = CONCAT('usr_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 9)) 
WHERE user_id IS NULL OR user_id = '';

-- Step 2: Make user_id NOT NULL and unique in users table
ALTER TABLE users MODIFY user_id VARCHAR(50) NOT NULL UNIQUE;

-- Step 3: Create mapping table (id_number -> user_id)
CREATE TABLE IF NOT EXISTS _user_mapping AS
SELECT id_number, user_id FROM users;

-- Step 4: Add new user_id columns to related tables (as CHAR(36) for UUID compatibility)
-- These will store the UUID user_id instead of varchar id_number

-- orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id_uuid CHAR(36) NULL;
UPDATE orders o
JOIN _user_mapping um ON o.user_id = um.id_number
SET o.user_id_uuid = um.user_id;
-- Rename columns
ALTER TABLE orders CHANGE user_id id_number_ref VARCHAR(100) NULL;
ALTER TABLE orders CHANGE user_id_uuid user_id CHAR(36) NOT NULL;
ALTER TABLE orders DROP INDEX fk_orders_user;
ALTER TABLE orders ADD INDEX fk_orders_user (user_id);

-- processed_by in orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by_uuid CHAR(36) NULL;
UPDATE orders o
JOIN _user_mapping um ON o.processed_by = um.id_number
SET o.processed_by_uuid = um.user_id;
ALTER TABLE orders CHANGE processed_by processed_by_id_number VARCHAR(100) NULL;
ALTER TABLE orders CHANGE processed_by_uuid processed_by CHAR(36) NULL;

-- appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id_uuid CHAR(36) NULL;
UPDATE appointments a
JOIN _user_mapping um ON a.user_id = um.id_number
SET a.user_id_uuid = um.user_id;
ALTER TABLE appointments CHANGE user_id id_number_ref VARCHAR(100) NULL;
ALTER TABLE appointments CHANGE user_id_uuid user_id CHAR(36) NOT NULL;
ALTER TABLE appointments DROP INDEX fk_appointments_user;
ALTER TABLE appointments ADD INDEX fk_appointments_user (user_id);

-- confirmed_by in appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by_uuid CHAR(36) NULL;
UPDATE appointments a
JOIN _user_mapping um ON a.confirmed_by = um.id_number
SET a.confirmed_by_uuid = um.user_id;
ALTER TABLE appointments CHANGE confirmed_by confirmed_by_id_number VARCHAR(100) NULL;
ALTER TABLE appointments CHANGE confirmed_by_uuid confirmed_by CHAR(36) NULL;

-- queues table
ALTER TABLE queues ADD COLUMN IF NOT EXISTS user_id_uuid CHAR(36) NULL;
UPDATE queues q
JOIN _user_mapping um ON q.user_id = um.id_number
SET q.user_id_uuid = um.user_id;
ALTER TABLE queues CHANGE user_id id_number_ref VARCHAR(100) NULL;
ALTER TABLE queues CHANGE user_id_uuid user_id CHAR(36) NOT NULL;
ALTER TABLE queues DROP INDEX fk_queues_user;
ALTER TABLE queues ADD INDEX fk_queues_user (user_id);

-- job_orders table (requester_id)
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS requester_id_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.requester_id = um.id_number
SET j.requester_id_uuid = um.user_id;
ALTER TABLE job_orders CHANGE requester_id requester_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE requester_id_uuid requester_id CHAR(36) NOT NULL;
ALTER TABLE job_orders DROP INDEX fk_job_orders_requester;
ALTER TABLE job_orders ADD INDEX fk_job_orders_requester (requester_id);

-- audited_by in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS audited_by_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.audited_by = um.id_number
SET j.audited_by_uuid = um.user_id;
ALTER TABLE job_orders CHANGE audited_by audited_by_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE audited_by_uuid audited_by CHAR(36) NULL;

-- approved_by in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS approved_by_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.approved_by = um.id_number
SET j.approved_by_uuid = um.user_id;
ALTER TABLE job_orders CHANGE approved_by approved_by_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE approved_by_uuid approved_by CHAR(36) NULL;

-- risographer_id in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS risographer_id_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.risographer_id = um.id_number
SET j.risographer_id_uuid = um.user_id;
ALTER TABLE job_orders CHANGE risographer_id risographer_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE risographer_id_uuid risographer_id CHAR(36) NULL;

-- computed_by in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS computed_by_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.computed_by = um.id_number
SET j.computed_by_uuid = um.user_id;
ALTER TABLE job_orders CHANGE computed_by computed_by_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE computed_by_uuid computed_by CHAR(36) NULL;

-- noted_by in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS noted_by_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.noted_by = um.id_number
SET j.noted_by_uuid = um.user_id;
ALTER TABLE job_orders CHANGE noted_by noted_by_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE noted_by_uuid noted_by CHAR(36) NULL;

-- verified_by in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS verified_by_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.verified_by = um.id_number
SET j.verified_by_uuid = um.user_id;
ALTER TABLE job_orders CHANGE verified_by verified_by_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE verified_by_uuid verified_by CHAR(36) NULL;

-- final_approved_by in job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS final_approved_by_uuid CHAR(36) NULL;
UPDATE job_orders j
JOIN _user_mapping um ON j.final_approved_by = um.id_number
SET j.final_approved_by_uuid = um.user_id;
ALTER TABLE job_orders CHANGE final_approved_by final_approved_by_id_number VARCHAR(100) NULL;
ALTER TABLE job_orders CHANGE final_approved_by_uuid final_approved_by CHAR(36) NULL;

-- payments table (verified_by)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by_uuid CHAR(36) NULL;
UPDATE payments p
JOIN _user_mapping um ON p.verified_by = um.id_number
SET p.verified_by_uuid = um.user_id;
ALTER TABLE payments CHANGE verified_by verified_by_id_number VARCHAR(100) NULL;
ALTER TABLE payments CHANGE verified_by_uuid verified_by CHAR(36) NULL;
ALTER TABLE payments DROP INDEX fk_payments_verified_by;
ALTER TABLE payments ADD INDEX fk_payments_verified_by (verified_by);

-- notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id_uuid CHAR(36) NULL;
UPDATE notifications n
JOIN _user_mapping um ON n.user_id = um.id_number
SET n.user_id_uuid = um.user_id;
ALTER TABLE notifications CHANGE user_id id_number_ref VARCHAR(100) NULL;
ALTER TABLE notifications CHANGE user_id_uuid user_id CHAR(36) NOT NULL;
ALTER TABLE notifications DROP INDEX fk_notifications_user;
ALTER TABLE notifications ADD INDEX fk_notifications_user (user_id);

-- inventory_logs table (changed_by)
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS changed_by_uuid CHAR(36) NULL;
UPDATE inventory_logs i
JOIN _user_mapping um ON i.changed_by = um.id_number
SET i.changed_by_uuid = um.user_id;
ALTER TABLE inventory_logs CHANGE changed_by changed_by_id_number VARCHAR(100) NULL;
ALTER TABLE inventory_logs CHANGE changed_by_uuid changed_by CHAR(36) NULL;
ALTER TABLE inventory_logs DROP INDEX fk_inventory_logs_changed_by;
ALTER TABLE inventory_logs ADD INDEX fk_inventory_logs_changed_by (changed_by);

-- feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id_uuid CHAR(36) NULL;
UPDATE feedback f
JOIN _user_mapping um ON f.user_id = um.id_number
SET f.user_id_uuid = um.user_id;
ALTER TABLE feedback CHANGE user_id id_number_ref VARCHAR(100) NULL;
ALTER TABLE feedback CHANGE user_id_uuid user_id CHAR(36) NOT NULL;
ALTER TABLE feedback DROP INDEX fk_feedback_user;
ALTER TABLE feedback ADD INDEX fk_feedback_user (user_id);

-- bookstore_items table (created_by)
ALTER TABLE bookstore_items ADD COLUMN IF NOT EXISTS created_by_uuid CHAR(36) NULL;
UPDATE bookstore_items b
JOIN _user_mapping um ON b.created_by = um.id_number
SET b.created_by_uuid = um.user_id;
ALTER TABLE bookstore_items CHANGE created_by created_by_id_number VARCHAR(100) NULL;
ALTER TABLE bookstore_items CHANGE created_by_uuid created_by CHAR(36) NULL;
ALTER TABLE bookstore_items DROP INDEX fk_items_created_by;
ALTER TABLE bookstore_items ADD INDEX fk_items_created_by (created_by);

-- riso_queue table (risographer_id)
ALTER TABLE riso_queue ADD COLUMN IF NOT EXISTS risographer_id_uuid CHAR(36) NULL;
UPDATE riso_queue r
JOIN _user_mapping um ON r.risographer_id = um.id_number
SET r.risographer_id_uuid = um.user_id;
ALTER TABLE riso_queue CHANGE risographer_id risographer_id_number VARCHAR(100) NULL;
ALTER TABLE riso_queue CHANGE risographer_id_uuid risographer_id CHAR(36) NULL;
ALTER TABLE riso_queue DROP INDEX fk_riso_queue_risographer;
ALTER TABLE riso_queue ADD INDEX fk_riso_queue_risographer (risographer_id);

-- ============================================
-- STEP 5: Update users table to make user_id the PRIMARY KEY
-- ============================================

-- First, we need to handle the fact that id_number is currently the PK
-- We'll create a new table structure and migrate

-- Create new users table with proper structure
CREATE TABLE IF NOT EXISTS users_new (
  user_id CHAR(36) PRIMARY KEY,
  id_number VARCHAR(100) UNIQUE NOT NULL,
  auth_id CHAR(36) UNIQUE NOT NULL,
  role_type ENUM('bookstore_manager','bookstore_staff','working_student','teacher','student','parent','risographer') NOT NULL DEFAULT 'student',
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  contact_number VARCHAR(20) NULL,
  id_type VARCHAR(50) NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  department VARCHAR(150) NULL,
  avatar_url TEXT NULL,
  first_login_expires_at TIMESTAMP NULL,
  last_login_at TIMESTAMP NULL,
  email_verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migrate data from old users table
INSERT INTO users_new (
  user_id, id_number, auth_id, role_type, username, password_hash,
  first_name, last_name, email, contact_number, id_type, status, department,
  avatar_url, first_login_expires_at, last_login_at, email_verified_at,
  created_at, updated_at
)
SELECT 
  user_id, id_number, auth_id, role_type, username, password_hash,
  first_name, last_name, email, contact_number, id_type, status, department,
  avatar_url, first_login_expires_at, last_login_at, email_verified_at,
  created_at, updated_at
FROM users;

-- ============================================
-- STEP 6: Add pre-order columns
-- ============================================

-- Add to bookstore_items
ALTER TABLE bookstore_items ADD COLUMN IF NOT EXISTS allow_preorder TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE bookstore_items ADD COLUMN IF NOT EXISTS preorder_eta_days INT NULL;

-- Add to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_preorder TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE NULL;

-- Update orders status enum to include 'Preordered' - need to modify the column
ALTER TABLE orders MODIFY status ENUM('Pending','Ready','Released','Cancelled','Preordered') NOT NULL DEFAULT 'Pending';

-- Add to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_preorder_item TINYINT(1) NOT NULL DEFAULT 0;

-- Update inventory_logs change_type
ALTER TABLE inventory_logs MODIFY change_type ENUM('Restock','Deduct','Adjust','Reserve','Release','Preorder') NOT NULL DEFAULT 'Adjust';

-- ============================================
-- STEP 7: Drop old users table and rename new one
-- ============================================

-- Drop old users table (backup already created)
DROP TABLE IF EXISTS users;

-- Rename new table
RENAME TABLE users_new TO users;

-- ============================================
-- STEP 8: Re-enable foreign key checks
-- ============================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- STEP 9: Clean up temporary mapping table
-- ============================================

DROP TABLE IF EXISTS _user_mapping;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 'Migration complete! Users table now uses user_id as PRIMARY KEY.' as message;
SELECT 'All foreign keys have been updated to reference user_id (CHAR(36)).' as message;
SELECT 'Pre-order functionality has been added.' as message;
