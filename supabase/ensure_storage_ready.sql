-- Ensure 'proofs' bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies to ensure clean stale
DROP POLICY IF EXISTS "Public View Proofs" ON storage.objects;
DROP POLICY IF EXISTS "Driver Upload Proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Proofs" ON storage.objects; -- potential duplicate name

-- Public View
CREATE POLICY "Public View Proofs" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'proofs' );

-- Authenticated Upload
CREATE POLICY "Driver Upload Proofs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'proofs' );
