-- ================================================================
-- BookSmart Test Data Seed
-- Run this in your MySQL client after creating the schema
-- All user passwords: password123
-- bcrypt hash: $2a$10$8KzQJH6mE5qJxGOZCnMX5e0b3kx1AAVdL4jSNEGBHOHqLBRyVGWKS
-- ================================================================

USE booksmart;

-- ────────────────────── USERS ──────────────────────
-- Password for all: password123
SET @hash = '$2a$10$8KzQJH6mE5qJxGOZCnMX5e0b3kx1AAVdL4jSNEGBHOHqLBRyVGWKS';

INSERT IGNORE INTO users (id_number, auth_id, role_type, username, password_hash, first_name, last_name, email, contact_number, id_type, department, status) VALUES
('MGR-0001',  UUID(), 'bookstore_manager', 'manager1',   @hash, 'Maria',   'Santos',     'maria.santos@hnu.edu.ph',              '09171234567', 'School ID', 'Bookstore', 'Active'),
('STF-0001',  UUID(), 'bookstore_staff',   'staff1',     @hash, 'Juan',    'Dela Cruz',  'juan.delacruz@hnu.edu.ph',             '09181234567', 'School ID', 'Bookstore', 'Active'),
('WS-0001',   UUID(), 'working_student',   'workstud1',  @hash, 'Ana',     'Reyes',      'ana.reyes@hnu.edu.ph',                 '09191234567', 'School ID', 'Bookstore', 'Active'),
('2024-0001', UUID(), 'student',           'student1',   @hash, 'Carlos',  'Garcia',     'carlos.garcia@student.hnu.edu.ph',     '09201234567', 'Student ID','CITE',      'Active'),
('2024-0002', UUID(), 'student',           'student2',   @hash, 'Jasmine', 'Flores',     'jasmine.flores@student.hnu.edu.ph',    '09211234567', 'Student ID','CBA',       'Active'),
('2024-0003', UUID(), 'student',           'student3',   @hash, 'Mark',    'Torres',     'mark.torres@student.hnu.edu.ph',       '09221234567', 'Student ID','COE',       'Active'),
('2024-0004', UUID(), 'student',           'student4',   @hash, 'Bianca',  'Lim',        'bianca.lim@student.hnu.edu.ph',        '09231234567', 'Student ID','CAS',       'Active'),
('2024-0005', UUID(), 'student',           'student5',   @hash, 'Rafael',  'Mendoza',    'rafael.mendoza@student.hnu.edu.ph',    '09241234567', 'Student ID','CITE',      'Active'),
('TCH-0001',  UUID(), 'teacher',           'teacher1',   @hash, 'Elena',   'Villanueva', 'elena.villanueva@hnu.edu.ph',          '09251234567', 'School ID', 'CITE',      'Active'),
('PAR-0001',  UUID(), 'parent',            'parent1',    @hash, 'Roberto', 'Garcia',     'roberto.garcia@gmail.com',             '09261234567', 'Valid ID',  NULL,        'Active');

-- ────────────────────── CATEGORIES ──────────────────────
INSERT IGNORE INTO categories (name, slug, is_active) VALUES
('Textbook',  'textbook',  1),
('Uniform',   'uniform',   1),
('Supply',    'supply',    1),
('Souvenir',  'souvenir',  1),
('Riso',      'riso',      1);

