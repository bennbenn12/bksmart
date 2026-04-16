-- Updated schema with user_id as PK and pre-order support
CREATE DATABASE IF NOT EXISTS booksmart;
USE booksmart;

-- Users table: user_id is the database PK, id_number is for display/login
CREATE TABLE IF NOT EXISTS users (
  user_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  id_number VARCHAR(100) UNIQUE NOT NULL,
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

-- Items now support pre-orders with allow_preorder flag
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
  allow_preorder TINYINT(1) NOT NULL DEFAULT 1, -- Allow pre-orders when out of stock
  preorder_eta_days INT NULL, -- Estimated days for preorder fulfillment
  created_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS item_images (
  image_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  item_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id) ON DELETE CASCADE
);

-- Orders now track if they are preorders
CREATE TABLE IF NOT EXISTS orders (
  order_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  user_id CHAR(36) NOT NULL,
  status ENUM('Pending','Ready','Released','Cancelled','Preordered') NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  transaction_id VARCHAR(120) NULL UNIQUE,
  notes TEXT NULL,
  is_preorder TINYINT(1) NOT NULL DEFAULT 0,
  expected_delivery_date DATE NULL,
  processed_by CHAR(36) NULL,
  released_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_orders_processed_by FOREIGN KEY (processed_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  is_preorder_item TINYINT(1) NOT NULL DEFAULT 0,
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
  verified_by CHAR(36) NULL,
  verified_at TIMESTAMP NULL,
  or_image_url TEXT NULL,
  notes TEXT NULL,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_payments_verified_by FOREIGN KEY (verified_by) REFERENCES users(user_id)
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
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) NULL,
  schedule_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  status ENUM('Pending','Confirmed','Completed','Rescheduled','Cancelled') NOT NULL DEFAULT 'Pending',
  or_number VARCHAR(100) NULL,
  purpose TEXT NULL,
  notes TEXT NULL,
  confirmed_by CHAR(36) NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_appointments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_appointments_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS queues (
  queue_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  queue_number INT NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) NULL,
  queue_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('Waiting','Processing','Completed') NOT NULL DEFAULT 'Waiting',
  called_at DATETIME NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_queues_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_queues_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE IF NOT EXISTS job_orders (
  job_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NULL,
  requester_id CHAR(36) NOT NULL,
  department_account VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('Draft','Pending_Audit','Approved','Rejected','Completed') NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  job_number VARCHAR(50) NOT NULL UNIQUE,
  audited_by CHAR(36) NULL,
  audited_at DATETIME NULL,
  audit_notes TEXT NULL,
  approved_by CHAR(36) NULL,
  approved_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_orders_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_job_orders_requester FOREIGN KEY (requester_id) REFERENCES users(user_id),
  CONSTRAINT fk_job_orders_audited_by FOREIGN KEY (audited_by) REFERENCES users(user_id),
  CONSTRAINT fk_job_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

-- RISO job items table
CREATE TABLE IF NOT EXISTS riso_job_items (
  riso_item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id CHAR(36) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  num_masters INT NOT NULL DEFAULT 1,
  print_type ENUM('1_side','B_to_B') NOT NULL DEFAULT '1_side',
  copies_per_master INT NOT NULL DEFAULT 1,
  total_paper_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_riso_items_job FOREIGN KEY (job_id) REFERENCES job_orders(job_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) NULL,
  message TEXT NOT NULL,
  status ENUM('Read','Unread') NOT NULL DEFAULT 'Unread',
  type VARCHAR(50) DEFAULT 'info',
  reference_type VARCHAR(60) NULL,
  reference_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  log_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  item_id CHAR(36) NOT NULL,
  changed_by CHAR(36) NULL,
  change_type ENUM('Restock','Deduct','Adjust','Reserve','Release','Preorder') NOT NULL DEFAULT 'Adjust',
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  delta INT NOT NULL,
  reference_id CHAR(36) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_logs_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id),
  CONSTRAINT fk_inventory_logs_changed_by FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  feedback_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) NULL,
  item_id CHAR(36) NULL,
  content TEXT NULL,
  rating INT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_feedback_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_feedback_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id)
);

-- Number generators are in application code (lib/utils.js)
