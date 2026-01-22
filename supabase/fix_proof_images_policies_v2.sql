-- TEMPORARY FIX: Ultra-simplified RLS policies for debugging
-- This allows ANY authenticated user to upload proof images
-- After we confirm it works, we'll tighten security back up

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view proof images in their company" ON proof_images;
DROP POLICY IF EXISTS "Users can upload proof images for their company orders" ON proof_images;
DROP POLICY IF EXISTS "Users can delete proof images in their company" ON proof_images;

-- ⚠️ TEMPORARY: Allow all authenticated users (for testing)
CREATE POLICY "Allow authenticated SELECT"
    ON proof_images
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated INSERT"
    ON proof_images
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated DELETE"
    ON proof_images
    FOR DELETE
    TO authenticated
    USING (true);

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'proof_images';
