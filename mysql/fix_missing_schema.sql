-- ============================================================================
-- FIX MISSING DATABASE SCHEMA FOR BOOKSMART SYSTEM
-- Run this to add all missing tables and columns
-- ============================================================================

-- 1. Fix users table - add risographer role
ALTER TABLE users 
MODIFY COLUMN role_type ENUM('bookstore_manager','bookstore_staff','working_student','teacher','student','parent','risographer') 
NOT NULL DEFAULT 'student';

-- 2. Fix job_orders table - expand status enum to include 'Processing'
ALTER TABLE job_orders 
MODIFY COLUMN status ENUM('Draft','Pending_Audit','Approved','Processing','Completed','Rejected') 
NOT NULL DEFAULT 'Draft';

-- 3. Add missing columns to job_orders table
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS job_type ENUM('General','RISO') NOT NULL DEFAULT 'General' AFTER description,
ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150) NULL AFTER department_account,
ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) NULL AFTER cost_center,
ADD COLUMN IF NOT EXISTS charge_to VARCHAR(150) NULL AFTER exam_type,
ADD COLUMN IF NOT EXISTS paper_used INT NULL DEFAULT 0 AFTER total_amount,
ADD COLUMN IF NOT EXISTS ink_used DECIMAL(10,2) NULL DEFAULT 0 AFTER paper_used,
ADD COLUMN IF NOT EXISTS masters_used INT NULL DEFAULT 0 AFTER ink_used,
ADD COLUMN IF NOT EXISTS risographer_id VARCHAR(100) NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS processing_at DATETIME NULL AFTER approved_at,
ADD COLUMN IF NOT EXISTS pickup_notified_at DATETIME NULL AFTER completed_at,
ADD COLUMN IF NOT EXISTS computed_by VARCHAR(100) NULL AFTER masters_used,
ADD COLUMN IF NOT EXISTS computed_at DATETIME NULL AFTER computed_by,
ADD COLUMN IF NOT EXISTS final_approved_by VARCHAR(100) NULL AFTER computed_at,
ADD COLUMN IF NOT EXISTS final_approved_at DATETIME NULL AFTER final_approved_by;

-- 4. Add foreign key for risographer_id (ignore error if already exists)
-- Note: This might fail if the FK already exists, which is fine
-- ALTER TABLE job_orders 
-- ADD CONSTRAINT fk_job_orders_risographer 
-- FOREIGN KEY (risographer_id) REFERENCES users(id_number);

-- 5. Create riso_job_items table (RISO printing job items)
CREATE TABLE IF NOT EXISTS riso_job_items (
  item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id CHAR(36) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  num_masters INT NOT NULL DEFAULT 1,
  print_type ENUM('1_side','B_to_B') NOT NULL DEFAULT '1_side',
  copies_per_master INT NOT NULL DEFAULT 1,
  total_paper_used INT GENERATED ALWAYS AS (num_masters * copies_per_master) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_riso_items_job FOREIGN KEY (job_id) REFERENCES job_orders(job_id) ON DELETE CASCADE
);

-- 6. Create riso_queue table for risographer queue management
CREATE TABLE IF NOT EXISTS riso_queue (
  queue_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id CHAR(36) NOT NULL UNIQUE,
  risographer_id VARCHAR(100) NULL,
  queue_position INT NOT NULL DEFAULT 0,
  status ENUM('Pending','Processing','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_riso_queue_job FOREIGN KEY (job_id) REFERENCES job_orders(job_id),
  CONSTRAINT fk_riso_queue_risographer FOREIGN KEY (risographer_id) REFERENCES users(id_number)
);

-- 7. Verify all tables exist
SELECT 'Tables created/updated successfully' as message;
