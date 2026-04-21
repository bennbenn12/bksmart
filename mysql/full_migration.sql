-- ============================================
-- FULL MIGRATION SCRIPT: id_number → user_id
-- Run this in Railway MySQL Query tab
-- ============================================
-- WARNING: BACKUP YOUR DATABASE FIRST!
-- ============================================

-- Step 0: Create backup tables (optional but recommended)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders;
CREATE TABLE IF NOT EXISTS appointments_backup AS SELECT * FROM appointments;
CREATE TABLE IF NOT EXISTS queues_backup AS SELECT * FROM queues;
CREATE TABLE IF NOT EXISTS job_orders_backup AS SELECT * FROM job_orders;
CREATE TABLE IF NOT EXISTS payments_backup AS SELECT * FROM payments;
CREATE TABLE IF NOT EXISTS notifications_backup AS SELECT * FROM notifications;
CREATE TABLE IF NOT EXISTS inventory_logs_backup AS SELECT * FROM inventory_logs;
CREATE TABLE IF NOT EXISTS feedback_backup AS SELECT * FROM feedback;
CREATE TABLE IF NOT EXISTS bookstore_items_backup AS SELECT * FROM bookstore_items;

-- ============================================
-- STEP 1: Add user_id to users table
-- ============================================

-- Add user_id column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id CHAR(36) NULL;

-- Generate UUID for existing users without user_id
UPDATE users SET user_id = UUID() WHERE user_id IS NULL;

-- ============================================
-- STEP 2: Create mapping table
-- ============================================

CREATE TEMPORARY TABLE IF NOT EXISTS user_mapping AS
SELECT id_number, user_id FROM users;

-- ============================================
-- STEP 3: Add user_id columns to all related tables
-- ============================================

-- orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id_new CHAR(36) NULL;
UPDATE orders o
JOIN user_mapping um ON o.user_id = um.id_number
SET o.user_id_new = um.user_id;
ALTER TABLE orders DROP FOREIGN KEY IF EXISTS fk_orders_user;
ALTER TABLE orders DROP FOREIGN KEY IF EXISTS fk_orders_processed_by;
ALTER TABLE orders DROP COLUMN IF EXISTS user_id;
ALTER TABLE orders CHANGE user_id_new user_id CHAR(36) NOT NULL;
ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id);

-- processed_by (nullable)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by_new CHAR(36) NULL;
UPDATE orders o
JOIN user_mapping um ON o.processed_by = um.id_number
SET o.processed_by_new = um.user_id;
ALTER TABLE orders DROP COLUMN IF EXISTS processed_by;
ALTER TABLE orders CHANGE processed_by_new processed_by CHAR(36) NULL;
ALTER TABLE orders ADD CONSTRAINT fk_orders_processed_by FOREIGN KEY (processed_by) REFERENCES users(user_id);

-- appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id_new CHAR(36) NULL;
UPDATE appointments a
JOIN user_mapping um ON a.user_id = um.id_number
SET a.user_id_new = um.user_id;
ALTER TABLE appointments DROP FOREIGN KEY IF EXISTS fk_appointments_user;
ALTER TABLE appointments DROP COLUMN IF EXISTS user_id;
ALTER TABLE appointments CHANGE user_id_new user_id CHAR(36) NOT NULL;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(user_id);

-- confirmed_by (nullable)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmed_by_new CHAR(36) NULL;
UPDATE appointments a
JOIN user_mapping um ON a.confirmed_by = um.id_number
SET a.confirmed_by_new = um.user_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS confirmed_by;
ALTER TABLE appointments CHANGE confirmed_by_new confirmed_by CHAR(36) NULL;
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(user_id);

-- queues table
ALTER TABLE queues ADD COLUMN IF NOT EXISTS user_id_new CHAR(36) NULL;
UPDATE queues q
JOIN user_mapping um ON q.user_id = um.id_number
SET q.user_id_new = um.user_id;
ALTER TABLE queues DROP FOREIGN KEY IF EXISTS fk_queues_user;
ALTER TABLE queues DROP COLUMN IF EXISTS user_id;
ALTER TABLE queues CHANGE user_id_new user_id CHAR(36) NOT NULL;
ALTER TABLE queues ADD CONSTRAINT fk_queues_user FOREIGN KEY (user_id) REFERENCES users(user_id);

-- job_orders table
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS requester_id_new CHAR(36) NULL;
UPDATE job_orders j
JOIN user_mapping um ON j.requester_id = um.id_number
SET j.requester_id_new = um.user_id;
ALTER TABLE job_orders DROP FOREIGN KEY IF EXISTS fk_job_orders_requester;
ALTER TABLE job_orders DROP COLUMN IF EXISTS requester_id;
ALTER TABLE job_orders CHANGE requester_id_new requester_id CHAR(36) NOT NULL;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_requester FOREIGN KEY (requester_id) REFERENCES users(user_id);

