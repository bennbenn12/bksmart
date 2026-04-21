-- ============================================
-- BOOKSMART DATABASE SCHEMA - FINAL VERSION
-- user_id as PRIMARY KEY (CHAR(36))
-- Pre-order support included
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Create database
CREATE DATABASE IF NOT EXISTS booksmart DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE booksmart;

-- ============================================
-- USERS TABLE (user_id is PK, id_number for display)
-- ============================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  user_id CHAR(36) PRIMARY KEY,
  id_number VARCHAR(100) UNIQUE NOT NULL,
  auth_id CHAR(36) UNIQUE NOT NULL,
  role_type ENUM('bookstore_manager','bookstore_staff','working_student','teacher','student','parent','risographer') NOT NULL DEFAULT 'student',
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  contact_number VARCHAR(20) DEFAULT NULL,
  id_type VARCHAR(50) DEFAULT NULL,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  department VARCHAR(150) DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL,
  first_login_expires_at TIMESTAMP NULL DEFAULT NULL,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_first_login_expires (first_login_expires_at),
  KEY idx_users_last_login (last_login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- CATEGORIES
-- ============================================
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  category_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT NULL,
  color_class VARCHAR(150) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY name (name),
  UNIQUE KEY slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- BOOKSTORE ITEMS (with pre-order support)
-- ============================================
DROP TABLE IF EXISTS bookstore_items;
CREATE TABLE bookstore_items (
  item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sku VARCHAR(120) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Supply',
  shop ENUM('Bookstore','Souvenir_Shop','Riso') NOT NULL DEFAULT 'Bookstore',
  reorder_level INT NOT NULL DEFAULT 10,
  unit VARCHAR(30) DEFAULT 'pc',
  sizes VARCHAR(255) DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  allow_preorder TINYINT(1) NOT NULL DEFAULT 1,
  preorder_eta_days INT DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY sku (sku),
  KEY fk_items_created_by (created_by),
  CONSTRAINT fk_items_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- ITEM IMAGES
-- ============================================
DROP TABLE IF EXISTS item_images;
CREATE TABLE item_images (
  image_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  item_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_item_images_item (item_id),
  CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- ORDERS (with pre-order status)
-- ============================================
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  order_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_number VARCHAR(50) NOT NULL,
  user_id CHAR(36) NOT NULL,
  status ENUM('Pending','Ready','Released','Cancelled','Preordered') NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  transaction_id VARCHAR(120) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  is_preorder TINYINT(1) NOT NULL DEFAULT 0,
  expected_delivery_date DATE DEFAULT NULL,
  processed_by CHAR(36) DEFAULT NULL,
  released_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY order_number (order_number),
  UNIQUE KEY transaction_id (transaction_id),
  KEY fk_orders_user (user_id),
  KEY fk_orders_processed_by (processed_by),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_orders_processed_by FOREIGN KEY (processed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- ORDER ITEMS
-- ============================================
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
  order_item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  item_id CHAR(36) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  size VARCHAR(20) DEFAULT NULL,
  is_preorder_item TINYINT(1) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_order_items_order (order_id),
  KEY fk_order_items_item (item_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- PAYMENTS
-- ============================================
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  payment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_source ENUM('Bookstore','Teller') NOT NULL DEFAULT 'Bookstore',
  or_number VARCHAR(100) DEFAULT NULL,
  date_paid TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_by CHAR(36) DEFAULT NULL,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  or_image_url TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  KEY fk_payments_order (order_id),
  KEY fk_payments_verified_by (verified_by),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_payments_verified_by FOREIGN KEY (verified_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- APPOINTMENT SLOTS
-- ============================================
DROP TABLE IF EXISTS appointment_slots;
CREATE TABLE appointment_slots (
  slot_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  max_capacity INT NOT NULL DEFAULT 5,
  current_bookings INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- APPOINTMENTS
-- ============================================
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
  appointment_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  appt_number VARCHAR(50) NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) DEFAULT NULL,
  schedule_date DATE NOT NULL,
  time_slot TIME NOT NULL,
  status ENUM('Pending','Confirmed','Completed','Rescheduled','Cancelled') NOT NULL DEFAULT 'Pending',
  or_number VARCHAR(100) DEFAULT NULL,
  purpose TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  confirmed_by CHAR(36) DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY appt_number (appt_number),
  KEY fk_appointments_user (user_id),
  KEY fk_appointments_order (order_id),
  KEY fk_appointments_confirmed_by (confirmed_by),
  CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_appointments_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_appointments_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- QUEUES
-- ============================================
DROP TABLE IF EXISTS queues;
CREATE TABLE queues (
  queue_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  queue_number INT NOT NULL,
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) DEFAULT NULL,
  queue_date DATE NOT NULL DEFAULT (CURDATE()),
  status ENUM('Waiting','Processing','Completed') NOT NULL DEFAULT 'Waiting',
  called_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY fk_queues_user (user_id),
  KEY fk_queues_order (order_id),
  CONSTRAINT fk_queues_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_queues_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- JOB ORDERS
-- ============================================
DROP TABLE IF EXISTS job_orders;
CREATE TABLE job_orders (
  job_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) DEFAULT NULL,
  requester_id CHAR(36) NOT NULL,
  department_account VARCHAR(150) NOT NULL,
  cost_center VARCHAR(150) DEFAULT NULL,
  exam_type VARCHAR(50) DEFAULT NULL,
  charge_to VARCHAR(150) DEFAULT NULL,
  computed_by CHAR(36) DEFAULT NULL,
  computed_at DATETIME DEFAULT NULL,
  noted_by CHAR(36) DEFAULT NULL,
  noted_at DATETIME DEFAULT NULL,
  verified_by CHAR(36) DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  final_approved_by CHAR(36) DEFAULT NULL,
  final_approved_at DATETIME DEFAULT NULL,
  description TEXT NOT NULL,
  job_type ENUM('General','RISO') NOT NULL DEFAULT 'General',
  status ENUM('Draft','Pending_Audit','Approved','Processing','Completed','Rejected') NOT NULL DEFAULT 'Draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paper_used INT DEFAULT 0,
  ink_used DECIMAL(10,2) DEFAULT 0.00,
  masters_used INT DEFAULT 0,
  notes TEXT DEFAULT NULL,
  job_number VARCHAR(50) NOT NULL,
  audited_by CHAR(36) DEFAULT NULL,
  audited_at DATETIME DEFAULT NULL,
  audit_notes TEXT DEFAULT NULL,
  approved_by CHAR(36) DEFAULT NULL,
  risographer_id CHAR(36) DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  processing_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  pickup_notified_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY job_number (job_number),
  KEY fk_job_orders_order (order_id),
  KEY fk_job_orders_requester (requester_id),
  KEY fk_job_orders_audited_by (audited_by),
  KEY fk_job_orders_approved_by (approved_by),
  KEY fk_job_orders_risographer (risographer_id),
  KEY computed_by (computed_by),
  KEY noted_by (noted_by),
  KEY verified_by (verified_by),
  KEY final_approved_by (final_approved_by),
  CONSTRAINT fk_job_orders_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_job_orders_requester FOREIGN KEY (requester_id) REFERENCES users(user_id),
  CONSTRAINT fk_job_orders_audited_by FOREIGN KEY (audited_by) REFERENCES users(user_id),
  CONSTRAINT fk_job_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id),
  CONSTRAINT fk_job_orders_risographer FOREIGN KEY (risographer_id) REFERENCES users(user_id),
  CONSTRAINT job_orders_ibfk_2 FOREIGN KEY (computed_by) REFERENCES users(user_id),
  CONSTRAINT job_orders_ibfk_3 FOREIGN KEY (noted_by) REFERENCES users(user_id),
  CONSTRAINT job_orders_ibfk_4 FOREIGN KEY (verified_by) REFERENCES users(user_id),
  CONSTRAINT job_orders_ibfk_5 FOREIGN KEY (final_approved_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- RISO JOB ITEMS
-- ============================================
DROP TABLE IF EXISTS riso_job_items;
CREATE TABLE riso_job_items (
  riso_item_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id CHAR(36) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  num_masters INT NOT NULL DEFAULT 1,
  print_type ENUM('1_side','B_to_B') NOT NULL DEFAULT '1_side',
  copies_per_master INT NOT NULL DEFAULT 1,
  total_paper_used INT GENERATED ALWAYS AS (num_masters * copies_per_master) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_riso_items_job (job_id),
  CONSTRAINT fk_riso_items_job FOREIGN KEY (job_id) REFERENCES job_orders(job_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- RISO QUEUE
-- ============================================
DROP TABLE IF EXISTS riso_queue;
CREATE TABLE riso_queue (
  queue_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id CHAR(36) NOT NULL,
  risographer_id CHAR(36) DEFAULT NULL,
  queue_position INT NOT NULL,
  status ENUM('Pending','Processing','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  started_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY job_id (job_id),
  KEY fk_riso_queue_risographer (risographer_id),
  CONSTRAINT fk_riso_queue_job FOREIGN KEY (job_id) REFERENCES job_orders(job_id),
  CONSTRAINT fk_riso_queue_risographer FOREIGN KEY (risographer_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- NOTIFICATIONS
-- ============================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  notification_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  message TEXT NOT NULL,
  status ENUM('Read','Unread') NOT NULL DEFAULT 'Unread',
  type VARCHAR(50) DEFAULT 'info',
  reference_type VARCHAR(60) DEFAULT NULL,
  reference_id CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- INVENTORY LOGS (with preorder type)
-- ============================================
DROP TABLE IF EXISTS inventory_logs;
CREATE TABLE inventory_logs (
  log_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  item_id CHAR(36) NOT NULL,
  changed_by CHAR(36) DEFAULT NULL,
  change_type ENUM('Restock','Deduct','Adjust','Reserve','Release','Preorder') NOT NULL DEFAULT 'Adjust',
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  delta INT NOT NULL,
  reference_id CHAR(36) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_inventory_logs_item (item_id),
  KEY fk_inventory_logs_changed_by (changed_by),
  CONSTRAINT fk_inventory_logs_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id),
  CONSTRAINT fk_inventory_logs_changed_by FOREIGN KEY (changed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- FEEDBACK
-- ============================================
DROP TABLE IF EXISTS feedback;
CREATE TABLE feedback (
  feedback_id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  order_id CHAR(36) DEFAULT NULL,
  item_id CHAR(36) DEFAULT NULL,
  content TEXT DEFAULT NULL,
  rating INT DEFAULT NULL CHECK (rating between 1 and 5),
  comment TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY fk_feedback_user (user_id),
  KEY fk_feedback_order (order_id),
  KEY fk_feedback_item (item_id),
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_feedback_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_feedback_item FOREIGN KEY (item_id) REFERENCES bookstore_items(item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- SEED DATA - USERS
-- ============================================
INSERT INTO users (user_id, id_number, auth_id, role_type, username, password_hash, first_name, last_name, email, contact_number, id_type, status, department, created_at, updated_at, first_login_expires_at, last_login_at, email_verified_at) VALUES
('usr_06929327_001', '06929327', '87a93359-348b-11f1-a318-b42e99f14876', 'bookstore_manager', 'benndota23', '$2b$10$XqzBWa43bOAjq32cfa87au3ndQ8ceDZoZUGWS.NXR58gRJq6XYmY2', 'Benn Stepen', 'Saco', 'benndota23@gmail.com', '09666375451', 'Driver License', 'Active', NULL, '2026-04-10 03:15:30', '2026-04-14 22:47:22', NULL, '2026-04-13 02:30:43', NULL),
('usr_06929328_001', '06929328', '6655cc30-3492-11f1-a318-b42e99f14876', 'student', 'Test', '$2b$10$JCWD3qH0MeIW5pgj3YC9PuXKv2ocM6zyzcmW4K9hFmrPDqTx.XKq6', 'Test', 'Test', 'Test@gmail.com', NULL, 'Student ID', 'Active', NULL, '2026-04-10 04:04:41', '2026-04-10 04:05:41', NULL, NULL, NULL),
('usr_09696969_001', '09696969', 'auth_1744357023123_a7x9k2m5p', 'bookstore_manager', 'benndota24', '$2b$10$eeBAGT0blguIbABZj2tXPObYlJCEEeQtfptPgRTuPpRmFLIEl.sqa', 'benndota', '24', 'benndota24@gmail.com', NULL, NULL, 'Active', 'DEVELOPER', '2026-04-11 07:58:01', '2026-04-11 09:36:56', '2026-04-12 07:58:01', '2026-04-11 09:36:56', NULL),
('usr_20240001_001', '2024-0001', 'baed71f6-1bce-4b1c-9cce-b2a93ceccc11', 'student', 'student1', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Carlos', 'Garcia', 'carlos.garcia@student.hnu.edu.ph', '09171234567', 'School ID', 'Active', 'CITE', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_20240002_001', '2024-0002', '06965279-bd01-47d8-a87d-864b3c78a5eb', 'student', 'student2', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Jasmine', 'Flores', 'jasmine.flores@student.hnu.edu.ph', '09171234567', 'School ID', 'Active', 'CBA', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_20240003_001', '2024-0003', '300246c4-9955-42a2-93e5-b875358a83c5', 'student', 'student3', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Mark', 'Torres', 'mark.torres@student.hnu.edu.ph', '09171234567', 'School ID', 'Active', 'COE', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_20240004_001', '2024-0004', 'fa5ca0bd-6d99-41da-a742-6f57afa6c798', 'student', 'student4', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Bianca', 'Lim', 'bianca.lim@student.hnu.edu.ph', '09171234567', 'School ID', 'Active', 'CAS', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_20240005_001', '2024-0005', '1747b468-342b-4d5c-9c83-b04fe6b9493b', 'student', 'student5', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Rafael', 'Mendoza', 'rafael.mendoza@student.hnu.edu.ph', '09171234567', 'School ID', 'Active', 'CITE', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_MGR0001_001', 'MGR-0001', '0f8d367a-2216-4909-abc8-e19b8d361d3a', 'bookstore_manager', 'manager1', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Maria', 'Santos', 'maria.santos@hnu.edu.ph', '09171234567', 'School ID', 'Active', 'Bookstore', '2026-04-10 08:07:22', '2026-04-11 08:19:02', NULL, NULL, NULL),
('usr_PAR0001_001', 'PAR-0001', 'b7ee5ba8-c79d-4056-a770-4ab174540b71', 'parent', 'parent1', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Roberto', 'Garcia', 'roberto.garcia@gmail.com', '09171234567', 'School ID', 'Active', NULL, '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_STF0001_001', 'STF-0001', '7f7e2f0f-f2aa-42a2-9faa-bbaa2d177248', 'bookstore_staff', 'staff1', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Juan', 'Dela Cruz', 'juan.delacruz@hnu.edu.ph', '09171234567', 'School ID', 'Active', 'Bookstore', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_TCH0001_001', 'TCH-0001', 'c00d1d27-427e-44ab-862f-bea0949aaf16', 'teacher', 'teacher1', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Elena', 'Villanueva', 'elena.villanueva@hnu.edu.ph', '09171234567', 'School ID', 'Active', 'CITE', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL),
('usr_WS0001_001', 'WS-0001', '7b63cb89-75d5-454a-9899-0657c7ac1a6d', 'working_student', 'workstud1', '$2b$10$EjdpgVcuddmE5oy8BLbU5.svZfUqlU7c/I7sJ9Hf4da4I7iAFcFGa', 'Ana', 'Reyes', 'ana.reyes@hnu.edu.ph', '09171234567', 'School ID', 'Active', 'Bookstore', '2026-04-10 08:07:22', '2026-04-10 08:07:22', NULL, NULL, NULL);

-- ============================================
-- SEED DATA - CATEGORIES
-- ============================================
INSERT INTO categories (category_id, name, slug, icon, color_class, is_active, created_at) VALUES
('4bda267e-34af-11f1-a318-b42e99f14876', 'TEST', 'test', NULL, NULL, 1, '2026-04-10 07:31:32'),
('4dba64b3-34b4-11f1-a318-b42e99f14876', 'Textbook', 'textbook', NULL, NULL, 1, '2026-04-10 08:07:22'),
('4dbada7e-34b4-11f1-a318-b42e99f14876', 'Uniform', 'uniform', NULL, NULL, 1, '2026-04-10 08:07:22'),
('4dbb04b4-34b4-11f1-a318-b42e99f14876', 'Supply', 'supply', NULL, NULL, 1, '2026-04-10 08:07:22'),
('4dbb3a89-34b4-11f1-a318-b42e99f14876', 'Souvenir', 'souvenir', NULL, NULL, 1, '2026-04-10 08:07:22'),
('4dbb608c-34b4-11f1-a318-b42e99f14876', 'Riso', 'riso', NULL, NULL, 1, '2026-04-10 08:07:22');

-- ============================================
-- SEED DATA - BOOKSTORE ITEMS (with pre-order enabled)
-- ============================================
INSERT INTO bookstore_items (item_id, name, description, price, stock_quantity, reserved_quantity, sku, category, shop, reorder_level, unit, sizes, image_url, is_active, allow_preorder, preorder_eta_days, created_by, created_at, updated_at) VALUES
('2942a73b-a6f2-49a2-9d94-e9f410051f01', 'Ballpoint Pen (Pack of 3)', 'Blue ink ballpoint pens, 0.7mm tip. Smooth writing, ideal for daily use.', 45.00, 146, 0, 'SUP-PEN3', 'Supply', 'Bookstore', 10, 'pack', NULL, 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-11 09:38:23'),
('299720a7-5cd9-4d05-9e5d-3ee52d937da7', 'College Department Shirt', 'Department-branded shirt available for all colleges. Screen-printed design.', 280.00, 100, 1, 'UNI-DEPT', 'Uniform', 'Bookstore', 10, 'pc', 'S,M,L,XL,2XL', 'https://images.unsplash.com/photo-1503341504253-dff4f94032fc?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 12:53:18'),
('2bc7eaee-bd72-4787-ad96-a42a3d54d41b', 'HNU Lanyard with ID Holder', 'Maroon & gold HNU lanyard with detachable ID holder. Breakaway clasp for safety.', 120.00, 80, 0, 'SOV-LNYD', 'Souvenir', 'Souvenir_Shop', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop', 1, 1, 7, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('306c6c8e-34a0-11f1-a318-b42e99f14876', 'Uniform', '', 100.00, 100, 3, 'test', 'Textbook', 'Bookstore', 10, 'pc', NULL, 'https://static.vecteezy.com/system/resources/thumbnails/044/280/984/small/stack-of-books-on-a-brown-background-concept-for-world-book-day-photo.jpg', 1, 1, NULL, 'usr_06929327_001', '2026-04-09 13:43:23', '2026-04-10 07:23:01'),
('3182e1fb-a266-49f3-878a-bdeb3f13771f', 'English Communication Arts', 'Academic writing, speech, and communication skills for college students.', 380.00, 40, 0, 'TXT-ENG101', 'Textbook', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('363a07a9-46a2-49a7-9f4a-4e94ddf11ba6', 'HNU Polo Uniform', 'Official HNU polo uniform with embroidered school seal. White with maroon accents.', 450.00, 59, 0, 'UNI-POLO', 'Uniform', 'Bookstore', 10, 'pc', 'XS,S,M,L,XL,2XL,3XL', 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-11 06:23:45'),
('50065245-b58a-4f36-b0da-aaec949aba0f', 'HNU PE Jogging Pants', 'Official HNU jogging pants for physical education classes. Comfortable fit with side pockets.', 400.00, 50, 0, 'UNI-PE-PANTS', 'Uniform', 'Bookstore', 10, 'pc', 'S,M,L,XL,2XL', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 12:38:31'),
('5114f814-1ae9-426b-9bae-69a15aa2f528', 'HNU Tote Bag', 'Canvas tote bag with HNU logo. Eco-friendly, perfect for books and everyday carry.', 250.00, 35, 0, 'SOV-TOTE', 'Souvenir', 'Souvenir_Shop', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('5187abf2-6590-4425-8c2c-c1c5e7728f5d', 'Fundamentals of Accounting', 'Essential accounting principles, financial statements and bookkeeping for business students.', 580.00, 25, 0, 'TXT-ACC101', 'Textbook', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('5cd872d1-1e5e-429c-972a-b423c26ff529', 'Casio Scientific Calculator fx-991ES', 'Casio scientific calculator with 417 functions. Allowed in board exams.', 890.00, 15, 0, 'SUP-CALC', 'Supply', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('60464b1b-7328-42e5-bb09-e2c00f70f8b3', 'HNU Spiral Notebook', 'Spiral-bound notebook with HNU cover design. 100 pages, college-ruled.', 95.00, 70, 0, 'SOV-SNOTE', 'Souvenir', 'Souvenir_Shop', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('7d89134a-855c-4a00-a5d2-45c0ad766b80', 'Clear Folder (Set of 5)', 'A4 size clear plastic folders, assorted colors. Keep documents organized.', 55.00, 100, 0, 'SUP-FLD5', 'Supply', 'Bookstore', 10, 'set', NULL, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('8997916a-b8db-4582-8080-591fd28353ed', 'General Chemistry', 'College-level chemistry textbook with laboratory exercises and practice problems.', 720.00, 20, 0, 'TXT-CHM101', 'Textbook', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 12:38:31'),
('8cc153df-4f20-4e8a-854d-761697231d16', 'Introduction to Computer Science', 'Comprehensive CS fundamentals textbook covering algorithms, data structures, and programming concepts.', 650.00, 30, 0, 'TXT-CS101', 'Textbook', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('9c73c029-f996-40a8-8290-a6f3ca3298a9', 'HNU Metal Keychain', 'Premium metal keychain with engraved HNU seal. Great graduation souvenir.', 85.00, 60, 0, 'SOV-KEY', 'Souvenir', 'Souvenir_Shop', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=400&h=400&fit=crop', 1, 1, 14, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('9f988b93-7957-40c2-8475-fc9a9adbd522', 'Philippine History & Culture', 'In-depth exploration of Philippine history from pre-colonial era to modern times.', 450.00, 35, 0, 'TXT-HIS101', 'Textbook', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('ba6b8d87-16a0-458d-9467-9be986fc1950', 'Yellow Pad Paper (Legal)', 'Ruled yellow legal pad, 80 leaves. Standard for exams and note-taking.', 35.00, 200, 0, 'SUP-YPAD', 'Supply', 'Bookstore', 10, 'pad', NULL, 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('c0a26618-ca05-4153-9864-d2a393992724', 'HNU Coffee Mug', 'Ceramic coffee mug with the Holy Name University crest. Dishwasher-safe, 12oz.', 180.00, 45, 0, 'SOV-MUG', 'Souvenir', 'Souvenir_Shop', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop', 1, 1, 7, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 08:07:22'),
('cf2fe470-2b7e-4775-b435-97814ee2164d', 'Engineering Notebook (80 leaves)', 'Grid-ruled engineering notebook, ideal for math, science, and technical drawings.', 65.00, 119, 0, 'SUP-ENGNB', 'Supply', 'Bookstore', 10, 'pc', NULL, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-11 09:37:53'),
('f1b74dff-e82f-41ec-9a0e-86dfa9734ac4', 'HNU PE T-Shirt', 'Official Holy Name University PE shirt. Moisture-wicking fabric, HNU logo print.', 350.00, 80, 0, 'UNI-PE-SHIRT', 'Uniform', 'Bookstore', 10, 'pc', 'XS,S,M,L,XL,2XL', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop', 1, 1, NULL, 'usr_MGR0001_001', '2026-04-10 08:07:22', '2026-04-10 12:38:31');

-- ============================================
-- SEED DATA - APPOINTMENT SLOTS
-- ============================================
INSERT INTO appointment_slots (slot_id, slot_date, slot_time, max_capacity, current_bookings, created_at) VALUES
('0181a3eb-992a-4d0a-85fe-2acfbb5f9b34', '2026-04-15', '15:00:00', 5, 0, '2026-04-10 08:07:22'),
('09a6bba0-d601-4bf1-b299-899b6f856a03', '2026-04-14', '10:00:00', 5, 0, '2026-04-10 08:07:22'),
('0a0760b2-a6f2-4b0c-888f-babdfda1a257', '2026-04-14', '09:00:00', 5, 0, '2026-04-10 08:07:22'),
('11ef9793-858c-4831-845d-d7a9858074b4', '2026-04-14', '13:00:00', 5, 0, '2026-04-10 08:07:22'),
('13ad0e64-b312-46d4-9910-e84e2c4d2ca8', '2026-04-16', '08:00:00', 5, 1, '2026-04-10 08:07:22'),
('1dbc9d5f-1be8-4356-ac2c-f0a85f05e7b6', '2026-04-16', '09:00:00', 5, 0, '2026-04-10 08:07:22'),
('36f082e7-0629-4c09-afe9-d22468825148', '2026-04-10', '13:00:00', 5, 0, '2026-04-10 08:07:22'),
('3be6f2e7-e25f-4fac-8263-43e8cf8d31aa', '2026-04-11', '13:00:00', 5, 0, '2026-04-10 08:07:22'),
('3c414c76-2437-4b75-81d4-1e2ec484f670', '2026-04-10', '10:00:00', 5, 0, '2026-04-10 08:07:22'),
('400bf94c-c698-40ba-8253-9424d71be40e', '2026-04-13', '09:00:00', 5, 0, '2026-04-10 08:07:22'),
('57dce051-4d20-4edf-86f6-f5083c5098eb', '2026-04-14', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('5a469773-31f4-4050-8b35-af8509956ead', '2026-04-13', '10:00:00', 5, 0, '2026-04-10 08:07:22'),
('5ab898d6-aaf4-457e-ad37-4c71eae4c255', '2026-04-15', '08:00:00', 5, 0, '2026-04-10 08:07:22'),
('5c7b8ec4-1f41-42cb-8b01-9c6f71ec1182', '2026-04-10', '08:00:00', 5, 0, '2026-04-10 08:07:22'),
('5e02e5c2-7d13-4611-ac50-57941c615e83', '2026-04-11', '15:00:00', 5, 0, '2026-04-10 08:07:22'),
('7327ee59-8a1e-4d18-a878-2f6dc2ae007b', '2026-04-12', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('7927ca3f-14b8-45d3-bd02-01440f38df97', '2026-04-14', '15:00:00', 5, 0, '2026-04-10 08:07:22'),
('7c5690f2-fa97-4d20-bde1-3c4ab5858299', '2026-04-15', '10:00:00', 5, 0, '2026-04-10 08:07:22'),
('7de54e66-b2f0-41b0-a67a-eef68d367959', '2026-04-10', '15:00:00', 5, 0, '2026-04-10 08:07:22'),
('8cac0932-a2ba-4aaf-bba7-8eb1b388d013', '2026-04-11', '09:00:00', 5, 0, '2026-04-10 08:07:22'),
('9098a265-2048-4643-80b3-0c23a64fe3f8', '2026-04-10', '09:00:00', 5, 1, '2026-04-10 08:07:22'),
('9ee0d87b-1746-485d-b4f8-d31cfd8fb1a9', '2026-04-15', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('ade40dd1-134e-4a78-99cd-c37f8c70cee1', '2026-04-11', '08:00:00', 5, 0, '2026-04-10 08:07:22'),
('b1bd01be-32d5-47a2-bbd8-030c43631c97', '2026-04-12', '15:00:00', 5, 0, '2026-04-10 08:07:22'),
('b59c322a-34af-11f1-a318-b42e99f14876', '2026-04-11', '08:30:00', 5, 1, '2026-04-10 07:34:29'),
('b5a3d296-34af-11f1-a318-b42e99f14876', '2026-04-11', '09:30:00', 5, 1, '2026-04-10 07:34:29'),
('b5a6270d-34af-11f1-a318-b42e99f14876', '2026-04-11', '10:00:00', 5, 0, '2026-04-10 07:34:29'),
('b5a88c4f-34af-11f1-a318-b42e99f14876', '2026-04-11', '10:30:00', 5, 1, '2026-04-10 07:34:29'),
('b5ab277c-34af-11f1-a318-b42e99f14876', '2026-04-11', '11:00:00', 5, 0, '2026-04-10 07:34:29'),
('b5add9c4-34af-11f1-a318-b42e99f14876', '2026-04-11', '11:30:00', 5, 1, '2026-04-10 07:34:29'),
('b5b20fa4-34af-11f1-a318-b42e99f14876', '2026-04-11', '13:00:00', 5, 1, '2026-04-10 07:34:29'),
('b5b47248-34af-11f1-a318-b42e99f14876', '2026-04-11', '13:30:00', 5, 0, '2026-04-10 07:34:29'),
('b5b6e31f-34af-11f1-a318-b42e99f14876', '2026-04-11', '14:00:00', 5, 0, '2026-04-10 07:34:29'),
('b5b93047-34af-11f1-a318-b42e99f14876', '2026-04-11', '14:30:00', 5, 1, '2026-04-10 07:34:29'),
('b5c0617a-34af-11f1-a318-b42e99f14876', '2026-04-11', '15:30:00', 5, 0, '2026-04-10 07:34:29'),
('b5c2af26-34af-11f1-a318-b42e99f14876', '2026-04-11', '16:00:00', 5, 0, '2026-04-10 07:34:29'),
('b5c5171b-34af-11f1-a318-b42e99f14876', '2026-04-11', '16:30:00', 5, 1, '2026-04-10 07:34:29'),
('b783831a-7c6f-4780-8a33-e18e061292c8', '2026-04-13', '08:00:00', 5, 0, '2026-04-10 08:07:22'),
('c0f11df1-b22b-4a4c-9c81-769c2f610463', '2026-04-13', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('c30d2dbf-2165-4303-acea-bcfef0b15c8f', '2026-04-13', '15:00:00', 5, 0, '2026-04-10 08:07:22'),
('c4f2c741-091e-4750-90a7-602e29608142', '2026-04-16', '15:00:00', 5, 2, '2026-04-10 08:07:22'),
('cc9d17cb-c376-448d-afb3-86c4209740bc', '2026-04-12', '08:00:00', 5, 0, '2026-04-10 08:07:22'),
('db4c205b-0377-48ac-a8e5-afa5541bae54', '2026-04-14', '08:00:00', 5, 0, '2026-04-10 08:07:22'),
('dc6acab4-6f38-40ca-ad37-8d3e04eca935', '2026-04-11', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('e0b2abc8-9669-4de7-b464-50c5a2e34fc7', '2026-04-13', '13:00:00', 5, 0, '2026-04-10 08:07:22'),
('e1871bc2-9364-4acf-9423-7e769be7f3b2', '2026-04-16', '13:00:00', 5, 0, '2026-04-10 08:07:22'),
('e42deece-184c-4061-bcdc-b31c8860b394', '2026-04-10', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('e8133062-b3fe-4e45-aab6-5c5516174c50', '2026-04-12', '09:00:00', 5, 0, '2026-04-10 08:07:22'),
('ea241a46-8a3e-4de3-b830-b7aaac925c86', '2026-04-15', '13:00:00', 5, 1, '2026-04-10 08:07:22'),
('ecdb3f42-dc11-4c17-9c1b-35a34e935ce6', '2026-04-12', '10:00:00', 5, 0, '2026-04-10 08:07:22'),
('ee6231a9-46d5-4062-ac63-acdf73319bf8', '2026-04-16', '14:00:00', 5, 0, '2026-04-10 08:07:22'),
('f045f49d-26a2-415e-a00f-2f5054de0027', '2026-04-12', '13:00:00', 5, 0, '2026-04-10 08:07:22'),
('f56f32b2-3048-46a5-a592-dff30e07022d', '2026-04-16', '10:00:00', 5, 0, '2026-04-10 08:07:22'),
('fa8d7c2b-3c0d-4d38-8e5d-26363e6d9c45', '2026-04-15', '09:00:00', 5, 0, '2026-04-10 08:07:22');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
SELECT 'Schema created successfully with user_id as PK and pre-order support!' as message;
