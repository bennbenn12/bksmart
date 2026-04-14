-- Run each trigger SEPARATELY in TiDB Cloud SQL Editor
-- Copy and run ONE trigger at a time

-- ============ TRIGGER 1 ============
-- Copy from here to the END; line and run it
DROP TRIGGER IF EXISTS trg_orders_number_before_insert;

-- Then copy and run this one:
CREATE TRIGGER trg_orders_number_before_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    SET NEW.order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 6)));
  END IF;
END;

-- ============ TRIGGER 2 ============
DROP TRIGGER IF EXISTS trg_appointments_number_before_insert;

-- Then copy and run this one:
CREATE TRIGGER trg_appointments_number_before_insert
BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
  IF NEW.appt_number IS NULL OR NEW.appt_number = '' THEN
    SET NEW.appt_number = CONCAT('APT-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 6)));
  END IF;
END;

-- ============ TRIGGER 3 ============
DROP TRIGGER IF EXISTS trg_job_orders_number_before_insert;

-- Then copy and run this one:
CREATE TRIGGER trg_job_orders_number_before_insert
BEFORE INSERT ON job_orders
FOR EACH ROW
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    SET NEW.job_number = CONCAT('JO-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 6)));
  END IF;
END;
