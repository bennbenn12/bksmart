-- ================================================================
-- BOOKSMART SEED DATA
-- Sample data for testing the shop functionality
-- ================================================================

-- 1. Create a dummy user for 'bookstore_manager' if not exists (Optional, mostly handled via auth)

-- 2. Insert Sample Bookstore Items
-- Textbooks
INSERT INTO bookstore_items (name, description, price, stock_quantity, sku, category, shop, image_url, is_active)
VALUES 
('HNU College Algebra', 'Official textbook for College Algebra (Math 101). Required for all freshmen.', 450.00, 100, 'TXT-MATH-101', 'Textbook', 'Bookstore', 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop', true),
('Understanding the Self', 'GE 1 Textbook. A comprehensive guide to self-discovery and personal development.', 380.00, 150, 'TXT-GE-001', 'Textbook', 'Bookstore', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=300&auto=format&fit=crop', true),
('Rizal Life and Works', 'Required reading for the Rizal course.', 320.00, 80, 'TXT-RIZAL-001', 'Textbook', 'Bookstore', 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=300&auto=format&fit=crop', true),
('Nursing Pharmacology', 'Comprehensive guide for nursing students.', 1200.00, 30, 'TXT-NURS-201', 'Textbook', 'Bookstore', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=300&auto=format&fit=crop', true);

-- Uniforms
INSERT INTO bookstore_items (name, description, price, stock_quantity, sku, category, shop, image_url, is_active)
VALUES
('HNU P.E. T-Shirt (Small)', 'Official P.E. shirt for all levels. Size: Small', 350.00, 200, 'UNI-PE-S', 'Uniform', 'Bookstore', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop', true),
('HNU P.E. T-Shirt (Medium)', 'Official P.E. shirt for all levels. Size: Medium', 350.00, 200, 'UNI-PE-M', 'Uniform', 'Bookstore', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop', true),
('HNU P.E. T-Shirt (Large)', 'Official P.E. shirt for all levels. Size: Large', 350.00, 150, 'UNI-PE-L', 'Uniform', 'Bookstore', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop', true),
('College Uniform Cloth (Female)', 'Textile for female college uniform blouse. Per yard.', 180.00, 500, 'UNI-CLOTH-F', 'Uniform', 'Bookstore', 'https://images.unsplash.com/photo-1598463944645-0f2b3225883d?q=80&w=300&auto=format&fit=crop', true);

-- School Supplies
INSERT INTO bookstore_items (name, description, price, stock_quantity, sku, category, shop, image_url, is_active)
VALUES
('HNU Blue Book', 'Official exam booklet.', 15.00, 1000, 'SUP-BLUE-001', 'Supply', 'Bookstore', 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=300&auto=format&fit=crop', true),
('Yellow Pad (Whole)', 'High quality yellow pad paper.', 45.00, 300, 'SUP-PAD-001', 'Supply', 'Bookstore', 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=300&auto=format&fit=crop', true),
('HNU ID Lace / Lanyard', 'Official HNU ID lace.', 75.00, 250, 'SUP-LACE-001', 'Supply', 'Souvenir_Shop', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=300&auto=format&fit=crop', true);

-- Souvenirs
INSERT INTO bookstore_items (name, description, price, stock_quantity, sku, category, shop, image_url, is_active)
VALUES
('HNU Hoodie Jacket', 'Premium cotton hoodie with HNU logo.', 850.00, 50, 'SOU-HOOD-001', 'Souvenir', 'Souvenir_Shop', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=300&auto=format&fit=crop', true),
('HNU Tote Bag', 'Canvas tote bag with HNU print.', 150.00, 100, 'SOU-BAG-001', 'Souvenir', 'Souvenir_Shop', 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=300&auto=format&fit=crop', true),
('HNU Mug', 'Ceramic mug with HNU seal.', 120.00, 80, 'SOU-MUG-001', 'Souvenir', 'Souvenir_Shop', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=300&auto=format&fit=crop', true);
