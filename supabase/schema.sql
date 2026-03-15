-- ================================================================
-- BOOKSMART v2 — SUPABASE SCHEMA
-- Aligned with Chapter III: Methodology (Holy Name University)
-- Tables: Users, Bookstore_Items, Orders, Payments, Job_Orders,
--         Appointments, Queues, Notifications, Feedback, Order_Items
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ENUMS (from File Structure tables)
-- ================================================================
CREATE TYPE user_status      AS ENUM ('Active', 'Inactive');
CREATE TYPE order_status     AS ENUM ('Pending', 'Ready', 'Released', 'Cancelled');
CREATE TYPE payment_source   AS ENUM ('Bookstore', 'Teller');
CREATE TYPE appt_status      AS ENUM ('Confirmed', 'Completed', 'Rescheduled');
CREATE TYPE queue_status     AS ENUM ('Waiting', 'Processing', 'Completed');
CREATE TYPE notif_status     AS ENUM ('Read', 'Unread');

-- Role enum (from Program Hierarchy: 5 levels)
CREATE TYPE user_role AS ENUM (
  'bookstore_manager',  -- Administrator / Top Level
  'bookstore_staff',    -- Bookstore Staff
  'working_student',    -- Working Student (limited staff)
  'teacher',            -- Teacher (job orders)
  'student',            -- Student
  'parent'              -- Parent
);