-- audited_by (nullable)
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS audited_by_new CHAR(36) NULL;
UPDATE job_orders j
JOIN user_mapping um ON j.audited_by = um.id_number
SET j.audited_by_new = um.user_id;
ALTER TABLE job_orders DROP COLUMN IF EXISTS audited_by;
ALTER TABLE job_orders CHANGE audited_by_new audited_by CHAR(36) NULL;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_audited_by FOREIGN KEY (audited_by) REFERENCES users(user_id);

-- approved_by (nullable)
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS approved_by_new CHAR(36) NULL;
UPDATE job_orders j
JOIN user_mapping um ON j.approved_by = um.id_number
SET j.approved_by_new = um.user_id;
ALTER TABLE job_orders DROP COLUMN IF EXISTS approved_by;
ALTER TABLE job_orders CHANGE approved_by_new approved_by CHAR(36) NULL;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id);

-- payments table (verified_by)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by_new CHAR(36) NULL;
UPDATE payments p
JOIN user_mapping um ON p.verified_by = um.id_number
SET p.verified_by_new = um.user_id;
ALTER TABLE payments DROP FOREIGN KEY IF EXISTS fk_payments_verified_by;
ALTER TABLE payments DROP COLUMN IF EXISTS verified_by;
ALTER TABLE payments CHANGE verified_by_new verified_by CHAR(36) NULL;
ALTER TABLE payments ADD CONSTRAINT fk_payments_verified_by FOREIGN KEY (verified_by) REFERENCES users(user_id);

-- notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id_new CHAR(36) NULL;
UPDATE notifications n
JOIN user_mapping um ON n.user_id = um.id_number
SET n.user_id_new = um.user_id;
ALTER TABLE notifications DROP FOREIGN KEY IF EXISTS fk_notifications_user;
ALTER TABLE notifications DROP COLUMN IF EXISTS user_id;
ALTER TABLE notifications CHANGE user_id_new user_id CHAR(36) NOT NULL;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id);

-- inventory_logs table
ALTER TABLE inventory_logs ADD COLUMN IF NOT EXISTS changed_by_new CHAR(36) NULL;
UPDATE inventory_logs i
JOIN user_mapping um ON i.changed_by = um.id_number
SET i.changed_by_new = um.user_id;
ALTER TABLE inventory_logs DROP FOREIGN KEY IF EXISTS fk_inventory_logs_changed_by;
ALTER TABLE inventory_logs DROP COLUMN IF EXISTS changed_by;
ALTER TABLE inventory_logs CHANGE changed_by_new changed_by CHAR(36) NULL;
ALTER TABLE inventory_logs ADD CONSTRAINT fk_inventory_logs_changed_by FOREIGN KEY (changed_by) REFERENCES users(user_id);

-- feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id_new CHAR(36) NULL;
UPDATE feedback f
JOIN user_mapping um ON f.user_id = um.id_number
SET f.user_id_new = um.user_id;
ALTER TABLE feedback DROP FOREIGN KEY IF EXISTS fk_feedback_user;
ALTER TABLE feedback DROP COLUMN IF EXISTS user_id;
ALTER TABLE feedback CHANGE user_id_new user_id CHAR(36) NOT NULL;
ALTER TABLE feedback ADD CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(user_id);

-- bookstore_items table (created_by)
ALTER TABLE bookstore_items ADD COLUMN IF NOT EXISTS created_by_new CHAR(36) NULL;
UPDATE bookstore_items b
JOIN user_mapping um ON b.created_by = um.id_number
SET b.created_by_new = um.user_id;
ALTER TABLE bookstore_items DROP FOREIGN KEY IF EXISTS fk_items_created_by;
ALTER TABLE bookstore_items DROP COLUMN IF EXISTS created_by;
ALTER TABLE bookstore_items CHANGE created_by_new created_by CHAR(36) NULL;
ALTER TABLE bookstore_items ADD CONSTRAINT fk_items_created_by FOREIGN KEY (created_by) REFERENCES users(user_id);

-- ============================================
-- STEP 4: Finalize users table
-- ============================================

-- Make user_id the primary key
ALTER TABLE users DROP PRIMARY KEY;
ALTER TABLE users ADD PRIMARY KEY (user_id);

-- Make sure id_number stays unique and not null
ALTER TABLE users MODIFY id_number VARCHAR(100) UNIQUE NOT NULL;

-- Add pre-order columns to bookstore_items
ALTER TABLE bookstore_items ADD COLUMN IF NOT EXISTS allow_preorder TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE bookstore_items ADD COLUMN IF NOT EXISTS preorder_eta_days INT NULL;

-- Add pre-order columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_preorder TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_delivery_date DATE NULL;

-- Update orders status enum to include 'Preordered'
-- Note: This may require recreating the orders table in MySQL 8.0+
-- For now, the application will handle this status

-- Add pre-order column to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_preorder_item TINYINT(1) NOT NULL DEFAULT 0;

-- Update inventory_logs change_type enum
-- The application will handle the 'Preorder' type

-- ============================================
-- STEP 5: Clean up
-- ============================================

DROP TEMPORARY TABLE IF EXISTS user_mapping;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
SELECT 'Migration complete! Please verify all data before deleting backup tables.' as message;
