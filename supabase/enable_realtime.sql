-- ================================================================
-- BOOKSMART — ENABLE REALTIME
-- Run this in Supabase SQL Editor ONCE to enable live updates
-- on all tables that need real-time sync.
-- ================================================================

-- Step 1: Add all tables to the Realtime publication
-- This makes Supabase broadcast changes to connected clients.

ALTER PUBLICATION supabase_realtime ADD TABLE queues;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE appointment_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE bookstore_items;
ALTER PUBLICATION supabase_realtime ADD TABLE job_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- ================================================================
-- OPTIONAL: Verify which tables are in the publication
-- ================================================================
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ================================================================
-- NOTE: After running this, go to your Supabase Dashboard:
--   Database → Replication → supabase_realtime
--   Confirm all tables above are listed under "Source"
-- ================================================================
