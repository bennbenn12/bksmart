-- Add clothing sizes support
-- Run this migration on your existing database

-- Available sizes per item (comma-separated, e.g. "XS,S,M,L,XL,2XL,3XL")
ALTER TABLE bookstore_items ADD COLUMN sizes VARCHAR(255) NULL AFTER unit;

-- Selected size per order line item
ALTER TABLE order_items ADD COLUMN size VARCHAR(20) NULL AFTER unit_price;
