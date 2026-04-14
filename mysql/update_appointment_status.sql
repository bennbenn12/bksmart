-- Add Pending and Cancelled to appointment status enum
ALTER TABLE appointments MODIFY COLUMN status ENUM('Pending','Confirmed','Completed','Rescheduled','Cancelled') NOT NULL DEFAULT 'Pending';
