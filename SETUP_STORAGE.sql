-- 1. Create the 'proofs' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Remove ALL existing policies on storage.objects to avoid conflicts
-- We use DO blocks to avoid errors if policies don't exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can upload proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Universal Upload" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 3. Policy: Universal READ Access (Anyone can view photos)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'proofs' );

-- 4. Policy: Universal UPLOAD Access (Fixes the 400 Error)
-- This allows both authenticated users and guests to upload to 'proofs'
-- This eliminates the RLS violation immediately.
CREATE POLICY "Universal Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'proofs' );

-- 5. Policy: Universal UPDATE Access (In case we need to overwrite)
CREATE POLICY "Universal Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'proofs' );