-- ================================================================
-- TABLE 1: Users
-- ================================================================
CREATE TABLE users (
  user_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id        user_role NOT NULL DEFAULT 'student',
  username       VARCHAR(100) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,           -- handled by Supabase Auth
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  contact_number VARCHAR(20),
  status         user_status NOT NULL DEFAULT 'Active',
  -- Extra fields for system use
  student_id     VARCHAR(50) UNIQUE,
  employee_id    VARCHAR(50) UNIQUE,
  department     VARCHAR(150),
  avatar_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  -- Link to Supabase Auth
  auth_id        UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ================================================================
-- TABLE 2: Bookstore_Items
-- ================================================================
CREATE TYPE item_category AS ENUM ('Textbook', 'Uniform', 'Supply', 'Souvenir', 'Riso');
CREATE TYPE item_shop     AS ENUM ('Bookstore', 'Souvenir_Shop', 'Riso');

CREATE TABLE bookstore_items (
  item_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  price             DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity    INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  -- Additional fields
  sku               VARCHAR(100) UNIQUE NOT NULL,
  category          item_category NOT NULL DEFAULT 'Supply',
  shop              item_shop NOT NULL DEFAULT 'Bookstore',
  reorder_level     INT NOT NULL DEFAULT 10,
  unit              VARCHAR(20) DEFAULT 'pc',
  image_url         TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_by        UUID REFERENCES users(user_id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLE 3: Orders
-- ================================================================
CREATE TABLE orders (
  order_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  transaction_id VARCHAR(100) UNIQUE,             -- OR/tracking ID for physical verification
  total_amount   DECIMAL(10,2) NOT NULL DEFAULT 0,
  status         order_status NOT NULL DEFAULT 'Pending',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  -- Extra
  order_number   VARCHAR(30) UNIQUE NOT NULL,     -- auto-generated e.g. ORD-2024-00001
  notes          TEXT,
  processed_by   UUID REFERENCES users(user_id),
  released_at    TIMESTAMPTZ
);

-- Auto-generate order_number
CREATE SEQUENCE order_seq START 1;
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('order_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ================================================================
-- TABLE 10: Order_Items (bridge table — listed here for FK ordering)
-- ================================================================
CREATE TABLE order_items (
  order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES bookstore_items(item_id),
  quantity      INT NOT NULL CHECK (quantity > 0),
  unit_price    DECIMAL(10,2) NOT NULL,
  subtotal      DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLE 4: Payments
-- ================================================================
CREATE TABLE payments (
  payment_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
  amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_source payment_source NOT NULL,         -- 'Bookstore' (<₱100) or 'Teller' (≥₱100)
  or_number      VARCHAR(50),                     -- Official Receipt from teller
  date_paid      TIMESTAMPTZ DEFAULT now(),
  -- Extra
  verified_by    UUID REFERENCES users(user_id),
  verified_at    TIMESTAMPTZ,
  or_image_url   TEXT,
  notes          TEXT
);

-- ================================================================
-- TABLE 5: Job_Orders
-- ================================================================
CREATE TYPE jo_status AS ENUM ('Draft', 'Pending_Audit', 'Approved', 'Processing', 'Completed', 'Rejected');

CREATE TABLE job_orders (
  job_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID REFERENCES orders(order_id),               -- links to inventory order
  requester_id       UUID NOT NULL REFERENCES users(user_id),
  department_account VARCHAR(100) NOT NULL,
  description        TEXT NOT NULL,
  status             jo_status NOT NULL DEFAULT 'Draft',
  total_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Audit trail
  job_number         VARCHAR(30) UNIQUE NOT NULL,
  audited_by         UUID REFERENCES users(user_id),
  audited_at         TIMESTAMPTZ,
  audit_notes        TEXT,
  approved_by        UUID REFERENCES users(user_id),
  approved_at        TIMESTAMPTZ,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE jo_seq START 1;
CREATE OR REPLACE FUNCTION generate_jo_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.job_number := 'JO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('jo_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_jo_number BEFORE INSERT ON job_orders FOR EACH ROW EXECUTE FUNCTION generate_jo_number();

-- ================================================================
-- TABLE 6: Appointments
-- ================================================================
CREATE TABLE appointments (
  appointment_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  order_id         UUID REFERENCES orders(order_id),
  schedule_date    DATE NOT NULL,
  time_slot        TIME NOT NULL,
  status           appt_status NOT NULL DEFAULT 'Confirmed',
  -- Extra
  appt_number      VARCHAR(30) UNIQUE NOT NULL,
  or_number        VARCHAR(50),
  purpose          TEXT DEFAULT 'OR Presentation & Item Pickup',
  notes            TEXT,
  confirmed_by     UUID REFERENCES users(user_id),
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE appt_seq START 1;
CREATE OR REPLACE FUNCTION generate_appt_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.appt_number := 'APT-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('appt_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_appt_number BEFORE INSERT ON appointments FOR EACH ROW EXECUTE FUNCTION generate_appt_number();

-- Appointment slots (capacity management)
CREATE TABLE appointment_slots (
  slot_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_date        DATE NOT NULL,
  slot_time        TIME NOT NULL,
  max_capacity     INT NOT NULL DEFAULT 5,
  current_bookings INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slot_date, slot_time)
);

-- ================================================================
-- TABLE 7: Queues
-- ================================================================
CREATE TABLE queues (
  queue_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(user_id),
  order_id     UUID REFERENCES orders(order_id),
  queue_number INT NOT NULL,
  status       queue_status NOT NULL DEFAULT 'Waiting',
  queue_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  called_at    TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Auto-assign queue number per day
CREATE OR REPLACE FUNCTION assign_queue_number()
RETURNS TRIGGER AS $$
DECLARE v_num INT;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
    INTO v_num
    FROM queues
   WHERE queue_date = CURRENT_DATE;
  NEW.queue_number := v_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_queue_number BEFORE INSERT ON queues FOR EACH ROW EXECUTE FUNCTION assign_queue_number();

-- ================================================================
-- TABLE 8: Notifications
-- ================================================================
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  status          notif_status NOT NULL DEFAULT 'Unread',
  -- Extra
  title           VARCHAR(200),
  type            VARCHAR(30) DEFAULT 'info',     -- info, success, warning, alert
  reference_type  VARCHAR(30),                    -- order, appointment, queue, job_order
  reference_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- TABLE 9: Feedback
-- ================================================================
CREATE TABLE feedback (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(user_id),
  order_id    UUID REFERENCES orders(order_id),
  content     TEXT NOT NULL,
  rating      INT CHECK (rating >= 1 AND rating <= 5),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- INVENTORY LOGS (audit trail for stock changes)
-- ================================================================
CREATE TYPE log_change_type AS ENUM ('Restock', 'Release', 'Reservation', 'Adjustment', 'Cancellation');

CREATE TABLE inventory_logs (
  log_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES bookstore_items(item_id),
  changed_by      UUID REFERENCES users(user_id),
  change_type     log_change_type NOT NULL,
  quantity_before INT NOT NULL,
  quantity_after  INT NOT NULL,
  delta           INT NOT NULL,
  reference_id    UUID,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- UPDATED_AT TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_upd       BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_items_upd       BEFORE UPDATE ON bookstore_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_upd      BEFORE UPDATE ON orders          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jo_upd          BEFORE UPDATE ON job_orders      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appt_upd        BEFORE UPDATE ON appointments    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_queue_upd       BEFORE UPDATE ON queues          FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update order total when order_items change
CREATE OR REPLACE FUNCTION refresh_order_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
     SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id))
   WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_order_total AFTER INSERT OR UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION refresh_order_total();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookstore_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs   ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from users table
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role_id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT user_id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users
CREATE POLICY "users_self"         ON users FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "users_staff_read"   ON users FOR SELECT USING (current_user_role() IN ('bookstore_manager','bookstore_staff'));
CREATE POLICY "users_manager_all"  ON users FOR ALL    USING (current_user_role() = 'bookstore_manager');

-- Bookstore Items: everyone reads, staff writes
CREATE POLICY "items_read"         ON bookstore_items FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);
CREATE POLICY "items_staff_all"    ON bookstore_items FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff','working_student'));

-- Orders: own or staff
CREATE POLICY "orders_own"         ON orders FOR SELECT USING (user_id = current_user_id());
CREATE POLICY "orders_staff"       ON orders FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff','working_student'));
CREATE POLICY "orders_insert"      ON orders FOR INSERT WITH CHECK (user_id = current_user_id());

-- Order items follow parent order
CREATE POLICY "oi_own"             ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.order_id = order_items.order_id AND o.user_id = current_user_id()));
CREATE POLICY "oi_staff"           ON order_items FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff','working_student'));
CREATE POLICY "oi_insert"          ON order_items FOR INSERT WITH CHECK (true);

-- Payments
CREATE POLICY "pay_own"            ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.order_id = payments.order_id AND o.user_id = current_user_id()));
CREATE POLICY "pay_staff"          ON payments FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff'));

-- Job Orders
CREATE POLICY "jo_own"             ON job_orders FOR SELECT USING (requester_id = current_user_id());
CREATE POLICY "jo_staff"           ON job_orders FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff'));
CREATE POLICY "jo_teacher_insert"  ON job_orders FOR INSERT WITH CHECK (current_user_role() = 'teacher');

-- Appointments
CREATE POLICY "appt_own"           ON appointments FOR SELECT USING (user_id = current_user_id());
CREATE POLICY "appt_staff"         ON appointments FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff'));
CREATE POLICY "appt_insert"        ON appointments FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY "slots_read"         ON appointment_slots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "slots_staff"        ON appointment_slots FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff'));

-- Queues
CREATE POLICY "queue_own"          ON queues FOR SELECT USING (user_id = current_user_id());
CREATE POLICY "queue_staff"        ON queues FOR ALL    USING (current_user_role() IN ('bookstore_manager','bookstore_staff','working_student'));
CREATE POLICY "queue_insert"       ON queues FOR INSERT WITH CHECK (user_id = current_user_id());

-- Notifications
CREATE POLICY "notif_own"          ON notifications FOR ALL USING (user_id = current_user_id());

-- Feedback
CREATE POLICY "fb_own"             ON feedback FOR SELECT USING (user_id = current_user_id());
CREATE POLICY "fb_staff_read"      ON feedback FOR SELECT USING (current_user_role() IN ('bookstore_manager'));
CREATE POLICY "fb_insert"          ON feedback FOR INSERT WITH CHECK (user_id = current_user_id());

-- Inventory logs
CREATE POLICY "invlog_staff"       ON inventory_logs FOR ALL USING (current_user_role() IN ('bookstore_manager','bookstore_staff','working_student'));

-- ================================================================
-- SEED: Appointment Slots (next 3 days)
-- ================================================================
INSERT INTO appointment_slots (slot_date, slot_time, max_capacity) VALUES
  (CURRENT_DATE + 1, '08:00', 5), (CURRENT_DATE + 1, '09:00', 5),
  (CURRENT_DATE + 1, '10:00', 5), (CURRENT_DATE + 1, '11:00', 5),
  (CURRENT_DATE + 1, '13:00', 5), (CURRENT_DATE + 1, '14:00', 5),
  (CURRENT_DATE + 1, '15:00', 5),
  (CURRENT_DATE + 2, '08:00', 5), (CURRENT_DATE + 2, '09:00', 5),
  (CURRENT_DATE + 2, '10:00', 5), (CURRENT_DATE + 2, '11:00', 5),
  (CURRENT_DATE + 2, '13:00', 5), (CURRENT_DATE + 2, '14:00', 5),
  (CURRENT_DATE + 3, '08:00', 5), (CURRENT_DATE + 3, '09:00', 5),
  (CURRENT_DATE + 3, '10:00', 5), (CURRENT_DATE + 3, '13:00', 5);