-- ────────────────────── BOOKSTORE ITEMS ──────────────────────
-- Textbooks
INSERT INTO bookstore_items (item_id, name, description, price, stock_quantity, sku, category, shop, unit, sizes, image_url, is_active, created_by) VALUES
(UUID(), 'Introduction to Computer Science',
 'Comprehensive CS fundamentals textbook covering algorithms, data structures, and programming concepts.',
 650.00, 30, 'TXT-CS101', 'Textbook', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'Fundamentals of Accounting',
 'Essential accounting principles, financial statements, and bookkeeping for business students.',
 580.00, 25, 'TXT-ACC101', 'Textbook', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'General Chemistry',
 'College-level chemistry textbook with laboratory exercises and practice problems.',
 720.00, 20, 'TXT-CHM101', 'Textbook', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'Philippine History & Culture',
 'In-depth exploration of Philippine history from pre-colonial era to modern times.',
 450.00, 35, 'TXT-HIS101', 'Textbook', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'English Communication Arts',
 'Academic writing, speech, and communication skills for college students.',
 380.00, 40, 'TXT-ENG101', 'Textbook', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=400&fit=crop', 1, 'MGR-0001');

-- Uniforms (with sizes)
INSERT INTO bookstore_items (item_id, name, description, price, stock_quantity, sku, category, shop, unit, sizes, image_url, is_active, created_by) VALUES
(UUID(), 'HNU PE T-Shirt',
 'Official Holy Name University PE shirt. Moisture-wicking fabric, HNU logo print.',
 350.00, 80, 'UNI-PE-SHIRT', 'Uniform', 'Bookstore', 'pc', 'XS,S,M,L,XL,2XL',
 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'HNU Polo Uniform',
 'Official HNU polo uniform with embroidered school seal. White with maroon accents.',
 450.00, 60, 'UNI-POLO', 'Uniform', 'Bookstore', 'pc', 'XS,S,M,L,XL,2XL,3XL',
 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'HNU PE Jogging Pants',
 'Official HNU jogging pants for physical education classes. Comfortable fit with side pockets.',
 400.00, 50, 'UNI-PE-PANTS', 'Uniform', 'Bookstore', 'pc', 'S,M,L,XL,2XL',
 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'College Department Shirt',
 'Department-branded shirt available for all colleges. Screen-printed design.',
 280.00, 100, 'UNI-DEPT', 'Uniform', 'Bookstore', 'pc', 'S,M,L,XL,2XL',
 'https://images.unsplash.com/photo-1503341504253-dff4f94032fc?w=400&h=400&fit=crop', 1, 'MGR-0001');

-- Supplies
INSERT INTO bookstore_items (item_id, name, description, price, stock_quantity, sku, category, shop, unit, sizes, image_url, is_active, created_by) VALUES
(UUID(), 'Yellow Pad Paper (Legal)',
 'Ruled yellow legal pad, 80 leaves. Standard for exams and note-taking.',
 35.00, 200, 'SUP-YPAD', 'Supply', 'Bookstore', 'pad', NULL,
 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'Ballpoint Pen (Pack of 3)',
 'Blue ink ballpoint pens, 0.7mm tip. Smooth writing, ideal for daily use.',
 45.00, 150, 'SUP-PEN3', 'Supply', 'Bookstore', 'pack', NULL,
 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'Engineering Notebook (80 leaves)',
 'Grid-ruled engineering notebook, ideal for math, science, and technical drawings.',
 65.00, 120, 'SUP-ENGNB', 'Supply', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'Casio Scientific Calculator fx-991ES',
 'Casio scientific calculator with 417 functions. Allowed in board exams.',
 890.00, 15, 'SUP-CALC', 'Supply', 'Bookstore', 'pc', NULL,
 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'Clear Folder (Set of 5)',
 'A4 size clear plastic folders, assorted colors. Keep documents organized.',
 55.00, 100, 'SUP-FLD5', 'Supply', 'Bookstore', 'set', NULL,
 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=400&fit=crop', 1, 'MGR-0001');

-- Souvenirs
INSERT INTO bookstore_items (item_id, name, description, price, stock_quantity, sku, category, shop, unit, sizes, image_url, is_active, created_by) VALUES
(UUID(), 'HNU Coffee Mug',
 'Ceramic coffee mug with the Holy Name University crest. Dishwasher-safe, 12oz.',
 180.00, 45, 'SOV-MUG', 'Souvenir', 'Souvenir_Shop', 'pc', NULL,
 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'HNU Lanyard with ID Holder',
 'Maroon & gold HNU lanyard with detachable ID holder. Breakaway clasp for safety.',
 120.00, 80, 'SOV-LNYD', 'Souvenir', 'Souvenir_Shop', 'pc', NULL,
 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'HNU Tote Bag',
 'Canvas tote bag with HNU logo. Eco-friendly, perfect for books and everyday carry.',
 250.00, 35, 'SOV-TOTE', 'Souvenir', 'Souvenir_Shop', 'pc', NULL,
 'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'HNU Metal Keychain',
 'Premium metal keychain with engraved HNU seal. Great graduation souvenir.',
 85.00, 60, 'SOV-KEY', 'Souvenir', 'Souvenir_Shop', 'pc', NULL,
 'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=400&h=400&fit=crop', 1, 'MGR-0001'),

(UUID(), 'HNU Spiral Notebook',
 'Spiral-bound notebook with HNU cover design. 100 pages, college-ruled.',
 95.00, 70, 'SOV-SNOTE', 'Souvenir', 'Souvenir_Shop', 'pc', NULL,
 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=400&h=400&fit=crop', 1, 'MGR-0001');

-- ────────────────────── ORDERS ──────────────────────
-- We need fixed UUIDs so we can reference them in order_items and payments
SET @ord1 = UUID();
SET @ord2 = UUID();
SET @ord3 = UUID();
SET @ord4 = UUID();
SET @ord5 = UUID();

INSERT INTO orders (order_id, order_number, user_id, status, total_amount, released_at, processed_by) VALUES
(@ord1, 'ORD-20260410-A1B2C3', '2024-0001', 'Pending',   80.00,   NULL, NULL),
(@ord2, 'ORD-20260410-D4E5F6', '2024-0002', 'Ready',     1050.00, NULL, NULL),
(@ord3, 'ORD-20260409-G7H8I9', '2024-0003', 'Released',  650.00,  NOW(), 'STF-0001'),
(@ord4, 'ORD-20260410-J0K1L2', '2024-0004', 'Pending',   890.00,  NULL, NULL),
(@ord5, 'ORD-20260408-M3N4O5', '2024-0005', 'Cancelled', 180.00,  NULL, NULL);

-- ────────────────────── ORDER ITEMS ──────────────────────
-- Look up item_ids by SKU
SET @pen   = (SELECT item_id FROM bookstore_items WHERE sku = 'SUP-PEN3'     LIMIT 1);
SET @ypad  = (SELECT item_id FROM bookstore_items WHERE sku = 'SUP-YPAD'     LIMIT 1);
SET @txtcs = (SELECT item_id FROM bookstore_items WHERE sku = 'TXT-CS101'    LIMIT 1);
SET @pants = (SELECT item_id FROM bookstore_items WHERE sku = 'UNI-PE-PANTS' LIMIT 1);
SET @calc  = (SELECT item_id FROM bookstore_items WHERE sku = 'SUP-CALC'     LIMIT 1);
SET @mug   = (SELECT item_id FROM bookstore_items WHERE sku = 'SOV-MUG'      LIMIT 1);

-- Order 1: pen + yellow pad = 45 + 35 = 80
INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, size) VALUES
(UUID(), @ord1, @pen,   1, 45.00,  NULL),
(UUID(), @ord1, @ypad,  1, 35.00,  NULL);

-- Order 2: CS textbook + PE pants (size L) = 650 + 400 = 1050
INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, size) VALUES
(UUID(), @ord2, @txtcs, 1, 650.00, NULL),
(UUID(), @ord2, @pants, 1, 400.00, 'L');

-- Order 3: CS textbook = 650
INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, size) VALUES
(UUID(), @ord3, @txtcs, 1, 650.00, NULL);

