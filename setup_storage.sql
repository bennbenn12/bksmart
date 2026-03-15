-- ================================================================
-- STORAGE BUCKET SETUP
-- Run this in your Supabase SQL Editor
-- ================================================================

-- 1. Create the 'items' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('items', 'items', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read Access
-- Allow anyone to view images in the 'items' bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'items' );

-- 4. Policy: Authenticated Upload Access
-- Allow authenticated users (Staff/Manager) to upload images
-- Adjust the role check as needed based on your auth implementation
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'items' AND
  auth.role() = 'authenticated'
);

-- 5. Policy: Owner Update/Delete Access
-- Allow users to update/delete their own uploads (or make it staff-only)
CREATE POLICY "Owner Update Access"
ON storage.objects FOR UPDATE
USING ( auth.uid() = owner );

CREATE POLICY "Owner Delete Access"
ON storage.objects FOR DELETE
USING ( auth.uid() = owner );
