-- Fix RLS policies for proof_images table
-- This resolves the 403 Forbidden error when uploading proof images

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view proof images in their company" ON proof_images;
DROP POLICY IF EXISTS "Users can upload proof images for their company orders" ON proof_images;
DROP POLICY IF EXISTS "Users can delete proof images in their company" ON proof_images;

-- Policy 1: Allow SELECT for users in the same company
CREATE POLICY "Users can view proof images in their company"
    ON proof_images
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = proof_images.company_id
        )
    );

-- Policy 2: Allow INSERT for authenticated users (simplified for drivers)
-- This allows drivers to upload proof images for their deliveries
CREATE POLICY "Users can upload proof images for their company orders"
    ON proof_images
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = proof_images.company_id
        )
    );

-- Policy 3: Allow DELETE for users in the same company
CREATE POLICY "Users can delete proof images in their company"
    ON proof_images
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = proof_images.company_id
        )
    );

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'proof_images';