-- Order 4: calculator = 890
INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, size) VALUES
(UUID(), @ord4, @calc,  1, 890.00, NULL);

-- Order 5: mug = 180
INSERT INTO order_items (order_item_id, order_id, item_id, quantity, unit_price, size) VALUES
(UUID(), @ord5, @mug,   1, 180.00, NULL);

-- ────────────────────── PAYMENTS ──────────────────────
-- Order 2 — paid via Teller
INSERT INTO payments (payment_id, order_id, amount, payment_source, or_number, verified_by, verified_at) VALUES
(UUID(), @ord2, 1050.00, 'Teller', 'OR-2026-4521', 'STF-0001', NOW());

-- Order 3 — paid via Teller
INSERT INTO payments (payment_id, order_id, amount, payment_source, or_number, verified_by, verified_at) VALUES
(UUID(), @ord3, 650.00, 'Teller', 'OR-2026-3887', 'STF-0001', NOW());

-- ────────────────────── NOTIFICATIONS ──────────────────────
INSERT INTO notifications (notification_id, user_id, title, message, type, status, reference_type) VALUES
(UUID(), '2024-0001', 'Order Placed',     'Your order #ORD-20260410-A1B2C3 has been placed. Total: ₱80.00',                    'info',    'Unread', 'order'),
(UUID(), '2024-0002', 'Order Placed',     'Your order #ORD-20260410-D4E5F6 has been placed. Total: ₱1,050.00',                 'info',    'Unread', 'order'),
(UUID(), '2024-0002', 'Payment Received', 'Payment of ₱1,050.00 verified for order #ORD-20260410-D4E5F6. Ready for pickup!',   'success', 'Unread', 'order'),
(UUID(), '2024-0002', 'Order Ready',      'Your order #ORD-20260410-D4E5F6 is ready for pickup!',                               'success', 'Unread', 'order'),
(UUID(), '2024-0003', 'Order Released',   'Your order #ORD-20260409-G7H8I9 has been released. Thank you!',                      'success', 'Unread', 'order'),
(UUID(), '2024-0004', 'Order Placed',     'Your order #ORD-20260410-J0K1L2 has been placed. Total: ₱890.00',                   'info',    'Unread', 'order'),
(UUID(), '2024-0005', 'Order Cancelled',  'Your order #ORD-20260408-M3N4O5 has been cancelled.',                                'alert',   'Unread', 'order');

