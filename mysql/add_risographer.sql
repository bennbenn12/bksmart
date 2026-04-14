-- Add Risographer Role and RISO Job Order System
-- Run this after schema.sql

-- 1. Modify users table to add risographer role
ALTER TABLE users 
MODIFY COLUMN role_type ENUM('bookstore_manager','bookstore_staff','working_student','teacher','student','parent','risographer') 
NOT NULL DEFAULT 'student';

-- 2. Add RISO-specific fields to job_orders table (matches physical form)
-- Run each ALTER separately to avoid errors if columns already exist

-- Add job_type column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS job_type ENUM('General','RISO') NOT NULL DEFAULT 'General' AFTER description;

-- Add cost_center column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS cost_center VARCHAR(150) NULL AFTER department_account;

-- Add exam_type column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50) NULL AFTER cost_center;

-- Add charge_to column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS charge_to VARCHAR(150) NULL AFTER exam_type;

-- Add paper_used column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS paper_used INT NULL DEFAULT 0 AFTER total_amount;

-- Add ink_used column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS ink_used DECIMAL(10,2) NULL DEFAULT 0 AFTER paper_used;

-- Add masters_used column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS masters_used INT NULL DEFAULT 0 AFTER ink_used;

-- Add risographer_id column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS risographer_id VARCHAR(100) NULL AFTER approved_by;

-- Add processing_at column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS processing_at DATETIME NULL AFTER approved_at;

-- Add pickup_notified_at column
ALTER TABLE job_orders 
ADD COLUMN IF NOT EXISTS pickup_notified_at DATETIME NULL AFTER completed_at;

-- Add foreign key (skip if error - may already exist)
-- Note: Run this separately if you get an error
ALTER TABLE job_orders 
ADD CONSTRAINT fk_job_orders_risographer 
FOREIGN KEY (risographer_id) REFERENCES users(id_number);

-- 3. Create RISO job items table (matches physical form SUBJECTS table)
-- Teachers enter subjects, masters, print type, copies
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

-- 4. Create RISO queue for risographer to manage printing jobs
CREATE TABLE IF NOT EXISTS riso_queue (
  queue_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id CHAR(36) NOT NULL UNIQUE,
  risographer_id VARCHAR(100) NULL,
  queue_position INT NOT NULL,
  status ENUM('Pending','Processing','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_riso_queue_job FOREIGN KEY (job_id) REFERENCES job_orders(job_id),
  CONSTRAINT fk_riso_queue_risographer FOREIGN KEY (risographer_id) REFERENCES users(id_number)
);

-- 5. Auto-increment queue position
DELIMITER //
DROP TRIGGER IF EXISTS trg_riso_queue_position//
CREATE TRIGGER trg_riso_queue_position
BEFORE INSERT ON riso_queue
FOR EACH ROW
BEGIN
  IF NEW.queue_position IS NULL THEN
    SET NEW.queue_position = (SELECT COALESCE(MAX(queue_position), 0) + 1 FROM riso_queue WHERE status != 'Completed');
  END IF;
END//
DELIMITER ;

-- Workflow:
-- 1. Teacher fills digital RISO form (matches physical form) → Draft
-- 2. Teacher submits → Pending_Audit
-- 3. Staff/Manager approves → Approved
-- 4. Risographer takes job → Processing
-- 5. Risographer completes, enters materials used → Completed
-- 6. System deducts inventory & notifies teacher for pickup
