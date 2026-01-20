-- ============================================
-- SETUP STORAGE FOR PROOF OF DELIVERY
-- ============================================

-- 1. Create the 'proofs' bucket
-- We use ON CONFLICT to avoid errors if it already exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Security Policies

-- A. Allow ANYONE to view photos (Public Access)
-- This ensures Managers can see proofs without complex token signing
DROP POLICY IF EXISTS "Public View Proofs" ON storage.objects;
CREATE POLICY "Public View Proofs" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'proofs' );

-- B. Allow Drivers (Authenticated Users) to Upload Photos
DROP POLICY IF EXISTS "Driver Upload Proofs" ON storage.objects;
CREATE POLICY "Driver Upload Proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'proofs' );

-- C. (Optional) Allow Drivers to Update/Overwrite their own photos
DROP POLICY IF EXISTS "Driver Update Proofs" ON storage.objects;
CREATE POLICY "Driver Update Proofs" 
ON storage.objects FOR UPDATE
TO authenticated 
USING ( bucket_id = 'proofs' AND owner = auth.uid() );

-- D. (Optional) Allow Managers to Delete (cleaning up)
-- Assuming managers have a specific role claim or just simple auth for now
DROP POLICY IF EXISTS "Manager Delete Proofs" ON storage.objects;
CREATE POLICY "Manager Delete Proofs" 
ON storage.objects FOR DELETE
TO authenticated 
USING ( bucket_id = 'proofs' );

-- 3. Verify Helper
SELECT * FROM storage.buckets WHERE id = 'proofs';
