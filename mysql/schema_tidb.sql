-- TiDB Cloud compatible schema (no DELIMITER statements)
-- Run this in TiDB Cloud SQL Editor instead of schema.sql
-- IMPORTANT: Select your database from the dropdown in TiDB Cloud first!

CREATE TABLE IF NOT EXISTS users (
  id_number VARCHAR(100) PRIMARY KEY,
  auth_id CHAR(36) UNIQUE NOT NULL,
  role_type ENUM('bookstore_manager','bookstore_staff','working_student','teacher','student','parent') NOT NULL DEFAULT 'student',
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  category_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) NULL,
  color_class VARCHAR(150) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookstore_items (
  item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sku VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL DEFAULT 'Supply',
  shop ENUM('Bookstore','Souvenir_Shop','Riso') NOT NULL DEFAULT 'Bookstore',
  reorder_level INT NOT NULL DEFAULT 10,
  unit VARCHAR(30) DEFAULT 'pc',
  image_url TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_created_by FOREIGN KEY (created_by) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS item_images (
  image_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  item_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  order_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id VARCHAR(100) NOT NULL,
  status ENUM('Pending','Ready','Released','Cancelled') NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  transaction_id VARCHAR(120) NULL UNIQUE,
  notes TEXT NULL,
  processed_by VARCHAR(100) NULL,
  released_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id_number),
  CONSTRAINT fk_orders_processed_by FOREIGN KEY (processed_by) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_source ENUM('Bookstore','Teller') NOT NULL DEFAULT 'Bookstore',
  or_number VARCHAR(100) NULL,
  date_paid TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_by VARCHAR(100) NULL,
  verified_at TIMESTAMP NULL,
  or_image_url TEXT NULL,
  notes TEXT NULL,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_payments_verified_by FOREIGN KEY (verified_by) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS appointment_slots (
  slot_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  max_capacity INT NOT NULL DEFAULT 5,
  current_bookings INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  appt_number VARCHAR(50) NOT NULL UNIQUE,
  user_id VARCHAR(100) NOT NULL,
  order_id CHAR(36) NULL,
  schedule_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  status ENUM('Pending','Confirmed','Completed','Rescheduled','Cancelled') NOT NULL DEFAULT 'Pending',
  or_number VARCHAR(100) NULL,
  purpose TEXT NULL DEFAULT 'OR Presentation & Item Pickup',
  notes TEXT NULL,
  confirmed_by VARCHAR(100) NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(id_number),
  CONSTRAINT fk_appointments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_appointments_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS queues (
  queue_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  queue_number INT NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  order_id CHAR(36) NULL,
  queue_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('Waiting','Processing','Completed') NOT NULL DEFAULT 'Waiting',
  called_at DATETIME NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_queues_user FOREIGN KEY (user_id) REFERENCES users(id_number),
  CONSTRAINT fk_queues_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE IF NOT EXISTS job_orders (
  job_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NULL,
  requester_id VARCHAR(100) NOT NULL,
  department_account VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('Draft','Pending_Audit','Approved','Rejected','Completed') NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  job_number VARCHAR(50) NOT NULL UNIQUE,
  audited_by VARCHAR(100) NULL,
  audited_at DATETIME NULL,
  audit_notes TEXT NULL,
  approved_by VARCHAR(100) NULL,
  approved_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_orders_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_job_orders_requester FOREIGN KEY (requester_id) REFERENCES users(id_number),
  CONSTRAINT fk_job_orders_audited_by FOREIGN KEY (audited_by) REFERENCES users(id_number),
  CONSTRAINT fk_job_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NULL,
  message TEXT NOT NULL,
  status ENUM('Read','Unread') NOT NULL DEFAULT 'Unread',
  type VARCHAR(50) DEFAULT 'info',
  reference_type VARCHAR(60) NULL,
  reference_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  log_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  item_id CHAR(36) NOT NULL,
  changed_by VARCHAR(100) NULL,
  change_type ENUM('Restock','Deduct','Adjust','Reserve','Release') NOT NULL DEFAULT 'Adjust',
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  delta INT NOT NULL,
  reference_id CHAR(36) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_logs_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id),
  CONSTRAINT fk_inventory_logs_changed_by FOREIGN KEY (changed_by) REFERENCES users(id_number)
);

CREATE TABLE IF NOT EXISTS feedback (
  feedback_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(100) NOT NULL,
  order_id CHAR(36) NULL,
  item_id CHAR(36) NULL,
  content TEXT NULL,
  rating INT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id_number),
  CONSTRAINT fk_feedback_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_feedback_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id)
);

-- NOTE: Triggers must be run separately. See triggers_tidb.sql