-- ────────────────────── APPOINTMENT SLOTS (next 7 days) ──────────────────────
INSERT INTO appointment_slots (slot_id, slot_date, slot_time, max_capacity, current_bookings) VALUES
(UUID(), CURDATE(),              '08:00:00', 5, 0), (UUID(), CURDATE(),              '09:00:00', 5, 0),
(UUID(), CURDATE(),              '10:00:00', 5, 0), (UUID(), CURDATE(),              '13:00:00', 5, 0),
(UUID(), CURDATE(),              '14:00:00', 5, 0), (UUID(), CURDATE(),              '15:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 1 DAY, '08:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 1 DAY, '09:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 1 DAY, '10:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 1 DAY, '13:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 1 DAY, '14:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 1 DAY, '15:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 2 DAY, '08:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 2 DAY, '09:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 2 DAY, '10:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 2 DAY, '13:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 2 DAY, '14:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 2 DAY, '15:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 3 DAY, '08:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 3 DAY, '09:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 3 DAY, '10:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 3 DAY, '13:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 3 DAY, '14:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 3 DAY, '15:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 4 DAY, '08:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 4 DAY, '09:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 4 DAY, '10:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 4 DAY, '13:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 4 DAY, '14:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 4 DAY, '15:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 5 DAY, '08:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 5 DAY, '09:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 5 DAY, '10:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 5 DAY, '13:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 5 DAY, '14:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 5 DAY, '15:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 6 DAY, '08:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 6 DAY, '09:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 6 DAY, '10:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 6 DAY, '13:00:00', 5, 0),
(UUID(), CURDATE() + INTERVAL 6 DAY, '14:00:00', 5, 0), (UUID(), CURDATE() + INTERVAL 6 DAY, '15:00:00', 5, 0);

-- ────────────────────── FEEDBACK ──────────────────────
INSERT INTO feedback (feedback_id, user_id, order_id, item_id, rating, comment) VALUES
(UUID(), '2024-0003', @ord3, @txtcs, 5, 'Great textbook! Exactly what I needed for my CS101 class.'),
(UUID(), '2024-0003', @ord3, NULL,   4, 'Fast processing, friendly staff. Will order again.');

-- ================================================================
-- Done! Login credentials:
--   Manager:  maria.santos@hnu.edu.ph        / password123
--   Staff:    juan.delacruz@hnu.edu.ph       / password123
--   Student:  carlos.garcia@student.hnu.edu.ph / password123
--   (all other users also use password123)
-- ================================================================
