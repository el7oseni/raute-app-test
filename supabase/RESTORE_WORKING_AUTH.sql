-- 🔄 RESTORE WORKING AUTH POLICIES
-- This restores the exact RLS configuration that was working in Build 957
-- Run this on Supabase SQL Editor

BEGIN;

-- ========================================
-- 1. CLEAN SLATE: Drop ALL existing policies
-- ========================================

DROP POLICY IF EXISTS "users_can_read_own" ON users;
DROP POLICY IF EXISTS "users_can_read_company" ON users;
DROP POLICY IF EXISTS "users_can_update_own" ON users;
DROP POLICY IF EXISTS "users_can_read_all_authenticated" ON users;
DROP POLICY IF EXISTS "users_read_company_and_self" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_service_all" ON users;

-- ========================================
-- 2. RESTORE SIMPLE, PROVEN POLICIES
-- ========================================

-- Policy 1: Users can read their own profile (CRITICAL for auth)
CREATE POLICY "users_can_read_own"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "users_can_update_own"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

COMMIT;

-- ========================================
-- 3. VERIFY THE FIX
-- ========================================

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN policyname = 'users_can_read_own' THEN '✅ Read own profile'
        WHEN policyname = 'users_can_update_own' THEN '✅ Update own profile'
        ELSE '⚠️ UNEXPECTED POLICY - Should only have 2 policies!'
    END as status
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- Expected output: Should show ONLY 2 policies:
-- 1. users_can_read_own (SELECT)
-- 2. users_can_update_own (UPDATE)
