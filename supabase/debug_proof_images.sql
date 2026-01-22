-- Debug script to check proof_images table configuration

-- 1. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'proof_images';

-- 2. Check all current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'proof_images';

-- 3. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'proof_images'
ORDER BY ordinal_position;

-- 4. TEMPORARY: Disable RLS for testing (⚠️ ONLY FOR DEBUGGING)
-- Uncomment the line below ONLY if you want to test without RLS
-- ALTER TABLE proof_images DISABLE ROW LEVEL SECURITY;

-- 5. After disabling RLS, verify it's off
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'proof_images';
