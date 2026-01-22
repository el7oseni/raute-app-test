-- 🔍 Check RLS Policy Performance on Users Table
-- This query shows all RLS policies and helps identify slow ones

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_tables
WHERE tablename = 'users';

-- 2. Show all RLS policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 3. Check if there are indexes on users table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users';

-- 4. Test query performance (simulate what mobile-nav does)
EXPLAIN ANALYZE
SELECT role 
FROM users 
WHERE id = auth.uid();
